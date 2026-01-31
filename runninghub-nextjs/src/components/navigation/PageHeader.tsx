"use client";

import React from "react";
import Link from "next/link";
import {
	ArrowLeft,
	Calculator,
	Home,
	LucideIcon,
	MessageSquare,
} from "lucide-react";
import { useMessageCenterStore } from "@/store/message-center-store";
import { useUiPreferencesStore } from "@/store/ui-preferences-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ToastToggle } from "@/components/ui/ToastToggle";
import { cn } from "@/lib/utils";

type ColorVariant = "blue" | "purple" | "green";

interface PageHeaderProps {
	/** Page title */
	title?: string;
	/** Page description */
	description?: string;
	/** Icon to display in badge */
	icon?: LucideIcon;
	/** Badge text */
	badgeText?: string;
	/** Whether to show Back to Selection button */
	showBackButton?: boolean;
	/** Back button click handler */
	onBackClick?: () => void;
	/** Color variant for theme */
	colorVariant?: ColorVariant;
	/** Additional className */
	className?: string;
}

const COLOR_STYLES = {
	blue: {
		backButton: "border-blue-300 text-blue-700 hover:bg-blue-50",
	},
	purple: {
		backButton: "border-purple-300 text-purple-700 hover:bg-purple-50",
	},
	green: {
		backButton: "border-green-300 text-green-700 hover:bg-green-50",
	},
} as const;

export function PageHeader({
	title,
	description,
	icon: Icon,
	badgeText,
	showBackButton = false,
	onBackClick,
	colorVariant = "blue",
	className = "",
}: PageHeaderProps) {
	const colors = COLOR_STYLES[colorVariant];
	const { aspectToolCollapsed, setAspectToolCollapsed } =
		useUiPreferencesStore();
	const { isOpen, dismissedJobIds, readJobIds, setOpen } =
		useMessageCenterStore();
	const jobs = useWorkspaceStore((state) => state.jobs);

	const unreadCount = React.useMemo(() => {
		if (jobs.length === 0) return 0;
		const dismissedSet = new Set(dismissedJobIds);
		const readSet = new Set(readJobIds);
		return jobs.filter(
			(job) => !dismissedSet.has(job.id) && !readSet.has(job.id),
		).length;
	}, [jobs, dismissedJobIds, readJobIds]);

	return (
		<div className={cn("flex items-center justify-between mb-8", className)}>
			{/* Left side: Navigation buttons and optional title */}
			<div className="flex items-center gap-4">
				{/* Home button - always visible */}
				<Link href="/">
					<Button variant="ghost" size="sm">
						<Home className="h-4 w-4 mr-2" />
						Home
					</Button>
				</Link>

				{/* Back to Selection button - conditional */}
				{showBackButton && onBackClick && (
					<Button
						variant="outline"
						size="sm"
						onClick={onBackClick}
						className={colors.backButton}
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Selection
					</Button>
				)}

				{/* Optional title and description */}
				{title && (
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{title}</h1>
						{description && (
							<p className="text-sm text-gray-600 mt-1">{description}</p>
						)}
					</div>
				)}
			</div>

			{/* Right side: Badge and ThemeToggle */}
			<div className="flex items-center gap-2">
				{badgeText && Icon && (
					<Badge variant="secondary" className="text-xs">
						<Icon className="h-3 w-3 mr-1" />
						{badgeText}
					</Badge>
				)}
				<ThemeToggle />
				<ToastToggle />
				{!isOpen && (
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setOpen(true)}
						aria-label="Open message center"
						title="Open message center"
						className="relative"
					>
						<MessageSquare className="h-4 w-4" />
						{unreadCount > 0 && (
							<span className="absolute -right-1 -top-1 min-w-[16px] rounded-full bg-blue-600 px-1 text-[10px] leading-4 text-white">
								{unreadCount}
							</span>
						)}
					</Button>
				)}
				{aspectToolCollapsed && (
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setAspectToolCollapsed(false)}
						aria-label="Open aspect ratio tool"
						title="Open aspect ratio tool"
					>
						<Calculator className="h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
}
