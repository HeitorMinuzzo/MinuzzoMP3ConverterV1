import { json, type RequestHandler } from '@sveltejs/kit';
import { getVideoMetadata, MediaPipelineError } from '$lib/server/youtube';

export const GET: RequestHandler = async ({ url }) => {
	const videoUrl = url.searchParams.get('url');

	if (!videoUrl) {
		return json({ error: 'Informe um link do YouTube válido.' }, { status: 400 });
	}

	try {
		const meta = await getVideoMetadata(videoUrl);
		return json(
			{
				id: meta.id,
				title: meta.title,
				channel: meta.channel,
				duration: meta.duration,
				durationFormatted: meta.durationText,
				thumbnail: meta.thumbnail,
				views: 'YouTube Audio'
			},
			{
				headers: {
					'Cache-Control': 'private, max-age=300'
				}
			}
		);
	} catch (err: unknown) {
		console.error('Info API error:', err);
		const status = err instanceof MediaPipelineError ? err.status : 500;
		const message = err instanceof Error ? err.message : 'Falha ao buscar metadados do vídeo';
		return json({ error: message }, { status });
	}
};
