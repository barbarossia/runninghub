"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import FolderSelector, {
	FolderInfo as FolderSelectorFolderInfo,
} from "@/components/folder/FolderSelector";

interface FolderSelectionLayoutProps {
	title: string;
	description: string;
	icon: LucideIcon;
	iconBgColor: string;
	iconColor: string;
	onFolderSelected: (folderInfo: FolderSelectorFolderInfo) => void;
	onError?: (error: string) => void;
	features?: ReactNode;
}

export function FolderSelectionLayout({
	title,
	description,
	icon: Icon,
	iconBgColor,
	iconColor,
	onFolderSelected,
	onError,
	features,
}: FolderSelectionLayoutProps) {
	return (
		<div className="space-y-8">
			<div className="text-center py-8">
				<div
					className={`${iconBgColor} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}
				>
					<Icon className={`w-8 h-8 ${iconColor}`} />
				</div>
				<h2 className="text-2xl font-semibold mb-2">{title}</h2>
				<p className="text-muted-foreground max-w-md mx-auto">{description}</p>
			</div>

			<FolderSelector onFolderSelected={onFolderSelected} onError={onError} />

			{features}
		</div>
	);
}
