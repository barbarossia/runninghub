import { NextRequest, NextResponse } from "next/server";
import { rename, access } from "fs/promises";
import { join, dirname, basename, extname } from "path";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";

interface RenameRequest {
	images: string[];
	videos: string[];
	config: {
		pattern: "prefix-sequence" | "suffix-sequence" | "custom-template";
		prefix?: string;
		suffix?: string;
		startNumber?: number;
		padding?: number;
		template?: string;
		preserveExtension: boolean;
	};
	folderPath: string;
}

export async function POST(request: NextRequest) {
	try {
		const data: RenameRequest = await request.json();
		const { images, videos, config } = data;

		const mediaFiles = [...(images || []), ...(videos || [])];

		if (mediaFiles.length === 0) {
			return NextResponse.json(
				{ error: "No files selected for rename" },
				{ status: 400 },
			);
		}

		const taskId = `rename_${Date.now()}`;
		await initTask(taskId, mediaFiles.length);

		processRenameInBackground(mediaFiles, config, taskId);

		return NextResponse.json({
			success: true,
			taskId,
			message: `Started renaming ${mediaFiles.length} files`,
			processedCount: mediaFiles.length,
		});
	} catch (error) {
		console.error("Rename API error:", error);
		return NextResponse.json(
			{ error: "Failed to start rename" },
			{ status: 500 },
		);
	}
}

function generateNewName(
	oldName: string,
	index: number,
	config: RenameRequest["config"],
): string {
	const ext = extname(oldName);
	const base = basename(oldName, ext);
	const {
		pattern,
		prefix,
		suffix,
		startNumber,
		padding,
		template,
		preserveExtension,
	} = config;

	let newName = "";
	const seqNumber = (startNumber || 1) + index;
	const paddedNumber = String(seqNumber).padStart(padding || 3, "0");

	if (pattern === "prefix-sequence") {
		newName = `${prefix}${paddedNumber}`;
	} else if (pattern === "suffix-sequence") {
		newName = `${base}${suffix}${paddedNumber}`;
	} else if (pattern === "custom-template" && template) {
		const now = new Date();
		newName = template
			.replace("{index}", String(seqNumber))
			.replace(/\{index:(\d+)d\}/, (_, width) =>
				String(seqNumber).padStart(parseInt(width), "0"),
			)
			.replace("{date}", now.toISOString().split("T")[0])
			.replace("{time}", now.toTimeString().split(" ")[0].replace(/:/g, "-"))
			.replace("{original}", base);
	}

	if (preserveExtension) {
		newName += ext;
	}

	return newName;
}

async function processRenameInBackground(
	mediaFiles: string[],
	config: RenameRequest["config"],
	taskId: string,
) {
	await writeLog(`=== BATCH RENAME STARTED ===`, "info", taskId);
	await writeLog(
		`Renaming ${mediaFiles.length} files with pattern: ${config.pattern}`,
		"info",
		taskId,
	);

	let successCount = 0;
	let failureCount = 0;

	// Sort files for consistent ordering
	const sortedFiles = [...mediaFiles].sort();

	for (let i = 0; i < sortedFiles.length; i++) {
		const oldPath = sortedFiles[i];
		await updateTask(taskId, {
			currentImage: `${basename(oldPath)} (${i + 1}/${sortedFiles.length})`,
		});

		try {
			const newName = generateNewName(basename(oldPath), i, config);
			const newPath = join(dirname(oldPath), newName);

			// Check if destination already exists
			try {
				await access(newPath);
				// File exists, skip or add counter
				await writeLog(`Skipped: ${newName} already exists`, "warning", taskId);
				failureCount++;
			} catch {
				// Destination doesn't exist, safe to rename
				await rename(oldPath, newPath);
				await writeLog(
					`Renamed: ${basename(oldPath)} -> ${newName}`,
					"success",
					taskId,
				);
				successCount++;
			}

			await updateTask(taskId, { completedCount: successCount });
		} catch (error) {
			await writeLog(
				`Failed to rename ${basename(oldPath)}: ${error}`,
				"error",
				taskId,
			);
			failureCount++;
			await updateTask(taskId, { failedCount: failureCount });
		}
	}

	await writeLog(
		`=== RENAME COMPLETED: ${successCount}/${sortedFiles.length} ===`,
		"info",
		taskId,
	);
	await updateTask(taskId, { status: "completed", endTime: Date.now() });
}
