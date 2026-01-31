"use client";

import { useEffect, useMemo, type ComponentType } from "react";
import { useMessageCenterStore } from "@/store/message-center-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Loader2,
	MessageSquare,
	Minimize2,
	Pin,
	PinOff,
	Trash2,
	X,
} from "lucide-react";
import type { Job, JobStatus } from "@/types/workspace";

const statusStyles: Record<JobStatus, { label: string; className: string }> = {
	queued: { label: "Queued", className: "text-slate-600" },
	pending: { label: "Pending", className: "text-slate-600" },
	running: { label: "Running", className: "text-blue-600" },
	completed: { label: "Completed", className: "text-emerald-600" },
	failed: { label: "Failed", className: "text-red-600" },
};

const statusIcons: Record<JobStatus, ComponentType<{ className?: string }>> = {
	queued: Clock,
	pending: Clock,
	running: Loader2,
	completed: CheckCircle2,
	failed: AlertCircle,
};

const formatTimestamp = (timestamp?: number): string => {
	if (!timestamp) return "—";
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(timestamp));
};

const getJobTimestamp = (job: Job): number => {
	return job.completedAt || job.startedAt || job.queuedAt || job.createdAt;
};

export function MessageCenter() {
	const jobs = useWorkspaceStore((state) => state.jobs);
	const {
		isOpen,
		dockMode,
		dismissedJobIds,
		setOpen,
		toggleDockMode,
		markRead,
		dismissJob,
		dismissJobs,
		syncJobStatus,
	} = useMessageCenterStore();

	useEffect(() => {
		jobs.forEach((job) => {
			syncJobStatus(job.id, job.status);
		});
	}, [jobs, syncJobStatus]);

	const visibleJobs = useMemo(() => {
		const dismissedSet = new Set(dismissedJobIds);
		return jobs
			.filter((job) => !dismissedSet.has(job.id))
			.sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a));
	}, [jobs, dismissedJobIds]);

	useEffect(() => {
		if (isOpen && visibleJobs.length > 0) {
			markRead(visibleJobs.map((job) => job.id));
		}
	}, [isOpen, visibleJobs, markRead]);

	const isDocked = dockMode === "dock";

	const containerClassName = cn(
		isDocked ? "" : "fixed bottom-4 right-4 z-50",
	);

	const headerActionClassName = "h-7 w-7";

	if (!isOpen) {
		return null;
	}

	return (
		<div className={containerClassName}>
			<Card className="w-[320px] border border-blue-100 bg-white/95 shadow-lg backdrop-blur">
				<div className="flex items-center justify-between border-b border-blue-100 px-3 py-2">
					<div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
						<MessageSquare className="h-4 w-4 text-blue-600" />
						Message Center
					</div>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className={headerActionClassName}
							onClick={toggleDockMode}
							title={isDocked ? "Float" : "Dock"}
						>
							{isDocked ? (
								<PinOff className="h-3.5 w-3.5" />
							) : (
								<Pin className="h-3.5 w-3.5" />
							)}
						</Button>
					<Button
						variant="ghost"
						size="icon"
						className={headerActionClassName}
						onClick={() => dismissJobs(visibleJobs.map((job) => job.id))}
						title="Clear"
						disabled={visibleJobs.length === 0}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className={headerActionClassName}
						onClick={() => setOpen(false)}
						title="Minimize"
					>
						<Minimize2 className="h-3.5 w-3.5" />
					</Button>
					</div>
				</div>
				<div className="max-h-[360px] space-y-2 overflow-y-auto px-3 py-3 text-xs text-gray-600">
					{visibleJobs.length === 0 ? (
						<div className="flex flex-col items-center gap-2 py-6 text-gray-500">
							<MessageSquare className="h-6 w-6 text-blue-400" />
							<span>No job messages yet</span>
						</div>
					) : (
						visibleJobs.map((job) => {
							const status = statusStyles[job.status];
							const StatusIcon = statusIcons[job.status];
							return (
								<div
									key={job.id}
									className="rounded-md border border-gray-200 bg-white/80 px-2.5 py-2"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="flex min-w-0 items-start gap-2">
											<StatusIcon
												className={cn(
													"h-4 w-4",
													status.className,
													job.status === "running" && "animate-spin",
												)}
											/>
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<span className="truncate text-sm font-semibold text-gray-800">
														{job.workflowName || "Job"}
													</span>
													<Badge variant="secondary" className="capitalize">
														{status.label}
													</Badge>
												</div>
												<div className="text-[11px] text-gray-500">
													{formatTimestamp(getJobTimestamp(job))}
													{job.taskId && ` • Task ${job.taskId}`}
												</div>
												{job.error && job.status === "failed" && (
													<div className="mt-1 text-[11px] text-red-600 line-clamp-2">
														{job.error}
													</div>
												)}
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6"
											onClick={() => dismissJob(job.id)}
											title="Dismiss"
										>
											<X className="h-3 w-3" />
										</Button>
									</div>
								</div>
							);
						})
					)}
				</div>
			</Card>
		</div>
	);
}
