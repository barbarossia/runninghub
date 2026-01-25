"use client";

import { useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CreateDatasetDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedFiles?: string[];
	parentPath: string;
	onSuccess?: (dataset: { name: string; path: string }) => void;
}

export function CreateDatasetDialog({
	open,
	onOpenChange,
	selectedFiles = [],
	parentPath,
	onSuccess,
}: CreateDatasetDialogProps) {
	const [datasetName, setDatasetName] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const handleCreate = async () => {
		if (!datasetName.trim()) {
			toast.error("Please enter a dataset name");
			return;
		}

		setIsCreating(true);
		try {
			const response = await fetch("/api/dataset/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: datasetName.trim(),
					files: selectedFiles,
					parentPath,
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast.success(data.message);
				onSuccess?.(data.dataset);
				setDatasetName("");
				onOpenChange(false);
			} else {
				toast.error(data.error || "Failed to create dataset");
			}
		} catch (error) {
			toast.error("Failed to create dataset");
		} finally {
			setIsCreating(false);
		}
	};

	const handleClose = () => {
		if (!isCreating) {
			setDatasetName("");
			onOpenChange(false);
		}
	};

	const hasSelectedFiles = selectedFiles.length > 0;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FolderOpen className="h-5 w-5 text-purple-600" />
						Create Dataset
					</DialogTitle>
					<DialogDescription>
						{hasSelectedFiles
							? `Create a new dataset folder and copy ${selectedFiles.length} selected file${selectedFiles.length !== 1 ? "s" : ""} into it.`
							: "Create a new empty dataset folder. You can add files to it later."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="dataset-name">Dataset Name</Label>
						<Input
							id="dataset-name"
							value={datasetName}
							onChange={(e) => setDatasetName(e.target.value)}
							placeholder="e.g., my-dataset"
							onKeyDown={(e) => e.key === "Enter" && handleCreate()}
							disabled={isCreating}
							autoFocus
						/>
						<p className="text-xs text-gray-500">
							A new folder will be created in the current directory with this
							name.
						</p>
					</div>

					<div className="text-xs text-gray-600 bg-purple-50 p-3 rounded-lg border border-purple-200">
						<p className="font-medium text-purple-800">Dataset Location:</p>
						<p className="text-purple-700 mt-1 font-mono">
							{parentPath}/{datasetName || "<name>"}/
						</p>
					</div>

					{hasSelectedFiles && (
						<div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
							<p className="font-medium text-blue-800">Files to copy:</p>
							<p className="text-blue-700 mt-1">
								{selectedFiles.length} file
								{selectedFiles.length !== 1 ? "s" : ""}
							</p>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={isCreating}>
						Cancel
					</Button>
					<Button
						onClick={handleCreate}
						disabled={isCreating || !datasetName.trim()}
						className="bg-purple-600 hover:bg-purple-700"
					>
						{isCreating ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Creating...
							</>
						) : (
							"Create Dataset"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
