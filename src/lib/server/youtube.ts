import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const MAX_COMMAND_OUTPUT = 10 * 1024 * 1024;

export type VideoMetadata = {
	id: string;
	title: string;
	channel: string;
	thumbnail: string;
	duration: number;
	durationText: string;
};

function ytDlpPath() {
	return resolve('bin/yt-dlp.exe');
}

function ffmpegPath() {
	return resolve('bin/ffmpeg.exe');
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

export function runProcess(command: string, args: string[], timeoutMs: number = 120_000) {
	return new Promise<{ stdout: string; stderr: string }>((resolvePromise, rejectPromise) => {
		const child = spawn(command, args, {
			env: { ...process.env, NO_COLOR: '1' },
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true
		});

		let stdout = '';
		let stderr = '';
		let settled = false;

		const finishWithError = (message: string) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			child.kill();
			rejectPromise(new Error(message));
		};

		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');

		child.stdout.on('data', (chunk: string) => {
			stdout += chunk;
			if (stdout.length > MAX_COMMAND_OUTPUT) finishWithError('Output process limit exceeded.');
		});
		child.stderr.on('data', (chunk: string) => {
			stderr += chunk;
			if (stderr.length > MAX_COMMAND_OUTPUT) finishWithError('Output process limit exceeded.');
		});

		child.on('error', (error) => finishWithError(error.message));
		child.on('close', (code) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);

			if (code === 0) resolvePromise({ stdout, stderr });
			else
				rejectPromise(
					new Error(stderr.trim() || stdout.trim() || `Process exited with code ${code}.`)
				);
		});

		const timeout = setTimeout(() => {
			finishWithError('Media extraction process timed out.');
		}, timeoutMs);
	});
}

function commonYtDlpArgs() {
	return [
		'--no-config',
		'--no-playlist',
		'--no-warnings',
		'--socket-timeout',
		'15',
		'--retries',
		'3',
		'--fragment-retries',
		'3'
	];
}

export async function getVideoMetadata(url: string): Promise<VideoMetadata> {
	const ytPath = ytDlpPath();
	const { stdout } = await runProcess(
		ytPath,
		[...commonYtDlpArgs(), '--skip-download', '--dump-single-json', url],
		30_000
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
		.sort((a: any, b: any) => (b.width ?? b.preference ?? 0) - (a.width ?? a.preference ?? 0))[0]?.url;

	return {
		id: info.id || '',
		title: info.title || info.fulltitle || 'YouTube Track',
		channel: info.channel || info.uploader || 'YouTube Creator',
		thumbnail: bestThumbnail || info.thumbnail || `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`,
		duration,
		durationText
	};
}

export async function convertAndTrimAudio(
	url: string,
	quality: string,
	trimEnabled: boolean,
	startSeconds: number,
	endSeconds: number
): Promise<{ buffer: Buffer; fileName: string }> {
	const ytPath = ytDlpPath();
	const ffPath = ffmpegPath();
	const workingDirectory = await mkdtemp(join(tmpdir(), 'minuzzo-mp3-'));

	try {
		// Download best audio source stream
		const downloadArgs = [...commonYtDlpArgs(), '--format', 'bestaudio/best', '-o', join(workingDirectory, 'source.%(ext)s'), url];
		await runProcess(ytPath, downloadArgs, 180_000);

		const files = await readdir(workingDirectory);
		const sourceFile = files.find(
			(file) => file.startsWith('source.') && !file.endsWith('.part') && !file.endsWith('.ytdl')
		);

		if (!sourceFile) {
			throw new Error('Could not download audio stream from YouTube.');
		}

		// Convert and encode to MP3 using FFmpeg with ID3 tags & trimming
		const metadata = await getVideoMetadata(url);
		const outputPath = join(workingDirectory, 'output.mp3');

		const ffmpegArgs = ['-hide_banner', '-loglevel', 'error', '-y'];

		if (trimEnabled && startSeconds > 0) {
			ffmpegArgs.push('-ss', startSeconds.toString());
		}

		ffmpegArgs.push('-i', join(workingDirectory, sourceFile));

		if (trimEnabled) {
			const durationToCut = Math.max(1, endSeconds - startSeconds);
			ffmpegArgs.push('-t', durationToCut.toString());
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

		await runProcess(ffPath, ffmpegArgs, 180_000);

		const outputStat = await stat(outputPath);
		if (!outputStat.size) {
			throw new Error('Generated MP3 file is empty.');
		}

		const fileBuffer = await readFile(outputPath);
		const cleanName = safeFilename(metadata.title);
		const trimSuffix = trimEnabled ? ` [Trim]` : '';
		const fileName = `${cleanName}${trimSuffix} (${quality}kbps).mp3`;

		return { buffer: fileBuffer, fileName };
	} finally {
		await rm(workingDirectory, { recursive: true, force: true }).catch(() => {});
	}
}
