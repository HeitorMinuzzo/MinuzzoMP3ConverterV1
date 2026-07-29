import { error, type RequestHandler } from '@sveltejs/kit';
import {
	convertAndTrimAudio,
	createAudioDownloadResponse,
	MediaPipelineError,
	parseTimestamp
} from '$lib/server/youtube';

export const GET: RequestHandler = async ({ url, request }) => {
	const videoUrl = url.searchParams.get('url')?.trim() ?? '';
	const bitrate = url.searchParams.get('bitrate') ?? '320';
	const enableTrim = url.searchParams.get('trim') === 'true';
	const startTime = url.searchParams.get('start') ?? '00:00:00';
	const endTime = url.searchParams.get('end') ?? '00:01:00';

	if (!videoUrl) {
		throw error(400, 'Informe um link do YouTube válido.');
	}

	const startSeconds = enableTrim ? parseTimestamp(startTime) : 0;
	const endSeconds = enableTrim ? parseTimestamp(endTime) : 0;
	if (
		enableTrim &&
		(startSeconds === null || endSeconds === null || endSeconds <= startSeconds)
	) {
		throw error(400, 'Intervalo de corte inválido.');
	}

	try {
		const audio = await convertAndTrimAudio(
			videoUrl,
			bitrate,
			enableTrim,
			startSeconds ?? 0,
			endSeconds ?? 0,
			request.signal
		);

		return createAudioDownloadResponse(audio);
	} catch (err: unknown) {
		console.error('Download API error:', err);
		const status = err instanceof MediaPipelineError ? err.status : 500;
		const message = err instanceof Error ? err.message : 'Falha ao converter o áudio';
		throw error(status === 499 ? 408 : status, message);
	}
};
