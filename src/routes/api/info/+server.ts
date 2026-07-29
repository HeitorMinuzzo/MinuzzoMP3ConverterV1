import { json, type RequestHandler } from '@sveltejs/kit';
import { getVideoMetadata } from '$lib/server/youtube';

export const GET: RequestHandler = async ({ url }) => {
	const videoUrl = url.searchParams.get('url');

	if (!videoUrl) {
		return json({ error: 'Informe um link do YouTube válido' }, { status: 400 });
	}

	try {
		const meta = await getVideoMetadata(videoUrl);
		return json({
			id: meta.id,
			title: meta.title,
			channel: meta.channel,
			duration: meta.duration,
			durationFormatted: meta.durationText,
			thumbnail: meta.thumbnail,
			views: 'YouTube Audio'
		});
	} catch (err: any) {
		console.error('Info API error:', err);
		return json({ error: err.message || 'Falha ao buscar metadados do vídeo' }, { status: 500 });
	}
};
