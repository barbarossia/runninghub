/**
 * Workspace Toolbar Component
 * Toolbar for batch operations on workspace files
 */

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Trash2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { toast } from "sonner";

interface WorkspaceToolbarProps {
	onProcessSelected?: (fileIds: string[]) => void;
	onClearAll?: () => void;
}

export function WorkspaceToolbar({
	onProcessSelected,
	onClearAll,
}: WorkspaceToolbarProps) {
	const { uploadedFiles, selectedFiles, isProcessing, toggleFileSelection } =
		useWorkspaceStore();

	const selectedCount = selectedFiles.size;
	const totalCount = uploadedFiles.length;

	const handleSelectAll = () => {
		const allSelected = selectedCount === totalCount;
		if (allSelected) {
			// Deselect all
			uploadedFiles.forEach((file) => {
				if (selectedFiles.has(file.id)) {
					toggleFileSelection(file.id);
				}
			});
		} else {
			// Select all
			uploadedFiles.forEach((file) => {
				if (!selectedFiles.has(file.id)) {
					toggleFileSelection(file.id);
				}
			});
		}
	};

	const handleProcess = () => {
		if (selectedCount === 0) {
			toast.error("No files selected");
			return;
		}

		onProcessSelected?.(Array.from(selectedFiles));
	};

	const handleClear = () => {
		onClearAll?.();
	};

	return (
		<div className="flex items-center justify-between p-4 bg-white rounded-xl border border-purple-100 shadow-sm">
			<div className="flex items-center gap-4">
				<Button
					variant="outline"
					size="sm"
					onClick={handleSelectAll}
					disabled={totalCount === 0}
				>
					{selectedCount === totalCount ? "Deselect All" : "Select All"}
				</Button>

				{selectedCount > 0 && (
					<Badge variant="secondary" className="bg-purple-100 text-purple-700">
						{selectedCount} selected
					</Badge>
				)}
			</div>

			<div className="flex items-center gap-2">
				<Button
					onClick={handleProcess}
					disabled={selectedCount === 0 || isProcessing}
					size="sm"
				>
					<Play className="h-4 w-4 mr-2" />
					Process Selected
				</Button>

				<Button
					onClick={handleClear}
					disabled={totalCount === 0 || isProcessing}
					variant="outline"
					size="sm"
				>
					<Trash2 className="h-4 w-4 mr-2" />
					Clear All
				</Button>
			</div>
		</div>
	);
}
