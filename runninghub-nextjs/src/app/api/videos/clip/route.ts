import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";
import { VideoClipConfig } from "@/types/video-clip";
import { ENVIRONMENT_VARIABLES } from "@/constants";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { useWorkspaceStore } from "@/store/workspace-store";

interface ClipRequest {
	videos: string[];
	clip_config: VideoClipConfig;
	timeout?: number;
	outputDir?: string;
}

/**
 * Resolve path, handling ~ and relative paths
 */
function resolvePath(filePath: string): string {
	if (filePath.startsWith("~")) {
		return path.join(os.homedir(), filePath.slice(1));
	}
	return path.resolve(filePath);
}

export async function POST(request: NextRequest) {
	try {
		const data: ClipRequest = await request.json();
		const { videos, clip_config, timeout = 3600, outputDir } = data;

		if (!videos || videos.length === 0) {
			return NextResponse.json(
				{ error: "No videos selected for clipping" },
				{ status: 400 },
			);
		}

		if (!clip_config || !clip_config.mode) {
			return NextResponse.json(
				{ error: "Invalid clip configuration" },
				{ status: 400 },
			);
		}

		// Check for ffmpeg
		const ffmpegAvailable = await checkFfmpeg();
		if (!ffmpegAvailable) {
			return NextResponse.json(
				{ error: "FFmpeg is not installed or not accessible" },
				{ status: 500 },
			);
		}

		// Create a background task for video clipping
		const taskId = `clip_${videos.length}_videos_${Date.now()}`;

		// Initialize task in store
		await initTask(taskId, videos.length);

		// Start background clipping
		clipVideosInBackground(videos, clip_config, timeout, taskId, outputDir);

		const response = {
			success: true,
			task_id: taskId,
			message: `Started clipping ${videos.length} videos`,
			video_count: videos.length,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error clipping videos:", error);
		return NextResponse.json(
			{ error: "Failed to start video clipping" },
			{ status: 500 },
		);
	}
}

/**
 * Check if FFmpeg is available
 */
async function checkFfmpeg(): Promise<boolean> {
	return new Promise((resolve) => {
		const childProcess = spawn("ffmpeg", ["-version"]);
		childProcess.on("close", (code) => {
			resolve(code === 0);
		});
		childProcess.on("error", () => {
			resolve(false);
		});
	});
}

/**
 * Clip a single video using RunningHub Python CLI
 */
function clipSingleVideo(
	videoPath: string,
	clipConfig: VideoClipConfig,
	timeout: number,
	env: NodeJS.ProcessEnv,
	customOutputDir?: string,
): Promise<{
	success: boolean;
	stdout: string;
	stderr: string;
	error?: string;
}> {
	return new Promise(async (resolve) => {
		let outputDir = resolvePath(ENVIRONMENT_VARIABLES.CLIP_OUTPUT_FOLDER);

		// If saveToWorkspace is enabled, use provided output directory
		let organizeByVideo = clipConfig.organizeByVideo;
		const deleteOriginal = clipConfig.deleteOriginal;

		if (clipConfig.saveToWorkspace && customOutputDir) {
			outputDir = customOutputDir;
			// Force no-organize when saving to workspace (conflicting option)
			organizeByVideo = false;
		}

		const args = [
			"-m",
			"runninghub_cli.cli",
			"clip",
			videoPath,
			"--mode",
			clipConfig.mode,
			"--format",
			clipConfig.imageFormat,
			"--quality",
			String(clipConfig.quality),
			"--output-dir",
			outputDir,
			organizeByVideo ? "--organize" : "--no-organize",
			deleteOriginal ? "--delete" : "--no-delete",
			"--timeout",
			String(timeout),
		];

		// Add mode-specific parameters
		switch (clipConfig.mode) {
			case "last_frames":
				args.push("--frame-count", "1");
				break;
			case "interval":
				args.push("--interval", String(clipConfig.intervalSeconds));
				break;
			case "frame_interval":
				args.push("--frame-interval", String(clipConfig.intervalFrames));
				break;
		}

		const childProcess = spawn("python3", args, {
			env,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";

		childProcess.stdout?.on("data", (data: Buffer) => {
			const text = data.toString();
			stdout += text;
		});

		childProcess.stderr?.on("data", (data: Buffer) => {
			const text = data.toString();
			stderr += text;
		});

		const timeoutHandle = setTimeout(() => {
			childProcess.kill("SIGKILL");
			resolve({
				success: false,
				stdout,
				stderr,
				error: `Clipping timed out after ${timeout} seconds`,
			});
		}, timeout * 1000);

		childProcess.on("close", (code) => {
			clearTimeout(timeoutHandle);
			const success = code === 0;
			resolve({ success, stdout, stderr });
		});

		childProcess.on("error", (error) => {
			clearTimeout(timeoutHandle);
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
 * Clip multiple videos in background
 */
async function clipVideosInBackground(
	videos: string[],
	clipConfig: VideoClipConfig,
	timeout: number,
	taskId: string,
	outputDir?: string,
) {
	await writeLog(
		`=== BACKGROUND VIDEO CLIPPING STARTED for task: ${taskId} ===`,
		"info",
		taskId,
	);

	// Get environment variables for Python CLI
	const env = {
		...process.env,
		RUNNINGHUB_API_KEY: process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY,
		RUNNINGHUB_WORKFLOW_ID: process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID,
		RUNNINGHUB_API_HOST:
			process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn",
		PYTHONPATH: `${process.env.PYTHONPATH || ""}:/Users/barbarossia/ai_coding/runninghub`,
	};
	let successCount = 0;
	let failureCount = 0;

	try {
		for (let i = 0; i < videos.length; i++) {
			const videoPath = videos[i];
			await writeLog(
				`Clipping video ${i + 1}/${videos.length}: ${videoPath}`,
				"info",
				taskId,
			);
			await updateTask(taskId, { currentImage: videoPath });

			const result = await clipSingleVideo(
				videoPath,
				clipConfig,
				timeout,
				env,
				outputDir,
			);

			if (result.success) {
				successCount++;
				await writeLog(`✓ Clipped: ${videoPath}`, "success", taskId);
				await updateTask(taskId, { completedCount: successCount });
			} else {
				failureCount++;
				await writeLog(`✗ Failed to clip: ${videoPath}`, "error", taskId);
				await updateTask(taskId, { failedCount: failureCount });
				if (result.error) {
					await writeLog(`  Error: ${result.error}`, "error", taskId);
				}
			}
		}

		await writeLog(
			`=== BACKGROUND VIDEO CLIPPING COMPLETED for task: ${taskId} ===`,
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
