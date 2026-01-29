
import type { LocalWorkflowOperationType } from '@/types/workspace';

export type LocalOpInputType = 'text' | 'number' | 'boolean' | 'select' | 'file';

export interface LocalOpInputDefinition {
	name: string;
	label: string;
	type: LocalOpInputType;
	options?: { value: string | number; label: string }[];
	defaultValue?: string | number | boolean;
	description?: string;
	min?: number;
	max?: number;
	placeholder?: string;
	// Conditional visibility based on other config values
	showIf?: (config: Record<string, any>) => boolean;
}

export interface LocalOpDefinition {
	type: LocalWorkflowOperationType;
	label: string;
	description: string;
	inputs: LocalOpInputDefinition[];
}

export const LOCAL_OPS_DEFINITIONS: Record<LocalWorkflowOperationType, LocalOpDefinition> = {
	'video-convert': {
		type: 'video-convert',
		label: 'Convert Video (MP4)',
		description: 'Convert video to MP4 format with customizable quality and resizing.',
		inputs: [
			{
				name: 'targetFps',
				label: 'Target FPS',
				type: 'select',
				defaultValue: '30',
				options: [
					{ value: '16', label: '16 FPS' },
					{ value: '24', label: '24 FPS' },
					{ value: '25', label: '25 FPS' },
					{ value: '30', label: '30 FPS' },
					{ value: '60', label: '60 FPS' },
					{ value: 'custom', label: 'Custom' },
				],
			},
			{
				name: 'customFps',
				label: 'Custom FPS',
				type: 'number',
				defaultValue: 24,
				min: 1,
				max: 120,
				showIf: (config) => config.targetFps === 'custom',
			},
			{
				name: 'quality',
				label: 'Quality (CRF)',
				type: 'select',
				defaultValue: 'medium',
				options: [
					{ value: 'high', label: 'High (CRF 18)' },
					{ value: 'medium', label: 'Medium (CRF 20)' },
					{ value: 'low', label: 'Low (CRF 23)' },
					{ value: 'custom', label: 'Custom' },
				],
			},
			{
				name: 'customCrf',
				label: 'Custom CRF',
				type: 'number',
				defaultValue: 23,
				min: 0,
				max: 51,
				showIf: (config) => config.quality === 'custom',
			},
			{
				name: 'encodingPreset',
				label: 'Encoding Speed',
				type: 'select',
				defaultValue: 'medium',
				options: [
					{ value: 'faster', label: 'Faster' },
					{ value: 'fast', label: 'Fast' },
					{ value: 'medium', label: 'Medium' },
					{ value: 'slow', label: 'Slow' },
					{ value: 'slower', label: 'Slower' },
				],
			},
			{
				name: 'resizeEnabled',
				label: 'Enable Resize',
				type: 'boolean',
				defaultValue: false,
			},
			{
				name: 'resizeMode',
				label: 'Resize Mode',
				type: 'select',
				defaultValue: 'fit',
				options: [
					{ value: 'fit', label: 'Fit Within Target' },
					{ value: 'longest-side', label: 'Longest Side' },
					{ value: 'shortest-side', label: 'Shortest Side' },
				],
				showIf: (config) => config.resizeEnabled === true,
			},
			{
				name: 'resizePreset',
				label: 'Resolution Preset',
				type: 'select',
				defaultValue: '720x1280',
				options: [
					{ value: '720x1280', label: '720×1280 (Portrait HD)' },
					{ value: '1080x1920', label: '1080×1920 (Portrait FHD)' },
					{ value: '1280x720', label: '1280×720 (Landscape HD)' },
					{ value: '1920x1080', label: '1920×1080 (Landscape FHD)' },
					{ value: '1080x1080', label: '1080×1080 (Square)' },
					{ value: 'custom', label: 'Custom' },
				],
				showIf: (config) => config.resizeEnabled === true && config.resizeMode === 'fit',
			},
			{
				name: 'resizeWidth',
				label: 'Width (px)',
				type: 'number',
				showIf: (config) =>
					config.resizeEnabled === true &&
					config.resizeMode === 'fit' &&
					config.resizePreset === 'custom',
			},
			{
				name: 'resizeHeight',
				label: 'Height (px)',
				type: 'number',
				showIf: (config) =>
					config.resizeEnabled === true &&
					config.resizeMode === 'fit' &&
					config.resizePreset === 'custom',
			},
			{
				name: 'resizeLongestSide',
				label: 'Side Length (px)',
				type: 'number',
				defaultValue: 1280,
				showIf: (config) =>
					config.resizeEnabled === true &&
					(config.resizeMode === 'longest-side' || config.resizeMode === 'shortest-side'),
			},
			{
				name: 'outputSuffix',
				label: 'Output Suffix',
				type: 'text',
				defaultValue: '_converted',
				placeholder: '_converted',
			},
			{
				name: 'deleteOriginal',
				label: 'Delete Original',
				type: 'boolean',
				defaultValue: false,
				description: 'Permanently delete source file after conversion',
			},
		],
	},
	'video-fps-convert': {
		type: 'video-fps-convert',
		label: 'Convert FPS Only',
		description: 'Change video frame rate without re-encoding (if possible) or minimal re-encoding.',
		inputs: [
			{
				name: 'targetFps',
				label: 'Target FPS',
				type: 'select',
				defaultValue: '30',
				options: [
					{ value: '24', label: '24 FPS' },
					{ value: '30', label: '30 FPS' },
					{ value: '60', label: '60 FPS' },
				],
			},
			{
				name: 'outputSuffix',
				label: 'Output Suffix',
				type: 'text',
				defaultValue: '_fps',
			},
		],
	},
	'video-clip': {
		type: 'video-clip',
		label: 'Clip Video',
		description: 'Extract a segment from a video.',
		inputs: [
			{
				name: 'startTime',
				label: 'Start Time (sec)',
				type: 'number',
				defaultValue: 0,
				min: 0,
			},
			{
				name: 'endTime',
				label: 'End Time (sec)',
				type: 'number',
				defaultValue: 10,
				min: 0,
			},
			{
				name: 'outputSuffix',
				label: 'Output Suffix',
				type: 'text',
				defaultValue: '_clip',
			},
		],
	},
	'video-crop': {
		type: 'video-crop',
		label: 'Crop Video',
		description: 'Crop video to specific dimensions.',
		inputs: [
			{
				name: 'x',
				label: 'X (px)',
				type: 'number',
				defaultValue: 0,
			},
			{
				name: 'y',
				label: 'Y (px)',
				type: 'number',
				defaultValue: 0,
			},
			{
				name: 'width',
				label: 'Width (px)',
				type: 'number',
				defaultValue: 100,
			},
			{
				name: 'height',
				label: 'Height (px)',
				type: 'number',
				defaultValue: 100,
			},
			{
				name: 'outputSuffix',
				label: 'Output Suffix',
				type: 'text',
				defaultValue: '_crop',
			},
		],
	},
	'image-resize': {
		type: 'image-resize',
		label: 'Resize Image',
		description: 'Resize image dimensions.',
		inputs: [
			{
				name: 'width',
				label: 'Width (px)',
				type: 'number',
				defaultValue: 1024,
			},
			{
				name: 'height',
				label: 'Height (px)',
				type: 'number',
				defaultValue: 1024,
			},
			{
				name: 'maintainAspectRatio',
				label: 'Maintain Aspect Ratio',
				type: 'boolean',
				defaultValue: true,
			},
			{
				name: 'outputSuffix',
				label: 'Output Suffix',
				type: 'text',
				defaultValue: '_resized',
			},
		],
	},
	'duck-decode': {
		type: 'duck-decode',
		label: 'Duck Decode',
		description: 'Decode hidden content from duck-encoded images.',
		inputs: [
			{
				name: 'password',
				label: 'Password',
				type: 'text',
				placeholder: 'Optional password',
			},
			{
				name: 'outputSuffix',
				label: 'Output Suffix',
				type: 'text',
				defaultValue: '_decoded',
			},
		],
	},
	'caption': {
		type: 'caption',
		label: 'Generate Caption',
		description: 'Generate captions for images using AI.',
		inputs: [
			{
				name: 'model',
				label: 'Model',
				type: 'select',
				defaultValue: 'blip',
				options: [
					{ value: 'blip', label: 'BLIP' },
					{ value: 'git-large', label: 'GIT Large' },
				],
			},
		],
	},
};
