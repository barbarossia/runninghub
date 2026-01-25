import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
	try {
		// Validate required environment variables
		const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
		const workflowId = process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID;
		const apiHost =
			process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn";

		if (!apiKey || !workflowId) {
			return NextResponse.json(
				{ error: "RunningHub API configuration missing" },
				{ status: 500 },
			);
		}

		// Use runninghub nodes command
		const cmd = ["python", "-m", "runninghub_cli.cli", "nodes"];

		// Set environment for subprocess
		const env = {
			...process.env,
			RUNNINGHUB_API_KEY: apiKey,
			RUNNINGHUB_WORKFLOW_ID: workflowId,
			RUNNINGHUB_API_HOST: apiHost,
		};

		console.log(`Running command: ${cmd.join(" ")}`);

		try {
			const { stdout, stderr } = await execAsync(cmd.join(" "), {
				env,
				timeout: 30000, // 30 second timeout
			});

			// Check if stderr contains error information
			if (stderr && stderr.trim()) {
				console.error("Failed to fetch nodes:", stderr);
				return NextResponse.json(
					{ error: "Failed to fetch nodes", details: stderr },
					{ status: 500 },
				);
			}

			return NextResponse.json({
				success: true,
				output: stdout,
			});
		} catch (error: unknown) {
			console.error("Error fetching nodes:", error);

			if (
				error instanceof Error &&
				(error as NodeJS.ErrnoException).code === "ETIMEDOUT"
			) {
				return NextResponse.json(
					{ error: "Request timed out" },
					{ status: 408 },
				);
			}

			return NextResponse.json(
				{
					error: "Failed to fetch nodes",
					details: error instanceof Error ? error.message : "Unknown error",
					stderr: (error as Error & { stderr?: string })?.stderr,
				},
				{ status: 500 },
			);
		}
	} catch (error) {
		console.error("Error in nodes endpoint:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
