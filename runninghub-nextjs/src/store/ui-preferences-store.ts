import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiPreferencesState {
	toastsEnabled: boolean;
	aspectToolCollapsed: boolean;
	setToastsEnabled: (enabled: boolean) => void;
	toggleToastsEnabled: () => void;
	setAspectToolCollapsed: (collapsed: boolean) => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
	persist(
		(set) => ({
			toastsEnabled: true,
			aspectToolCollapsed: false,
			setToastsEnabled: (enabled) => set({ toastsEnabled: enabled }),
			toggleToastsEnabled: () =>
				set((state) => ({ toastsEnabled: !state.toastsEnabled })),
			setAspectToolCollapsed: (collapsed) =>
				set({ aspectToolCollapsed: collapsed }),
		}),
		{
			name: "runninghub-ui-preferences",
			partialize: (state) => ({
				toastsEnabled: state.toastsEnabled,
				aspectToolCollapsed: state.aspectToolCollapsed,
			}),
		},
	),
);
