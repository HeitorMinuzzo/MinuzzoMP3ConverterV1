import { spawn, type ChildProcess } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';

const MAX_COMMAND_OUTPUT = 10 * 1024 * 1024;
const DEFAULT_METADATA_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_VIDEO_DURATION_SECONDS = 2 * 60 * 60;
const YOUTUBE_RUNTIME_DIRECTORY = join(tmpdir(), 'minuzzo-ytdlp-runtime');
const ALLOWED_BITRATES = new Set(['128', '192', '320']);
const ALLOWED_YOUTUBE_HOSTS = new Set([
	'youtube.com',
	'www.youtube.com',
	'm.youtube.com',
	'music.youtube.com',
	'youtu.be',
	'youtube-nocookie.com',
	'www.youtube-nocookie.com'
]);

function configuredInteger(name: string, fallback: number, minimum: number, maximum: number) {
	const parsed = Number.parseInt(process.env[name] ?? '', 10);
	return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

const METADATA_TTL_MS = configuredInteger(
	'YOUTUBE_METADATA_TTL_MS',
	DEFAULT_METADATA_TTL_MS,
	30_000,
	24 * 60 * 60 * 1000
);
const MAX_METADATA_CACHE_ENTRIES = configuredInteger('YOUTUBE_METADATA_CACHE_ENTRIES', 100, 10, 1_000);
const MAX_VIDEO_DURATION_SECONDS = configuredInteger(
	'MAX_VIDEO_DURATION_SECONDS',
	DEFAULT_MAX_VIDEO_DURATION_SECONDS,
	60,
	24 * 60 * 60
);

export class MediaPipelineError extends Error {
	constructor(
		message: string,
		public readonly status = 500
	) {
		super(message);
		this.name = 'MediaPipelineError';
	}
}

type QueueEntry = {
	resolve: (release: () => void) => void;
	reject: (error: Error) => void;
	signal?: AbortSignal;
	onAbort?: () => void;
};

class ConversionSemaphore {
	private active = 0;
	private readonly queue: QueueEntry[] = [];

	constructor(
		private readonly limit: number,
		private readonly maxQueue: number
	) {}

	async acquire(signal?: AbortSignal): Promise<() => void> {
		if (signal?.aborted) {
			throw new MediaPipelineError('Conversão cancelada pelo cliente.', 499);
		}

		if (this.active < this.limit) {
			this.active += 1;
			return this.createRelease();
		}

		if (this.queue.length >= this.maxQueue) {
			throw new MediaPipelineError(
				'Servidor ocupado. Aguarde alguns instantes antes de tentar novamente.',
				503
			);
		}

		return new Promise<() => void>((resolvePromise, rejectPromise) => {
			const entry: QueueEntry = {
				resolve: resolvePromise,
				reject: rejectPromise,
				signal
			};

			if (signal) {
				entry.onAbort = () => {
					const index = this.queue.indexOf(entry);
					if (index >= 0) this.queue.splice(index, 1);
					rejectPromise(new MediaPipelineError('Conversão cancelada pelo cliente.', 499));
				};
				signal.addEventListener('abort', entry.onAbort, { once: true });
			}

			this.queue.push(entry);
		});
	}

	private createRelease() {
		let released = false;

		return () => {
			if (released) return;
			released = true;
			this.active -= 1;
			this.startNext();
		};
	}

	private startNext() {
		while (this.queue.length > 0 && this.active < this.limit) {
			const entry = this.queue.shift()!;
			if (entry.onAbort && entry.signal) {
				entry.signal.removeEventListener('abort', entry.onAbort);
			}
			if (entry.signal?.aborted) {
				entry.reject(new MediaPipelineError('Conversão cancelada pelo cliente.', 499));
				continue;
			}

			this.active += 1;
			entry.resolve(this.createRelease());
		}
	}
}

const conversionSemaphore = new ConversionSemaphore(
	configuredInteger('MAX_CONCURRENT_CONVERSIONS', 2, 1, 16),
	configuredInteger('MAX_QUEUED_CONVERSIONS', 20, 0, 1_000)
);

export type VideoMetadata = {
	id: string;
	title: string;
	channel: string;
	thumbnail: string;
	duration: number;
	durationText: string;
};

export type ConvertedAudio = {
	filePath: string;
	fileName: string;
	size: number;
	cleanup: () => Promise<void>;
};

type ProcessOptions = {
	timeoutMs?: number;
	cwd?: string;
	signal?: AbortSignal;
};

type MetadataCacheEntry = {
	value: VideoMetadata;
	expiresAt: number;
};

const metadataCache = new Map<string, MetadataCacheEntry>();
const pendingMetadata = new Map<string, Promise<VideoMetadata>>();

function getBinaryPath(name: string) {
	const isWin = process.platform === 'win32';
	const binaryName = isWin ? `${name}.exe` : name;

	const localPath = resolve('bin', binaryName);
	if (existsSync(localPath)) return localPath;

	const cwdPath = resolve(process.cwd(), 'bin', binaryName);
	if (existsSync(cwdPath)) return cwdPath;

	return name;
}

function ytDlpPath() {
	return getBinaryPath('yt-dlp');
}

function ffmpegPath() {
	return getBinaryPath('ffmpeg');
}

export function parseTimestamp(value: string) {
	const match = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/.exec(value.trim());
	if (!match) return null;
	return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

export function safeFilename(value: string) {
	const cleaned = value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[<>:"/\\|?*]/g, '')
		.split('')
		.filter((character) => character.charCodeAt(0) >= 32)
		.join('')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 120);

	return cleaned || 'minuzzo-mp3-audio';
}

export function assertYouTubeUrl(value: string) {
	let parsed: URL;

	try {
		parsed = new URL(value);
	} catch {
		throw new MediaPipelineError('Informe um link do YouTube válido.', 400);
	}

	if (
		parsed.protocol !== 'https:' ||
		!ALLOWED_YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())
	) {
		throw new MediaPipelineError('Informe um link HTTPS válido do YouTube.', 400);
	}

	return parsed.toString();
}

function metadataCacheKey(url: string) {
	const parsed = new URL(url);
	const host = parsed.hostname.toLowerCase();
	let videoId = '';

	if (host === 'youtu.be') {
		videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
	} else {
		videoId = parsed.searchParams.get('v') ?? '';
		if (!videoId) {
			const [route, id] = parsed.pathname.split('/').filter(Boolean);
			if (route === 'shorts' || route === 'embed' || route === 'live') videoId = id ?? '';
		}
	}

	return /^[\w-]{11}$/.test(videoId) ? videoId : url;
}

function terminateProcessTree(child: ChildProcess) {
	if (!child.pid) return;

	if (process.platform === 'win32') {
		const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
			stdio: 'ignore',
			windowsHide: true
		});
		killer.unref();
		return;
	}

	child.kill('SIGKILL');
}

