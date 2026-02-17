"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
	Video,
	RefreshCw,
	Pencil,
	Scissors,
	Loader2,
	Eye,
	Zap,
	Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVideoSelectionStore, useVideoStore } from "@/store";
// For backward compatibility, we still import stores but use props when provided
import { toast } from "sonner";
import { API_ENDPOINTS } from "@/constants";
import { RenameVideoDialog } from "./RenameVideoDialog";
import { VideoFile } from "@/types";
import { BaseSelectionToolbar } from "@/components/selection/BaseSelectionToolbar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface VideoClipSelectionToolbarProps {
	selectedCount: number;
	onClip?: (selectedPaths: string[]) => void;
	onRefresh?: () => void;
	onRename?: (video: VideoFile, newName: string) => Promise<void>;
	onPreview?: (selectedPaths: string[]) => void;
	onDeselectAll?: () => void;
	onConvertFps?: (selectedPaths: string[]) => void;
	onDelete?: (selectedPaths: string[]) => void;
	disabled?: boolean;
	className?: string;
	label?: string;
	clipButtonText?: string;
	showCancelButton?: boolean;
}

export function VideoClipSelectionToolbar({
	selectedCount,
	onClip,
	onRefresh,
	onRename,
	onPreview,
	onDeselectAll,
	onConvertFps,
	onDelete,
	disabled = false,
	className = "",
	label = "Select videos to extract images",
	clipButtonText = "Clip",
	showCancelButton = true,
}: VideoClipSelectionToolbarProps) {
	// For backward compatibility with standalone clip page
	const store = useVideoSelectionStore();
	const videoStore = useVideoStore();

	// Default rename handler for backward compatibility
	const defaultRenameHandler = async (video: VideoFile, newName: string) => {
		try {
			const response = await fetch(API_ENDPOINTS.VIDEOS_RENAME, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					video_path: video.path,
					new_name: newName,
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast.success(`Renamed to ${data.new_name}`);
				videoStore.updateVideo(video.path, {
					path: data.new_path,
					name: data.new_name,
				});
				store.deselectVideo(video.path);
				onRefresh?.();
			} else {
				throw new Error(data.error || "Failed to rename video");
			}
		} catch (error) {
			console.error("Error renaming video:", error);
			throw error;
		}
	};

	// Use prop or fallback to default handler
	const handleRenameCallback = onRename || defaultRenameHandler;

	const [isProcessing, setIsProcessing] = useState(false);
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

	// Get selected paths (only used in standalone clip page)
	const selectedPaths = useMemo(() => {
		return Array.from(store.selectedVideos.keys());
	}, [store.selectedVideos]);

	// Get the single selected video for rename (from store)
	const selectedVideo = useMemo(() => {
		if (selectedCount !== 1) return null;
		return store.selectedVideos.values().next().value || null;
	}, [selectedCount, store.selectedVideos]);

	// Handle clip
	const handleClip = useCallback(async () => {
		if (!onClip) return;

		setIsProcessing(true);
		try {
			await onClip(selectedPaths);
			// Clear selection after action
			if (onDeselectAll) {
				onDeselectAll();
			} else {
				store.deselectAll();
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to clip videos",
			);
		} finally {
			setIsProcessing(false);
		}
	}, [onClip, selectedPaths, onDeselectAll, store]);

	// Handle FPS convert
	const handleConvertFps = useCallback(async () => {
		if (!onConvertFps) return;

		setIsProcessing(true);
		try {
			await onConvertFps(selectedPaths);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to convert video FPS",
			);
		} finally {
			setIsProcessing(false);
		}
	}, [onConvertFps, selectedPaths]);

	// Handle delete
	const handleDelete = useCallback(async () => {
		if (!onDelete) return;

		setIsProcessing(true);
		try {
			await onDelete(selectedPaths);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete videos",
			);
		} finally {
			setIsProcessing(false);
		}
	}, [onDelete, selectedPaths]);

	// Handle preview
	const handlePreview = useCallback(() => {
		if (!onPreview) return;

		if (selectedPaths.length === 0) {
			toast.error("No videos selected");
			return;
		}

		// Preview the first selected video
		onPreview([selectedPaths[0]]);
	}, [onPreview, selectedPaths]);

	// Handle rename (now uses callback)
	const handleRename = async (video: VideoFile, newName: string) => {
		await handleRenameCallback(video, newName);
		setIsRenameDialogOpen(false);
	};

	// Handle refresh
	const handleRefresh = useCallback(() => {
		onRefresh?.();
	}, [onRefresh]);

	// Handle deselect all
	const handleDeselectAllCallback = useCallback(() => {
		if (onDeselectAll) {
			onDeselectAll();
		} else {
			// Fallback to store method
			store.deselectAll();
		}
	}, [onDeselectAll, store]);

	const toolbarDisabled = disabled || isProcessing;
	const selectedCountLabel =
		selectedCount === 1 ? "1 selected" : `${selectedCount} selected`;

	const actionLabel = (labelText: string) =>
		`${labelText} • ${selectedCountLabel}`;

	return (
		<>
			<BaseSelectionToolbar
				selectedCount={selectedCount}
				className={className}
				onDeselectAll={handleDeselectAllCallback}
				showCancelButton={showCancelButton}
				alwaysVisible={true}
				fullWidth={true}
			>
				{(mode) => {
					if (mode === "expanded") {
						return null;
					}

					if (mode === "expanded-actions") {
						return (
							<>
								{onRename && selectedCount === 1 && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="outline"
												size="icon"
												onClick={() => setIsRenameDialogOpen(true)}
												disabled={toolbarDisabled}
												className="h-9 w-11 border-purple-100 bg-purple-50/50 hover:bg-purple-100 text-purple-700"
												aria-label="Rename"
											>
												<Pencil className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>{actionLabel("Rename")}</TooltipContent>
									</Tooltip>
								)}

								{onPreview && selectedCount > 0 && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="outline"
												size="icon"
												onClick={handlePreview}
												disabled={toolbarDisabled}
												className="h-9 w-11 border-green-100 bg-green-50/50 hover:bg-green-100 text-green-700"
												aria-label="Preview"
											>
												<Eye className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>{actionLabel("Preview")}</TooltipContent>
									</Tooltip>
								)}

								{onConvertFps && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="outline"
												size="icon"
												onClick={handleConvertFps}
												disabled={toolbarDisabled || selectedCount === 0}
												className="h-9 w-11 border-blue-100 bg-blue-50/50 hover:bg-blue-100 text-blue-700"
												aria-label="FPS"
											>
												{isProcessing ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Zap className="h-4 w-4" />
												)}
											</Button>
										</TooltipTrigger>
										<TooltipContent>{actionLabel("FPS")}</TooltipContent>
									</Tooltip>
								)}

								{onDelete && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="outline"
												size="icon"
												onClick={handleDelete}
												disabled={toolbarDisabled || selectedCount === 0}
												className="h-9 w-11 border-red-100 bg-red-50/50 hover:bg-red-100 text-red-700"
												aria-label="Delete"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>{actionLabel("Delete")}</TooltipContent>
									</Tooltip>
								)}

								{onClip && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="default"
												size="icon"
												onClick={handleClip}
												disabled={toolbarDisabled || selectedCount === 0}
												className="h-9 w-11 bg-green-600 hover:bg-green-700 shadow-md"
												aria-label="Clip"
											>
												{isProcessing ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Scissors className="h-4 w-4" />
												)}
											</Button>
										</TooltipTrigger>
										<TooltipContent>{actionLabel(clipButtonText)}</TooltipContent>
									</Tooltip>
								)}

								{onRefresh && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="outline"
												size="icon"
												className="h-9 w-11 border-gray-200 hover:bg-gray-100"
												onClick={handleRefresh}
												disabled={disabled}
												aria-label="Refresh"
											>
												<RefreshCw className="h-4 w-4 text-gray-600" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Refresh</TooltipContent>
									</Tooltip>
								)}
							</>
						);
					}

					if (mode === "floating") {
						return (
							<>
								{onRename && selectedCount === 1 && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => setIsRenameDialogOpen(true)}
												disabled={toolbarDisabled}
												className="h-8 w-10 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full"
												aria-label="Rename"
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>{actionLabel("Rename")}</TooltipContent>
									</Tooltip>
								)}

								{onPreview && selectedCount > 0 && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												onClick={handlePreview}
												disabled={toolbarDisabled}
												className="h-8 w-10 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-full"
												aria-label="Preview"
											>
												<Eye className="h-3.5 w-3.5" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>{actionLabel("Preview")}</TooltipContent>
									</Tooltip>
								)}

								{onConvertFps && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="default"
												size="icon"
												onClick={handleConvertFps}
												disabled={toolbarDisabled || selectedCount === 0}
												className="h-8 w-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/20"
												aria-label="FPS"
											>
												{isProcessing ? (
													<Loader2 className="h-3.5 w-3.5 animate-spin" />
												) : (
													<Zap className="h-3.5 w-3.5 fill-current" />
												)}
											</Button>
										</TooltipTrigger>
										<TooltipContent>{actionLabel("FPS")}</TooltipContent>
									</Tooltip>
								)}

								{onDelete && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="default"
												size="icon"
												onClick={handleDelete}
												disabled={toolbarDisabled || selectedCount === 0}
												className="h-8 w-10 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg shadow-red-900/20"
												aria-label="Delete"
											>
												<Trash2 className="h-3.5 w-3.5 fill-current" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>{actionLabel("Delete")}</TooltipContent>
									</Tooltip>
								)}

								{onClip && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="default"
												size="icon"
												onClick={handleClip}
												disabled={toolbarDisabled || selectedCount === 0}
												className="h-8 w-10 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-lg shadow-green-900/20"
												aria-label="Clip"
											>
												{isProcessing ? (
													<Loader2 className="h-3.5 w-3.5 animate-spin" />
												) : (
													<Scissors className="h-3.5 w-3.5 fill-current" />
												)}
											</Button>
										</TooltipTrigger>
										<TooltipContent>{actionLabel(clipButtonText)}</TooltipContent>
									</Tooltip>
								)}
							</>
						);
					}

					return null;
				}}
			</BaseSelectionToolbar>

			<RenameVideoDialog
				video={selectedVideo}
				isOpen={isRenameDialogOpen}
				onClose={() => setIsRenameDialogOpen(false)}
				onRename={handleRename}
			/>
		</>
	);
}
