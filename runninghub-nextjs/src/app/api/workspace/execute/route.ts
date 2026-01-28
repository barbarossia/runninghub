/**
 * Job Execution API
 * Executes a workflow with given inputs and creates a job
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";
import {
	enqueueJob,
	releaseSlot,
	takeNextQueued,
	tryAcquireSlot,
} from "@/lib/workspace-submit-queue";
import type {
	ExecuteJobRequest,
	ExecuteJobResponse,
	FileInputAssignment,
	Job,
	Workflow,
} from "@/types/workspace";

const MAX_CONCURRENT_SUBMISSIONS = parseInt(
	process.env.RUNNINGHUB_MAX_CONCURRENT_PROCESSES || "3",
	10,
);

let isDrainingQueue = false;

export async function POST(request: NextRequest) {
	try {
		const body: ExecuteJobRequest = await request.json();

		// Validate request
		if (!body.workflowId) {
			return NextResponse.json(
				{
					success: false,
					error: "Workflow ID is required",
				} as ExecuteJobResponse,
				{ status: 400 },
			);
		}

		if (
			(!body.fileInputs || body.fileInputs.length === 0) &&
			(!body.textInputs || Object.keys(body.textInputs).length === 0)
		) {
			return NextResponse.json(
				{
					success: false,
					error: "No inputs provided",
				} as ExecuteJobResponse,
				{ status: 400 },
			);
		}

		// Generate IDs
		const taskId = `workspace_job_${Date.now()}_${randomUUID().substring(0, 8)}`;
		const jobId = `job_${Date.now()}_${randomUUID().substring(0, 8)}`;

		// Initialize task in store
		await initTask(
			taskId,
			(body.fileInputs?.length || 0) +
				Object.keys(body.textInputs || {}).length,
		);

		// Prepare environment
		const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
		const apiHost =
			process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn";
		const downloadDir = process.env.RUNNINGHUB_DOWNLOAD_DIR;

		// Use sourceWorkflowId for CLI (template ID), fallback to workflowId
		const cliWorkflowId = body.sourceWorkflowId || body.workflowId;

		const env: NodeJS.ProcessEnv = {
			...process.env,
			RUNNINGHUB_API_KEY: apiKey!,
			RUNNINGHUB_WORKFLOW_ID: cliWorkflowId, // CLI needs template ID
			RUNNINGHUB_API_HOST: apiHost,
		};

		if (downloadDir) {
			env.RUNNINGHUB_DOWNLOAD_DIR = downloadDir;
		}

		// Create job directory and save initial job.json
		const fs = await import("fs/promises");
		const path = await import("path");
		const workspaceJobDir = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
			jobId,
		);
		await fs.mkdir(workspaceJobDir, { recursive: true });

		const initialJob: Job = {
			id: jobId,
			workflowId: body.workflowId,
			workflowName: body.workflowName || "Unknown Workflow",
			sourceWorkflowId: body.sourceWorkflowId,
			fileInputs: body.fileInputs || [],
			textInputs: body.textInputs || {},
			status: "pending",
			taskId: taskId,
			createdAt: Date.now(),
			folderPath: body.folderPath,
			deleteSourceFiles: body.deleteSourceFiles,
			parentJobId: body.parentJobId,
			seriesId: body.seriesId,
		};

		await fs.writeFile(
			path.join(workspaceJobDir, "job.json"),
			JSON.stringify(initialJob, null, 2),
		);

		// Filter and validate file inputs
		if (body.fileInputs && body.fileInputs.length > 0) {
			const missingRequiredFiles: string[] = [];
			const validFileInputs: FileInputAssignment[] = [];
			
			// Load workflow definition to check for required parameters
			const workflow = await getWorkflowById(body.workflowId);

			if (!workflow) {
				await writeLog(
					`Warning: Could not load workflow definition for ${body.workflowId}. Defaulting to strict existence check.`,
					"warning",
					taskId
				);
			}

			for (const input of body.fileInputs) {
				const exists = await fs
					.stat(input.filePath)
					.then(() => true)
					.catch(() => false);

				if (workflow) {
					// STRICT MODE: Validate against workflow definition
					const param = workflow.inputs.find(p => p.id === input.parameterId);

					if (!param) {
						// Ghost input: Assigned in UI but not in workflow definition
						await writeLog(
							`Ignoring ghost input: ${input.parameterId} (not in workflow definition)`,
							"warning",
							taskId
						);
						continue; // Skip this input completely
					}

					if (exists) {
						validFileInputs.push(input);
					} else {
						// File is missing, check requirement from workflow
						if (param.required) {
							missingRequiredFiles.push(input.filePath);
						} else {
							await writeLog(
								`Skipping missing optional file: ${path.basename(input.filePath)} (param: ${input.parameterId})`,
								"warning",
								taskId
							);
						}
					}
				} else {
					// FALLBACK MODE: Workflow not loaded
					// Assume everything is required if it's missing (safety first)
					// If it exists, we keep it (can't determine if it's a ghost input)
					if (exists) {
						validFileInputs.push(input);
					} else {
						missingRequiredFiles.push(input.filePath);
					}
				}
			}

			if (missingRequiredFiles.length > 0) {
				const errorMessage = `Missing input file(s): ${missingRequiredFiles.join(", ")}`;
				await updateTask(taskId, { status: "failed", error: errorMessage });
				await updateJobFile(jobId, {
					status: "failed",
					error: errorMessage,
					completedAt: Date.now(),
				});
				return NextResponse.json(
					{
						success: false,
						error: errorMessage,
					} as ExecuteJobResponse,
					{ status: 400 },
				);
			}

			// Update body.fileInputs with only the valid ones
			body.fileInputs = validFileInputs;
		}

		const canStartNow = await tryAcquireSlot(MAX_CONCURRENT_SUBMISSIONS);
		if (!canStartNow) {
			const position = await enqueueJob({
				jobId,
				taskId,
				workflowId: body.workflowId,
				enqueuedAt: Date.now(),
			});

			await updateTask(taskId, { status: "pending", error: undefined });
			await updateJobFile(jobId, {
				status: "queued",
				queuedAt: Date.now(),
				error: undefined,
				completedAt: undefined,
			});

			await writeLog(
				`Job queued due to capacity limit (position ${position})`,
				"info",
				taskId,
			);

			return NextResponse.json({
				success: true,
				taskId,
				jobId,
				message: "Job queued successfully",
			} as ExecuteJobResponse);
		}

		processWorkflowInBackground(
			taskId,
			jobId,
			body.workflowId, // Actual workflow ID for output config
			body.fileInputs || [],
			body.textInputs || {},
			body.deleteSourceFiles || false,
			env,
			body.seriesId,
		);

		return NextResponse.json({
			success: true,
			taskId,
			jobId,
			message: "Job started successfully",
		} as ExecuteJobResponse);
	} catch (error) {
		console.error("Job execution error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to execute job",
			} as ExecuteJobResponse,
			{ status: 500 },
		);
	}
}

/**
 * Upload local file to RunningHub
 * Returns remote fileName (e.g., "api/xxx.jpg")
 */
