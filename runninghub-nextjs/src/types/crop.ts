export type CropMode =
	| "left"
	| "right"
	| "center"
	| "top"
	| "bottom"
	| "custom";

export interface CropConfig {
	mode: CropMode;
	customWidth?: string;
	customHeight?: string;
	customX?: string;
	customY?: string;
	outputSuffix?: string;
	preserveAudio?: boolean;
}

export interface CropRequest {
	videos: string[];
	crop_config: {
		mode: CropMode;
		width?: string;
		height?: string;
		x?: string;
		y?: string;
	};
	output_suffix?: string;
	preserve_audio?: boolean;
	timeout?: number;
}

export interface CropResponse {
	success: boolean;
	task_id?: string;
	message?: string;
	video_count?: number;
	error?: string;
}
