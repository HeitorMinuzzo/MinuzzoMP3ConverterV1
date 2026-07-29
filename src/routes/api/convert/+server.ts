import { json, type RequestHandler } from '@sveltejs/kit';
import { convertAndTrimAudio, parseTimestamp } from '$lib/server/youtube';

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

		if (trimEnabled && body.startTime && body.endTime) {
			startSeconds = parseTimestamp(body.startTime) || 0;
			endSeconds = parseTimestamp(body.endTime) || 0;
		}

		const { buffer, fileName } = await convertAndTrimAudio(
			url,
			quality,
			trimEnabled,
			startSeconds,
			endSeconds
		);

		return new Response(Uint8Array.from(buffer), {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Content-Length': buffer.length.toString(),
				'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"; filename*="utf-8''${encodeURIComponent(fileName)}"`,
				'X-Download-Filename': encodeURIComponent(fileName)
			}
		});
	} catch (err: any) {
		console.error('Convert API error:', err);
		return json({ error: err.message || 'Erro durante a conversão do áudio' }, { status: 500 });
	}
};
