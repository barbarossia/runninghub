/**
 * Workflow Selector Component
 * Dropdown for selecting a configured workflow
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { Settings, Plus, Loader2, AlertCircle, Key } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";
import { CustomWorkflowIdDialog } from "@/components/workspace/CustomWorkflowIdDialog";
import type { Workflow, LocalWorkflow } from "@/types/workspace";

export interface WorkflowSelectorProps {
	onAddWorkflow?: () => void;
	className?: string;
}

export function WorkflowSelector({
	onAddWorkflow,
	className = "",
}: WorkflowSelectorProps) {
	const {
		workflows,
		selectedWorkflowId,
		setSelectedWorkflow,
		setWorkflows,
		clearJobInputs,
	} = useWorkspaceStore();

	// Loading and error states for workflow fetching
	const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [showCustomWorkflowDialog, setShowCustomWorkflowDialog] =
		useState(false);

	// Load workflows from workspace folder on component mount
	useEffect(() => {
		const loadWorkflows = async () => {
			setIsLoadingWorkflows(true);
			setLoadError(null);

			try {
				// Fetch both standard and local workflows in parallel
				const [standardRes, localRes] = await Promise.all([
					fetch("/api/workflow/list"),
					fetch("/api/workspace/local-workflow/list"),
				]);

				const standardData = await standardRes.json();
				const localData = await localRes.json();

				if (!standardRes.ok) {
					throw new Error(standardData.error || "Failed to load workflows");
				}

				const standardWorkflows: Workflow[] = standardData.workflows || [];
				let localWorkflows: Workflow[] = [];

				if (localRes.ok && localData.success) {
					// Adapt LocalWorkflow to Workflow interface
					localWorkflows = (localData.workflows || []).map(
						(lw: LocalWorkflow) => {
							// Determine input type based on operation
							const opType = lw.inputs?.[0]?.operation || "video-convert";
							const isVideoOp =
								opType.startsWith("video-") || opType === "caption"; // Caption supports both, defaulting to video/image check
							const isImageOp =
								opType.startsWith("image-") || opType === "duck-decode";

							// Create synthetic input for compatibility checks
							const syntheticInput = {
								id: "input_1",
								name: "Input File",
								type: "file" as const,
								required: true,
								validation: {
									mediaType: isVideoOp
										? ("video" as const)
										: isImageOp
											? ("image" as const)
											: undefined,
								},
							};

							return {
								id: lw.id,
								name: lw.name,
								description: lw.description || `Local ${opType} workflow`,
								inputs: [syntheticInput],
								createdAt: lw.createdAt,
								updatedAt: lw.updatedAt,
								sourceType: "local" as const,
							};
						},
					);
				}

				// Merge and set workflows
				setWorkflows([...standardWorkflows, ...localWorkflows]);
			} catch (error) {
				console.error("Failed to load workflows:", error);
				setLoadError(
					error instanceof Error ? error.message : "Failed to load workflows",
				);

				// Clear workflows on error (empty state)
				setWorkflows([]);
			} finally {
				setIsLoadingWorkflows(false);
			}
		};

		loadWorkflows();
	}, [setWorkflows]);

	const handleValueChange = (value: string) => {
		if (value === "add_new") {
			onAddWorkflow?.();
		} else if (value === "add_custom_id") {
			setShowCustomWorkflowDialog(true);
		} else {
			clearJobInputs();
			setSelectedWorkflow(value);
		}
	};

	return (
		<div className={cn("flex items-center gap-3", className)}>
			<div className="flex-1">
				<Select
					value={selectedWorkflowId || ""}
					onValueChange={handleValueChange}
				>
					<SelectTrigger className="w-full">
						<div className="flex items-center gap-2 flex-1">
							<Settings className="h-4 w-4 text-gray-500" />
							<SelectValue placeholder="Select a workflow..." />
						</div>
					</SelectTrigger>
					<SelectContent
						className="z-[100] max-w-md"
						position="popper"
						align="start"
					>
						{isLoadingWorkflows ? (
							<div className="p-4 flex items-center justify-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin text-gray-500" />
								<span className="text-sm text-gray-500">
									Loading workflows...
								</span>
							</div>
						) : loadError ? (
							<div className="p-4 flex items-start gap-2">
								<AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
								<div className="flex-1">
									<p className="text-sm text-red-600 font-medium">
										Failed to load workflows
									</p>
									<p className="text-xs text-gray-500 mt-1">{loadError}</p>
								</div>
							</div>
						) : workflows.length === 0 ? (
							<div className="p-2 text-sm text-gray-500 text-center">
								No workflows configured
							</div>
						) : (
							workflows.map((workflow) => (
								<SelectItem key={workflow.id} value={workflow.id}>
									{workflow.name}
								</SelectItem>
							))
						)}
						{onAddWorkflow && (
							<>
								{workflows.length > 0 && <div className="border-t my-1" />}
								<SelectItem value="add_new">
									<div className="flex items-center gap-2">
										<Plus className="h-4 w-4" />
										<span>Configure New Workflow</span>
									</div>
								</SelectItem>
								<SelectItem value="add_custom_id">
									<div className="flex items-center gap-2">
										<Key className="h-4 w-4" />
										<span>Add Custom Workflow ID</span>
									</div>
								</SelectItem>
							</>
						)}
					</SelectContent>
				</Select>
			</div>

			{/* Custom Workflow ID Dialog */}
			<CustomWorkflowIdDialog
				open={showCustomWorkflowDialog}
				onOpenChange={setShowCustomWorkflowDialog}
				onWorkflowSaved={() => {
					// Reload workflows
					const loadWorkflows = async () => {
						setIsLoadingWorkflows(true);
						setLoadError(null);

						try {
							// Fetch both standard and local workflows in parallel
							const [standardRes, localRes] = await Promise.all([
								fetch("/api/workflow/list"),
								fetch("/api/workspace/local-workflow/list"),
							]);

							const standardData = await standardRes.json();
							const localData = await localRes.json();

							if (!standardRes.ok) {
								throw new Error(
									standardData.error || "Failed to load workflows",
								);
							}

							const standardWorkflows: Workflow[] =
								standardData.workflows || [];
							let localWorkflows: Workflow[] = [];

							if (localRes.ok && localData.success) {
								// Adapt LocalWorkflow to Workflow interface
								localWorkflows = (localData.workflows || []).map(
									(lw: LocalWorkflow) => {
										// Determine input type based on operation
										const opType =
											lw.inputs?.[0]?.operation || "video-convert";
										const isVideoOp =
											opType.startsWith("video-") || opType === "caption";
										const isImageOp =
											opType.startsWith("image-") ||
											opType === "duck-decode";

										// Create synthetic input for compatibility checks
										const syntheticInput = {
											id: "input_1",
											name: "Input File",
											type: "file" as const,
											required: true,
											validation: {
												mediaType: isVideoOp
													? ("video" as const)
													: isImageOp
														? ("image" as const)
														: undefined,
											},
										};

										return {
											id: lw.id,
											name: lw.name,
											description:
												lw.description || `Local ${opType} workflow`,
											inputs: [syntheticInput],
											createdAt: lw.createdAt,
											updatedAt: lw.updatedAt,
											sourceType: "local" as const,
										};
									},
								);
							}

							// Merge and set workflows
							setWorkflows([...standardWorkflows, ...localWorkflows]);
						} catch (error) {
							console.error("Failed to load workflows:", error);
							setLoadError(
								error instanceof Error
									? error.message
									: "Failed to load workflows",
							);

							// Clear workflows on error (empty state)
							setWorkflows([]);
						} finally {
							setIsLoadingWorkflows(false);
						}
					};

					loadWorkflows();
				}}
			/>
		</div>
	);
}
