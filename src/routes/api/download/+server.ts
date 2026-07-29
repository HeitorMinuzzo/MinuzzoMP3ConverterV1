import { error, type RequestHandler } from '@sveltejs/kit';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const ytDlpPath = path.resolve('bin/yt-dlp.exe');
const ffmpegPath = path.resolve('bin/ffmpeg.exe');

export const GET: RequestHandler = async ({ url }) => {
	const videoUrl = url.searchParams.get('url');
	const bitrate = url.searchParams.get('bitrate') || '320';
	const enableTrim = url.searchParams.get('trim') === 'true';
	const startTime = url.searchParams.get('start') || '00:00:00';
	const endTime = url.searchParams.get('end') || '00:01:00';

	if (!videoUrl) {
		throw error(400, 'Missing YouTube URL');
	}

	try {
		// 1. Get video info
		const { stdout: jsonOut } = await execFileAsync(ytDlpPath, [
			'--dump-json',
			'--no-warnings',
			'--no-playlist',
			videoUrl
		], { maxBuffer: 10 * 1024 * 1024 });

		const info = JSON.parse(jsonOut);
		const rawTitle = info.title || 'YouTube_Audio';
		const cleanTitle = rawTitle.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
		const trimSuffix = enableTrim ? ` [Trim ${startTime}-${endTime}]` : '';
		const fileName = `${cleanTitle || 'AudioPulse_Track'}${trimSuffix} (${bitrate}kbps).mp3`;

		if (enableTrim) {
			// Trimmed section download using yt-dlp + ffmpeg
			const tempFilePath = path.join(os.tmpdir(), `minuzzo_trim_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);

			await execFileAsync(ytDlpPath, [
				'--ffmpeg-location', ffmpegPath,
				'--download-sections', `*${startTime}-${endTime}`,
				'-f', 'bestaudio/best',
				'-o', tempFilePath,
				'--force-overwrites',
				'--no-playlist',
				videoUrl
			], { maxBuffer: 20 * 1024 * 1024 });

			if (!fs.existsSync(tempFilePath)) {
				throw new Error('Trimmed audio file generation failed');
			}

			const fileStats = fs.statSync(tempFilePath);
			const nodeStream = fs.createReadStream(tempFilePath);

			// Clean up temp file when stream ends
			nodeStream.on('close', () => {
				try {
					if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
				} catch {}
			});

			const headers = new Headers();
			headers.set('Content-Type', 'audio/mpeg');
			headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"; filename*="utf-8''${encodeURIComponent(fileName)}"`);
			headers.set('Content-Length', fileStats.size.toString());
			headers.set('Cache-Control', 'no-cache');

			const webStream = new ReadableStream({
				start(controller) {
					nodeStream.on('data', (chunk: any) => controller.enqueue(chunk));
					nodeStream.on('end', () => controller.close());
					nodeStream.on('error', (err: any) => controller.error(err));
				},
				cancel() {
					nodeStream.destroy();
				}
			});

			return new Response(webStream, { headers });
		} else {
			// Full audio stream directly from YouTube CDN
			const { stdout: streamUrlOut } = await execFileAsync(ytDlpPath, [
				'-f', 'bestaudio/best',
				'-g',
				'--no-playlist',
				videoUrl
			]);

			const directAudioUrl = streamUrlOut.trim().split('\n')[0];

			if (!directAudioUrl) {
				throw new Error('Direct audio stream URL not found');
			}

			const audioResponse = await fetch(directAudioUrl, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
				}
			});

			if (!audioResponse.ok || !audioResponse.body) {
				throw new Error(`Failed to stream audio from YouTube CDN (${audioResponse.status})`);
			}

			const headers = new Headers();
			headers.set('Content-Type', 'audio/mpeg');
			headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"; filename*="utf-8''${encodeURIComponent(fileName)}"`);
			headers.set('Cache-Control', 'no-cache');

			const contentLength = audioResponse.headers.get('content-length');
			if (contentLength) {
				headers.set('Content-Length', contentLength);
			}

			return new Response(audioResponse.body as any, {
				status: 200,
				headers
			});
		}
	} catch (err: any) {
		console.error('yt-dlp download error:', err);
		throw error(500, err.message || 'Failed to download YouTube audio stream');
	}
};
