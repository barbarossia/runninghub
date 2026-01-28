import { NextRequest, NextResponse } from "next/server";
import { spawn, execSync } from "child_process";
import { basename, dirname, extname, join, parse } from "path";
import { promises as fs } from "fs";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";
import { loadBatchProcessTemplate } from "@/lib/batch-process-utils";
import {
	getFileExtension,
	getMediaTypeFromExtension,
} from "@/utils/workspace-validation";
import type {
	BatchProcessInputMapping,
	BatchProcessOutputMapping,
	BatchProcessStep,
	BatchProcessTemplate,
	ExecuteBatchProcessTemplateRequest,
	ExecuteBatchProcessTemplateResponse,
	FileInputAssignment,
	Job,
	JobResult,
	Workflow,
} from "@/types/workspace";
import type { VideoClipConfig } from "@/types/video-clip";
import type { CropRequest } from "@/types/crop";

const DEFAULT_STEP_OUTPUT_KEY = "output";
const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_WORKFLOW_TIMEOUT_MS = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
	try {
		const body: ExecuteBatchProcessTemplateRequest = await request.json();

		if (!body.templateId) {
			return NextResponse.json(
				{ success: false, error: "Template ID is required" },
				{ status: 400 },
			);
		}

		if (!body.filePaths || body.filePaths.length === 0) {
			return NextResponse.json(
				{ success: false, error: "No files selected" },
				{ status: 400 },
			);
		}

		const template = await loadBatchProcessTemplate(body.templateId);
		if (!template) {
			return NextResponse.json(
				{ success: false, error: "Template not found" },
				{ status: 404 },
			);
		}

		const taskId = `batch_process_${Date.now()}`;
		await initTask(taskId, body.filePaths.length);

		runBatchProcessInBackground({
			template,
			filePaths: body.filePaths,
			folderPath: body.folderPath,
			taskId,
		});

		return NextResponse.json({
			success: true,
			taskId,
			message: "Batch process started",
		} as ExecuteBatchProcessTemplateResponse);
	} catch (error) {
		console.error("Batch process execute error:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to execute batch process" },
			{ status: 500 },
		);
	}
}

