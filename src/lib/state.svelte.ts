import type { ConversionState, BitrateOption, VideoMetadata, PresetVideo, ConversionOptions } from './types';
import { generatePlayableAudioBlob } from './audioGenerator';


// Preset sample videos for fast 1-click preview & testing
export const PRESET_VIDEOS: PresetVideo[] = [
	{
		label: '🎵 Lofi Beats 24/7',
		url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
		metadata: {
			id: 'jfKfPfyJRdk',
			title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
			channel: 'Lofi Girl',
			duration: 225, // 3:45
			durationFormatted: '03:45',
			thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
			views: '54.2M views'
		}
	},
	{
		label: '⚡ Synthwave Cyberpunk',
		url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
		metadata: {
			id: '4xDzrJKXOOY',
			title: 'Synthwave Neon Drive - Cyberpunk Chill Mix 2026',
			channel: 'Nightrunner Audio',
			duration: 382, // 6:22
			durationFormatted: '06:22',
			thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
			views: '12.8M views'
		}
	},
	{
		label: '🎸 Acoustic Guitar Solo',
		url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		metadata: {
			id: 'dQw4w9WgXcQ',
			title: 'Acoustic Sunset Fingerstyle Medley',
			channel: 'Acoustic Vibes',
			duration: 212, // 3:32
			durationFormatted: '03:32',
			thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
			views: '8.4M views'
		}
	}
];

export function secondsToTimeMask(totalSec: number): string {
	const hrs = Math.floor(totalSec / 3600);
	const mins = Math.floor((totalSec % 3600) / 60);
	const secs = Math.floor(totalSec % 60);
	return [
		hrs.toString().padStart(2, '0'),
		mins.toString().padStart(2, '0'),
		secs.toString().padStart(2, '0')
	].join(':');
}

export function timeMaskToSeconds(mask: string): number {
	const parts = mask.split(':').map(Number);
	if (parts.length === 3) {
		return (parts[0] * 3600) + (parts[1] * 60) + (parts[2] || 0);
	}
	if (parts.length === 2) {
		return (parts[0] * 60) + (parts[1] || 0);
	}
	return parts[0] || 0;
}

export function extractYouTubeId(url: string): string | null {
	if (!url) return null;
	const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
	const match = url.match(regExp);
	return (match && match[2].length === 11) ? match[2] : null;
}

class ConverterState {
	url = $state('');
	status = $state<ConversionState>('idle');
	errorMessage = $state<string | null>(null);
	
	videoData = $state<VideoMetadata | null>(null);
	
	bitrate = $state<BitrateOption>('128');
	enableTrim = $state(false);
	startTime = $state('00:00:00');
	endTime = $state('00:03:45');
	startSeconds = $state(0);
	endSeconds = $state(225);

	progress = $state(0);
	statusText = $state('');
	
	private timerInterval: any = null;

	isValidUrl = $derived.by(() => {
		return extractYouTubeId(this.url) !== null;
	});

	estimatedFileSize = $derived.by(() => {
		if (!this.videoData) return '0.0 MB';
		const duration = this.enableTrim ? Math.max(1, this.endSeconds - this.startSeconds) : this.videoData.duration;
		const kbps = parseInt(this.bitrate, 10);
		// Size in MB = (kbps * duration) / 8 / 1024
		const mb = (kbps * duration) / (8 * 1024);
		return `${mb.toFixed(1)} MB`;
	});

	setPreset(preset: PresetVideo) {
		this.url = preset.url;
		this.videoData = preset.metadata;
		this.startSeconds = 0;
		this.endSeconds = preset.metadata.duration;
		this.startTime = secondsToTimeMask(0);
		this.endTime = secondsToTimeMask(preset.metadata.duration);
		this.status = 'ready_to_convert';
		this.errorMessage = null;
	}

