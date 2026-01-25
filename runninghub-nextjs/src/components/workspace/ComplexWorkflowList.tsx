/**
 * Complex Workflow List Component
 * Displays all saved complex workflows with execute/delete options
 */

"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Play, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { useWorkspaceStore } from "@/store/workspace-store";
import type { ComplexWorkflow } from "@/types/workspace";

export function ComplexWorkflowList() {
	const [workflows, setWorkflows] = useState<ComplexWorkflow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedWorkflow, setSelectedWorkflow] =
		useState<ComplexWorkflow | null>(null);
	const [isDeleting, setIsDeleting] = useState<string | null>(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const setActiveComplexExecutionId = useWorkspaceStore(
		(state) => state.setActiveComplexExecutionId,
	);

	// Load workflows on mount
	useEffect(() => {
		loadWorkflows();
	}, []);

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

	const handleExecute = (workflowId: string) => {
		window.location.href = `/workspace/complex-workflow/execute/${workflowId}`;
	};

	const handleDelete = async (workflowId: string) => {
		setIsDeleting(workflowId);
		setShowDeleteDialog(false);

		try {
			const response = await fetch(
				`/api/workspace/complex-workflow/${workflowId}`,
				{
					method: "DELETE",
				},
			);

			const data = await response.json();

			if (data.success) {
				setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
				toast.success("Complex workflow deleted");
			} else {
				toast.error(data.error || "Failed to delete complex workflow");
			}
		} catch (error) {
			console.error("Failed to delete complex workflow:", error);
			toast.error("Failed to delete complex workflow");
		} finally {
			setIsDeleting(null);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold text-gray-900">Complex Workflows</h2>
				<Button
					onClick={() =>
						(window.location.href = "/workspace/complex-workflow/create")
					}
				>
					<Plus className="h-4 w-4 mr-2" />
					Create New
				</Button>
			</div>

			{workflows.length === 0 && !isLoading && (
				<div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
					<div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
						<AlertCircle className="h-8 w-8 text-gray-400" />
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						No Complex Workflows
					</h3>
					<p className="text-sm text-gray-600 max-w-md mx-auto">
						Create your first complex workflow to get started
					</p>
					<Button
						onClick={() =>
							(window.location.href = "/workspace/complex-workflow/create")
						}
						className="mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md"
					>
						<Plus className="h-4 w-4 mr-2" />
						Create Complex Workflow
					</Button>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{workflows.map((workflow) => (
					<Card key={workflow.id} className="flex flex-col">
						<div className="flex-1 flex flex-col">
							<div className="flex items-start justify-between mb-2">
								<div className="flex-1">
									<h3 className="font-semibold text-gray-900">
										{workflow.name}
									</h3>
									{workflow.description && (
										<p className="text-sm text-gray-600 mt-1">
											{workflow.description}
										</p>
									)}
								</div>
								<Badge className="text-xs">{workflow.steps.length} steps</Badge>
							</div>

							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleExecute(workflow.id)}
									disabled={isDeleting === workflow.id}
								>
									<Play className="h-4 w-4 mr-1" />
									Execute
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => {
										setSelectedWorkflow(workflow);
										setShowDeleteDialog(true);
									}}
									disabled={isDeleting === workflow.id}
								>
									<Trash2 className="h-4 w-4 mr-1" />
									Delete
								</Button>
							</div>
						</div>
					</Card>
				))}
			</div>

			{/* Delete Confirmation Dialog */}
			{selectedWorkflow && showDeleteDialog && (
				<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Delete Complex Workflow</DialogTitle>
						</DialogHeader>
						<div className="py-4">
							<p className="text-sm text-gray-600">
								Are you sure you want to delete &quot;{selectedWorkflow.name}
								&quot;?
								<br />
								This action cannot be undone.
							</p>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setShowDeleteDialog(false)}
							>
								Cancel
							</Button>
							<Button
								variant="destructive"
								onClick={() => handleDelete(selectedWorkflow.id)}
								disabled={isDeleting === selectedWorkflow.id}
							>
								{isDeleting === selectedWorkflow.id ? (
									<>
										<Loader2 className="h-4 w-4 mr-1 animate-spin" />
										Deleting...
									</>
								) : (
									<>
										<Trash2 className="h-4 w-4 mr-1" />
										Delete
									</>
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
