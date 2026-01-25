import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";

interface ConvertRequest {
	videos: string[];
	overwrite?: boolean;
	timeout?: number;
}

export async function POST(request: NextRequest) {
	try {
		const data: ConvertRequest = await request.json();
		const { videos, overwrite = true, timeout = 3600 } = data;

		if (!videos || videos.length === 0) {
			return NextResponse.json(
				{ error: "No videos selected for conversion" },
				{ status: 400 },
			);
		}

		// Check if FFmpeg is available
		const ffmpegAvailable = await checkFFmpegAvailable();
		if (!ffmpegAvailable) {
			return NextResponse.json(
				{
					error:
						"FFmpeg is not installed or not accessible. Please install FFmpeg to use video conversion features.",
				},
				{ status: 500 },
			);
		}

		// Create a background task for video conversion
		const taskId = `convert_${videos.length}_videos_${Date.now()}`;

		// Initialize task in store
		await initTask(taskId, videos.length);

		// Start background conversion
		convertVideosInBackground(videos, overwrite, timeout, taskId);

		const response = {
			success: true,
			task_id: taskId,
			message: `Started converting ${videos.length} videos`,
			video_count: videos.length,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error converting videos:", error);
		return NextResponse.json(
			{ error: "Failed to start video conversion" },
			{ status: 500 },
		);
	}
}

/**
 * Check if FFmpeg is available
 */
async function checkFFmpegAvailable(): Promise<boolean> {
	return new Promise((resolve) => {
		const childProcess = spawn("ffmpeg", ["-version"], {
			stdio: ["ignore", "pipe", "pipe"],
		});

		childProcess.on("close", (code) => {
			resolve(code === 0);
		});

		childProcess.on("error", () => {
			resolve(false);
		});

		// Timeout after 5 seconds
		setTimeout(() => {
			childProcess.kill();
			resolve(false);
		}, 5000);
	});
}

/**
 * Convert a single video using FFmpeg
 */
function convertSingleVideo(
	videoPath: string,
	overwrite: boolean,
	timeout: number,
): Promise<{
	success: boolean;
	stdout: string;
	stderr: string;
	error?: string;
}> {
	return new Promise((resolve) => {
		const inputPath = videoPath;
		const outputPath = videoPath.replace(/\.[^.]+$/, ".mp4");
		const tempOutputPath = videoPath.replace(/\.[^.]+$/, ".temp.mp4");

		// Build FFmpeg command
		// -c:v libx264: Use H.264 video codec
		// -an: No audio (as per requirements)
		const cmd = "ffmpeg";
		const args = [
			"-i",
			inputPath,
			"-c:v",
			"libx264",
			"-an",
			"-y", // Overwrite output file without asking
			tempOutputPath,
		];

		console.log(`Running command: ${cmd} ${args.join(" ")}`);

		const childProcess = spawn(cmd, args, {
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";

		// Collect stdout
		childProcess.stdout?.on("data", (data: Buffer) => {
			const text = data.toString();
			stdout += text;
			console.log(`[${videoPath}] STDOUT: ${text.trim()}`);
		});

		// Collect stderr
		childProcess.stderr?.on("data", (data: Buffer) => {
			const text = data.toString();
			stderr += text;
			console.log(`[${videoPath}] STDERR: ${text.trim()}`);
		});

		// Set timeout
		const timeoutHandle = setTimeout(() => {
			console.error(
				`[${videoPath}] Process timed out after ${timeout} seconds`,
			);
			childProcess.kill("SIGKILL");
			resolve({
				success: false,
				stdout,
				stderr,
				error: `Conversion timed out after ${timeout} seconds`,
			});
		}, timeout * 1000);

		// Handle process exit
		childProcess.on("close", async (code) => {
			clearTimeout(timeoutHandle);
			const success = code === 0;
			console.log(`[${videoPath}] Process exited with code: ${code}`);

			const fs = await import("fs/promises");

			// Clean up temp file and handle result
			if (success) {
				try {
					// If overwriting and original file exists
					if (overwrite && inputPath !== outputPath) {
						// Delete original file
						try {
							await fs.unlink(inputPath);
							console.log(`[${videoPath}] Deleted original file`);
						} catch (err) {
							console.error(`[${videoPath}] Failed to delete original:`, err);
						}
					}

					// Rename temp file to final output
					if (await fileExists(tempOutputPath)) {
						await fs.rename(tempOutputPath, outputPath);
						console.log(`[${videoPath}] Renamed temp file to final output`);
					}
				} catch (err) {
					console.error(`[${videoPath}] Error finalizing output:`, err);
					resolve({
						success: false,
						stdout,
						stderr,
						error: `Failed to finalize output: ${err}`,
					});
					return;
				}
			} else {
				// Clean up temp file on failure
				try {
					if (await fileExists(tempOutputPath)) {
						await fs.unlink(tempOutputPath);
						console.log(`[${videoPath}] Cleaned up temp file`);
					}
				} catch (err) {
					console.error(`[${videoPath}] Failed to clean up temp file:`, err);
				}
			}

			resolve({ success, stdout, stderr });
		});

		// Handle process errors
		childProcess.on("error", (error) => {
			clearTimeout(timeoutHandle);
			console.error(`[${videoPath}] Process error:`, error);
			resolve({
				success: false,
				stdout,
				stderr,
				error: error.message,
			});
		});
	});
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
	try {
		const fs = await import("fs/promises");
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Convert multiple videos in background
 */
async function convertVideosInBackground(
	videos: string[],
	overwrite: boolean,
	timeout: number,
	taskId: string,
) {
	await writeLog(
		`=== BACKGROUND VIDEO CONVERSION STARTED for task: ${taskId} ===`,
		"info",
		taskId,
	);
	await writeLog(`Converting ${videos.length} videos`, "info", taskId);

	let successCount = 0;
	let failureCount = 0;

	try {
		for (let i = 0; i < videos.length; i++) {
			const videoPath = videos[i];
			await writeLog(
				`Converting video ${i + 1}/${videos.length}: ${videoPath}`,
				"info",
				taskId,
			);
			await updateTask(taskId, { currentImage: videoPath }); // Reuse currentImage field

			// Check if file exists
			try {
				const fs = await import("fs/promises");
				await fs.access(videoPath);
			} catch {
				await writeLog(
					`Video file does not exist: ${videoPath}`,
					"error",
					taskId,
				);
				failureCount++;
				await updateTask(taskId, { failedCount: failureCount });
				continue;
			}

			// Convert the video
			const result = await convertSingleVideo(videoPath, overwrite, timeout);

			if (result.success) {
				successCount++;
				await writeLog(
					`✓ Successfully converted: ${videoPath}`,
					"success",
					taskId,
				);
				await updateTask(taskId, { completedCount: successCount });
			} else {
				failureCount++;
				await writeLog(`✗ Failed to convert: ${videoPath}`, "error", taskId);
				await updateTask(taskId, { failedCount: failureCount });
				if (result.error) {
					await writeLog(`  Error: ${result.error}`, "error", taskId);
				}
			}
		}

		await writeLog(
			`=== BACKGROUND VIDEO CONVERSION COMPLETED for task: ${taskId} ===`,
			"info",
			taskId,
		);
		await writeLog(
			`Summary: ${successCount} succeeded, ${failureCount} failed out of ${videos.length} total`,
			"info",
			taskId,
		);
		await updateTask(taskId, { status: "completed", endTime: Date.now() });
	} catch (err) {
		const error = err instanceof Error ? err.message : "Unknown error";
		await writeLog(`Task crashed: ${error}`, "error", taskId);
		await updateTask(taskId, { status: "failed", error });
	}
}
