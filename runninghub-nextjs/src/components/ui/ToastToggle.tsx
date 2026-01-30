"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiPreferencesStore } from "@/store/ui-preferences-store";

export function ToastToggle() {
	const { toastsEnabled, toggleToastsEnabled } = useUiPreferencesStore();
	const label = toastsEnabled
		? "Disable toast notifications"
		: "Enable toast notifications";

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleToastsEnabled}
			aria-label={label}
			title={label}
		>
			{toastsEnabled ? (
				<Bell className="h-4 w-4" />
			) : (
				<BellOff className="h-4 w-4" />
			)}
		</Button>
	);
}