async function runBatchProcessInBackground({
	template,
	filePaths,
	folderPath,
	taskId,
}: {
	template: BatchProcessTemplate;
	filePaths: string[];
	folderPath?: string;
	taskId: string;
}) {
	await writeLog(
		`=== BATCH PROCESS STARTED: ${template.name} ===`,
		"info",
		taskId,
	);
	await updateTask(taskId, { status: "processing", completedCount: 0 });

	const steps = [...template.steps].sort((a, b) => a.order - b.order);
	let completedCount = 0;

	for (const filePath of filePaths) {
		const fileName = basename(filePath);
		await writeLog(`Processing ${fileName}`, "info", taskId);

		const outputMap: Record<string, unknown> = {};

		for (const step of steps) {
			try {
				await writeLog(
					`Step ${step.order}: ${step.name} (${step.type})`,
					"info",
					taskId,
				);

				if (step.type === "local") {
					const inputValue = resolveStepInput({
						mapping: step.inputMapping,
						filePath,
						outputMap,
					});

					const output = await runLocalStep({
						step,
						inputValue,
						folderPath,
						taskId,
					});

					const outputKey =
						step.outputMapping?.[0]?.outputKey ||
						DEFAULT_STEP_OUTPUT_KEY;
					outputMap[outputKey] = output;
					continue;
				}

				if (step.type === "workflow") {
					const workflowOutputs = await runWorkflowStep({
						step,
						filePath,
						outputMap,
						folderPath,
						taskId,
					});

					Object.entries(workflowOutputs).forEach(([key, value]) => {
						outputMap[key] = value;
					});
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				await writeLog(
					`Failed on ${fileName}, step ${step.order}: ${message}`,
					"error",
					taskId,
				);
				await updateTask(taskId, {
					status: "failed",
					error: message,
					endTime: Date.now(),
				});
				return;
			}
		}

		completedCount += 1;
		await updateTask(taskId, { completedCount });
	}

	await writeLog(
		`=== BATCH PROCESS COMPLETED: ${completedCount}/${filePaths.length} ===`,
		"success",
		taskId,
	);
	await updateTask(taskId, { status: "completed", endTime: Date.now() });
}

function resolveStepInput({
	mapping,
	filePath,
	outputMap,
}: {
	mapping: BatchProcessInputMapping[];
	filePath: string;
	outputMap: Record<string, unknown>;
}): unknown {
	if (!mapping.length) {
		return filePath;
	}

	const primary = mapping[0];
	return resolveMappingValue(primary, filePath, outputMap);
}

function resolveMappingValue(
	mapping: BatchProcessInputMapping,
	filePath: string,
	outputMap: Record<string, unknown>,
): unknown {
	if (mapping.sourceType === "selected") {
		return filePath;
	}

	if (mapping.sourceType === "previous-output") {
		const key = mapping.sourceKey || DEFAULT_STEP_OUTPUT_KEY;
		return outputMap[key];
	}

	if (mapping.sourceType === "static") {
		return mapping.staticValue;
	}

	return undefined;
}

async function runLocalStep({
	step,
	inputValue,
	folderPath,
	taskId,
}: {
	step: BatchProcessStep;
	inputValue: unknown;
	folderPath?: string;
	taskId: string;
}): Promise<string | string[]> {
	const operation = step.localOperation;
	if (!operation) {
		throw new Error("Local operation is missing");
	}

	const inputPath = Array.isArray(inputValue)
		? (inputValue[0] as string | undefined)
		: (inputValue as string | undefined);

	if (!inputPath) {
		throw new Error("Local operation input path is missing");
	}

	switch (operation.type) {
		case "video-convert":
			return convertVideoToMp4(inputPath, operation.config, taskId);
		case "video-fps-convert":
			return convertVideoFps(inputPath, operation.config, taskId);
		case "video-clip":
			return clipVideoFrames(
				inputPath,
				operation.config,
				folderPath,
				taskId,
			);
		case "video-crop":
			return cropVideo(inputPath, operation.config, taskId);
		case "image-resize":
			return resizeImage(inputPath, operation.config, taskId);
		case "duck-decode":
			return duckDecode(inputPath, operation.config, taskId);
		case "caption":
			return captionMedia(inputPath, operation.config, folderPath, taskId);
		default:
			throw new Error(`Unsupported local operation: ${operation.type}`);
	}
}

async function runWorkflowStep({
	step,
	filePath,
	outputMap,
	folderPath,
	taskId,
}: {
	step: BatchProcessStep;
	filePath: string;
	outputMap: Record<string, unknown>;
	folderPath?: string;
	taskId: string;
}): Promise<Record<string, unknown>> {
	if (!step.workflowId || !step.workflowName) {
		throw new Error("Workflow step is missing workflow details");
	}

	const { fileInputs, textInputs } = await buildWorkflowInputs({
		step,
		filePath,
		outputMap,
	});

	const executeResponse = await fetch(
		`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workspace/execute`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				workflowId: step.workflowId,
				sourceWorkflowId: step.sourceWorkflowId,
				workflowName: step.workflowName,
				fileInputs,
				textInputs,
				folderPath: folderPath || "",
				deleteSourceFiles: false,
			}),
		},
	);

	const executeData = (await executeResponse.json()) as {
		success: boolean;
		jobId?: string;
		error?: string;
	};

	if (!executeData.success || !executeData.jobId) {
		throw new Error(executeData.error || "Workflow execution failed");
	}

	const jobResult = await waitForJobCompletion(
		executeData.jobId,
		taskId,
	);

	return mapWorkflowOutputs(jobResult, step.outputMapping);
}

async function buildWorkflowInputs({
	step,
	filePath,
	outputMap,
}: {
	step: BatchProcessStep;
	filePath: string;
	outputMap: Record<string, unknown>;
}): Promise<{ fileInputs: FileInputAssignment[]; textInputs: Record<string, string> }> {
	const fileInputs: FileInputAssignment[] = [];
	const textInputs: Record<string, string> = {};

	for (const mapping of step.inputMapping) {
		const value = resolveMappingValue(mapping, filePath, outputMap);

		if (mapping.targetType === "file") {
			const filePathValue = Array.isArray(value)
				? (value[0] as string | undefined)
				: (value as string | undefined);

			if (!filePathValue) {
				continue;
			}

			const assignment = await buildFileAssignment(
				mapping.targetKey,
				filePathValue,
			);
			fileInputs.push(assignment);
		}

		if (mapping.targetType === "text") {
			if (value === undefined || value === null) {
				continue;
			}
			textInputs[mapping.targetKey] = String(value);
		}
	}

	return { fileInputs, textInputs };
}

