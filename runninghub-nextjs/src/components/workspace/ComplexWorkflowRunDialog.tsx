/**
 * Complex Workflow Run Dialog
 * Dialog for selecting and running a complex workflow with selected images
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Zap, Video, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/store/workspace-store";
import { cn } from "@/lib/utils";
import type { MediaFile } from "@/types/workspace";

export interface ComplexWorkflowRunDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedFiles: MediaFile[];
}

export function ComplexWorkflowRunDialog({
	open,
	onOpenChange,
	selectedFiles,
}: ComplexWorkflowRunDialogProps) {
	const router = useRouter();
	const setJobFiles = useWorkspaceStore((state) => state.setJobFiles);
	const setSelectedComplexWorkflowId = useWorkspaceStore(
		(state) => state.setSelectedComplexWorkflowId,
	);
	const [workflows, setWorkflows] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Load workflows when dialog opens
	useEffect(() => {
		if (open) {
			loadWorkflows();
		}
	}, [open]);

	const loadWorkflows = async () => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/workspace/complex-workflow/list");
			const data = await response.json();

			if (data.success) {
				setWorkflows(data.workflows || []);
			} else {
				toast.error(data.error || "Failed to load complex workflows");
			}
		} catch (error) {
			console.error("Failed to load complex workflows:", error);
			toast.error("Failed to load complex workflows");
		} finally {
			setIsLoading(false);
		}
	};

	const handleRunOnPage = (workflowId: string) => {
		// Close dialog and navigate to run page
		if (selectedFiles.length === 0) {
			toast.error("Please select files in the media gallery first");
			return;
		}

		const workflow = workflows.find((item) => item.id === workflowId);
		const stepParams = workflow?.steps?.[0]?.parameters || [];
		const fileParams = stepParams.filter(
			(param: any) => param.valueType === "user-input",
		);

		if (fileParams.length === 0) {
			toast.error("Step 1 has no user-input parameters");
			return;
		}

		const assignments = selectedFiles
			.slice(0, fileParams.length)
			.map((file, index) => ({
				parameterId: fileParams[index].parameterId,
				filePath: file.path,
				fileName: file.name,
				fileSize: file.size || 0,
				fileType: file.type,
				valid: true,
				width: file.width,
				height: file.height,
				thumbnail: file.thumbnail,
			}));

		if (selectedFiles.length > fileParams.length) {
			toast.warning(
				"More files selected than available step 1 inputs. Extra files were ignored.",
			);
		}

		setJobFiles(assignments);
		setSelectedComplexWorkflowId(workflowId);
		onOpenChange(false);

		// Navigate to the complex workflow execute page
		router.push(`/workspace/complex-workflow/execute/${workflowId}`);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Zap className="h-5 w-5 text-purple-600" />
						Run Complex Workflow
					</DialogTitle>
					<DialogDescription>
						Select a complex workflow to configure and execute
					</DialogDescription>
				</DialogHeader>

				{/* Selected Files Display */}
				{selectedFiles.length > 0 && (
					<div className="mb-4">
						<p className="text-sm font-medium mb-2">
							{selectedFiles.length} file(s) selected
						</p>
						<div className="flex gap-2 overflow-x-auto pb-2">
							{selectedFiles.slice(0, 5).map((file) => (
								<div
									key={file.id}
									className="flex-shrink-0 w-16 h-16 rounded border overflow-hidden bg-gray-50 relative group"
								>
									{file.type === "video" ? (
										<video
											src={
												file.thumbnail ||
												file.blobUrl ||
												`/api/videos/serve?path=${encodeURIComponent(file.path)}`
											}
											muted
											className="w-full h-full object-cover"
										/>
									) : file.type === "image" ? (
										<img
											src={
												file.thumbnail ||
												`/api/images/serve?path=${encodeURIComponent(file.path)}`
											}
											alt={file.name}
											className="w-full h-full object-contain"
											onError={(e) => {
												e.currentTarget.src = "";
												e.currentTarget.className = "hidden";
											}}
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center text-xs text-gray-500 bg-gray-100">
											{file.extension || "FILE"}
										</div>
									)}

									{/* Type icon overlay */}
									<div className="absolute top-0.5 right-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
										{file.type === "video" ? (
											<div className="bg-black/50 rounded-full p-0.5">
												<Video className="h-2.5 w-2.5 text-white" />
											</div>
										) : (
											<div className="bg-blue-500/50 rounded-full p-0.5">
												<ImageIcon className="h-2.5 w-2.5 text-white" />
											</div>
										)}
									</div>
								</div>
							))}
							{selectedFiles.length > 5 && (
								<div className="flex-shrink-0 w-16 h-16 rounded bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
									+{selectedFiles.length - 5}
								</div>
							)}
						</div>
					</div>
				)}

				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				) : workflows.length === 0 ? (
					<div className="text-center py-12 text-gray-500">
						<AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							No Complex Workflows
						</h3>
						<p className="text-sm text-gray-500 mb-4">
							Create a complex workflow in Workspace → Workflows → Complex
							Workflows first
						</p>
					</div>
				) : (
					<div className="space-y-3 mt-4">
						{selectedFiles.length === 0 && (
							<p className="text-sm text-gray-600 mb-4">
								Select files in the media gallery first, then select a workflow.
							</p>
						)}
						{workflows.map((workflow) => (
							<Card
								key={workflow.id}
								className="p-4 hover:border-purple-300 transition-colors cursor-pointer"
								onClick={() => handleRunOnPage(workflow.id)}
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<h3 className="font-semibold text-gray-900 truncate">
												{workflow.name}
											</h3>
											<Badge variant="secondary" className="text-xs shrink-0">
												{workflow.steps.length} step
												{workflow.steps.length !== 1 ? "s" : ""}
											</Badge>
										</div>
										{workflow.description && (
											<p className="text-sm text-gray-600 line-clamp-2">
												{workflow.description}
											</p>
										)}
										<div className="flex flex-wrap gap-1 mt-2">
											{workflow.steps
												.slice(0, 3)
												.map((step: any, idx: number) => (
													<Badge
														key={idx}
														variant="outline"
														className="text-xs"
													>
														Step {step.stepNumber}: {step.workflowName}
													</Badge>
												))}
											{workflow.steps.length > 3 && (
												<Badge variant="outline" className="text-xs">
													+{workflow.steps.length - 3} more
												</Badge>
											)}
										</div>
									</div>
									<Button
										size="sm"
										disabled={selectedFiles.length === 0}
										className={cn(
											"shrink-0",
											selectedFiles.length === 0 &&
												"opacity-50 cursor-not-allowed",
										)}
									>
										Configure & Run →
									</Button>
								</div>
							</Card>
						))}
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
