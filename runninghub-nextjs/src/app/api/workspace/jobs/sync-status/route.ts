import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { Job } from "@/types/workspace";
import { getDisplayJobStatus } from "@/utils/job-status";

type SyncMode = "trusted" | "smart";

type SyncRequest = {
	jobIds?: string[];
	mode?: SyncMode;
	maxJobs?: number;
};

type ResolvedJobStatus = {
	id: string;
	workflowId: string;
	workflowName?: string;
	status: string;
	timestamp: number;
	verified: boolean;
	source: "runninghub" | "local";
	reason?: string;
};

type RunningHubResponse = {
	code: number;
	msg?: string;
	message?: string;
	data?: any;
};

const DEFAULT_MAX_JOBS = 25;
const SMART_SYNC_TTL_MS = 60_000;

const getJobTimestamp = (job: Job): number => {
	return job.completedAt || job.startedAt || job.queuedAt || job.createdAt;
};

const mapRemoteStatus = (
	response: RunningHubResponse,
): { status: string; isTerminal: boolean; error?: string } => {
	const code = response.code;
	const data = response.data;
	const message = response.msg || response.message;

	if (code === 0) {
		if (Array.isArray(data) && data.length > 0) {
			return { status: "completed", isTerminal: true };
		}
		if (data && typeof data === "object") {
			const rawStatus = String(data.status || "").toLowerCase();
			if (rawStatus) {
				if (rawStatus === "running") {
					return { status: "running", isTerminal: false };
				}
				if (rawStatus === "queued") {
					return { status: "queued", isTerminal: false };
				}
				if (rawStatus === "pending") {
					return { status: "pending", isTerminal: false };
				}
				if (rawStatus === "completed" || rawStatus === "succeeded") {
					return { status: "completed", isTerminal: true };
				}
				if (rawStatus === "failed" || rawStatus === "error") {
					return { status: "failed", isTerminal: true, error: message };
				}
			}
		}
		return { status: "completed", isTerminal: true };
	}

	if (code === 804) {
		return { status: "running", isTerminal: false };
	}

	if (code === 813) {
		return { status: "queued", isTerminal: false };
	}

	if (code === 805) {
		return { status: "failed", isTerminal: true, error: message };
	}

	if (data && typeof data === "object" && data.status) {
		const rawStatus = String(data.status || "").toLowerCase();
		if (rawStatus === "running") {
			return { status: "running", isTerminal: false };
		}
		if (rawStatus === "queued") {
			return { status: "queued", isTerminal: false };
		}
		if (rawStatus === "pending") {
			return { status: "pending", isTerminal: false };
		}
		if (rawStatus === "completed" || rawStatus === "succeeded") {
			return { status: "completed", isTerminal: true };
		}
		if (rawStatus === "failed" || rawStatus === "error") {
			return { status: "failed", isTerminal: true, error: message };
		}
	}

	return { status: "unknown", isTerminal: false, error: message };
};

const isLocalWorkflowJob = (job: Job): boolean => {
	if (job.workflowId?.startsWith("local_")) return true;
	if (job.sourceWorkflowId?.startsWith("local_")) return true;
	return false;
};

const shouldSyncRemotely = (job: Job, mode: SyncMode): boolean => {
	if (isLocalWorkflowJob(job)) return false;
	if (!job.runninghubTaskId) return false;
	if (mode === "trusted") return true;
	if (!job.lastStatusSyncAt) return true;
	if (!job.lastStatusSource || job.lastStatusSource !== "runninghub") return true;
	return Date.now() - job.lastStatusSyncAt > SMART_SYNC_TTL_MS;
};

const loadJobsFromDisk = async (): Promise<Job[]> => {
	const workspaceDir = path.join(
		process.env.HOME || "~",
		"Downloads",
		"workspace",
	);
	try {
		await fs.access(workspaceDir);
	} catch {
		return [];
	}

	const entries = await fs.readdir(workspaceDir, { withFileTypes: true });
	const jobDirs = entries.filter(
		(entry) => entry.isDirectory() && entry.name.startsWith("job_"),
	);

	const jobs: Job[] = [];
	for (const jobDir of jobDirs) {
		try {
			const jobJsonPath = path.join(workspaceDir, jobDir.name, "job.json");
			const content = await fs.readFile(jobJsonPath, "utf-8");
			const job = JSON.parse(content) as Job;
			if (job.id && job.workflowId) {
				jobs.push(job);
			}
		} catch {
			// Ignore invalid/missing job.json
		}
	}

	jobs.sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a));
	return jobs;
};

const updateJobFile = async (jobId: string, updates: Partial<Job>) => {
	const jobFilePath = path.join(
		process.env.HOME || "~",
		"Downloads",
		"workspace",
		jobId,
		"job.json",
	);

	try {
		const content = await fs.readFile(jobFilePath, "utf-8");
		const job = JSON.parse(content) as Job;
		const updatedJob = { ...job, ...updates };
		await fs.writeFile(jobFilePath, JSON.stringify(updatedJob, null, 2));
	} catch (error) {
		console.error(`Failed to update job file for ${jobId}:`, error);
	}
};

