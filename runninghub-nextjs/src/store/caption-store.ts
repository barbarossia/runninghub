import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
	CaptionMode,
	ResizeMode,
	AspectRatioStrategy,
	RenamePattern,
	OutputFormat,
} from "@/types/caption";

// Default configurations
const DEFAULT_AI_CAPTION_CONFIG = {
	workflowId: "",
	mode: "generate" as CaptionMode,
	language: "en" as "en" | "zh" | "both",
};

const DEFAULT_RESIZE_CONFIG = {
	mode: "percentage" as ResizeMode,
	width: undefined as number | undefined,
	height: undefined as number | undefined,
	percentage: 100,
	aspectRatioStrategy: "fit" as AspectRatioStrategy,
	outputSuffix: "_resized",
	deleteOriginal: false,
};

const DEFAULT_RENAME_CONFIG = {
	pattern: "prefix-sequence" as RenamePattern,
	prefix: "photo",
	suffix: "_",
	startNumber: 1,
	padding: 3,
	template: "{original}_{index:03d}",
	preserveExtension: true,
};

const DEFAULT_CONVERT_CONFIG = {
	outputFormat: "jpg" as OutputFormat,
	quality: 90,
	lossless: false,
	outputSuffix: "",
	deleteOriginal: false,
};

interface CaptionStoreState {
	// AI Caption config
	aiCaptionWorkflowId: string;
	aiCaptionMode: CaptionMode;
	aiCaptionLanguage: "en" | "zh" | "both";

	// Resize config
	resizeMode: ResizeMode;
	resizeWidth: number | undefined;
	resizeHeight: number | undefined;
	resizePercentage: number;
	resizeAspectRatioStrategy: AspectRatioStrategy;
	resizeOutputSuffix: string;
	resizeDeleteOriginal: boolean;

	// Rename config
	renamePattern: RenamePattern;
	renamePrefix: string;
	renameSuffix: string;
	renameStartNumber: number;
	renamePadding: number;
	renameTemplate: string;
	renamePreserveExtension: boolean;

	// Convert config
	convertOutputFormat: OutputFormat;
	convertQuality: number;
	convertLossless: boolean;
	convertOutputSuffix: string;
	convertDeleteOriginal: boolean;

	// Active operation
	activeOperation: "ai-caption" | "resize" | "rename" | "convert" | null;
}

interface CaptionStoreActions extends CaptionStoreState {
	// AI Caption actions
	setAICaptionWorkflowId: (id: string) => void;
	setAICaptionMode: (mode: CaptionMode) => void;
	setAICaptionLanguage: (language: "en" | "zh" | "both") => void;

	// Resize actions
	setResizeMode: (mode: ResizeMode) => void;
	setResizeDimensions: (dims: { width?: number; height?: number }) => void;
	setResizePercentage: (percentage: number) => void;
	setResizeAspectRatioStrategy: (strategy: AspectRatioStrategy) => void;
	setResizeOutputSuffix: (suffix: string) => void;
	toggleResizeDeleteOriginal: () => void;

	// Rename actions
	setRenamePattern: (pattern: RenamePattern) => void;
	setRenamePrefix: (prefix: string) => void;
	setRenameSuffix: (suffix: string) => void;
	setRenameStartNumber: (num: number) => void;
	setRenamePadding: (padding: number) => void;
	setRenameTemplate: (template: string) => void;
	toggleRenamePreserveExtension: () => void;

	// Convert actions
	setConvertOutputFormat: (format: OutputFormat) => void;
	setConvertQuality: (quality: number) => void;
	setConvertLossless: (lossless: boolean) => void;
	setConvertOutputSuffix: (suffix: string) => void;
	toggleConvertDeleteOriginal: () => void;

	// Active operation
	setActiveOperation: (op: CaptionStoreState["activeOperation"]) => void;

	// Reset
	resetAllConfigs: () => void;
}

