import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ClipMode, VideoClipConfig } from "@/types/video-clip";
import { DEFAULT_CLIP_CONFIG } from "@/constants";

interface VideoClipState {
	// Configuration
	clipConfig: VideoClipConfig;

	// Actions
	setClipConfig: (config: VideoClipConfig) => void;
	setClipMode: (mode: ClipMode) => void;
	setImageFormat: (format: "png" | "jpg") => void;
	setQuality: (quality: number) => void;
	setFrameCount: (count: number) => void;
	setIntervalSeconds: (seconds: number) => void;
	setIntervalFrames: (frames: number) => void;
	toggleOrganizeByVideo: () => void;
	toggleDeleteOriginal: () => void;
	toggleSaveToWorkspace: () => void;

	// Reset
	resetConfig: () => void;
}

export const useVideoClipStore = create<VideoClipState>()(
	persist(
		(set) => ({
			// Initial state
			clipConfig: DEFAULT_CLIP_CONFIG,

			// Setters
			setClipConfig: (config) => set({ clipConfig: config }),

			setClipMode: (mode) =>
				set((state) => ({
					clipConfig: { ...state.clipConfig, mode },
				})),

			setImageFormat: (format) =>
				set((state) => ({
					clipConfig: { ...state.clipConfig, imageFormat: format },
				})),

			setQuality: (quality) =>
				set((state) => ({
					clipConfig: { ...state.clipConfig, quality },
				})),

			setFrameCount: (count) =>
				set((state) => ({
					clipConfig: { ...state.clipConfig, frameCount: count },
				})),

			setIntervalSeconds: (seconds) =>
				set((state) => ({
					clipConfig: { ...state.clipConfig, intervalSeconds: seconds },
				})),

			setIntervalFrames: (frames) =>
				set((state) => ({
					clipConfig: { ...state.clipConfig, intervalFrames: frames },
				})),

			toggleOrganizeByVideo: () =>
				set((state) => ({
					clipConfig: {
						...state.clipConfig,
						organizeByVideo: !state.clipConfig.organizeByVideo,
					},
				})),

			toggleDeleteOriginal: () =>
				set((state) => ({
					clipConfig: {
						...state.clipConfig,
						deleteOriginal: !state.clipConfig.deleteOriginal,
					},
				})),
			toggleSaveToWorkspace: () =>
				set((state) => {
					const newSaveToWorkspace = !state.clipConfig.saveToWorkspace;
					return {
						clipConfig: {
							...state.clipConfig,
							saveToWorkspace: newSaveToWorkspace,
							// If we are enabling saveToWorkspace, disable organizeByVideo to ensure mutual exclusivity
							organizeByVideo: newSaveToWorkspace
								? false
								: state.clipConfig.organizeByVideo,
						},
					};
				}),

			// Reset
			resetConfig: () => set({ clipConfig: DEFAULT_CLIP_CONFIG }),
		}),
		{
			name: "runninghub-video-clip-storage",
			partialize: (state) => ({
				clipConfig: state.clipConfig,
			}),
		},
	),
);
