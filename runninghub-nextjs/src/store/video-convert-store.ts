import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FpsOption = 16 | 24 | 25 | 30 | 60 | "custom";
export type QualityPreset = "high" | "medium" | "low" | "custom";
export type EncodingPreset = "faster" | "fast" | "medium" | "slow" | "slower";

export interface VideoConvertConfig {
	targetFps: FpsOption;
	customFps: number;
	outputSuffix: string;
	quality: QualityPreset;
	customCrf: number;
	encodingPreset: EncodingPreset;
	deleteOriginal: boolean;
}

const DEFAULT_CONVERT_CONFIG: VideoConvertConfig = {
	targetFps: 16,
	customFps: 24,
	outputSuffix: "_converted",
	quality: "medium",
	customCrf: 20,
	encodingPreset: "slow",
	deleteOriginal: false,
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
