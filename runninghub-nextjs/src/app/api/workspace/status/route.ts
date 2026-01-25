/**
 * Query Job Status from RunningHub API
 * Queries the current status of a job's task from RunningHub without submitting a new task
 */

import { NextRequest, NextResponse } from "next/server";
import { writeLog } from "@/lib/logger";
import { updateTask } from "@/lib/task-store";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { jobId, taskId, runninghubTaskId } = body;

		if (!runninghubTaskId) {
			return NextResponse.json(
				{
					success: false,
					error: "RunningHub task ID is required",
				},
				{ status: 400 },
			);
		}

		await writeLog(
			`Querying task status from RunningHub: ${runninghubTaskId}`,
			"info",
			taskId || runninghubTaskId,
		);

		// Query RunningHub API for task status
		const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
		const apiHost =
			process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn";

		if (!apiKey) {
			throw new Error("RUNNINGHUB_API_KEY not configured");
		}

		const response = await fetch(`https://${apiHost}/task/openapi/outputs`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				apiKey,
				taskId: runninghubTaskId,
			}),
		});

		if (!response.ok) {
			throw new Error(
				`RunningHub API error: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();

		await writeLog(
			`RunningHub API response: ${JSON.stringify(data).slice(0, 200)}`,
			"info",
			taskId || runninghubTaskId,
		);

		// Parse RunningHub response
		if (data.code !== 0) {
			throw new Error(data.msg || "Failed to query task status");
		}

		const taskData = data.data;

		// Check if taskData is an array (output files) or object (task status)
		// When completed with outputs: data is an array of file objects
		// When running/pending: data is an object with status field
		const hasOutputFiles = Array.isArray(taskData) && taskData.length > 0;

		let taskStatus: string;
		let outputFiles: any[] = [];

		if (hasOutputFiles) {
			// Task is completed with output files
			taskStatus = "completed";
			outputFiles = taskData;
			await writeLog(
				`Task completed with ${outputFiles.length} output files`,
				"success",
				taskId || runninghubTaskId,
			);
		} else if (taskData && typeof taskData === "object") {
			// Task status object
			taskStatus = taskData.status || "pending";
		} else {
			taskStatus = "pending";
		}

		// Map RunningHub status to our job/task status
		let taskMappedStatus: "pending" | "processing" | "completed" | "failed" =
			"pending";
		let jobMappedStatus: "pending" | "running" | "completed" | "failed" =
			"pending";

		if (taskStatus === "running") {
			taskMappedStatus = "processing";
			jobMappedStatus = "running";
		} else if (taskStatus === "completed" || taskStatus === "succeeded") {
			taskMappedStatus = "completed";
			jobMappedStatus = "completed";
		} else if (taskStatus === "failed" || taskStatus === "error") {
			taskMappedStatus = "failed";
			jobMappedStatus = "failed";
		}

		await writeLog(
			`Task status: ${taskStatus} -> job:${jobMappedStatus} task:${taskMappedStatus}`,
			"info",
			taskId || runninghubTaskId,
		);

		// Update task in local store (only if we have a local taskId)
		if (taskId) {
			await updateTask(taskId, {
				status: taskMappedStatus,
				completedCount: taskData.processedCount || 0,
			});
		}

		// If job ID is provided, update job.json file
		if (jobId) {
			const fs = await import("fs/promises");
			const path = await import("path");

			const jobFilePath = path.join(
				process.env.HOME || "~",
				"Downloads",
				"workspace",
				jobId,
				"job.json",
			);

			const resultDir = path.join(
				process.env.HOME || "~",
				"Downloads",
				"workspace",
				jobId,
				"result",
			);

			try {
				const jobContent = await fs.readFile(jobFilePath, "utf-8");
				const job = JSON.parse(jobContent);

				// Update job status
				const updates: any = {
					status: jobMappedStatus,
				};

				// Add completion timestamp if completed/failed
				if (jobMappedStatus === "completed" || jobMappedStatus === "failed") {
					updates.completedAt = Date.now();

					// Add error message if failed
					if (jobMappedStatus === "failed" && taskData.error) {
						updates.error = taskData.error;
					}
				}

				// If completed with output files, download them
				if (
					jobMappedStatus === "completed" &&
					hasOutputFiles &&
					outputFiles.length > 0
				) {
					await writeLog(
						`Downloading ${outputFiles.length} output files...`,
						"info",
						taskId || runninghubTaskId,
					);

					// Create result directory
					await fs.mkdir(resultDir, { recursive: true });

					const results: any[] = [];

					for (const file of outputFiles) {
						if (file.fileUrl) {
							try {
								// Extract filename from URL
								const urlParts = file.fileUrl.split("/");
								const fileName = decodeURIComponent(
									urlParts[urlParts.length - 1] ||
										`output_${Date.now()}.${file.fileType || "png"}`,
								);

								const localPath = path.join(resultDir, fileName);

								// Download file
								await writeLog(
									`Downloading ${fileName}...`,
									"info",
									taskId || runninghubTaskId,
								);
								const fileResponse = await fetch(file.fileUrl);
								if (!fileResponse.ok) {
									throw new Error(
										`Failed to download: ${fileResponse.statusText}`,
									);
								}

								const arrayBuffer = await fileResponse.arrayBuffer();
								const buffer = Buffer.from(arrayBuffer);
								await fs.writeFile(localPath, buffer);

								await writeLog(
									`Downloaded: ${fileName}`,
									"success",
									taskId || runninghubTaskId,
								);

								// Get file stats
								const stats = await fs.stat(localPath);

								// Determine file type
								let fileType = "image";
								const ext = path.extname(fileName).toLowerCase();
								if (
									ext === ".mp4" ||
									ext === ".mov" ||
									ext === ".avi" ||
									ext === ".webm"
								) {
									fileType = "video";
								} else if (ext === ".txt" || ext === ".json") {
									fileType = "text";
								}

								results.push({
									type: "file",
									path: localPath,
									fileName: fileName,
									fileType: fileType,
									workspacePath: localPath,
									fileSize: stats.size,
								});
							} catch (downloadError) {
								await writeLog(
									`Failed to download ${file.fileUrl}: ${downloadError}`,
									"error",
									taskId || runninghubTaskId,
								);
							}
						}
					}

					// Update job with results
					if (results.length > 0) {
						updates.results = {
							outputs: results,
						};
						await writeLog(
							`Saved ${results.length} output files to job.json`,
							"success",
							taskId || runninghubTaskId,
						);
					}
				}

				// Merge with existing job data
				const updatedJob = { ...job, ...updates };

				await fs.writeFile(jobFilePath, JSON.stringify(updatedJob, null, 2));
				await writeLog(
					`Updated job file: ${jobId}`,
					"success",
					taskId || runninghubTaskId,
				);

				return NextResponse.json({
					success: true,
					status: jobMappedStatus,
					taskData,
					job: updatedJob,
					downloadedFiles: hasOutputFiles ? outputFiles.length : 0,
				});
			} catch (e) {
				await writeLog(
					`Failed to update job file: ${e}`,
					"warning",
					taskId || runninghubTaskId,
				);
				// Return success anyway, even if job update failed
				return NextResponse.json({
					success: true,
					status: jobMappedStatus,
					taskData,
				});
			}
		}

		return NextResponse.json({
			success: true,
			status: jobMappedStatus,
			taskData,
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Failed to query task status";
		await writeLog(`Status query error: ${errorMessage}`, "error");

		return NextResponse.json(
			{
				success: false,
				error: errorMessage,
			},
			{ status: 500 },
		);
	}
}