export function runProcess(command: string, args: string[], options: ProcessOptions = {}) {
	const { timeoutMs = 120_000, cwd, signal } = options;

	return new Promise<{ stdout: string; stderr: string }>((resolvePromise, rejectPromise) => {
		const child = spawn(command, args, {
			cwd,
			env: { ...process.env, NO_COLOR: '1' },
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true
		});

		let stdout = '';
		let stderr = '';
		let stdoutBytes = 0;
		let stderrBytes = 0;
		let settled = false;
		let terminationError: Error | null = null;

		const requestTermination = (message: string) => {
			if (settled || terminationError) return;
			terminationError = new Error(message);
			terminateProcessTree(child);
		};

		const timeout = setTimeout(() => {
			requestTermination('Media extraction process timed out.');
		}, timeoutMs);

		const onAbort = () => requestTermination('Media extraction process was cancelled.');
		signal?.addEventListener('abort', onAbort, { once: true });
		if (signal?.aborted) onAbort();

		const finish = () => {
			clearTimeout(timeout);
			signal?.removeEventListener('abort', onAbort);
		};

		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');

		child.stdout.on('data', (chunk: string) => {
			if (terminationError) return;
			stdoutBytes += Buffer.byteLength(chunk);
			if (stdoutBytes > MAX_COMMAND_OUTPUT) {
				requestTermination('Output process limit exceeded.');
				return;
			}
			stdout += chunk;
		});
		child.stderr.on('data', (chunk: string) => {
			if (terminationError) return;
			stderrBytes += Buffer.byteLength(chunk);
			if (stderrBytes > MAX_COMMAND_OUTPUT) {
				requestTermination('Output process limit exceeded.');
				return;
			}
			stderr += chunk;
		});

		child.on('error', (error) => {
			if (settled) return;
			settled = true;
			finish();
			rejectPromise(error);
		});
		child.on('close', (code) => {
			if (settled) return;
			settled = true;
			finish();

			if (terminationError) {
				rejectPromise(terminationError);
			} else if (code === 0) {
				resolvePromise({ stdout, stderr });
			} else {
				rejectPromise(
					new Error(stderr.trim() || stdout.trim() || `Process exited with code ${code}.`)
				);
			}
		});
	});
}

