"use client";

import { Toaster } from "@/components/ui/sonner";
import { useUiPreferencesStore } from "@/store/ui-preferences-store";

export function ToastGate() {
	const toastsEnabled = useUiPreferencesStore(
		(state) => state.toastsEnabled,
	);

	if (!toastsEnabled) return null;

	return <Toaster />;
}
