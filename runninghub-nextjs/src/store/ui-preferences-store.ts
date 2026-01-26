import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiPreferencesState {
	toastsEnabled: boolean;
	setToastsEnabled: (enabled: boolean) => void;
	toggleToastsEnabled: () => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
	persist(
		(set) => ({
			toastsEnabled: true,
			setToastsEnabled: (enabled) => set({ toastsEnabled: enabled }),
			toggleToastsEnabled: () =>
				set((state) => ({ toastsEnabled: !state.toastsEnabled })),
		}),
		{
			name: "runninghub-ui-preferences",
			partialize: (state) => ({
				toastsEnabled: state.toastsEnabled,
			}),
		},
	),
);