function commonYtDlpArgs() {
	return [
		'--no-config',
		'--no-playlist',
		'--no-warnings',
		'--no-progress',
		'--cache-dir',
		join(YOUTUBE_RUNTIME_DIRECTORY, 'cache'),
		'--socket-timeout',
		'15',
		'--retries',
		'3',
		'--fragment-retries',
		'3'
	];
}

function pruneMetadataCache() {
	const now = Date.now();
	for (const [key, entry] of metadataCache) {
		if (entry.expiresAt <= now) metadataCache.delete(key);
	}

	while (metadataCache.size >= MAX_METADATA_CACHE_ENTRIES) {
		const oldestKey = metadataCache.keys().next().value;
		if (oldestKey === undefined) break;
		metadataCache.delete(oldestKey);
	}
}

async function fetchVideoMetadata(url: string): Promise<VideoMetadata> {
	await mkdir(YOUTUBE_RUNTIME_DIRECTORY, { recursive: true });
	const { stdout } = await runProcess(
		ytDlpPath(),
		[...commonYtDlpArgs(), '--skip-download', '--dump-single-json', url],
		{ timeoutMs: 30_000, cwd: YOUTUBE_RUNTIME_DIRECTORY }
	);
	const info = JSON.parse(stdout);

	const duration = Math.round(info.duration ?? 0);
	const hrs = Math.floor(duration / 3600);
	const mins = Math.floor((duration % 3600) / 60);
	const secs = duration % 60;
	const durationText = [
		hrs > 0 ? hrs.toString().padStart(2, '0') : null,
		mins.toString().padStart(2, '0'),
		secs.toString().padStart(2, '0')
	]
		.filter(Boolean)
		.join(':');

	const bestThumbnail = info.thumbnails
		?.filter((item: any) => item.url)
		.sort(
			(a: any, b: any) =>
				(b.width ?? b.preference ?? 0) - (a.width ?? a.preference ?? 0)
		)[0]?.url;

	return {
		id: info.id || '',
		title: info.title || info.fulltitle || 'YouTube Track',
		channel: info.channel || info.uploader || 'YouTube Creator',
		thumbnail:
			bestThumbnail ||
			info.thumbnail ||
			`https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`,
		duration,
		durationText
	};
}

export async function getVideoMetadata(value: string): Promise<VideoMetadata> {
	const url = assertYouTubeUrl(value);
	const cacheKey = metadataCacheKey(url);
	const cached = metadataCache.get(cacheKey);

	if (cached && cached.expiresAt > Date.now()) {
		metadataCache.delete(cacheKey);
		metadataCache.set(cacheKey, cached);
		return cached.value;
	}

	const existingRequest = pendingMetadata.get(cacheKey);
	if (existingRequest) return existingRequest;

	const request = fetchVideoMetadata(url)
		.then((metadata) => {
			pruneMetadataCache();
			metadataCache.set(cacheKey, {
				value: metadata,
				expiresAt: Date.now() + METADATA_TTL_MS
			});
			return metadata;
		})
		.finally(() => {
			pendingMetadata.delete(cacheKey);
		});

	pendingMetadata.set(cacheKey, request);
	return request;
}

