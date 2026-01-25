import { CropMode } from "@/types/crop";

export interface CropFilterParams {
	mode: CropMode;
	width?: string;
	height?: string;
	x?: string;
	y?: string;
}

/**
 * Validates custom crop dimensions
 * @param config - Crop configuration with dimensions as percentages
 * @returns Validation result with valid flag and optional error message
 */
export function validateCropConfig(config: {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
}): { valid: boolean; error?: string } {
	const { x = 0, y = 0, width = 50, height = 100 } = config;

	if (x < 0 || x > 100) {
		return { valid: false, error: "X position must be between 0% and 100%" };
	}

	if (y < 0 || y > 100) {
		return { valid: false, error: "Y position must be between 0% and 100%" };
	}

	if (width <= 0 || width > 100) {
		return { valid: false, error: "Width must be between 0% and 100%" };
	}

	if (height <= 0 || height > 100) {
		return { valid: false, error: "Height must be between 0% and 100%" };
	}

	if (x + width > 100) {
		return { valid: false, error: "X position + Width cannot exceed 100%" };
	}

	if (y + height > 100) {
		return { valid: false, error: "Y position + Height cannot exceed 100%" };
	}

	return { valid: true };
}

/**
 * Converts percentage to FFmpeg expression
 * @param percentage - Value between 0 and 100
 * @returns FFmpeg expression (e.g., "iw*0.5" for 50%)
 */
function percentageToFfmpeg(percentage: number): string {
	return `iw*${percentage / 100}`;
}

/**
 * Converts percentage to FFmpeg expression for height
 * @param percentage - Value between 0 and 100
 * @returns FFmpeg expression (e.g., "ih*0.5" for 50%)
 */
function percentageToFfmpegHeight(percentage: number): string {
	return `ih*${percentage / 100}`;
}

/**
 * Builds FFmpeg crop filter based on crop mode and parameters
 * @param params - Crop filter parameters
 * @returns FFmpeg filter_complex string
 */
export function buildCropFilter(params: CropFilterParams): string {
	const { mode } = params;

	switch (mode) {
		case "left":
			// Left half: width=iw/2, height=ih, x=0, y=0
			return "[0:v]crop=iw/2:ih:0:0[left];[left]scale=iw:-2";

		case "right":
			// Right half: width=iw/2, height=ih, x=iw/2, y=0
			return "[0:v]crop=iw/2:ih:iw/2:0[right];[right]scale=iw:-2";

		case "center":
			// Center crop: maintain aspect ratio, crop to largest square
			// crop=w:h:x:y where w and h are the smaller dimension, centered
			return "[0:v]crop=min(iw,ih):min(iw,ih):(iw-min(iw,ih))/2:(ih-min(iw,ih))/2,scale=iw:-2[center]";

		case "custom":
			// Custom dimensions
			const w = params.width || "iw/2";
			const h = params.height || "ih";
			const x = params.x || "0";
			const y = params.y || "0";
			return `[0:v]crop=${w}:${h}:${x}:${y}[custom];[custom]scale=iw:-2`;

		default:
			throw new Error(`Invalid crop mode: ${mode}`);
	}
}

/**
 * Converts percentage-based custom config to FFmpeg expressions
 * @param config - Custom crop configuration with percentages
 * @returns FFmpeg-compatible parameter objects
 */
export function buildCustomCropParams(config: {
	customWidth?: number;
	customHeight?: number;
	customX?: number;
	customY?: number;
}): { width?: string; height?: string; x?: string; y?: string } {
	const params: { width?: string; height?: string; x?: string; y?: string } =
		{};

	if (config.customWidth !== undefined) {
		params.width = percentageToFfmpeg(config.customWidth);
	}

	if (config.customHeight !== undefined) {
		params.height = percentageToFfmpegHeight(config.customHeight);
	}

	if (config.customX !== undefined) {
		params.x = percentageToFfmpeg(config.customX);
	}

	if (config.customY !== undefined) {
		params.y = percentageToFfmpegHeight(config.customY);
	}

	return params;
}

/**
 * Builds full FFmpeg command arguments for video cropping
 * @param inputPath - Input video file path
 * @param cropFilter - FFmpeg crop filter string
 * @param outputPath - Output video file path
 * @param preserveAudio - Whether to preserve audio (default: false)
 * @returns Array of FFmpeg command arguments
 */
export function buildFFmpegArgs(
	inputPath: string,
	cropFilter: string,
	outputPath: string,
	preserveAudio: boolean = false,
): string[] {
	const args = ["-i", inputPath, "-filter_complex", cropFilter, "-map"];

	// Check if filter has labeled outputs (e.g., [left], [center])
	if (cropFilter.includes("[") && cropFilter.match(/\`[a-z]+\`(?=;|$)/)) {
		// Extract the output label from the filter
		const labelMatch = cropFilter.match(/\`[a-z]+\`(?=;|$)/);
		if (labelMatch) {
			args.push(labelMatch[0]); // Use the labeled output
		} else {
			args.push("0:v"); // Fallback to video stream
		}
	} else {
		args.push("0:v"); // Use the first video stream
	}

	if (preserveAudio) {
		args.push("-c:a", "copy"); // Copy audio stream without re-encoding
		args.push("-map", "0:a?"); // Map audio stream if present
	} else {
		args.push("-an"); // Remove audio
	}

	args.push("-y", outputPath);
	return args;
}