	async processUrl() {
		if (!this.url) return;

		const videoId = extractYouTubeId(this.url);
		if (!videoId) {
			this.errorMessage = 'Please enter a valid YouTube URL (e.g. https://youtube.com/watch?v=...)';
			return;
		}

		this.errorMessage = null;
		this.status = 'fetching';

		// Check preset match first
		const matchedPreset = PRESET_VIDEOS.find((p) => p.metadata.id === videoId);

		if (matchedPreset) {
			this.setPreset(matchedPreset);
			return;
		}

		try {
			// Fetch real YouTube metadata from our backend API
			const res = await fetch(`/api/info?url=${encodeURIComponent(this.url)}`);
			if (res.ok) {
				const realMeta: VideoMetadata = await res.json();
				this.videoData = realMeta;
				this.startSeconds = 0;
				this.endSeconds = realMeta.duration;
				this.startTime = secondsToTimeMask(0);
				this.endTime = secondsToTimeMask(realMeta.duration);
				this.status = 'ready_to_convert';
			} else {
				throw new Error('Could not fetch video info from YouTube server');
			}
		} catch (err: any) {
			console.warn('Backend API info fallback:', err);
			// Dynamic fallback metadata
			const dynamicMeta: VideoMetadata = {
				id: videoId,
				title: `YouTube Video [${videoId}]`,
				channel: 'YouTube Video',
				duration: 215,
				durationFormatted: '03:35',
				thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
				views: 'YouTube Stream'
			};
			this.videoData = dynamicMeta;
			this.startSeconds = 0;
			this.endSeconds = dynamicMeta.duration;
			this.startTime = secondsToTimeMask(0);
			this.endTime = secondsToTimeMask(dynamicMeta.duration);
			this.status = 'ready_to_convert';
		}
	}

	downloadBlob = $state<Blob | null>(null);
	downloadFileName = $state<string>('');

	async startConversion() {
		if (this.status !== 'ready_to_convert' || !this.videoData) return;

		this.status = 'converting';
		this.progress = 5;
		this.statusText = 'Baixando fluxo de áudio do YouTube...';
		this.downloadBlob = null;
		this.errorMessage = null;

		if (this.timerInterval) clearInterval(this.timerInterval);

		// Animate smooth progress up to 90% while server converts
		this.timerInterval = setInterval(() => {
			if (this.progress < 90) {
				this.progress += Math.floor(Math.random() * 8) + 4;
				if (this.progress > 90) this.progress = 90;

				if (this.progress > 25 && this.progress <= 55) {
					this.statusText = `Codificando em MP3 com FFmpeg (${this.bitrate} kbps)...`;
				} else if (this.progress > 55) {
					this.statusText = this.enableTrim ? 'Aplicando corte preciso de áudio...' : 'Inserindo metadados e tags ID3...';
				}
			}
		}, 300);

		try {
			const response = await fetch('/api/convert', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					url: this.url,
					quality: this.bitrate,
					trimEnabled: this.enableTrim,
					startTime: this.startTime,
					endTime: this.endTime
				})
			});

			if (!response.ok) {
				const errJson = await response.json().catch(() => ({}));
				throw new Error(errJson.error || 'Falha na conversão do áudio');
			}

			const blob = await response.blob();
			const headerFilename = response.headers.get('X-Download-Filename');
			const cleanName = this.videoData.title.replace(/[^a-zA-Z0-9 _-]/g, '');
			const trimSuffix = this.enableTrim ? ' [Corte]' : '';
			const fallbackFileName = `${cleanName || 'Minuzzo_Audio'}${trimSuffix} (${this.bitrate}kbps).mp3`;

			this.downloadBlob = blob;
			this.downloadFileName = headerFilename ? decodeURIComponent(headerFilename) : fallbackFileName;

			clearInterval(this.timerInterval);
			this.progress = 100;
			this.status = 'completed';
			this.statusText = 'Conversão concluída! Clique para baixar o MP3.';

			// Auto trigger download for maximum speed
			this.downloadMp3();
		} catch (err: any) {
			clearInterval(this.timerInterval);
			console.error('Conversion error:', err);
			this.status = 'ready_to_convert';
			this.errorMessage = err.message || 'Ocorreu um erro durante a conversão do áudio.';
		}
	}

	downloadMp3() {
		if (!this.downloadBlob) return;

		const blobUrl = URL.createObjectURL(this.downloadBlob);
		const a = document.createElement('a');
		a.href = blobUrl;
		a.download = this.downloadFileName || 'Minuzzo_Audio.mp3';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
	}

	reset() {
		if (this.timerInterval) clearInterval(this.timerInterval);
		this.url = '';
		this.status = 'idle';
		this.errorMessage = null;
		this.videoData = null;
		this.progress = 0;
		this.statusText = '';
		this.bitrate = '128';
		this.enableTrim = false;
	}
}

export const converter = new ConverterState();
