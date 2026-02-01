"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
	Trash2,
	Play,
	Check,
	ChevronDown,
	Settings,
	Loader2,
	Eye,
	Download,
	Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSelectionStore } from "@/store";
import { useImageStore } from "@/store/image-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BaseSelectionToolbar } from "./BaseSelectionToolbar";
import { DuckDecodeDialog } from "@/components/selection/DuckDecodeDialog";
import { ComplexWorkflowRunDialog } from "@/components/workspace/ComplexWorkflowRunDialog";

interface SelectionToolbarProps {
	onProcess?: (selectedPaths: string[]) => void;
	onDelete?: (selectedPaths: string[]) => void;
	onExport?: (selectedPaths: string[]) => void;
	onDuckDecodeOpen?: () => void;
	nodes?: Array<{ id: string; name: string }>;
	selectedNode?: string;
	onNodeChange?: (nodeId: string) => void;
	disabled?: boolean;
	className?: string;
	showDuckDecodeButton?: boolean;
	showComplexWorkflowButton?: boolean;
	selectedImagePaths?: string[];
}

export function SelectionToolbar({
	onProcess,
	onDelete,
	onExport,
	onDuckDecodeOpen,
	nodes = [],
	selectedNode,
	onNodeChange,
	disabled = false,
	className = "",
	showDuckDecodeButton = false,
	showComplexWorkflowButton = false,
	selectedImagePaths = [],
}: SelectionToolbarProps) {
	const store = useSelectionStore();
	const selectedCount = store.selectedImages.size;
	const { images, getDuckEncodedImages } = useImageStore();

	// Debug logging
	console.log(
		"[SelectionToolbar] showComplexWorkflowButton:",
		showComplexWorkflowButton,
		"selectedImagePaths:",
		selectedImagePaths.length,
	);

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [showDecodeDialog, setShowDecodeDialog] = useState(false);
	const [showComplexWorkflowDialog, setShowComplexWorkflowDialog] =
		useState(false);

	// Get selected duck-encoded images
	const selectedDuckEncodedImages = useMemo(() => {
		const selectedPaths = Array.from(store.selectedImages.keys());
		return images.filter(
			(img) => selectedPaths.includes(img.path) && img.isDuckEncoded === true,
		);
	}, [images, store.selectedImages]);

	const hasDuckEncodedInSelection = selectedDuckEncodedImages.length > 0;

	// Get selected paths
	const selectedPaths = useMemo(() => {
		return Array.from(store.selectedImages.keys());
	}, [store.selectedImages]);

	// Handle process
	const handleProcess = useCallback(async () => {
		if (!onProcess) return;

		setIsProcessing(true);
		try {
			await onProcess(selectedPaths);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to process images",
			);
		} finally {
			setIsProcessing(false);
		}
	}, [onProcess, selectedPaths]);

	// Handle export
	const handleExport = useCallback(async () => {
		if (!onExport) return;

		setIsExporting(true);
		try {
			await onExport(selectedPaths);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to export images",
			);
		} finally {
			setIsExporting(false);
		}
	}, [onExport, selectedPaths]);

	// Handle delete with confirmation
	const handleDeleteConfirm = useCallback(async () => {
		if (!onDelete) return;

		try {
			await onDelete(selectedPaths);
			store.deselectAll();
			toast.success(
				`Deleted ${selectedCount} image${selectedCount !== 1 ? "s" : ""}`,
			);
			setShowDeleteDialog(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete images",
			);
		}
	}, [onDelete, selectedPaths, selectedCount, store]);

	// Handle node change
	const handleNodeChange = useCallback(
		(nodeId: string) => {
			onNodeChange?.(nodeId);
		},
		[onNodeChange],
	);

	// Handle deselect all
	const handleDeselectAll = useCallback(() => {
		store.deselectAll();
	}, [store]);

	const toolbarDisabled = disabled || isProcessing || isExporting;

	return (
		<>
			<BaseSelectionToolbar
				selectedCount={selectedCount}
				className={className}
				onDeselectAll={handleDeselectAll}
			>
				{(mode) => {
					if (mode === "expanded") {
						return (
							<>
								<span className="text-sm text-muted-foreground hidden sm:inline-block">
									{nodes.length > 0 && onNodeChange
										? "Select images to process"
										: "Select node and images to process"}
								</span>
							</>
						);
					}

					if (mode === "expanded-actions") {
						return (
							<>
								{nodes.length > 0 && onNodeChange && (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="h-9 border-blue-100 bg-blue-50/50 hover:bg-blue-100 text-blue-700"
											>
												<Settings className="h-4 w-4 mr-2" />
												<span className="max-w-[150px] truncate">
													{selectedNode
														? nodes.find((n) => n.id === selectedNode)?.name
														: "Select Node"}
												</span>
												<ChevronDown className="h-4 w-4 ml-2 opacity-50" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start" className="w-56">
											{nodes.map((node) => (
												<DropdownMenuItem
													key={node.id}
													onClick={() => handleNodeChange(node.id)}
													className={cn(
														"focus:bg-blue-50 focus:text-blue-700",
														selectedNode === node.id
															? "bg-blue-50 text-blue-700 font-bold"
															: "",
													)}
												>
													<Check
														className={cn(
															"h-4 w-4 mr-2",
															selectedNode === node.id
																? "opacity-100"
																: "opacity-0",
														)}
													/>
													{node.name}
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								)}

								<Button
									variant="default"
									size="sm"
									onClick={handleProcess}
									disabled={toolbarDisabled}
									className="h-9 px-6 bg-blue-600 hover:bg-blue-700 shadow-md"
								>
									<Play className="h-4 w-4 mr-2 fill-current" />
									{isProcessing ? "Processing..." : "Start Processing"}
								</Button>

								{/* Export button */}
								{onExport && (
									<Button
										variant="outline"
										size="sm"
										onClick={handleExport}
										disabled={toolbarDisabled}
										className="h-9 border-purple-100 bg-purple-50/50 hover:bg-purple-100 text-purple-700"
										title="Export to folder"
									>
										{isExporting ? (
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										) : (
											<Download className="h-4 w-4 mr-2" />
										)}
										Export
									</Button>
								)}

								{/* Duck Decode button - shown when there are duck-encoded images in selection */}
								{hasDuckEncodedInSelection && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowDecodeDialog(true)}
										disabled={toolbarDisabled}
										className="h-9 border-green-200 bg-green-50/50 hover:bg-green-100 text-green-700"
										title={`Decode ${selectedDuckEncodedImages.length} duck-encoded image${selectedDuckEncodedImages.length !== 1 ? "s" : ""}`}
									>
										<Eye className="h-4 w-4 mr-2" />
										Decode ({selectedDuckEncodedImages.length})
									</Button>
								)}

								{/* Complex Workflow button */}
								{showComplexWorkflowButton && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowComplexWorkflowDialog(true)}
										disabled={
											toolbarDisabled || selectedImagePaths.length === 0
										}
										className={cn(
											"h-9 border-2 border-indigo-500 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold",
											selectedImagePaths.length === 0 &&
												"opacity-40 cursor-not-allowed",
										)}
										title="Run complex workflow on selected images"
									>
										<Zap className="h-4 w-4 mr-2 fill-indigo-700" />
										Run Complex Workflow
									</Button>
								)}

								<Button
									variant="outline"
									size="icon"
									className="h-9 w-9 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700"
									onClick={() => setShowDeleteDialog(true)}
									disabled={toolbarDisabled}
									title="Delete selected"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</>
						);
					}

					if (mode === "floating") {
						return (
							<>
								{nodes.length > 0 && onNodeChange && (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
											>
												<Settings className="h-3.5 w-3.5 mr-2 text-blue-400" />
												<span className="text-xs max-w-[100px] truncate">
													{selectedNode
														? nodes.find((n) => n.id === selectedNode)?.name
														: "Select Node"}
												</span>
												<ChevronDown className="h-3 w-3 ml-1 text-gray-500" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align="center"
											side="top"
											className="w-56 bg-gray-900 border-gray-700 text-gray-300"
										>
											{nodes.map((node) => (
												<DropdownMenuItem
													key={node.id}
													onClick={() => handleNodeChange(node.id)}
													className={cn(
														"focus:bg-gray-800 focus:text-white",
														selectedNode === node.id
															? "bg-gray-800 text-blue-400"
															: "",
													)}
												>
													<Check
														className={cn(
															"h-3.5 w-3.5 mr-2",
															selectedNode === node.id
																? "opacity-100"
																: "opacity-0",
														)}
													/>
													<span className="text-xs">{node.name}</span>
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								)}

								{onProcess && (
									<Button
										variant="default"
										size="sm"
										onClick={handleProcess}
										disabled={toolbarDisabled}
										className="h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 shadow-lg shadow-blue-900/20"
									>
										{isProcessing ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
										)}
										<span className="text-xs font-bold">
											{isProcessing ? "..." : "Process"}
										</span>
									</Button>
								)}

								{onExport && (
									<Button
										variant="ghost"
										size="icon"
										onClick={handleExport}
										disabled={toolbarDisabled}
										className="h-8 w-8 text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 rounded-full"
										title="Export to folder"
									>
										{isExporting ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<Download className="h-3.5 w-3.5" />
										)}
									</Button>
								)}

								{onDelete && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setShowDeleteDialog(true)}
										disabled={toolbarDisabled}
										className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-full"
										title="Delete selected"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								)}

								{/* Duck Decode button - shown when there are duck-encoded images in selection */}
								{hasDuckEncodedInSelection && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setShowDecodeDialog(true)}
										disabled={toolbarDisabled}
										className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-950/30 rounded-full"
										title={`Decode ${selectedDuckEncodedImages.length} duck-encoded image${selectedDuckEncodedImages.length !== 1 ? "s" : ""}`}
									>
										<Eye className="h-3.5 w-3.5" />
									</Button>
								)}

								{/* Complex Workflow button */}
								{showComplexWorkflowButton && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setShowComplexWorkflowDialog(true)}
										disabled={
											toolbarDisabled || selectedImagePaths.length === 0
										}
										className={cn(
											"h-8 w-8 rounded-full",
											selectedImagePaths.length > 0
												? "text-purple-400 hover:text-purple-300 hover:bg-purple-950/30"
												: "text-gray-500 cursor-not-allowed",
										)}
										title={
											selectedImagePaths.length > 0
												? "Run complex workflow on selected images"
												: "Select images to run complex workflow"
										}
									>
										<Zap className="h-3.5 w-3.5" />
									</Button>
								)}
							</>
						);
					}

					return null;
				}}
			</BaseSelectionToolbar>

			{/* Delete confirmation dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {selectedCount} image{selectedCount !== 1 ? "s" : ""}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. The selected images will be
							permanently deleted from your file system.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							className="bg-red-600 hover:bg-red-700"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Duck Decode dialog */}
			<DuckDecodeDialog
				open={showDecodeDialog}
				onOpenChange={setShowDecodeDialog}
				images={selectedDuckEncodedImages}
				onDecoded={() => {
					// Callback after successful decode - parent can refresh folder
					onDuckDecodeOpen?.();
				}}
			/>

			{/* Complex Workflow dialog */}
			{showComplexWorkflowButton && (
				<ComplexWorkflowRunDialog
					open={showComplexWorkflowDialog}
					onOpenChange={setShowComplexWorkflowDialog}
					selectedFiles={selectedImagePaths.map((path) => {
						const img = images.find((i) => i.path === path);
						if (img) {
							return { ...img, id: path } as any;
						}
						return {
							id: path,
							path,
							name: path.split("/").pop() || "Unknown",
							type: "image",
							extension: path.split(".").pop() || "",
							size: 0,
						} as any;
					})}
				/>
			)}
		</>
	);
}