async function uploadFileToRunningHub(
	filePath: string,
	taskId: string,
): Promise<string> {
	try {
		await writeLog(`Uploading file to RunningHub: ${filePath}`, "info", taskId);

		const fs = await import("fs");
		const { default: FormData } = await import("form-data");
		const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;

		if (!apiKey) {
			throw new Error("RUNNINGHUB_API_KEY not configured");
		}

		// Create form data
		const form = new FormData();
		form.append("file", fs.createReadStream(filePath));
		form.append("apiKey", apiKey);
		form.append("fileType", "input");

		// Upload to RunningHub
		const response = await fetch(
			"https://www.runninghub.cn/task/openapi/upload",
			{
				method: "POST",
				body: form as any,
				headers: {
					Host: "www.runninghub.cn",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		if (data.code === 0 && data.data?.fileName) {
			await writeLog(
				`Uploaded successfully: ${data.data.fileName}`,
				"success",
				taskId,
			);
			return data.data.fileName;
		} else {
			throw new Error(data.msg || "Upload failed");
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "Upload failed";
		await writeLog(`File upload error: ${errorMsg}`, "error", taskId);
		throw error;
	}
}

/**
 * Helper to update job.json
 */
async function updateJobFile(jobId: string, updates: Partial<Job>) {
	const fs = await import("fs/promises");
	const path = await import("path");
	const jobFilePath = path.join(
		process.env.HOME || "~",
		"Downloads",
		"workspace",
		jobId,
		"job.json",
	);

	try {
		const content = await fs.readFile(jobFilePath, "utf-8");
		const job = JSON.parse(content);
		const updatedJob = { ...job, ...updates };
		await fs.writeFile(jobFilePath, JSON.stringify(updatedJob, null, 2));
	} catch (e) {
		console.error(`Failed to update job file for ${jobId}:`, e);
	}
}

async function readJobFile(jobId: string): Promise<Job | null> {
	const fs = await import("fs/promises");
	const path = await import("path");
	const jobFilePath = path.join(
		process.env.HOME || "~",
		"Downloads",
		"workspace",
		jobId,
		"job.json",
	);

	try {
		const content = await fs.readFile(jobFilePath, "utf-8");
		return JSON.parse(content) as Job;
	} catch (error) {
		console.error(`Failed to read job file for ${jobId}:`, error);
		return null;
	}
}

function buildEnvForJob(job: Job): NodeJS.ProcessEnv {
	const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
	const apiHost =
		process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn";
	const downloadDir = process.env.RUNNINGHUB_DOWNLOAD_DIR;
	const cliWorkflowId = job.sourceWorkflowId || job.workflowId;

	const env: NodeJS.ProcessEnv = {
		...process.env,
		RUNNINGHUB_API_KEY: apiKey!,
		RUNNINGHUB_WORKFLOW_ID: cliWorkflowId,
		RUNNINGHUB_API_HOST: apiHost,
	};

	if (downloadDir) {
		env.RUNNINGHUB_DOWNLOAD_DIR = downloadDir;
	}

	return env;
}

function extractCliCode(output: string): number | null {
	const lines = output.split("\n");
	const candidates: any[] = [];

	for (let startIndex = 0; startIndex < lines.length; startIndex++) {
		if (!lines[startIndex].includes("{")) continue;
		const firstBracePos = lines[startIndex].indexOf("{");
		let braceCount = 0;
		let endIndex = -1;

		for (let i = startIndex; i < lines.length; i++) {
			const line =
				i === startIndex ? lines[i].substring(firstBracePos) : lines[i];
			for (const char of line) {
				if (char === "{") braceCount++;
				if (char === "}") braceCount--;
			}
			if (braceCount === 0) {
				endIndex = i;
				break;
			}
		}

		if (endIndex >= 0) {
			try {
				const jsonStr = lines.slice(startIndex, endIndex + 1).join("\n");
				const jsonStart = firstBracePos > 0 ? jsonStr.indexOf("{") : 0;
				const parsed = JSON.parse(jsonStr.substring(jsonStart));
				if (parsed && parsed.code !== undefined) {
					candidates.push(parsed);
				}
			} catch {
				continue;
			}
		}
	}

	if (candidates.length === 0) return null;
	const last = candidates[candidates.length - 1];
	const parsedCode = Number(last.code);
	return Number.isFinite(parsedCode) ? parsedCode : null;
}

function isQueueFullError(stdout: string, stderr: string): boolean {
	const combined = `${stdout}\n${stderr}`;
	const code = extractCliCode(combined);
	if (code === 805) return true;
	if (combined.includes("TASK_QUEUE_MAXED")) return true;
	return /code\s*[:=]\s*805/i.test(combined);
}

async function startQueuedJob(jobId: string, taskId: string) {
	const job = await readJobFile(jobId);
	if (!job) {
		await releaseSlot();
		await drainQueue();
		return;
	}

	const env = buildEnvForJob(job);

	await processWorkflowInBackground(
		taskId,
		jobId,
		job.workflowId,
		job.fileInputs || [],
		job.textInputs || {},
		job.deleteSourceFiles,
		env,
		job.seriesId,
	);
}

async function drainQueue() {
	if (isDrainingQueue) return;
	isDrainingQueue = true;
	try {
		while (true) {
			const next = await takeNextQueued(MAX_CONCURRENT_SUBMISSIONS);
			if (!next) break;
			await writeLog(
				`Dequeued job ${next.jobId} for execution`,
				"info",
				next.taskId,
			);
			await startQueuedJob(next.jobId, next.taskId);
		}
	} finally {
		isDrainingQueue = false;
	}
}

/**
 * Helper to parse RunningHub task ID from CLI output
 * Looks for patterns like "Task ID: 1234567890" or "Task submitted successfully! Task ID: 1234567890"
 * Also parses task ID from CLI client print statement: "taskId": "12345"
 */
function parseRunningHubTaskId(stdout: string): string | null {
	const patterns = [
		/Task ID:\s*(\d+)/i,
		/task.*?id[:\s]+(\d+)/i,
		/taskid:\s*(\d+)/i,
		/"taskId"\s*:\s*"(\d+)"/i,
		/"taskId"\s*:\s*(\d+)/i,
	];

	for (const pattern of patterns) {
		const match = stdout.match(pattern);
		if (match && match[1]) {
			return match[1];
		}
	}

	return null;
}

/**
 * Process job outputs after CLI completion
 */
async function processJobOutputs(
	taskId: string,
	workflowId: string,
	jobId: string,
	env: NodeJS.ProcessEnv,
	cliStdout: string,
) {
	try {
		await writeLog("Processing job outputs...", "info", taskId);

		const fs = await import("fs/promises");
		const path = await import("path");

		// Get workflow output configuration from store
		const workflow = await getWorkflowById(workflowId);
		const outputConfig = workflow?.output;

		if (!outputConfig || outputConfig.type === "none") {
			await writeLog("No outputs configured for this workflow", "info", taskId);
			return;
		}

		// Parse CLI JSON response to extract file URLs
		let cliResponse: any = null;
		try {
			// Extract JSON from stdout (might be mixed with log lines)
			// Strategy: Find all JSON objects in stdout and try to parse them
			// We look for the one that matches RunningHub response structure (has code and data)
			const lines = cliStdout.split("\n");
			const validJsonObjects: any[] = [];

			for (let startIndex = 0; startIndex < lines.length; startIndex++) {
				// Look for lines that contain '{' (potential JSON start)
				if (!lines[startIndex].includes("{")) {
					continue;
				}

				// Find the position of the first '{' in this line
				const firstBracePos = lines[startIndex].indexOf("{");

				// Start counting braces from this position
				let braceCount = 0;
				let endIndex = -1;

				for (let i = startIndex; i < lines.length; i++) {
					const line =
						i === startIndex ? lines[i].substring(firstBracePos) : lines[i];

					for (const char of line) {
						if (char === "{") braceCount++;
						if (char === "}") braceCount--;
					}

					// When braces balance, we've found a complete JSON object
					if (braceCount === 0) {
						endIndex = i;
						break;
					}
				}

				// If we found a balanced JSON object, try to parse it
				if (endIndex >= 0) {
					try {
						const jsonStr = lines.slice(startIndex, endIndex + 1).join("\n");
						const jsonStart = firstBracePos > 0 ? jsonStr.indexOf("{") : 0;
						const jsonOnly = jsonStr.substring(jsonStart);

						const parsed = JSON.parse(jsonOnly);
						validJsonObjects.push(parsed);

						// Optimization: If this looks exactly like what we want, we can stop
						if (parsed.code !== undefined && Array.isArray(parsed.data)) {
							cliResponse = parsed;
							await writeLog(
								`Found valid response JSON at lines ${startIndex}-${endIndex}`,
								"info",
								taskId,
							);
							break;
						}
					} catch (e) {
						// This isn't valid JSON, continue searching
						continue;
					}
				}
			}

			// If we didn't find the perfect match, try to use the last valid object
			// (assuming result is usually at the end)
			if (!cliResponse && validJsonObjects.length > 0) {
				cliResponse = validJsonObjects[validJsonObjects.length - 1];
				await writeLog(
					`Using last found JSON object as response`,
					"info",
					taskId,
				);
			}

			if (cliResponse) {
				await writeLog(
					`CLI Response code: ${cliResponse.code}`,
					"info",
					taskId,
				);
			} else {
				await writeLog("No valid JSON found in CLI output", "warning", taskId);
				await writeLog(
					`CLI stdout preview: ${cliStdout.slice(0, 200)}...`,
					"info",
					taskId,
				);
			}
		} catch (parseError) {
			await writeLog(
				`Failed to parse CLI JSON response: ${parseError}`,
				"warning",
				taskId,
			);
			await writeLog(`CLI stdout: ${cliStdout.slice(0, 500)}`, "info", taskId);
		}

		if (
			!cliResponse ||
			cliResponse.code !== 0 ||
			!cliResponse.data ||
			cliResponse.data.length === 0
		) {
			await writeLog("No output files in CLI response", "warning", taskId);
			return;
		}

		// Workspace job directory: ~/Downloads/workspace/{jobId}/result/
		const workspaceJobDir = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
			jobId,
		);

		const workspaceOutputsDir = path.join(workspaceJobDir, "result");

		// Create workspace job directory and result subdirectory
		await fs.mkdir(workspaceOutputsDir, { recursive: true });

		// Download each output file from remote URL
		const outputFiles = cliResponse.data;
		await writeLog(
			`Found ${outputFiles.length} output file(s) in CLI response`,
			"info",
			taskId,
		);

		const processedOutputs: any[] = [];
		const textOutputs: any[] = [];

		for (const output of outputFiles) {
			const fileUrl = output.fileUrl;
			const fileType = output.fileType;

			if (!fileUrl) {
				await writeLog("Output missing fileUrl, skipping", "warning", taskId);
				continue;
			}

			try {
				// Extract filename from URL
				const urlParts = fileUrl.split("/");
				const fileName = urlParts[urlParts.length - 1];
				const workspacePath = path.join(workspaceOutputsDir, fileName);

				// Download file from remote URL
				await writeLog(`Downloading ${fileName}...`, "info", taskId);
				const response = await fetch(fileUrl);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const buffer = await response.arrayBuffer();
				const uint8Array = new Uint8Array(buffer);

				// Write to workspace outputs directory
				await fs.writeFile(workspacePath, uint8Array);

				// Determine file type based on extension
				const ext = path.extname(fileName).toLowerCase();
				let determinedFileType: "image" | "text" | "video" | "file" = "file";

				if (
					[".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"].includes(
						ext,
					)
				) {
					determinedFileType = "image";
				} else if ([".mp4", ".mov", ".avi", ".webm"].includes(ext)) {
					determinedFileType = "video";
				} else if (
					[".txt", ".md", ".json", ".log", ".xml", ".csv"].includes(ext)
				) {
					determinedFileType = "text";
				}

				if (determinedFileType === "text") {
					// Read text file content
					const content = await fs.readFile(workspacePath, "utf-8");

					textOutputs.push({
						fileName,
						filePath: workspacePath,
						content: {
							original: content,
							en: undefined,
							zh: undefined,
						},
						autoTranslated: false,
						translationError: undefined,
					});
				}

				processedOutputs.push({
					type: determinedFileType === "text" ? "text" : "file",
					path: workspacePath,
					fileName: fileName,
					fileType: determinedFileType,
					workspacePath: path.join(jobId, "result", fileName),
				});

				await writeLog(
					`Downloaded ${fileName} to workspace outputs`,
					"success",
					taskId,
				);
			} catch (downloadError) {
				const errorMsg =
					downloadError instanceof Error
						? downloadError.message
						: "Unknown error";
				await writeLog(
					`Failed to download ${fileUrl}: ${errorMsg}`,
					"error",
					taskId,
				);
			}
		}

		// Update job.json with results
		await updateJobFile(jobId, {
			results: {
				outputs: processedOutputs,
				textOutputs: textOutputs,
			},
		});

		// Note: Text translation will be done client-side
		// Server just prepares the files for download/viewing

		await writeLog("Output processing complete", "success", taskId);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Output processing failed";
		await writeLog(`Output processing error: ${errorMessage}`, "error", taskId);
	}
}

/**
 * Get workflow by ID from store or file
 */
async function getWorkflowById(
	workflowId: string,
): Promise<Workflow | undefined> {
	const path = await import("path");
	const fs = await import("fs/promises");

	try {
		const workflowDir = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
			"workflows",
		);
		const workflowPath = path.join(workflowDir, `${workflowId}.json`);

		const content = await fs.readFile(workflowPath, "utf-8");
		return JSON.parse(content) as Workflow;
	} catch (error) {
		console.error("Failed to load workflow:", error);
		return undefined;
	}
}

/**
 * Copy input files to job directory
 * Returns array of new file paths in job directory with all original metadata preserved
 */
async function copyInputFilesToJobDirectory(
	fileInputs: FileInputAssignment[],
	jobId: string,
	taskId: string,
): Promise<FileInputAssignment[]> {
	try {
		const fs = await import("fs/promises");
		const path = await import("path");

		// Create job directory
		const workspaceJobDir = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
			jobId,
		);
		await fs.mkdir(workspaceJobDir, { recursive: true });

		await writeLog(
			`Copying ${fileInputs.length} input file(s) to job directory`,
			"info",
			taskId,
		);

		const copiedFiles: FileInputAssignment[] = [];

		for (const input of fileInputs) {
			try {
				// Extract filename from original path
				const fileName = path.basename(input.filePath);
				const jobFilePath = path.join(workspaceJobDir, fileName);

				// Copy file to job directory
				await fs.copyFile(input.filePath, jobFilePath);

				await writeLog(`Copied ${fileName} to job directory`, "info", taskId);

				// Use the copied file path for CLI, but preserve all other metadata
				copiedFiles.push({
					...input, // Preserve all properties (fileName, fileSize, fileType, valid, etc.)
					filePath: jobFilePath, // Update only the path
				});
			} catch (copyError) {
				const errorMsg =
					copyError instanceof Error ? copyError.message : "Unknown error";
				await writeLog(
					`Failed to copy ${input.filePath}: ${errorMsg}`,
					"error",
					taskId,
				);
				// If copy fails, use original path
				copiedFiles.push(input);
			}
		}

		return copiedFiles;
	} catch (error) {
		const errorMsg =
			error instanceof Error ? error.message : "File copy failed";
		await writeLog(`Error copying input files: ${errorMsg}`, "error", taskId);
		// Return original paths if copy fails
		return fileInputs;
	}
}

async function processWorkflowInBackground(
	taskId: string,
	jobId: string,
	workflowId: string,
	fileInputs: FileInputAssignment[],
	textInputs: Record<string, string>,
	deleteSourceFiles: boolean,
	env: NodeJS.ProcessEnv,
	seriesId?: string,
) {
	try {
		await writeLog(`=== WORKFLOW JOB STARTED: ${taskId} ===`, "info", taskId);
		await writeLog(
			`Files: ${fileInputs.length}, Text Inputs: ${Object.keys(textInputs).length}`,
			"info",
			taskId,
		);
		await updateTask(taskId, { status: "processing", completedCount: 0 });

		// Update job status to running
		await updateJobFile(jobId, { status: "running", startedAt: Date.now() });

		// Copy input files to job directory and get new paths
		const jobFileInputs = await copyInputFilesToJobDirectory(
			fileInputs,
			jobId,
			taskId,
		);

		// Update job.json with the copied file paths (from job folder)
		// This ensures job history references files from job folder, not original location
		await updateJobFile(jobId, { fileInputs: jobFileInputs });

		// Handle source file deletion BEFORE execution
		// Since we've already copied the files to the job directory, it's safe to remove the originals from the gallery
		if (deleteSourceFiles) {
			await writeLog(
				"Cleaning up original source files from gallery...",
				"info",
				taskId,
			);
			try {
				const fs = await import("fs/promises");
				const path = await import("path");
				for (const input of fileInputs) {
					try {
						// Check if original path exists and is different from the new path
						// (it should be different since it's in the job folder now)
						if (
							await fs
								.stat(input.filePath)
								.then((s) => s.isFile())
								.catch(() => false)
						) {
							await fs.unlink(input.filePath);
							await writeLog(
								`Deleted original: ${path.basename(input.filePath)}`,
								"info",
								taskId,
							);
						}
					} catch (e) {
						await writeLog(
							`Failed to delete original ${input.filePath}: ${e}`,
							"warning",
							taskId,
						);
					}
				}
			} catch (e) {
				await writeLog(`Source cleanup failed: ${e}`, "error", taskId);
			}
		}

		// Clean up temporary uploads immediately after ensuring they are in the job folder
		// This prevents accumulation of files in ~/Downloads/workspace/uploads
		// SKIP if this is part of a complex workflow execution (files might be needed by subsequent steps)
		const isComplexExecution = seriesId && seriesId.startsWith("exec_");
		
		if (isComplexExecution) {
			await writeLog(
				"Skipping uploads cleanup (complex workflow execution detected)",
				"info",
				taskId,
			);
		} else {
			try {
				const fs = await import("fs/promises");
				const path = await import("path");
				// Check for uploads folder in path (platform agnostic)
				const uploadsDirMarker = path.join("workspace", "uploads");

				for (let i = 0; i < fileInputs.length; i++) {
					const originalPath = fileInputs[i].filePath;
					const newPath = jobFileInputs[i].filePath;

					// Only delete if:
					// 1. File was successfully copied (path changed)
					// 2. Original file is in the uploads directory
					// 3. We didn't already delete it in the deleteSourceFiles block above
					if (
						originalPath !== newPath &&
						originalPath.includes(uploadsDirMarker)
					) {
						try {
							// Check existence first to avoid errors if already deleted
							const exists = await fs
								.stat(originalPath)
								.then(() => true)
								.catch(() => false);
							if (exists) {
								await fs.unlink(originalPath);
								await writeLog(
									`Cleaned up temporary upload: ${path.basename(originalPath)}`,
									"info",
									taskId,
								);
							}
						} catch (cleanupError) {
							// Log but don't fail the job
							console.warn(
								`Failed to cleanup temporary file ${originalPath}:`,
								cleanupError,
							);
						}
					}
				}
			} catch (e) {
				console.error("Error during temporary file cleanup:", e);
			}
		}

		// Before executing CLI, get workflow info
		const workflow = await getWorkflowById(workflowId);
		const executionType = workflow?.executionType || "ai-app"; // Default to ai-app for backward compatibility
		await writeLog(`Execution type: ${executionType}`, "info", taskId);

		// Upload files to RunningHub if workflow execution type is 'workflow'
		// (workflow API requires remote file IDs, not local paths)
		if (executionType === "workflow") {
			await writeLog(
				"Workflow execution detected: uploading files to RunningHub...",
				"info",
				taskId,
			);

			// Upload each file and update jobFileInputs with remote fileName
			for (let i = 0; i < jobFileInputs.length; i++) {
				try {
					const remoteFileName = await uploadFileToRunningHub(
						jobFileInputs[i].filePath,
						taskId,
					);

					// Replace local path with remote fileName
					jobFileInputs[i] = {
						...jobFileInputs[i],
						filePath: remoteFileName, // Use remote fileName for CLI
					};
				} catch (uploadError) {
					await writeLog(
						`Failed to upload ${jobFileInputs[i].filePath}, using local path`,
						"warning",
						taskId,
					);
					// Fall back to local path if upload fails
				}
			}
		}

		// Force unbuffered output (-u) so logs appear in real-time
		const args: string[] = ["-u", "-m", "runninghub_cli.cli"];

		// Helper to extract node ID from parameter ID (e.g., "param_203" -> "203", "param_69_image" -> "69")
		const getNodeId = (paramId: string) => {
			// Remove param_ prefix
			const noPrefix = paramId.replace(/^param_/, "");
			// If it contains underscore, take the first part (assuming format ID_type)
			if (noPrefix.includes("_")) {
				return noPrefix.split("_")[0];
			}
			return noPrefix;
		};

		// Helper to determine field name from parameter ID and Workflow definition

		const getParamFieldName = (paramId: string, wf: Workflow | undefined) => {
			// First try to find in workflow definition

			if (wf) {
				const param = wf.inputs.find((p) => p.id === paramId);

				if (param && param.name) {
					return param.name;
				}
			}

			// Fallback: Remove param_ prefix

			const noPrefix = paramId.replace(/^param_/, "");

			// Try to extract ID and Name: start with number, then underscore, then rest

			// e.g., "143_multi_line_prompt" -> ID "143", Name "multi_line_prompt"

			// e.g., "7_width" -> ID "7", Name "width"

			const match = noPrefix.match(/^(\d+)_(.+)$/);

			if (match) {
				const candidate = match[2];

				// Filter out our own type suffixes if they are ALONE (e.g. "143_text")

				// If the candidate is EXACTLY "text", "value", or "image", we might still default to them

				// but if it's "multi_line_prompt", it passes this check.

				if (
					candidate !== "value" &&
					candidate !== "text" &&
					candidate !== "image"
				) {
					return candidate;
				}

				// If it is 'value' or 'text', it might be the actual field name (e.g. Primitive Node)

				// so we can return it too, but the regex match is better than split.

				return candidate;
			}

			const lowerId = noPrefix.toLowerCase();

			// Check for known suffixes/keywords which act as field names (Legacy/Fallback)

			if (lowerId.includes("width")) return "width";

			if (lowerId.includes("height")) return "height";

			if (lowerId.includes("seed")) return "seed";

			if (lowerId.includes("steps")) return "steps";

			if (lowerId.includes("cfg")) return "cfg";

			if (lowerId.includes("batch")) return "batch_size";

			if (lowerId.includes("denoise")) return "denoise";

			if (lowerId.includes("scheduler")) return "scheduler";

			if (lowerId.includes("sampler")) return "sampler_name";

			// Default fallback

			return "text";
		};

		// DECISION: Use execution type to determine CLI command

		if (executionType === "workflow") {
			// Workflow execution -> use 'run-workflow' or 'run-text-workflow' command

			if (jobFileInputs.length > 0) {
				// Has file inputs -> use 'run-workflow' command

				args.push("run-workflow");

				// Pass local workflow ID to allow CLI to load field mappings from JSON

				// The CLI will use this to map node IDs (e.g. 22) to field names (e.g. 'video')

				args.push("--workflow", workflowId);

				// Add file inputs

				for (const input of jobFileInputs) {
					// Format: <node_id>:<file_path>

					args.push(
						"--image",
						`${getNodeId(input.parameterId)}:${input.filePath}`,
					);
				}

				// Add text inputs

				for (const [paramId, value] of Object.entries(textInputs)) {
					// Format: <node_id>:<field_name>:<value>

					const fieldName = getParamFieldName(paramId, workflow);

					args.push("-p", `${getNodeId(paramId)}:${fieldName}:${value}`);
				}

				// Note: run-workflow doesn't support --no-cleanup flag
			} else {
				// No file inputs -> use 'run-text-workflow' command (text-only workflow)

				args.push("run-text-workflow");

				// Add text inputs

				// Note: run-text-workflow now supports explicit fieldName format: nodeId:fieldName:value

				for (const [paramId, value] of Object.entries(textInputs)) {
					const nodeId = getNodeId(paramId);

					const fieldName = getParamFieldName(paramId, workflow);

					// Construct format that CLI recognizes: nodeId:fieldName:value

					args.push("-p", `${nodeId}:${fieldName}:${value}`);
				}

				// Note: run-text-workflow doesn't support --no-cleanup flag
			}
		} else {
			// AI app execution -> use 'process' or 'process-multiple' command
			if (jobFileInputs.length === 1) {
				// Single file mode -> use 'process' command
				const input = jobFileInputs[0];
				args.push("process");
				args.push(input.filePath);
				args.push("--node", getNodeId(input.parameterId));

				// Add text inputs as params
				// Add text inputs as params
				for (const [paramId, value] of Object.entries(textInputs)) {
					// Format: <node_id>:<field_name>:<value>
					const fieldName = getParamFieldName(paramId, workflow);
					args.push("-p", `${getNodeId(paramId)}:${fieldName}:${value}`);
				}

				// Handle cleanup flag
				// CLI behavior: Default is to delete the source file it was given.
				// Since we've already manually deleted the originals from the gallery,
				// and we want to keep the copies in the job folder, we ALWAYS pass --no-cleanup.
				args.push("--no-cleanup");
			} else {
				// Multiple files (or 0 files with just params) -> use 'process-multiple' command
				args.push("process-multiple");

				// Pass local workflow ID to allow CLI to load field mappings from JSON
				args.push("--workflow", workflowId);

				// Add file inputs
				for (const input of jobFileInputs) {
					// Format: <node_id>:<file_path>
					args.push(
						"--image",
						`${getNodeId(input.parameterId)}:${input.filePath}`,
					);
				}

				// Add text inputs
				// Add text inputs as params
				for (const [paramId, value] of Object.entries(textInputs)) {
					// Format: <node_id>:<field_name>:<value>
					const fieldName = getParamFieldName(paramId, workflow);
					args.push("-p", `${getNodeId(paramId)}:${fieldName}:${value}`);
				}

				// Note: process-multiple in CLI doesn't support --no-cleanup yet, but it doesn't auto-delete either
			}
		}

		// Add workflow ID explicitly if provided
		if (env.RUNNINGHUB_WORKFLOW_ID) {
			args.push("--workflow-id", env.RUNNINGHUB_WORKFLOW_ID);
		}

		// Add common flags
		args.push("--json"); // Output JSON for better parsing (though we rely on logs mostly)

		await writeLog(
			`Executing command: python ${args.join(" ")}`,
			"info",
			taskId,
		);

		// Set working directory to job folder so CLI output files are saved there, not in Downloads
		const path = await import("path");
		const jobDir = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
			jobId,
		);

		const childProcess = spawn("python", args, {
			cwd: jobDir, // Set working directory to job folder
			env,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";
		let foundRunningHubTaskId = false; // Track if we've already saved the task ID

		childProcess.stdout?.on("data", (data: Buffer) => {
			const text = data.toString();
			stdout += text;
			writeLog(text.trim(), "info", taskId);

			// Try to parse RunningHub task ID from stdout (only once)
			if (!foundRunningHubTaskId) {
				const runningHubTaskId = parseRunningHubTaskId(stdout);
				if (runningHubTaskId) {
					foundRunningHubTaskId = true;
					writeLog(
						`Found RunningHub task ID: ${runningHubTaskId}`,
						"info",
						taskId,
					);
					// Save to job.json
					updateJobFile(jobId, { runninghubTaskId: runningHubTaskId });
				}
			}
		});

		childProcess.stderr?.on("data", (data: Buffer) => {
			const text = data.toString();
			stderr += text;
			writeLog(text.trim(), "warning", taskId);
		});

		childProcess.on("close", async (code) => {
			if (code === 0) {
				await writeLog(
					"Workflow execution completed successfully",
					"success",
					taskId,
				);
				await updateTask(taskId, {
					status: "completed",
					completedCount: fileInputs.length + Object.keys(textInputs).length,
				});

				await updateJobFile(jobId, {
					status: "completed",
					completedAt: Date.now(),
				});

				await processJobOutputs(taskId, workflowId, jobId, env, stdout);
				await releaseSlot();
				await drainQueue();
				return;
			}

			if (isQueueFullError(stdout, stderr)) {
				await writeLog(
					"RunningHub queue is full (code 805). Re-queuing job.",
					"warning",
					taskId,
				);
				await updateTask(taskId, { status: "pending", error: undefined });
				await updateJobFile(jobId, {
					status: "queued",
					queuedAt: Date.now(),
					error: undefined,
					completedAt: undefined,
				});
				await enqueueJob({
					jobId,
					taskId,
					workflowId,
					enqueuedAt: Date.now(),
				});
				await releaseSlot();
				await drainQueue();
				return;
			}

			await writeLog(
				`Workflow execution failed with code ${code}`,
				"error",
				taskId,
			);
			await updateTask(taskId, {
				status: "failed",
				error: `Exit code ${code}`,
			});

			await updateJobFile(jobId, {
				status: "failed",
				error: `Exit code ${code}`,
				completedAt: Date.now(),
			});
			await releaseSlot();
			await drainQueue();
		});

		childProcess.on("error", async (error) => {
			await writeLog(`Process error: ${error.message}`, "error", taskId);
			await updateTask(taskId, { status: "failed", error: error.message });

			await updateJobFile(jobId, {
				status: "failed",
				error: error.message,
				completedAt: Date.now(),
			});
			await releaseSlot();
			await drainQueue();
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		await writeLog(`Job failed to start: ${errorMessage}`, "error", taskId);
		await updateTask(taskId, { status: "failed", error: errorMessage });

		// Update job status
		await updateJobFile(jobId, {
			status: "failed",
			error: errorMessage,
			completedAt: Date.now(),
		});
		await releaseSlot();
		await drainQueue();
	}
}