const withConcurrency = async <T,>(
	items: T[],
	limit: number,
	handler: (item: T, index: number) => Promise<void>,
) => {
	let index = 0;
	await Promise.all(
		Array.from({ length: Math.max(1, limit) }).map(async () => {
			while (index < items.length) {
				const currentIndex = index++;
				const item = items[currentIndex];
				await handler(item, currentIndex);
			}
		}),
	);
};

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json().catch(() => ({}))) as SyncRequest;
		const mode: SyncMode = body.mode || "trusted";
		const maxJobs = Math.max(1, body.maxJobs || DEFAULT_MAX_JOBS);

		const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
		const apiHost =
			process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn";

		const allJobs = await loadJobsFromDisk();
		const filteredJobs = body.jobIds?.length
			? allJobs.filter((job) => body.jobIds?.includes(job.id))
			: allJobs;
		const targetJobs = filteredJobs.slice(0, maxJobs);

		const resolvedJobs: ResolvedJobStatus[] = new Array(targetJobs.length);
		const errors: Array<{ jobId: string; error: string }> = [];

		await withConcurrency(targetJobs, 3, async (job, idx) => {
			if (isLocalWorkflowJob(job)) {
				const now = Date.now();
				await updateJobFile(job.id, {
					lastStatusSyncAt: now,
					lastStatusSource: "local",
				});

				resolvedJobs[idx] = {
					id: job.id,
					workflowId: job.workflowId,
					workflowName: job.workflowName,
					status: job.status,
					timestamp: getJobTimestamp(job),
					verified: true,
					source: "local",
					reason: "local_workflow",
				};
				return;
			}

			if (!job.runninghubTaskId) {
				const displayStatus = getDisplayJobStatus(job);
				resolvedJobs[idx] = {
					id: job.id,
					workflowId: job.workflowId,
					workflowName: job.workflowName,
					status: displayStatus,
					timestamp: getJobTimestamp(job),
					verified: false,
					source: "local",
					reason: "missing_runninghub_task_id",
				};
				return;
			}

			if (!shouldSyncRemotely(job, mode)) {
				resolvedJobs[idx] = {
					id: job.id,
					workflowId: job.workflowId,
					workflowName: job.workflowName,
					status: job.status,
					timestamp: getJobTimestamp(job),
					verified: true,
					source: "runninghub",
					reason: "recently_verified",
				};
				return;
			}

			if (!apiKey) {
				resolvedJobs[idx] = {
					id: job.id,
					workflowId: job.workflowId,
					workflowName: job.workflowName,
					status: "unknown",
					timestamp: getJobTimestamp(job),
					verified: false,
					source: "local",
					reason: "missing_api_key",
				};
				return;
			}

			try {
				const response = await fetch(`https://${apiHost}/task/openapi/outputs`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						apiKey,
						taskId: job.runninghubTaskId,
					}),
				});

				if (!response.ok) {
					throw new Error(
						`RunningHub API error: ${response.status} ${response.statusText}`,
					);
				}

				const data = (await response.json()) as RunningHubResponse;
				const mapping = mapRemoteStatus(data);
				const now = Date.now();

				if (mapping.status !== "unknown") {
					const updates: Partial<Job> = {
						status: mapping.status as Job["status"],
						lastStatusSyncAt: now,
						lastStatusSource: "runninghub",
						lastRemoteCode: data.code,
						lastRemoteMessage: data.msg || data.message,
					};

					if (mapping.isTerminal) {
						updates.completedAt = job.completedAt || now;
					}

					if (mapping.status === "failed") {
						updates.error = mapping.error || job.error;
					} else if (mapping.status !== "failed") {
						updates.error = undefined;
					}

					await updateJobFile(job.id, updates);
				}

				resolvedJobs[idx] = {
					id: job.id,
					workflowId: job.workflowId,
					workflowName: job.workflowName,
					status: mapping.status,
					timestamp: getJobTimestamp(job),
					verified: mapping.status !== "unknown",
					source: "runninghub",
					reason:
						mapping.status === "unknown" ? "remote_unknown_status" : undefined,
				};
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to sync job status";
				errors.push({ jobId: job.id, error: message });
				resolvedJobs[idx] = {
					id: job.id,
					workflowId: job.workflowId,
					workflowName: job.workflowName,
					status: "unknown",
					timestamp: getJobTimestamp(job),
					verified: false,
					source: "local",
					reason: "remote_error",
				};
			}
		});

		const finalizedJobs = resolvedJobs.filter(
			(job): job is ResolvedJobStatus => Boolean(job),
		);

		return NextResponse.json({
			success: true,
			resolvedJobs: finalizedJobs,
			errors,
			mode,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to sync job statuses";
		return NextResponse.json(
			{ success: false, error: message },
			{ status: 500 },
		);
	}
}
