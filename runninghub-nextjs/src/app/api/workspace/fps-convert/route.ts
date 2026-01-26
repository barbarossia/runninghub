import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";
import path from "path";

interface FpsConvertRequest {
	videos: Array<{
		path: string;
		name: string;
	}>;
	targetFps: number;
	deleteOriginal?: boolean;
	outputSuffix?: string;
	crf?: number;
	preset?: string;
	resizeEnabled?: boolean;
	resizeMode?: "fit" | "longest-side" | "shortest-side";
	resizeWidth?: number;
	resizeHeight?: number;
	resizeLongestSide?: number;
	timeout?: number;
}

export async function POST(request: NextRequest) {
	try {
		const data: FpsConvertRequest = await request.json();
		const {
			videos,
			targetFps,
			deleteOriginal = false,
			outputSuffix = "_converted",
			crf = 20,
			preset = "slow",
			resizeEnabled = false,
			resizeMode = "fit",
			resizeWidth,
			resizeHeight,
			resizeLongestSide,
			timeout = 3600,
		} = data;

		if (!videos || videos.length === 0) {
			return NextResponse.json(
				{ error: "No videos selected for FPS conversion" },
				{ status: 400 },
			);
		}

		if (!targetFps || targetFps < 1 || targetFps > 120) {
			return NextResponse.json(
				{ error: "Invalid target FPS. Must be between 1 and 120." },
				{ status: 400 },
			);
		}

		if (
			resizeEnabled &&
			(resizeMode === "longest-side" || resizeMode === "shortest-side") &&
			!resizeLongestSide
		) {
			return NextResponse.json(
				{
					error: "Resize longest-side enabled but no size provided",
				},
				{ status: 400 },
			);
		}

		if (resizeEnabled && resizeMode === "fit" && !resizeWidth && !resizeHeight) {
			return NextResponse.json(
				{
					error: "Resize enabled but no width or height provided",
				},
				{ status: 400 },
			);
		}

		if (
			(resizeWidth && resizeWidth < 1) ||
			(resizeHeight && resizeHeight < 1) ||
			(resizeLongestSide && resizeLongestSide < 1)
		) {
			return NextResponse.json(
				{
					error: "Invalid resize dimensions. Width/height must be positive.",
				},
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

		// Create a background task for FPS conversion
		const taskId = `fps_convert_${videos.length}_videos_${Date.now()}`;

		// Initialize task in store
		await initTask(taskId, videos.length);

		// Start background conversion
		convertVideosInBackground(
			videos,
			targetFps,
			deleteOriginal,
			outputSuffix,
			crf,
			preset,
			resizeEnabled,
			resizeMode,
			resizeWidth,
			resizeHeight,
			resizeLongestSide,
			timeout,
			taskId,
		);

		const response = {
			success: true,
			task_id: taskId,
			message: `Started converting ${videos.length} videos to ${targetFps} FPS`,
			video_count: videos.length,
			target_fps: targetFps,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error converting videos:", error);
		return NextResponse.json(
			{ error: "Failed to start FPS conversion" },
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
 * Convert a single video FPS using FFmpeg
 */
function convertSingleVideo(
	videoPath: string,
	targetFps: number,
	deleteOriginal: boolean,
	outputSuffix: string,
	crf: number,
	preset: string,
	resizeEnabled: boolean,
	resizeMode: "fit" | "longest-side" | "shortest-side",
	resizeWidth: number | undefined,
	resizeHeight: number | undefined,
	resizeLongestSide: number | undefined,
	timeout: number,
): Promise<{
	success: boolean;
	outputPath?: string;
	stdout: string;
	stderr: string;
	error?: string;
}> {
	return new Promise((resolve) => {
		const inputPath = videoPath;
		const parsedPath = path.parse(videoPath);
		const outputPath = path.join(
			parsedPath.dir,
			`${parsedPath.name}${outputSuffix}.mp4`,
		);
		const tempOutputPath = path.join(
			parsedPath.dir,
			`${parsedPath.name}_temp_fps_convert.mp4`,
		);

		// Build FFmpeg command for FPS conversion
		// -r: Set frame rate
		// -c:v libx264: Use H.264 video codec
		// -crf: Quality (lower is better)
		// -preset: Encoding speed/compression tradeoff
		// -vf "format=yuv420p": Ensure compatibility
		// -c:a aac: AAC audio codec
		// -b:a 128k: Audio bitrate
		// -movflags +faststart: Enable web streaming
		const filters: string[] = [];

		if (resizeEnabled) {
			if (
				(resizeMode === "longest-side" ||
					resizeMode === "shortest-side") &&
				resizeLongestSide
			) {
				const comparator = resizeMode === "shortest-side" ? "lt" : "gt";
				filters.push(
					`scale=if(${comparator}(iw\\,ih)\\,${resizeLongestSide}\\,-2):if(${comparator}(iw\\,ih)\\,-2\\,${resizeLongestSide})`,
				);
			} else if (resizeWidth || resizeHeight) {
				if (resizeWidth && resizeHeight) {
					filters.push(
						`scale=${resizeWidth}:${resizeHeight}:force_original_aspect_ratio=decrease`,
					);
					filters.push(
						`pad=${resizeWidth}:${resizeHeight}:(ow-iw)/2:(oh-ih)/2`,
					);
				} else {
					const width = resizeWidth ? resizeWidth.toString() : "-2";
					const height = resizeHeight ? resizeHeight.toString() : "-2";
					filters.push(`scale=${width}:${height}`);
				}
			}
		}

		filters.push("format=yuv420p");

		const cmd = "ffmpeg";
		const args = [
			"-i",
			inputPath,
			"-r",
			targetFps.toString(),
			"-c:v",
			"libx264",
			"-crf",
			crf.toString(),
			"-preset",
			preset,
			"-vf",
			filters.join(","),
			"-c:a",
			"aac",
			"-b:a",
			"128k",
			"-movflags",
			"+faststart",
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
					// Rename temp file to final output
					if (await fileExists(tempOutputPath)) {
						await fs.rename(tempOutputPath, outputPath);
						console.log(
							`[${videoPath}] Renamed temp file to final output: ${outputPath}`,
						);
					}

					// Delete original if requested
					if (deleteOriginal && inputPath !== outputPath) {
						try {
							await fs.unlink(inputPath);
							console.log(`[${videoPath}] Deleted original file`);
						} catch (err) {
							console.error(`[${videoPath}] Failed to delete original:`, err);
						}
					}

					resolve({
						success: true,
						outputPath,
						stdout,
						stderr,
					});
				} catch (err) {
					console.error(`[${videoPath}] Error finalizing output:`, err);
					resolve({
						success: false,
						stdout,
						stderr,
						error: `Failed to finalize output: ${err}`,
					});
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

				resolve({
					success: false,
					stdout,
					stderr,
					error: `FFmpeg exited with code ${code}`,
				});
			}
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
	videos: Array<{ path: string; name: string }>,
	targetFps: number,
	deleteOriginal: boolean,
	outputSuffix: string,
	crf: number,
	preset: string,
	resizeEnabled: boolean,
	resizeMode: "fit" | "longest-side" | "shortest-side",
	resizeWidth: number | undefined,
	resizeHeight: number | undefined,
	resizeLongestSide: number | undefined,
	timeout: number,
		taskId: string,
	) {
	await writeLog(
		`=== BACKGROUND FPS CONVERSION STARTED for task: ${taskId} ===`,
		"info",
		taskId,
	);
	await writeLog(
		`Converting ${videos.length} videos to ${targetFps} FPS`,
		"info",
		taskId,
	);
	if (resizeEnabled) {
		await writeLog(
			resizeMode === "longest-side"
				? `Resize enabled: longest side ${resizeLongestSide || "auto"}px`
				: resizeMode === "shortest-side"
					? `Resize enabled: shortest side ${resizeLongestSide || "auto"}px`
				: `Resize enabled: fit within ${resizeWidth || "auto"}x${resizeHeight || "auto"}`,
			"info",
			taskId,
		);
	}

	let successCount = 0;
	let failureCount = 0;

	try {
		for (let i = 0; i < videos.length; i++) {
			const video = videos[i];
			await writeLog(
				`Converting video ${i + 1}/${videos.length}: ${video.name}`,
				"info",
				taskId,
			);
			await updateTask(taskId, { currentImage: video.name }); // Reuse currentImage field

			// Check if file exists
			try {
				const fs = await import("fs/promises");
				await fs.access(video.path);
			} catch {
				await writeLog(
					`Video file does not exist: ${video.path}`,
					"error",
					taskId,
				);
				failureCount++;
				await updateTask(taskId, { failedCount: failureCount });
				continue;
			}

			// Convert the video
			const result = await convertSingleVideo(
				video.path,
				targetFps,
				deleteOriginal,
				outputSuffix,
				crf,
				preset,
				resizeEnabled,
				resizeMode,
				resizeWidth,
				resizeHeight,
				resizeLongestSide,
				timeout,
			);

			if (result.success) {
				successCount++;
				await writeLog(
					`✓ Successfully converted: ${video.name} → ${result.outputPath}`,
					"success",
					taskId,
				);
				await updateTask(taskId, { completedCount: successCount });
			} else {
				failureCount++;
				await writeLog(`✗ Failed to convert: ${video.name}`, "error", taskId);
				await updateTask(taskId, { failedCount: failureCount });
				if (result.error) {
					await writeLog(`  Error: ${result.error}`, "error", taskId);
				}
			}
		}

		await writeLog(
			`=== BACKGROUND FPS CONVERSION COMPLETED for task: ${taskId} ===`,
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
