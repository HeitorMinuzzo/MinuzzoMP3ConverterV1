import { json, type RequestHandler } from '@sveltejs/kit';
import {
	convertAndTrimAudio,
	createAudioDownloadResponse,
	MediaPipelineError,
	parseTimestamp
} from '$lib/server/youtube';

export const POST: RequestHandler = async ({ request }) => {
	let body: {
		url?: string;
		quality?: string;
		trimEnabled?: boolean;
		startTime?: string;
		endTime?: string;
	};

	try {
		body = await request.json();
	} catch {
		return json({ error: 'Requisição inválida.' }, { status: 400 });
	}

	const url = body.url?.trim() || '';
	const quality = body.quality || '320';
	const trimEnabled = body.trimEnabled === true;

	if (!url) {
		return json({ error: 'Informe um link do YouTube válido.' }, { status: 400 });
	}

	try {
		let startSeconds = 0;
		let endSeconds = 0;

		if (trimEnabled) {
			if (!body.startTime || !body.endTime) {
				return json({ error: 'Informe o início e o fim do corte.' }, { status: 400 });
			}

			const parsedStart = parseTimestamp(body.startTime);
			const parsedEnd = parseTimestamp(body.endTime);
			if (parsedStart === null || parsedEnd === null || parsedEnd <= parsedStart) {
				return json({ error: 'Intervalo de corte inválido.' }, { status: 400 });
			}

			startSeconds = parsedStart;
			endSeconds = parsedEnd;
		}

		const audio = await convertAndTrimAudio(
			url,
			quality,
			trimEnabled,
			startSeconds,
			endSeconds,
			request.signal
		);

		return createAudioDownloadResponse(audio);
	} catch (err: unknown) {
		console.error('Convert API error:', err);
		const status = err instanceof MediaPipelineError ? err.status : 500;
		const message = err instanceof Error ? err.message : 'Erro durante a conversão do áudio';
		return json({ error: message }, { status: status === 499 ? 408 : status });
	}
};
