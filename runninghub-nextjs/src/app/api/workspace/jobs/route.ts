import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { Job } from "@/types/workspace";

export async function GET() {
	try {
		const workspaceDir = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
		);

		// Ensure workspace directory exists
		try {
			await fs.access(workspaceDir);
		} catch {
			return NextResponse.json({ jobs: [] });
		}

		const entries = await fs.readdir(workspaceDir, { withFileTypes: true });

		// Filter for directories that look like jobs (start with 'job_')
		const jobDirs = entries.filter(
			(entry) => entry.isDirectory() && entry.name.startsWith("job_"),
		);

		const jobs: Job[] = [];

		for (const jobDir of jobDirs) {
			try {
				const jobJsonPath = path.join(workspaceDir, jobDir.name, "job.json");
				const content = await fs.readFile(jobJsonPath, "utf-8");
				const job = JSON.parse(content);

				// Basic validation to ensure it's a valid job object
				if (job.id && job.workflowId) {
					jobs.push(job);
				}
			} catch (e) {
				// Skip invalid or missing job.json
				// It's normal for folders without job.json (e.g. partial writes or other folders)
				// console.warn(`Failed to read job.json in ${jobDir.name}`, e);
			}
		}

		// Sort by createdAt desc
		jobs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

		return NextResponse.json({ jobs });
	} catch (error) {
		console.error("Failed to list jobs:", error);
		return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 });
	}
}
