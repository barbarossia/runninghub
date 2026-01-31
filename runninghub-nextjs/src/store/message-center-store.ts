import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JobStatus } from "@/types/workspace";

export type MessageCenterDockMode = "dock" | "float";

interface MessageCenterState {
	isOpen: boolean;
	dockMode: MessageCenterDockMode;
	dismissedJobIds: string[];
	readJobIds: string[];
	seenStatuses: Record<string, JobStatus>;

	setOpen: (open: boolean) => void;
	toggleOpen: () => void;
	setDockMode: (mode: MessageCenterDockMode) => void;
	toggleDockMode: () => void;
	markRead: (jobIds: string[]) => void;
	dismissJob: (jobId: string) => void;
	dismissJobs: (jobIds: string[]) => void;
	clearDismissed: () => void;
	syncJobStatus: (jobId: string, status: JobStatus) => void;
}

export const useMessageCenterStore = create<MessageCenterState>()(
	persist(
		(set, get) => ({
			isOpen: false,
			dockMode: "dock",
			dismissedJobIds: [],
			readJobIds: [],
			seenStatuses: {},

			setOpen: (open) => set({ isOpen: open }),
			toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
			setDockMode: (mode) => set({ dockMode: mode }),
			toggleDockMode: () =>
				set((state) => ({
					dockMode: state.dockMode === "dock" ? "float" : "dock",
				})),
			markRead: (jobIds) =>
				set((state) => {
					if (jobIds.length === 0) return state;
					const nextRead = new Set(state.readJobIds);
					jobIds.forEach((id) => nextRead.add(id));
					return { readJobIds: Array.from(nextRead) };
				}),
			dismissJob: (jobId) =>
				set((state) => {
					if (state.dismissedJobIds.includes(jobId)) return state;
					return {
						dismissedJobIds: [...state.dismissedJobIds, jobId],
					};
				}),
			dismissJobs: (jobIds) =>
				set((state) => {
					if (jobIds.length === 0) return state;
					const nextDismissed = new Set(state.dismissedJobIds);
					jobIds.forEach((id) => nextDismissed.add(id));
					return { dismissedJobIds: Array.from(nextDismissed) };
				}),
			clearDismissed: () => set({ dismissedJobIds: [] }),
			syncJobStatus: (jobId, status) => {
				const state = get();
				const previousStatus = state.seenStatuses[jobId];
				if (previousStatus === status) {
					return;
				}
				const nextStatuses = { ...state.seenStatuses, [jobId]: status };
				const nextRead = new Set(state.readJobIds);
				nextRead.delete(jobId);
				set({
					seenStatuses: nextStatuses,
					readJobIds: Array.from(nextRead),
				});
			},
		}),
		{
			name: "runninghub-message-center",
			partialize: (state) => ({
				isOpen: state.isOpen,
				dockMode: state.dockMode,
				dismissedJobIds: state.dismissedJobIds,
				readJobIds: state.readJobIds,
				seenStatuses: state.seenStatuses,
			}),
		},
	),
);
