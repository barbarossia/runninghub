/**
 * Job Series Navigation Component
 * Shows navigation for all jobs in a series
 */

"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import type { Job } from "@/types/workspace";

export interface JobSeriesNavProps {
	jobs: Job[];
	currentJobId: string;
	onSelectJob: (jobId: string) => void;
	className?: string;
}

export function JobSeriesNav({
	jobs,
	currentJobId,
	onSelectJob,
	className = "",
}: JobSeriesNavProps) {
	if (jobs.length <= 1) {
		return null; // Don't show navigation if only one job
	}

	// Get status color for job
	const getStatusColor = (status: Job["status"]) => {
		switch (status) {
			case "queued":
				return "bg-amber-100 text-amber-800 hover:bg-amber-200";
			case "pending":
				return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
			case "running":
				return "bg-blue-100 text-blue-800 hover:bg-blue-200";
			case "completed":
				return "bg-green-100 text-green-800 hover:bg-green-200";
			case "failed":
				return "bg-red-100 text-red-800 hover:bg-red-200";
		}
	};

	// Get status icon
	const getStatusIcon = (status: Job["status"]) => {
		const iconClassName = "h-3 w-3";
		switch (status) {
			case "queued":
				return <Clock className={iconClassName} />;
			case "pending":
				return <Clock className={iconClassName} />;
			case "running":
				return <Loader2 className={cn(iconClassName, "animate-spin")} />;
			case "completed":
				return <CheckCircle2 className={iconClassName} />;
			case "failed":
				return <XCircle className={iconClassName} />;
		}
	};

	return (
		<div className={cn("flex items-center gap-2 flex-wrap", className)}>
			<span className="text-sm text-gray-600 font-medium">Run:</span>
			{jobs.map((job, index) => (
				<button
					key={job.id}
					onClick={() => onSelectJob(job.id)}
					className={cn(
						"px-2 py-1 text-sm rounded transition-all font-medium flex items-center gap-1",
						job.id === currentJobId
							? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
							: getStatusColor(job.status),
					)}
					title={`Run #${job.runNumber || index + 1} - ${job.status}`}
				>
					{getStatusIcon(job.status)}#{job.runNumber || index + 1}
				</button>
			))}
		</div>
	);
}