async function buildFileAssignment(
	parameterId: string,
	filePath: string,
): Promise<FileInputAssignment> {
	const stats = await fs.stat(filePath);
	const fileName = basename(filePath);
	const extension = getFileExtension(fileName);
	const fileType = getMediaTypeFromExtension(extension) || "image";

	return {
		parameterId,
		filePath,
		fileName,
		fileSize: stats.size,
		fileType,
		valid: true,
	};
}

async function waitForJobCompletion(
	jobId: string,
	taskId: string,
): Promise<JobResult> {
	const jobPath = join(
		process.env.HOME || "~",
		"Downloads",
		"workspace",
		jobId,
		"job.json",
	);

	const start = Date.now();
	while (true) {
		const jobContent = await fs.readFile(jobPath, "utf-8");
		const job = JSON.parse(jobContent) as Job;

		if (job.status === "completed") {
			if (!job.results) {
				throw new Error("Workflow completed without results");
			}
			return job.results;
		}

		if (job.status === "failed") {
			throw new Error(job.error || "Workflow failed");
		}

		if (Date.now() - start > DEFAULT_WORKFLOW_TIMEOUT_MS) {
			throw new Error("Workflow step timed out");
		}

		await writeLog(
			`Waiting for workflow job ${jobId} to complete...`,
			"info",
			taskId,
		);

		await sleep(DEFAULT_POLL_INTERVAL_MS);
	}
}

function mapWorkflowOutputs(
	jobResult: JobResult,
	outputMapping?: BatchProcessOutputMapping[],
): Record<string, unknown> {
	if (!outputMapping || outputMapping.length === 0) {
		const defaultFile = jobResult.outputs.find((output) => output.type === "file");
		if (defaultFile?.path) {
			return { [DEFAULT_STEP_OUTPUT_KEY]: defaultFile.path };
		}
		return {};
	}

	const mapped: Record<string, unknown> = {};

	for (const mapping of outputMapping) {
		const outputsOfType = jobResult.outputs.filter(
			(output) => output.type === mapping.outputType,
		);

		let output = outputsOfType[0];
		if (mapping.parameterId) {
			output = outputsOfType.find(
				(candidate) => candidate.parameterId === mapping.parameterId,
			);
		} else if (mapping.outputIndex !== undefined) {
			output = outputsOfType[mapping.outputIndex];
		}

		if (!output) continue;

		if (mapping.outputType === "file") {
			mapped[mapping.outputKey] = output.path || output.workspacePath;
		} else {
			mapped[mapping.outputKey] = output.content;
		}
	}

	return mapped;
}

async function convertVideoToMp4(
	inputPath: string,
	config: Record<string, unknown> | undefined,
	taskId: string,
): Promise<string> {
	await writeLog(`Converting video to MP4: ${basename(inputPath)}`, "info", taskId);
	const deleteOriginal = Boolean(config?.deleteOriginal);
	const timeout = Number(config?.timeout ?? 3600);

	const outputPath = inputPath.replace(/\.[^.]+$/, ".mp4");
	const tempOutputPath = inputPath.replace(/\.[^.]+$/, ".temp.mp4");

	await runFfmpeg({
		args: [
			"-i",
			inputPath,
			"-c:v",
			"libx264",
			"-an",
			"-y",
			tempOutputPath,
		],
		timeout,
	});

	await finalizeTempOutput({
		inputPath,
		outputPath,
		tempOutputPath,
		deleteOriginal,
	});

	return outputPath;
}

async function convertVideoFps(
	inputPath: string,
	config: Record<string, unknown> | undefined,
	taskId: string,
): Promise<string> {
	const targetFps = Number(config?.targetFps);
	if (!targetFps || targetFps < 1 || targetFps > 120) {
		throw new Error("Invalid target FPS for FPS conversion");
	}

	const outputSuffix = String(config?.outputSuffix || "_fps");
	const deleteOriginal = Boolean(config?.deleteOriginal);
	const timeout = Number(config?.timeout ?? 3600);
	const crf = Number(config?.crf ?? 20);
	const preset = String(config?.preset || "medium");

	const parsedPath = parse(inputPath);
	const outputPath = join(parsedPath.dir, `${parsedPath.name}${outputSuffix}.mp4`);
	const tempOutputPath = join(parsedPath.dir, `${parsedPath.name}_temp_fps_convert.mp4`);

	await writeLog(
		`Converting FPS to ${targetFps}: ${basename(inputPath)}`,
		"info",
		taskId,
	);

	await runFfmpeg({
		args: [
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
			"format=yuv420p",
			"-c:a",
			"aac",
			"-b:a",
			"128k",
			"-movflags",
			"+faststart",
			"-y",
			tempOutputPath,
		],
		timeout,
	});

	await finalizeTempOutput({
		inputPath,
		outputPath,
		tempOutputPath,
		deleteOriginal,
	});

	return outputPath;
}

