/**
 * Job List Component
 * Displays list of jobs with filtering and status indicators
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Clock,
	CheckCircle2,
	XCircle,
	Loader2,
	Calendar,
	FileText,
	RefreshCcw,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Job, JobStatus } from "@/types/workspace";

export interface JobListProps {
	onJobClick?: (job: Job) => void;
	className?: string;
}

export function JobList({ onJobClick, className = "" }: JobListProps) {
	const {
		jobs,
		selectedJobId,
		setSelectedJob,
		deleteJob,
		deleteJobs,
		fetchJobs,
		isLoadingJobs,
		updateJob,
	} = useWorkspaceStore();

	const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
	const [workflowFilter, setWorkflowFilter] = useState<string>("all");
	const [reQueryingIds, setReQueryingIds] = useState<Set<string>>(new Set());
	const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(
		new Set(),
	);
	const [isDeletingSelected, setIsDeletingSelected] = useState(false);

	// Fetch jobs on mount
	useEffect(() => {
		fetchJobs();
	}, [fetchJobs]);

	const handleReQuery = async (e: React.MouseEvent, job: Job) => {
		e.stopPropagation();
		if (!job.runninghubTaskId) return;

		setReQueryingIds((prev) => new Set(prev).add(job.id));
		try {
			const response = await fetch("/api/workspace/status", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jobId: job.id,
					taskId: job.taskId,
					runninghubTaskId: job.runninghubTaskId,
				}),
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data.error || "Failed to query task status");
			}

			updateJob(job.id, {
				status: data.status,
				completedAt: data.job?.completedAt,
				error: data.job?.error,
			});

			toast.success(`Status updated: ${data.status}`);

			if (data.status === "completed") {
				fetchJobs();
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to query task status";
			toast.error(errorMessage);
		} finally {
			setReQueryingIds((prev) => {
				const next = new Set(prev);
				next.delete(job.id);
				return next;
			});
		}
	};

	// Get unique workflow IDs
	const workflowIds = useMemo(() => {
		const ids = new Set(jobs.map((j) => j.workflowId));
		return Array.from(ids);
	}, [jobs]);

	// Filter jobs
	const filteredJobs = useMemo(() => {
		return jobs.filter((job) => {
			if (statusFilter !== "all" && job.status !== statusFilter) return false;
			if (workflowFilter !== "all" && job.workflowId !== workflowFilter)
				return false;
			return true;
		});
	}, [jobs, statusFilter, workflowFilter]);

	// Get status icon and color
	const getStatusIcon = (status: JobStatus) => {
		switch (status) {
			case "pending":
				return <Clock className="h-4 w-4" />;
			case "running":
				return <Loader2 className="h-4 w-4 animate-spin" />;
			case "completed":
				return <CheckCircle2 className="h-4 w-4" />;
			case "failed":
				return <XCircle className="h-4 w-4" />;
		}
	};

	const getStatusColor = (status: JobStatus) => {
		switch (status) {
			case "pending":
				return "text-yellow-600 bg-yellow-50";
			case "running":
				return "text-blue-600 bg-blue-50";
			case "completed":
				return "text-green-600 bg-green-50";
			case "failed":
				return "text-red-600 bg-red-50";
		}
	};

	const getStatusBadgeVariant = (
		status: JobStatus,
	): "default" | "secondary" | "destructive" | "outline" => {
		switch (status) {
			case "completed":
				return "default";
			case "failed":
				return "destructive";
			default:
				return "secondary";
		}
	};

	// Format date
	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleString();
	};

	const toggleJobSelection = (jobId: string, checked: boolean) => {
		setSelectedJobIds((prev) => {
			const next = new Set(prev);
			if (checked) {
				next.add(jobId);
			} else {
				next.delete(jobId);
			}
			return next;
		});
	};

	const handleDeleteSelected = async () => {
		if (selectedJobIds.size === 0) return;
		if (!confirm("Delete selected jobs? This action cannot be undone.")) {
			return;
		}
		setIsDeletingSelected(true);
		try {
			const jobIds = Array.from(selectedJobIds);
			const result = await deleteJobs(jobIds);
			if (result.deletedIds.length > 0) {
				toast.success(
					`Deleted ${result.deletedIds.length} job${
						result.deletedIds.length !== 1 ? "s" : ""
					}`,
				);
			}
			if (result.failedIds.length > 0) {
				toast.error(
					`Failed to delete ${result.failedIds.length} job${
						result.failedIds.length !== 1 ? "s" : ""
					}`,
				);
			}
			setSelectedJobIds(new Set(result.failedIds));
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to delete jobs";
			toast.error(errorMessage);
		} finally {
			setIsDeletingSelected(false);
		}
	};

	const handleDeleteSingle = async (e: React.MouseEvent, jobId: string) => {
		e.stopPropagation();
		if (!confirm("Delete this job?")) return;
		try {
			await deleteJob(jobId);
			toast.success("Job deleted");
			setSelectedJobIds((prev) => {
				const next = new Set(prev);
				next.delete(jobId);
				return next;
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to delete job";
			toast.error(errorMessage);
		}
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* Header and filters */}
			<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div className="flex items-center gap-2">
					<div>
						<h2 className="text-lg font-semibold">Job History</h2>
						<p className="text-sm text-gray-500">
							{jobs.length} job{jobs.length !== 1 ? "s" : ""} total
						</p>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => fetchJobs()}
						disabled={isLoadingJobs}
						className={cn(isLoadingJobs && "animate-spin")}
					>
						<RefreshCcw className="h-4 w-4" />
					</Button>
				</div>

				<div className="flex flex-wrap gap-2">
					{/* Status filter */}
					<Select
						value={statusFilter}
						onValueChange={(value: any) => setStatusFilter(value)}
					>
						<SelectTrigger className="w-32">
							<SelectValue placeholder="All Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="running">Running</SelectItem>
							<SelectItem value="completed">Completed</SelectItem>
							<SelectItem value="failed">Failed</SelectItem>
						</SelectContent>
					</Select>

					{/* Workflow filter */}
					{workflowIds.length > 1 && (
						<Select value={workflowFilter} onValueChange={setWorkflowFilter}>
							<SelectTrigger className="w-40">
								<SelectValue placeholder="All Workflows" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Workflows</SelectItem>
								{workflowIds.map((id) => (
									<SelectItem key={id} value={id}>
										{id}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					<Button
						variant="destructive"
						size="sm"
						onClick={handleDeleteSelected}
						disabled={selectedJobIds.size === 0 || isDeletingSelected}
						className="gap-2"
					>
						<Trash2 className="h-4 w-4" />
						Delete Selected
						{selectedJobIds.size > 0 ? ` (${selectedJobIds.size})` : ""}
					</Button>
				</div>
			</div>

			{/* Job list */}
			{jobs.length === 0 ? (
				<Card className="p-12 text-center">
					<FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						No jobs yet
					</h3>
					<p className="text-sm text-gray-500">
						Run a workflow to see your job history here
					</p>
				</Card>
			) : (
				<div className="space-y-3">
					<AnimatePresence mode="popLayout">
						{filteredJobs.map((job) => {
							const isSelected = selectedJobId === job.id;
							const isChecked = selectedJobIds.has(job.id);
							return (
								<motion.div
									key={job.id}
									layout
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.2 }}
								>
									<Card
										className={cn(
											"p-4 cursor-pointer transition-all hover:shadow-md",
											isSelected && "ring-2 ring-blue-500",
										)}
										onClick={() => setSelectedJob(job.id)}
									>
										<div className="flex items-start justify-between gap-4">
											{/* Left: Status icon and info */}
											<div className="flex items-start gap-3 flex-1 min-w-0">
												<Checkbox
													checked={isChecked}
													onClick={(e) => e.stopPropagation()}
													onCheckedChange={(checked) =>
														toggleJobSelection(job.id, checked === true)
													}
													aria-label={`Select job ${job.workflowName}`}
													className="mt-1"
												/>
												<div
													className={cn(
														"p-2 rounded-lg",
														getStatusColor(job.status),
													)}
												>
													{getStatusIcon(job.status)}
												</div>

												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2 mb-1">
														<h3 className="font-semibold text-sm truncate">
															{job.workflowName}
														</h3>
														<Badge
															variant={getStatusBadgeVariant(job.status)}
															className="text-xs"
														>
															{job.status}
														</Badge>
													</div>

													{/* File inputs count */}
													<div className="flex items-center gap-2 mb-1">
														<span className="text-xs text-gray-500">
															{job.fileInputs.length} file
															{job.fileInputs.length !== 1 ? "s" : ""}
														</span>
														{job.deleteSourceFiles && (
															<Badge variant="outline" className="text-xs">
																Source files deleted
															</Badge>
														)}
													</div>

													{/* Timestamp */}
													<div className="flex items-center gap-1 text-xs text-gray-500">
														<Calendar className="h-3 w-3" />
														<span>{formatDate(job.createdAt)}</span>
													</div>

													{/* Error message */}
													{job.status === "failed" && job.error && (
														<p className="text-xs text-red-600 mt-1 truncate">
															{job.error}
														</p>
													)}
												</div>
											</div>

											<div className="flex gap-1">
												{job.status === "failed" && (
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
														onClick={(e) => handleReQuery(e, job)}
														disabled={reQueryingIds.has(job.id)}
														title="Re-query status from RunningHub"
													>
														<RefreshCw
															className={cn(
																"h-4 w-4",
																reQueryingIds.has(job.id) && "animate-spin",
															)}
														/>
													</Button>
												)}
												{job.runninghubTaskId && job.status !== "failed" && (
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
														onClick={(e) => handleReQuery(e, job)}
														disabled={reQueryingIds.has(job.id)}
														title="Re-query status from RunningHub"
													>
														<RefreshCw
															className={cn(
																"h-4 w-4",
																reQueryingIds.has(job.id) && "animate-spin",
															)}
														/>
													</Button>
												)}
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
													onClick={(e) => handleDeleteSingle(e, job.id)}
													title="Delete job"
												>
													<svg
														className="h-4 w-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1h1a1 1 0 001-1v-3a1 1 0 011-1h2a1 1 0 011 1v9"
														/>
													</svg>
												</Button>
											</div>
										</div>
									</Card>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</div>
			)}
		</div>
	);
}