export async function convertAndTrimAudio(
	value: string,
	quality: string,
	trimEnabled: boolean,
	startSeconds: number,
	endSeconds: number,
	signal?: AbortSignal
): Promise<ConvertedAudio> {
	const url = assertYouTubeUrl(value);
	if (!ALLOWED_BITRATES.has(quality)) {
		throw new MediaPipelineError('Qualidade de áudio inválida.', 400);
	}

	const releaseSlot = await conversionSemaphore.acquire(signal);
	let workingDirectory: string | null = null;
	let preserveOutput = false;
	let cleaned = false;

	const cleanup = async () => {
		if (cleaned || !workingDirectory) return;
		cleaned = true;
		await rm(workingDirectory, { recursive: true, force: true }).catch(() => {});
	};

	try {
		workingDirectory = await mkdtemp(join(tmpdir(), 'minuzzo-mp3-'));
		const metadata = await getVideoMetadata(url);
		if (metadata.duration <= 0 || metadata.duration > MAX_VIDEO_DURATION_SECONDS) {
			throw new MediaPipelineError(
				`O vídeo deve ter no máximo ${Math.floor(MAX_VIDEO_DURATION_SECONDS / 60)} minutos.`,
				400
			);
		}

		if (
			trimEnabled &&
			(!Number.isFinite(startSeconds) ||
				!Number.isFinite(endSeconds) ||
				startSeconds < 0 ||
				endSeconds <= startSeconds ||
				endSeconds > metadata.duration)
		) {
			throw new MediaPipelineError('Intervalo de corte inválido.', 400);
		}

		const ytPath = ytDlpPath();
		const ffPath = ffmpegPath();
		const downloadArgs = [
			...commonYtDlpArgs(),
			'--quiet',
			'--format',
			'bestaudio/best',
			'--output',
			join(workingDirectory, 'source.%(ext)s')
		];

		if (trimEnabled) {
			downloadArgs.push(
				'--ffmpeg-location',
				ffPath,
				'--download-sections',
				`*${startSeconds}-${endSeconds}`
			);
		}

		downloadArgs.push(url);
		await runProcess(ytPath, downloadArgs, {
			timeoutMs: 180_000,
			cwd: workingDirectory,
			signal
		});

		const files = await readdir(workingDirectory);
		const sourceFile = files.find(
			(file) =>
				file.startsWith('source.') && !file.endsWith('.part') && !file.endsWith('.ytdl')
		);

		if (!sourceFile) {
			throw new Error('Could not download audio stream from YouTube.');
		}

		const outputPath = join(workingDirectory, 'output.mp3');
		const ffmpegArgs = [
			'-hide_banner',
			'-loglevel',
			'error',
			'-y',
			'-i',
			join(workingDirectory, sourceFile)
		];

		if (trimEnabled) {
			ffmpegArgs.push('-t', Math.max(1, endSeconds - startSeconds).toString());
		}

		ffmpegArgs.push(
			'-vn',
			'-c:a',
			'libmp3lame',
			'-b:a',
			`${quality}k`,
			'-id3v2_version',
			'3',
			'-metadata',
			`title=${metadata.title}`,
			'-metadata',
			`artist=${metadata.channel}`,
			'-metadata',
			'comment=Converted by MinuzzoMP3Converter',
			outputPath
		);

		await runProcess(ffPath, ffmpegArgs, {
			timeoutMs: 180_000,
			cwd: workingDirectory,
			signal
		});

		const outputStat = await stat(outputPath);
		if (!outputStat.size) {
			throw new Error('Generated MP3 file is empty.');
		}

		const cleanName = safeFilename(metadata.title);
		const trimSuffix = trimEnabled ? ' [Trim]' : '';
		const fileName = `${cleanName}${trimSuffix} (${quality}kbps).mp3`;

		preserveOutput = true;
		return {
			filePath: outputPath,
			fileName,
			size: outputStat.size,
			cleanup
		};
	} finally {
		releaseSlot();
		if (!preserveOutput) await cleanup();
	}
}

export function createAudioDownloadResponse(audio: ConvertedAudio) {
	const nodeStream = createReadStream(audio.filePath);
	const cleanup = () => {
		void audio.cleanup();
	};

	nodeStream.once('close', cleanup);
	nodeStream.once('error', cleanup);

	try {
		const body = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
		const encodedName = encodeURIComponent(audio.fileName);

		return new Response(body, {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Content-Length': audio.size.toString(),
				'Content-Disposition': `attachment; filename="${encodedName}"; filename*=utf-8''${encodedName}`,
				'X-Download-Filename': encodedName,
				'Cache-Control': 'no-store',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch (error) {
		nodeStream.destroy();
		void audio.cleanup();
		throw error;
	}
}
