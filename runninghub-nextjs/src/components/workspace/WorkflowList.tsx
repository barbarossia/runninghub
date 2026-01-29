/**
 * Workflow List Component
 * Displays list of configured workflows with edit/delete actions
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, FileText, Calendar, Settings, Layers } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { WorkflowEditor } from "./WorkflowEditor";
import type { LocalWorkflow, Workflow } from "@/types/workspace";

import { API_ENDPOINTS } from "@/constants";
import { toast } from "sonner";
import { LocalWorkflowDialog } from "@/components/workspace/LocalWorkflowDialog";

export interface WorkflowListProps {
	onSelectWorkflow?: (workflow: Workflow) => void;
	className?: string;
}

export function WorkflowList({
	onSelectWorkflow,
	className = "",
}: WorkflowListProps) {
	const { workflows, addWorkflow, updateWorkflow, deleteWorkflow } =
		useWorkspaceStore();

	const [localWorkflows, setLocalWorkflows] = useState<LocalWorkflow[]>([]);
	const [editingWorkflow, setEditingWorkflow] = useState<
		Workflow | undefined
	>();
	const [deletingWorkflowId, setDeletingWorkflowId] = useState<
		string | undefined
	>();
	const [deletingLocalWorkflowId, setDeletingLocalWorkflowId] = useState<
		string | undefined
	>();
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [showCreateTypeDialog, setShowCreateTypeDialog] = useState(false);
	const [showLocalWorkflowDialog, setShowLocalWorkflowDialog] = useState(false);
	const [localWorkflowEditId, setLocalWorkflowEditId] = useState<string | null>(
		null,
	);
	const [startLocalCreateMode, setStartLocalCreateMode] = useState(false);

	// Handle create workflow
	const handleCreateWorkflow = () => {
		setShowCreateTypeDialog(true);
	};

	// Handle edit workflow
	const handleEditWorkflow = (workflow: Workflow) => {
		setEditingWorkflow(workflow);
		setIsEditorOpen(true);
	};

	const handleCreateLocalWorkflow = () => {
		setLocalWorkflowEditId(null);
		setStartLocalCreateMode(true);
		setShowLocalWorkflowDialog(true);
	};

	const handleEditLocalWorkflow = (workflow: LocalWorkflow) => {
		setLocalWorkflowEditId(workflow.id);
		setStartLocalCreateMode(false);
		setShowLocalWorkflowDialog(true);
	};

	// Handle save workflow
	const handleSaveWorkflow = (workflow: Workflow) => {
		if (editingWorkflow) {
			updateWorkflow(workflow.id, workflow);
		} else {
			addWorkflow(workflow);
		}
		setIsEditorOpen(false);
		setEditingWorkflow(undefined);
	};

	// Handle delete workflow
	const handleDeleteWorkflow = async () => {
		if (deletingWorkflowId) {
			try {
				const response = await fetch(
					`${API_ENDPOINTS.WORKFLOW_DELETE}?id=${deletingWorkflowId}`,
					{
						method: "DELETE",
					},
				);

				if (!response.ok) {
					throw new Error("Failed to delete workflow from server");
				}

				deleteWorkflow(deletingWorkflowId);
				toast.success("Workflow deleted");
			} catch (error) {
				console.error("Delete workflow error:", error);
				toast.error("Failed to delete workflow");
			}
			setDeletingWorkflowId(undefined);
		}
	};

	const handleDeleteLocalWorkflow = async () => {
		if (!deletingLocalWorkflowId) return;
		try {
			const response = await fetch(
				`/api/workspace/local-workflow/${deletingLocalWorkflowId}`,
				{ method: "DELETE" },
			);

			if (!response.ok) {
				throw new Error("Failed to delete local workflow");
			}

			await loadLocalWorkflows();
			toast.success("Local workflow deleted");
		} catch (error) {
			console.error("Delete local workflow error:", error);
			toast.error("Failed to delete local workflow");
		}

		setDeletingLocalWorkflowId(undefined);
	};

	// Format date
	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const requiredParams = (workflow: Workflow) =>
		workflow.inputs.filter((i) => i.required).length;
	const optionalParams = (workflow: Workflow) =>
		workflow.inputs.filter((i) => !i.required).length;

	const loadLocalWorkflows = useCallback(async () => {
		try {
			const response = await fetch("/api/workspace/local-workflow/list");
			const data = await response.json();
			if (data.success) {
				setLocalWorkflows(data.workflows || []);
			} else {
				toast.error(data.error || "Failed to load local workflows");
			}
		} catch (error) {
			console.error("Failed to load local workflows:", error);
			toast.error("Failed to load local workflows");
		}
	}, []);

	useEffect(() => {
		loadLocalWorkflows();
	}, [loadLocalWorkflows]);

	const workflowItems = useMemo(() => {
		const runningHubItems = workflows.map((workflow) => ({
			kind: "runninghub" as const,
			workflow,
			createdAt: workflow.createdAt,
		}));
		const localItems = localWorkflows.map((workflow) => ({
			kind: "local" as const,
			workflow,
			createdAt: workflow.createdAt,
		}));
		return [...runningHubItems, ...localItems].sort(
			(a, b) => b.createdAt - a.createdAt,
		);
	}, [workflows, localWorkflows]);

	const getLocalOperationLabel = (workflow: LocalWorkflow) => {
		const operation = workflow.inputs?.[0]?.operation || "local";
		return operation
			.replace("video-", "")
			.replace("image-", "")
			.replace("-", " ");
	};

	if (showLocalWorkflowDialog) {
		return (
			<div className={cn("space-y-4", className)}>
				<LocalWorkflowDialog
					open={showLocalWorkflowDialog}
					variant="inline"
					onOpenChange={(nextOpen) => {
						setShowLocalWorkflowDialog(nextOpen);
						if (!nextOpen) {
							setLocalWorkflowEditId(null);
							setStartLocalCreateMode(false);
							loadLocalWorkflows();
						}
					}}
					initialWorkflowId={localWorkflowEditId}
					startInCreateMode={startLocalCreateMode}
					onSaved={loadLocalWorkflows}
				/>
			</div>
		);
	}

	return (
		<div className={cn("space-y-4", className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Workflows</h2>
					<p className="text-sm text-gray-500">
						{workflowItems.length} workflow
						{workflowItems.length !== 1 ? "s" : ""} configured
					</p>
				</div>
				<Button onClick={handleCreateWorkflow} size="sm">
					<Plus className="h-4 w-4 mr-1" />
					Create New
				</Button>
			</div>

			{/* Workflow list */}
			{workflowItems.length === 0 ? (
				<Card className="p-12 text-center">
					<FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						No workflows configured
					</h3>
					<p className="text-sm text-gray-500 mb-4">
						Create your first workflow to start processing files
					</p>
					<Button onClick={handleCreateWorkflow}>
						<Plus className="h-4 w-4 mr-1" />
						Create Workflow
					</Button>
				</Card>
			) : (
				<div className="grid gap-3">
					<AnimatePresence mode="popLayout">
						{workflowItems.map((item) => (
							<motion.div
								key={`${item.kind}_${item.workflow.id}`}
								layout
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								transition={{ duration: 0.2 }}
							>
								<Card
									className={cn(
										"p-4 transition-all hover:shadow-md cursor-pointer",
										item.kind === "runninghub" &&
											onSelectWorkflow &&
											"hover:border-blue-300",
									)}
									onClick={() => {
										if (item.kind === "local") {
											handleEditLocalWorkflow(item.workflow);
											return;
										}
										onSelectWorkflow?.(item.workflow);
									}}
								>
									<div className="flex items-start justify-between gap-4">
										{/* Left: Icon and info */}
										<div className="flex items-start gap-3 flex-1 min-w-0">
											<div className="p-2 bg-blue-50 rounded-lg">
												{item.kind === "local" ? (
													<Layers className="h-5 w-5 text-blue-600" />
												) : (
													<Settings className="h-5 w-5 text-blue-600" />
												)}
											</div>

											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													<h3 className="font-semibold text-sm truncate">
														{item.workflow.name}
													</h3>
													<Badge variant="secondary" className="text-[10px]">
														{item.kind === "local" ? "Local" : "RunningHub"}
													</Badge>
												</div>

												{item.workflow.description && (
													<p className="text-xs text-gray-500 line-clamp-2 mb-2">
														{item.workflow.description}
													</p>
												)}

												{/* Parameters info */}
												{item.kind === "runninghub" ? (
													<div className="flex items-center gap-2 mb-2">
														<Badge variant="secondary" className="text-xs">
															{requiredParams(item.workflow)} required
														</Badge>
														<Badge variant="outline" className="text-xs">
															{optionalParams(item.workflow)} optional
														</Badge>
													</div>
												) : (
													<div className="flex items-center gap-2 mb-2">
														<Badge variant="secondary" className="text-xs">
															Operation: {getLocalOperationLabel(item.workflow)}
														</Badge>
													</div>
												)}

												{/* Created date */}
												<div className="flex items-center gap-1 text-xs text-gray-500">
													<Calendar className="h-3 w-3" />
													<span>
														Created {formatDate(item.workflow.createdAt)}
													</span>
												</div>
											</div>
										</div>

										{/* Right: Actions */}
										<div className="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												onClick={(e) => {
													e.stopPropagation();
													if (item.kind === "local") {
														handleEditLocalWorkflow(item.workflow);
														return;
													}
													handleEditWorkflow(item.workflow);
												}}
											>
												<Edit className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-red-600 hover:text-red-700"
												onClick={(e) => {
													e.stopPropagation();
													if (item.kind === "local") {
														setDeletingLocalWorkflowId(item.workflow.id);
														return;
													}
													setDeletingWorkflowId(item.workflow.id);
												}}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</Card>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			)}

			{/* Workflow Editor Dialog */}
			<WorkflowEditor
				workflow={editingWorkflow}
				open={isEditorOpen}
				onSave={handleSaveWorkflow}
				onCancel={() => {
					setIsEditorOpen(false);
					setEditingWorkflow(undefined);
				}}
				onDelete={deletingWorkflowId ? undefined : handleDeleteWorkflow}
			/>

			<Dialog
				open={showCreateTypeDialog}
				onOpenChange={setShowCreateTypeDialog}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Create Workflow</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<Button
							className="w-full justify-start"
							onClick={() => {
								setShowCreateTypeDialog(false);
								setEditingWorkflow(undefined);
								setIsEditorOpen(true);
							}}
						>
							<Settings className="h-4 w-4 mr-2" />
							RunningHub Workflow
						</Button>
						<Button
							variant="outline"
							className="w-full justify-start"
							onClick={() => {
								setShowCreateTypeDialog(false);
								handleCreateLocalWorkflow();
							}}
						>
							<Layers className="h-4 w-4 mr-2" />
							Local Workflow
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={!!deletingWorkflowId}
				onOpenChange={() => setDeletingWorkflowId(undefined)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this workflow? This action cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteWorkflow}
							className="bg-red-600 text-white hover:bg-red-700"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={!!deletingLocalWorkflowId}
				onOpenChange={() => setDeletingLocalWorkflowId(undefined)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Local Workflow?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this local workflow? This action
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteLocalWorkflow}
							className="bg-red-600 text-white hover:bg-red-700"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
