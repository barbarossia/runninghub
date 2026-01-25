import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { unlink } from "fs/promises";
import { join, basename, extname } from "path";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";

interface ResizeRequest {
	images: string[];
	config: {
		mode: "percentage" | "dimensions" | "longest" | "shortest";
		width?: number;
		height?: number;
		percentage?: number;
		aspectRatioStrategy: "fit" | "fill" | "stretch";
		outputSuffix?: string;
		deleteOriginal: boolean;
	};
	folderPath: string;
	timeout?: number;
}

export async function POST(request: NextRequest) {
	try {
		const data: ResizeRequest = await request.json();
		const { images, config, timeout = 600 } = data;

		if (!images || images.length === 0) {
			return NextResponse.json(
				{ error: "No images selected for resize" },
				{ status: 400 },
			);
		}

		const taskId = `resize_${Date.now()}`;
		await initTask(taskId, images.length);

		processResizeInBackground(images, config, taskId, timeout);

		return NextResponse.json({
			success: true,
			taskId,
			message: `Started resizing ${images.length} images`,
			processedCount: images.length,
		});
	} catch (error) {
		console.error("Resize API error:", error);
		return NextResponse.json(
			{ error: "Failed to start resize" },
			{ status: 500 },
		);
	}
}

function buildFFmpegFilter(config: ResizeRequest["config"]): string {
	const { mode, width, height, percentage, aspectRatioStrategy } = config;
	let filter = "";

	if (mode === "percentage") {
		const scale = (percentage || 100) / 100;
		filter = `scale=iw*${scale}:ih*${scale}`;
	} else if (mode === "dimensions" && width && height) {
		if (aspectRatioStrategy === "stretch") {
			filter = `scale=${width}:${height}`;
		} else if (aspectRatioStrategy === "fill") {
			filter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
		} else {
			// fit
			filter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
		}
	} else if (mode === "longest" && width) {
		filter = `scale=${width}:-1`;
	} else if (mode === "shortest" && width) {
		filter = `scale=-1:${width}`;
	}

	return filter;
}

async function resizeImage(
	inputPath: string,
	outputPath: string,
	config: ResizeRequest["config"],
): Promise<boolean> {
	return new Promise((resolve) => {
		const filter = buildFFmpegFilter(config);

		if (!filter) {
			resolve(false);
			return;
		}

		const args = ["-i", inputPath, "-vf", filter, outputPath];

		const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

		let stderr = "";
		child.stderr?.on("data", (data) => {
			stderr += data.toString();
		});

		child.on("close", (code) => {
			resolve(code === 0);
		});

		child.on("error", () => {
			resolve(false);
		});
	});
}

async function processResizeInBackground(
	images: string[],
	config: ResizeRequest["config"],
	taskId: string,
	timeout: number,
) {
	await writeLog(`=== BATCH RESIZE STARTED ===`, "info", taskId);
	await writeLog(`Resizing ${images.length} images`, "info", taskId);
	await writeLog(
		`Mode: ${config.mode}, Delete original: ${config.deleteOriginal}`,
		"info",
		taskId,
	);

	let successCount = 0;
	let failureCount = 0;

	for (let i = 0; i < images.length; i++) {
		const inputPath = images[i];
		await updateTask(taskId, {
			currentImage: `${basename(inputPath)} (${i + 1}/${images.length})`,
		});

		try {
			const ext = extname(inputPath);
			const base = inputPath.replace(ext, "");
			const suffix = config.outputSuffix || "_resized";
			const outputPath = `${base}${suffix}${ext}`;

			const success = await resizeImage(inputPath, outputPath, config);

			if (success) {
				await writeLog(`Resized: ${basename(outputPath)}`, "success", taskId);

				if (config.deleteOriginal) {
					await unlink(inputPath);
					await writeLog(
						`Deleted original: ${basename(inputPath)}`,
						"info",
						taskId,
					);
				}

				successCount++;
				await updateTask(taskId, { completedCount: successCount });
			} else {
				failureCount++;
				await updateTask(taskId, { failedCount: failureCount });
			}
		} catch (error) {
			await writeLog(
				`Failed to resize ${basename(inputPath)}: ${error}`,
				"error",
				taskId,
			);
			failureCount++;
			await updateTask(taskId, { failedCount: failureCount });
		}
	}

	await writeLog(
		`=== RESIZE COMPLETED: ${successCount}/${images.length} ===`,
		"info",
		taskId,
	);
	await updateTask(taskId, { status: "completed", endTime: Date.now() });
}
