"use client";

import React from "react";
import Link from "next/link";
import { Home, ArrowLeft, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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
			</div>
		</div>
	);
}