export const useCaptionStore = create<CaptionStoreActions>()(
	persist(
		(set) => ({
			// Initial state
			aiCaptionWorkflowId: DEFAULT_AI_CAPTION_CONFIG.workflowId,
			aiCaptionMode: DEFAULT_AI_CAPTION_CONFIG.mode,
			aiCaptionLanguage: DEFAULT_AI_CAPTION_CONFIG.language,

			resizeMode: DEFAULT_RESIZE_CONFIG.mode,
			resizeWidth: DEFAULT_RESIZE_CONFIG.width,
			resizeHeight: DEFAULT_RESIZE_CONFIG.height,
			resizePercentage: DEFAULT_RESIZE_CONFIG.percentage,
			resizeAspectRatioStrategy: DEFAULT_RESIZE_CONFIG.aspectRatioStrategy,
			resizeOutputSuffix: DEFAULT_RESIZE_CONFIG.outputSuffix,
			resizeDeleteOriginal: DEFAULT_RESIZE_CONFIG.deleteOriginal,

			renamePattern: DEFAULT_RENAME_CONFIG.pattern,
			renamePrefix: DEFAULT_RENAME_CONFIG.prefix,
			renameSuffix: DEFAULT_RENAME_CONFIG.suffix,
			renameStartNumber: DEFAULT_RENAME_CONFIG.startNumber,
			renamePadding: DEFAULT_RENAME_CONFIG.padding,
			renameTemplate: DEFAULT_RENAME_CONFIG.template,
			renamePreserveExtension: DEFAULT_RENAME_CONFIG.preserveExtension,

			convertOutputFormat: DEFAULT_CONVERT_CONFIG.outputFormat,
			convertQuality: DEFAULT_CONVERT_CONFIG.quality,
			convertLossless: DEFAULT_CONVERT_CONFIG.lossless,
			convertOutputSuffix: DEFAULT_CONVERT_CONFIG.outputSuffix,
			convertDeleteOriginal: DEFAULT_CONVERT_CONFIG.deleteOriginal,

			activeOperation: null,

			// AI Caption actions
			setAICaptionWorkflowId: (id) => set({ aiCaptionWorkflowId: id }),
			setAICaptionMode: (mode) => set({ aiCaptionMode: mode }),
			setAICaptionLanguage: (language) => set({ aiCaptionLanguage: language }),

			// Resize actions
			setResizeMode: (mode) => set({ resizeMode: mode }),
			setResizeDimensions: (dims) =>
				set((state) => ({
					resizeWidth: dims.width ?? state.resizeWidth,
					resizeHeight: dims.height ?? state.resizeHeight,
				})),
			setResizePercentage: (percentage) =>
				set({ resizePercentage: percentage }),
			setResizeAspectRatioStrategy: (strategy) =>
				set({ resizeAspectRatioStrategy: strategy }),
			setResizeOutputSuffix: (suffix) => set({ resizeOutputSuffix: suffix }),
			toggleResizeDeleteOriginal: () =>
				set((state) => ({ resizeDeleteOriginal: !state.resizeDeleteOriginal })),

			// Rename actions
			setRenamePattern: (pattern) => set({ renamePattern: pattern }),
			setRenamePrefix: (prefix) => set({ renamePrefix: prefix }),
			setRenameSuffix: (suffix) => set({ renameSuffix: suffix }),
			setRenameStartNumber: (num) => set({ renameStartNumber: num }),
			setRenamePadding: (padding) => set({ renamePadding: padding }),
			setRenameTemplate: (template) => set({ renameTemplate: template }),
			toggleRenamePreserveExtension: () =>
				set((state) => ({
					renamePreserveExtension: !state.renamePreserveExtension,
				})),

			// Convert actions
			setConvertOutputFormat: (format) => set({ convertOutputFormat: format }),
			setConvertQuality: (quality) => set({ convertQuality: quality }),
			setConvertLossless: (lossless) => set({ convertLossless: lossless }),
			setConvertOutputSuffix: (suffix) => set({ convertOutputSuffix: suffix }),
			toggleConvertDeleteOriginal: () =>
				set((state) => ({
					convertDeleteOriginal: !state.convertDeleteOriginal,
				})),

			// Active operation
			setActiveOperation: (op) => set({ activeOperation: op }),

			// Reset
			resetAllConfigs: () =>
				set({
					aiCaptionWorkflowId: DEFAULT_AI_CAPTION_CONFIG.workflowId,
					aiCaptionMode: DEFAULT_AI_CAPTION_CONFIG.mode,
					aiCaptionLanguage: DEFAULT_AI_CAPTION_CONFIG.language,
					resizeMode: DEFAULT_RESIZE_CONFIG.mode,
					resizeWidth: DEFAULT_RESIZE_CONFIG.width,
					resizeHeight: DEFAULT_RESIZE_CONFIG.height,
					resizePercentage: DEFAULT_RESIZE_CONFIG.percentage,
					resizeAspectRatioStrategy: DEFAULT_RESIZE_CONFIG.aspectRatioStrategy,
					resizeOutputSuffix: DEFAULT_RESIZE_CONFIG.outputSuffix,
					resizeDeleteOriginal: DEFAULT_RESIZE_CONFIG.deleteOriginal,
					renamePattern: DEFAULT_RENAME_CONFIG.pattern,
					renamePrefix: DEFAULT_RENAME_CONFIG.prefix,
					renameSuffix: DEFAULT_RENAME_CONFIG.suffix,
					renameStartNumber: DEFAULT_RENAME_CONFIG.startNumber,
					renamePadding: DEFAULT_RENAME_CONFIG.padding,
					renameTemplate: DEFAULT_RENAME_CONFIG.template,
					renamePreserveExtension: DEFAULT_RENAME_CONFIG.preserveExtension,
					convertOutputFormat: DEFAULT_CONVERT_CONFIG.outputFormat,
					convertQuality: DEFAULT_CONVERT_CONFIG.quality,
					convertLossless: DEFAULT_CONVERT_CONFIG.lossless,
					convertOutputSuffix: DEFAULT_CONVERT_CONFIG.outputSuffix,
					convertDeleteOriginal: DEFAULT_CONVERT_CONFIG.deleteOriginal,
					activeOperation: null,
				}),
		}),
		{
			name: "runninghub-caption-storage",
			partialize: (state) => ({
				aiCaptionWorkflowId: state.aiCaptionWorkflowId,
				aiCaptionMode: state.aiCaptionMode,
				aiCaptionLanguage: state.aiCaptionLanguage,
				resizeMode: state.resizeMode,
				resizeWidth: state.resizeWidth,
				resizeHeight: state.resizeHeight,
				resizePercentage: state.resizePercentage,
				resizeAspectRatioStrategy: state.resizeAspectRatioStrategy,
				resizeOutputSuffix: state.resizeOutputSuffix,
				resizeDeleteOriginal: state.resizeDeleteOriginal,
				renamePattern: state.renamePattern,
				renamePrefix: state.renamePrefix,
				renameSuffix: state.renameSuffix,
				renameStartNumber: state.renameStartNumber,
				renamePadding: state.renamePadding,
				renameTemplate: state.renameTemplate,
				renamePreserveExtension: state.renamePreserveExtension,
				convertOutputFormat: state.convertOutputFormat,
				convertQuality: state.convertQuality,
				convertLossless: state.convertLossless,
				convertOutputSuffix: state.convertOutputSuffix,
				convertDeleteOriginal: state.convertDeleteOriginal,
			}),
		},
	),
);

// Export type for TypeScript
export type { CaptionStoreActions, CaptionStoreState };