async function clipVideoFrames(
	inputPath: string,
	config: Record<string, unknown> | undefined,
	folderPath: string | undefined,
	taskId: string,
): Promise<string[]> {
	const clipConfig = config as VideoClipConfig | undefined;
	if (!clipConfig?.mode) {
		throw new Error("Invalid clip configuration");
	}

	const timeout = Number((config as { timeout?: number } | undefined)?.timeout ?? 3600);
	const outputDir =
		(config as { outputDir?: string } | undefined)?.outputDir ||
		folderPath ||
		dirname(inputPath);

	const before = await listFiles(outputDir);

	const args = [
		"-m",
		"runninghub_cli.cli",
		"clip",
		inputPath,
		"--mode",
		clipConfig.mode,
		"--format",
		clipConfig.imageFormat,
		"--quality",
		String(clipConfig.quality),
		"--output-dir",
		outputDir,
		clipConfig.organizeByVideo ? "--organize" : "--no-organize",
		clipConfig.deleteOriginal ? "--delete" : "--no-delete",
		"--timeout",
		String(timeout),
	];

	if (clipConfig.mode === "last_frames") {
		args.push("--frame-count", "1");
	} else if (clipConfig.mode === "interval") {
		args.push("--interval", String(clipConfig.intervalSeconds));
	} else if (clipConfig.mode === "frame_interval") {
		args.push("--frame-interval", String(clipConfig.intervalFrames));
	}

	await runPythonCli(args, taskId);

	const after = await listFiles(outputDir);
	const created = after.filter((file) => !before.has(file));

	if (created.length === 0) {
		throw new Error("No clip outputs were generated");
	}

	return created;
}

async function cropVideo(
	inputPath: string,
	config: Record<string, unknown> | undefined,
	taskId: string,
): Promise<string> {
	const cropConfig = config as CropRequest["crop_config"] | undefined;
	if (!cropConfig?.mode) {
		throw new Error("Invalid crop configuration");
	}

	const outputSuffix = String((config as { outputSuffix?: string } | undefined)?.outputSuffix || "_cropped");
	const timeout = Number((config as { timeout?: number } | undefined)?.timeout ?? 3600);

	const args = [
		"-m",
		"runninghub_cli.cli",
		"crop",
		inputPath,
		"--mode",
		cropConfig.mode,
		"--output-suffix",
		outputSuffix,
		"--timeout",
		String(timeout),
	];

	if (cropConfig.mode === "custom") {
		if (cropConfig.width) args.push("--width", cropConfig.width);
		if (cropConfig.height) args.push("--height", cropConfig.height);
		if (cropConfig.x) args.push("--x", cropConfig.x);
		if (cropConfig.y) args.push("--y", cropConfig.y);
	}

	await runPythonCli(args, taskId);

	const extension = extname(inputPath);
	const outputPath = inputPath.replace(extension, `${outputSuffix}${extension}`);
	return outputPath;
}

async function resizeImage(
	inputPath: string,
	config: Record<string, unknown> | undefined,
	taskId: string,
): Promise<string> {
	if (!config) {
		throw new Error("Resize configuration is required");
	}

	const mode = String(config.mode || "longest");
	const width = config.width ? Number(config.width) : undefined;
	const height = config.height ? Number(config.height) : undefined;
	const percentage = config.percentage ? Number(config.percentage) : undefined;
	const aspectRatioStrategy = String(config.aspectRatioStrategy || "fit");
	const outputSuffix = String(config.outputSuffix || "_resized");
	const deleteOriginal = Boolean(config.deleteOriginal);

	const filter = buildResizeFilter({
		mode,
		width,
		height,
		percentage,
		aspectRatioStrategy,
	});

	if (!filter) {
		throw new Error("Invalid resize configuration");
	}

	const extension = extname(inputPath);
	const outputPath = inputPath.replace(extension, `${outputSuffix}${extension}`);

	await writeLog(
		`Resizing image: ${basename(inputPath)} -> ${basename(outputPath)}`,
		"info",
		taskId,
	);

	await runFfmpeg({
		args: ["-i", inputPath, "-vf", filter, outputPath],
		timeout: Number(config.timeout ?? 600),
	});

	if (deleteOriginal) {
		await fs.unlink(inputPath);
	}

	return outputPath;
}

