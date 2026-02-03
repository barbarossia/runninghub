import type { Job, JobStatus } from "@/types/workspace";

export const getDisplayJobStatus = (job: Job): JobStatus => {
	if (job.error) return "failed";
	if (job.completedAt) return "completed";
	if (job.queuedAt) return "queued";
	if (!job.runninghubTaskId && job.status === "running") return "pending";
	return job.status;
};
