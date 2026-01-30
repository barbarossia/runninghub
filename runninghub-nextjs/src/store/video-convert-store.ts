import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FpsOption = 16 | 24 | 25 | 30 | 60 | "custom";
export type QualityPreset = "high" | "medium" | "low" | "custom";
export type EncodingPreset = "faster" | "fast" | "medium" | "slow" | "slower";
export type ResizePreset =
	| "720x1280"
	| "1080x1920"
	| "1280x720"
	| "1920x1080"
	| "1080x1080"
	| "custom";
export type ResizeMode = "fit" | "longest-side" | "shortest-side";

export interface VideoConvertConfig {
	targetFps: FpsOption;
	customFps: number;
	outputSuffix: string;
	quality: QualityPreset;
	customCrf: number;
	encodingPreset: EncodingPreset;
	deleteOriginal: boolean;
	resizeEnabled: boolean;
	resizeMode: ResizeMode;
	resizePreset: ResizePreset;
	resizeWidth: string;
	resizeHeight: string;
	resizeLongestSide: string;
}

const DEFAULT_CONVERT_CONFIG: VideoConvertConfig = {
	targetFps: 16,
	customFps: 24,
	outputSuffix: "_converted",
	quality: "medium",
	customCrf: 20,
	encodingPreset: "slow",
	deleteOriginal: false,
	resizeEnabled: false,
	resizeMode: "fit",
	resizePreset: "720x1280",
	resizeWidth: "720",
	resizeHeight: "1280",
	resizeLongestSide: "1280",
};

interface VideoConvertState {
	convertConfig: VideoConvertConfig;
	setTargetFps: (fps: FpsOption) => void;
	setCustomFps: (fps: number) => void;
	setOutputSuffix: (suffix: string) => void;
	setQuality: (quality: QualityPreset) => void;
	setCustomCrf: (crf: number) => void;
	setEncodingPreset: (preset: EncodingPreset) => void;
	toggleDeleteOriginal: () => void;
	setDeleteOriginal: (value: boolean) => void;
	setResizeEnabled: (enabled: boolean) => void;
	setResizeMode: (mode: ResizeMode) => void;
	setResizePreset: (preset: ResizePreset) => void;
	setResizeWidth: (width: string) => void;
	setResizeHeight: (height: string) => void;
	setResizeLongestSide: (value: string) => void;
	resetConfig: () => void;
}

// CRF values for quality presets
export const QUALITY_CRF: Record<QualityPreset, number> = {
	high: 18,
	medium: 20,
	low: 23,
	custom: 20,
};

export const useVideoConvertStore = create<VideoConvertState>()(
	persist(
		(set) => ({
			convertConfig: DEFAULT_CONVERT_CONFIG,

			setTargetFps: (fps) =>
				set((state) => ({
					convertConfig: { ...state.convertConfig, targetFps: fps },
				})),

			setCustomFps: (fps) =>
				set((state) => ({
					convertConfig: { ...state.convertConfig, customFps: fps },
				})),

			setOutputSuffix: (suffix) =>
				set((state) => ({
					convertConfig: { ...state.convertConfig, outputSuffix: suffix },
				})),

			setQuality: (quality) =>
				set((state) => ({
					convertConfig: {
						...state.convertConfig,
						quality,
						customCrf:
							quality === "custom"
								? state.convertConfig.customCrf
								: QUALITY_CRF[quality],
					},
				})),

			setCustomCrf: (crf) =>
				set((state) => ({
					convertConfig: { ...state.convertConfig, customCrf: crf },
				})),

			setEncodingPreset: (preset) =>
				set((state) => ({
					convertConfig: { ...state.convertConfig, encodingPreset: preset },
				})),

			toggleDeleteOriginal: () =>
				set((state) => ({
					convertConfig: {
						...state.convertConfig,
						deleteOriginal: !state.convertConfig.deleteOriginal,
					},
				})),

			setDeleteOriginal: (value) =>
				set((state) => ({
					convertConfig: {
						...state.convertConfig,
						deleteOriginal: value,
					},
				})),

			setResizeEnabled: (enabled) =>
				set((state) => ({
					convertConfig: {
						...state.convertConfig,
						resizeEnabled: enabled,
					},
				})),

			setResizeMode: (mode) =>
				set((state) => ({
					convertConfig: {
						...state.convertConfig,
						resizeMode: mode,
					},
				})),

			setResizePreset: (preset) =>
				set((state) => {
					let resizeWidth = state.convertConfig.resizeWidth;
					let resizeHeight = state.convertConfig.resizeHeight;

					if (preset !== "custom") {
						const [width, height] = preset
							.split("x")
							.map((value) => value.trim());
						resizeWidth = width || resizeWidth;
						resizeHeight = height || resizeHeight;
					}

					return {
						convertConfig: {
							...state.convertConfig,
							resizePreset: preset,
							resizeWidth,
							resizeHeight,
						},
					};
				}),

			setResizeWidth: (width) =>
				set((state) => ({
					convertConfig: { ...state.convertConfig, resizeWidth: width },
				})),

			setResizeHeight: (height) =>
				set((state) => ({
					convertConfig: { ...state.convertConfig, resizeHeight: height },
				})),

			setResizeLongestSide: (value) =>
				set((state) => ({
					convertConfig: { ...state.convertConfig, resizeLongestSide: value },
				})),

			resetConfig: () => set({ convertConfig: DEFAULT_CONVERT_CONFIG }),
		}),
		{
			name: "runninghub-video-convert-storage",
			partialize: (state) => ({
				convertConfig: state.convertConfig,
			}),
		},
	),
);
