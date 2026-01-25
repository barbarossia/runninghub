import { NextRequest, NextResponse } from "next/server";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";

interface AICaptionRequest {
	images: string[];
	videos: string[];
	config: {
		workflowId: string;
		mode: "generate" | "replace" | "append" | "prepend";
		language: "en" | "zh" | "both";
	};
	folderPath: string;
}

export async function POST(request: NextRequest) {
	try {
		const data: AICaptionRequest = await request.json();
		const { images, videos, config, folderPath } = data;

		const mediaFiles = [...(images || []), ...(videos || [])];

		if (mediaFiles.length === 0) {
			return NextResponse.json(
				{ error: "No media files selected for captioning" },
				{ status: 400 },
			);
		}

		// Check if workflow is configured
		if (!config.workflowId) {
			return NextResponse.json(
				{
					error: "Caption workflow not configured",
					message:
						"Please configure a RunningHub workflow ID for captioning in the settings",
				},
				{ status: 400 },
			);
		}

		// Create background task
		const taskId = `caption_${Date.now()}`;
		await initTask(taskId, mediaFiles.length);

		// Start background processing
		processCaptionsInBackground(mediaFiles, config, folderPath, taskId);

		return NextResponse.json({
			success: true,
			taskId,
			message: `Started captioning ${mediaFiles.length} files`,
			processedCount: mediaFiles.length,
		});
	} catch (error) {
		console.error("Caption API error:", error);
		return NextResponse.json(
			{ error: "Failed to start captioning" },
			{ status: 500 },
		);
	}
}

async function processCaptionsInBackground(
	mediaFiles: string[],
	config: AICaptionRequest["config"],
	folderPath: string,
	taskId: string,
) {
	await writeLog(`=== AI CAPTIONING STARTED ===`, "info", taskId);
	await writeLog(`Workflow ID: ${config.workflowId}`, "info", taskId);
	await writeLog(`Processing ${mediaFiles.length} files`, "info", taskId);

	// Placeholder: Show message that this requires workflow integration
	await writeLog(
		`Caption workflow integration not yet implemented`,
		"warning",
		taskId,
	);
	await writeLog(
		`Workflow ID "${config.workflowId}" will be used for captioning`,
		"info",
		taskId,
	);

	// TODO: Implement actual workflow execution
	// This would:
	// 1. Upload each image/video to RunningHub
	// 2. Submit to the caption workflow
	// 3. Download the generated caption
	// 4. Save as .txt file

	const successCount = 0;
	const failureCount = mediaFiles.length;

	for (let i = 0; i < mediaFiles.length; i++) {
		const filePath = mediaFiles[i];
		await updateTask(taskId, {
			currentImage: `${filePath} (${i + 1}/${mediaFiles.length})`,
		});
		await writeLog(`Placeholder: Would caption ${filePath}`, "info", taskId);
	}

	await writeLog(
		`=== CAPTIONING COMPLETED: ${successCount} succeeded, ${failureCount} failed ===`,
		"info",
		taskId,
	);
	await updateTask(taskId, { status: "completed", endTime: Date.now() });
}
