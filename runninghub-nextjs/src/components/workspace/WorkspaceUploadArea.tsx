/**
 * Workspace Upload Area Component
 * Drag-and-drop zone for uploading images to workspace
 */

"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WorkspaceUploadAreaProps {
	onUpload: (files: File[]) => Promise<void>;
	isUploading?: boolean;
}

export function WorkspaceUploadArea({
	onUpload,
	isUploading = false,
}: WorkspaceUploadAreaProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

	const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);

		const files = Array.from(e.dataTransfer.files).filter((f) =>
			f.type.startsWith("image/"),
		);

		if (files.length === 0) {
			toast.error("Please select image files");
			return;
		}

		setSelectedFiles((prev) => [...prev, ...files]);
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(e.target.files || []).filter((f) =>
				f.type.startsWith("image/"),
			);
			setSelectedFiles((prev) => [...prev, ...files]);
		},
		[],
	);

	const handleRemoveFile = useCallback((index: number) => {
		setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const handleUpload = useCallback(async () => {
		if (selectedFiles.length === 0) {
			toast.error("No files selected");
			return;
		}

		await onUpload(selectedFiles);
		setSelectedFiles([]);
	}, [selectedFiles, onUpload]);

	return (
		<div className="space-y-4">
			<Card
				className={cn(
					"border-2 border-dashed transition-colors",
					isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300",
				)}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
			>
				<CardContent className="flex flex-col items-center justify-center py-16">
					<Upload className="h-16 w-16 text-gray-400 mb-4" />
					<h3 className="text-lg font-semibold mb-2">
						Upload Images to Workspace
					</h3>
					<p className="text-sm text-gray-600 text-center mb-6">
						Drag and drop images here, or click to browse
					</p>

					<input
						type="file"
						multiple
						accept="image/*"
						onChange={handleFileSelect}
						className="hidden"
						id="workspace-file-input"
						disabled={isUploading}
					/>

					<Button
						onClick={() =>
							document.getElementById("workspace-file-input")?.click()
						}
						disabled={isUploading}
					>
						Browse Files
					</Button>
				</CardContent>
			</Card>

			{/* File Previews */}
			{selectedFiles.length > 0 && (
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between mb-4">
							<h4 className="font-semibold">
								Selected Files ({selectedFiles.length})
							</h4>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSelectedFiles([])}
								disabled={isUploading}
							>
								Clear All
							</Button>
						</div>

						<div className="space-y-2 max-h-64 overflow-y-auto">
							{selectedFiles.map((file, index) => (
								<div
									key={index}
									className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
								>
									<img
										src={URL.createObjectURL(file)}
										alt={file.name}
										className="w-12 h-12 object-contain rounded"
									/>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">{file.name}</p>
										<p className="text-xs text-gray-500">
											{(file.size / 1024).toFixed(1)} KB
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleRemoveFile(index)}
										disabled={isUploading}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>

						<Button
							onClick={handleUpload}
							disabled={isUploading}
							className="w-full mt-4"
						>
							Upload to Workspace
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
