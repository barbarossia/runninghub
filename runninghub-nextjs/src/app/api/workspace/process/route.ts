/**
 * Workspace file processing API endpoint
 * Processes uploaded images through RunningHub workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import crypto from "crypto";
import type { ProcessRequest, ProcessResponse } from "@/types/workspace";
import { ENVIRONMENT_VARIABLES, ERROR_MESSAGES } from "@/constants";

export async function POST(request: NextRequest) {
	let taskId: string | null = null;

	try {
		const body = await request.json();
		const { files, workflowId, workspacePath } = body as ProcessRequest;

		// Validate inputs
		if (!workflowId) {
			return NextResponse.json(
				{
					success: false,
					taskId: "",
					message: ERROR_MESSAGES.NO_WORKFLOW_ID,
					error: ERROR_MESSAGES.NO_WORKFLOW_ID,
				},
				{ status: 400 },
			);
		}

		if (!files || files.length === 0) {
			return NextResponse.json(
				{
					success: false,
					taskId: "",
					message: ERROR_MESSAGES.NO_FILES_SELECTED,
					error: ERROR_MESSAGES.NO_FILES_SELECTED,
				},
				{ status: 400 },
			);
		}

		if (!workspacePath) {
			return NextResponse.json(
				{
					success: false,
					taskId: "",
					message: ERROR_MESSAGES.WORKSPACE_NOT_CONFIGURED,
					error: ERROR_MESSAGES.WORKSPACE_NOT_CONFIGURED,
				},
				{ status: 400 },
			);
		}

		// Generate task ID
		taskId = crypto.randomBytes(16).toString("hex");

		// Get Python CLI path
		const pythonCliPath = path.resolve(
			process.cwd(),
			ENVIRONMENT_VARIABLES.PYTHON_CLI_PATH,
		);

		// Process each file
		const promises = files.map((filePath) => {
			return new Promise<void>((resolve, reject) => {
				const args = [
					"-m",
					"runninghub_cli.cli",
					"process",
					filePath,
					"--workflow",
					workflowId,
					"--output-dir",
					workspacePath,
				];

				const pythonProcess = spawn("python3", args, {
					cwd: pythonCliPath,
					env: {
						...process.env,
						RUNNINGHUB_API_KEY: ENVIRONMENT_VARIABLES.API_KEY,
						RUNNINGHUB_WORKFLOW_ID: workflowId,
						RUNNINGHUB_API_HOST: ENVIRONMENT_VARIABLES.API_HOST,
					},
				});

				let stdout = "";
				let stderr = "";

				pythonProcess.stdout?.on("data", (data) => {
					stdout += data.toString();
				});

				pythonProcess.stderr?.on("data", (data) => {
					stderr += data.toString();
				});

				pythonProcess.on("close", (code) => {
					if (code === 0) {
						resolve();
					} else {
						reject(new Error(stderr || `Process exited with code ${code}`));
					}
				});

				pythonProcess.on("error", (err) => {
					reject(err);
				});
			});
		});

		// Start processing in background
		Promise.all(promises)
			.then(() => {
				console.log(`Task ${taskId} completed successfully`);
			})
			.catch((error) => {
				console.error(`Task ${taskId} failed:`, error);
			});

		return NextResponse.json({
			success: true,
			taskId,
			message: `Processing ${files.length} file(s)`,
		});
	} catch (error) {
		console.error("Process error:", error);
		return NextResponse.json(
			{
				success: false,
				taskId: taskId || "",
				message: "Failed to start processing",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