function buildResizeFilter({
	mode,
	width,
	height,
	percentage,
	aspectRatioStrategy,
}: {
	mode: string;
	width?: number;
	height?: number;
	percentage?: number;
	aspectRatioStrategy: string;
}): string {
	if (mode === "percentage" && percentage) {
		const scale = percentage / 100;
		return `scale=iw*${scale}:ih*${scale}`;
	}

	if (mode === "dimensions" && width && height) {
		if (aspectRatioStrategy === "stretch") {
			return `scale=${width}:${height}`;
		}
		if (aspectRatioStrategy === "fill") {
			return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
		}
		return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
	}

	if (mode === "longest" && width) {
		return `scale=${width}:-1`;
	}

	if (mode === "shortest" && width) {
		return `scale=-1:${width}`;
	}

	return "";
}

async function duckDecode(
	inputPath: string,
	config: Record<string, unknown> | undefined,
	taskId: string,
): Promise<string> {
	const password = config?.password ? String(config.password) : undefined;
	const outputPath = buildDecodedOutputPath(inputPath);

	const args = ["-m", "runninghub_cli.cli", "duck-decode", inputPath, "--out", outputPath];
	if (password) {
		args.push("--password", password);
	}

	await writeLog(`Decoding duck image: ${basename(inputPath)}`, "info", taskId);
	await runPythonCli(args, taskId);

	return outputPath;
}

async function captionMedia(
	inputPath: string,
	config: Record<string, unknown> | undefined,
	folderPath: string | undefined,
	taskId: string,
): Promise<string> {
	const datasetPath =
		(config?.datasetPath as string | undefined) ||
		folderPath ||
		dirname(inputPath);

	const response = await fetch(
		`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/dataset/caption`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				videoPath: inputPath,
				videoName: basename(inputPath),
				datasetPath,
			}),
		},
	);

	const data = (await response.json()) as { success: boolean; captionPath?: string; message?: string };

	if (!data.success || !data.captionPath) {
		throw new Error(data.message || "Caption failed");
	}

	await writeLog(`Caption saved: ${basename(data.captionPath)}`, "success", taskId);

	return data.captionPath;
}

async function runPythonCli(args: string[], taskId: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn("python3", args, {
			env: process.env,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stderr = "";

		child.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		child.on("close", (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(stderr || "Command failed"));
		});

		child.on("error", (error) => {
			reject(error);
		});
	}).catch(async (error) => {
		await writeLog(
			`CLI error: ${error instanceof Error ? error.message : "Unknown error"}`,
			"error",
			taskId,
		);
		throw error;
	});
}

async function runFfmpeg({ args, timeout }: { args: string[]; timeout: number }) {
	return new Promise<void>((resolve, reject) => {
		const child = spawn("ffmpeg", args, {
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stderr = "";
		const timeoutHandle = setTimeout(() => {
			child.kill("SIGKILL");
			reject(new Error("FFmpeg timed out"));
		}, timeout * 1000);

		child.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		child.on("close", (code) => {
			clearTimeout(timeoutHandle);
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(stderr || "FFmpeg failed"));
		});

		child.on("error", (error) => {
			clearTimeout(timeoutHandle);
			reject(error);
		});
	});
}

async function finalizeTempOutput({
	inputPath,
	outputPath,
	tempOutputPath,
	deleteOriginal,
}: {
	inputPath: string;
	outputPath: string;
	tempOutputPath: string;
	deleteOriginal: boolean;
}) {
	await fs.rename(tempOutputPath, outputPath);

	if (deleteOriginal && inputPath !== outputPath) {
		await fs.unlink(inputPath);
	}
}

function buildDecodedOutputPath(inputPath: string): string {
	const extension = extname(inputPath);
	const base = inputPath.slice(0, -extension.length);
	return `${base}_decoded${extension}`;
}

async function listFiles(dirPath: string): Promise<Set<string>> {
	try {
		const entries = await fs.readdir(dirPath);
		return new Set(entries.map((entry) => join(dirPath, entry)));
	} catch (error) {
		return new Set();
	}
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
