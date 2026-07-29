export type ConversionState = 'idle' | 'fetching' | 'ready_to_convert' | 'converting' | 'completed' | 'error';

export type BitrateOption = '128' | '192' | '320';

export interface VideoMetadata {
	id: string;
	title: string;
	channel: string;
	duration: number; // in seconds
	durationFormatted: string;
	thumbnail: string;
	views?: string;
	published?: string;
}

export interface PresetVideo {
	label: string;
	url: string;
	metadata: VideoMetadata;
}

export interface ConversionOptions {
	bitrate: BitrateOption;
	enableTrim: boolean;
	startTime: string; // "00:00:00"
	endTime: string;   // "00:03:45"
	startSeconds: number;
	endSeconds: number;
}
