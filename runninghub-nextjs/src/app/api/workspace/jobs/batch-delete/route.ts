import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type BatchDeleteRequest = {
	jobIds: string[];
};

const isValidJobId = (jobId: string) => {
	if (!jobId.startsWith("job_")) return false;
	if (jobId !== path.basename(jobId)) return false;
	return !jobId.includes(path.sep);
};

export async function POST(request: NextRequest) {
	try {
		const body: BatchDeleteRequest = await request.json();
		const jobIds = Array.isArray(body.jobIds) ? body.jobIds : [];

		if (jobIds.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error: "No job IDs provided",
				},
				{ status: 400 },
			);
		}

		const workspaceDir = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
		);

		const deleted: string[] = [];
		const failed: string[] = [];

		for (const jobId of jobIds) {
			if (!isValidJobId(jobId)) {
				failed.push(jobId);
				continue;
			}
			const jobDir = path.join(workspaceDir, jobId);
			try {
				await fs.rm(jobDir, { recursive: true, force: true });
				deleted.push(jobId);
			} catch (error) {
				console.error(`Failed to delete job ${jobId}:`, error);
				failed.push(jobId);
			}
		}

		return NextResponse.json({
			success: failed.length === 0,
			deleted,
			failed,
			message:
				failed.length === 0
					? "Jobs deleted"
					: "Some jobs could not be deleted",
		});
	} catch (error) {
		console.error("Batch job delete error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to delete jobs",
			},
			{ status: 500 },
		);
	}
}
