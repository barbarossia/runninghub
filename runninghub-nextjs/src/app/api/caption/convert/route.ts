import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { unlink } from "fs/promises";
import { join, basename, extname } from "path";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";

interface ConvertRequest {
	images: string[];
	config: {
		outputFormat: "jpg" | "png" | "webp" | "avif";
		quality?: number;
		lossless?: boolean;
		outputSuffix?: string;
		deleteOriginal: boolean;
	};
	folderPath: string;
	timeout?: number;
}

export async function POST(request: NextRequest) {
	try {
		const data: ConvertRequest = await request.json();
		const { images, config, timeout = 600 } = data;

		if (!images || images.length === 0) {
			return NextResponse.json(
				{ error: "No images selected for conversion" },
				{ status: 400 },
			);
		}

		const taskId = `convert_${Date.now()}`;
		await initTask(taskId, images.length);

		processConvertInBackground(images, config, taskId, timeout);

		return NextResponse.json({
			success: true,
			taskId,
			message: `Started converting ${images.length} images`,
			processedCount: images.length,
		});
	} catch (error) {
		console.error("Convert API error:", error);
		return NextResponse.json(
			{ error: "Failed to start conversion" },
			{ status: 500 },
		);
	}
}

function buildFFmpegArgs(config: ConvertRequest["config"]): string[] {
	const { outputFormat, quality, lossless } = config;
	const args: string[] = [];

	if (outputFormat === "jpg") {
		args.push("-q:v", String(quality || 90));
	} else if (outputFormat === "png") {
		args.push("-compression_level", "9");
	} else if (outputFormat === "webp") {
		if (lossless) {
			args.push("-lossless", "1");
		} else {
			args.push("-quality", String(quality || 90));
		}
	} else if (outputFormat === "avif") {
		args.push("-compression_level", "9");
		if (lossless) {
			args.push("-pred", "mixed");
		} else {
			args.push("-crf", String(quality || 30));
		}
	}

	return args;
}

async function convertImage(
	inputPath: string,
	outputPath: string,
	config: ConvertRequest["config"],
): Promise<boolean> {
	return new Promise((resolve) => {
		const args = ["-i", inputPath, ...buildFFmpegArgs(config), outputPath];

		const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

		child.on("close", (code) => {
			resolve(code === 0);
		});

		child.on("error", () => {
			resolve(false);
		});
	});
}

async function processConvertInBackground(
	images: string[],
	config: ConvertRequest["config"],
	taskId: string,
	timeout: number,
) {
	await writeLog(`=== FORMAT CONVERT STARTED ===`, "info", taskId);
	await writeLog(
		`Converting ${images.length} images to ${config.outputFormat}`,
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
			const suffix = config.outputSuffix || "";
			const outputPath = `${base}${suffix}.${config.outputFormat}`;

			const success = await convertImage(inputPath, outputPath, config);

			if (success) {
				await writeLog(`Converted: ${basename(outputPath)}`, "success", taskId);

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
				`Failed to convert ${basename(inputPath)}: ${error}`,
				"error",
				taskId,
			);
			failureCount++;
			await updateTask(taskId, { failedCount: failureCount });
		}
	}

	await writeLog(
		`=== CONVERT COMPLETED: ${successCount}/${images.length} ===`,
		"info",
		taskId,
	);
	await updateTask(taskId, { status: "completed", endTime: Date.now() });
}
