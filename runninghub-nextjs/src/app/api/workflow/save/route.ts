import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Workflow } from "@/types/workspace";
import { getWorkspaceDir } from "@/lib/workspace-path";

/**
 * POST /api/workflow/save
 * Save a workflow to the workspace folder
 */
export async function POST(request: NextRequest) {
	try {
		const workflow: Workflow = await request.json();

		// Validate workflow
		if (!workflow.id) {
			return NextResponse.json(
				{ error: "Workflow ID is required" },
				{ status: 400 },
			);
		}

		if (!workflow.name) {
			return NextResponse.json(
				{ error: "Workflow name is required" },
				{ status: 400 },
			);
		}

		const workflowsDir = getWorkspaceDir("workflows");

		// Ensure workflows directory exists
		try {
			await mkdir(workflowsDir, { recursive: true });
		} catch (mkdirError) {
			console.error("Failed to create workflows directory:", mkdirError);
			return NextResponse.json(
				{
					error: "Failed to create workflows directory",
					details: String(mkdirError),
				},
				{ status: 500 },
			);
		}

		// Create filename from workflow ID
		const filename = `${workflow.id}.json`;
		const filepath = join(workflowsDir, filename);

		// Save workflow to file
		const workflowJson = JSON.stringify(workflow, null, 2);
		await writeFile(filepath, workflowJson, "utf-8");

		console.log(`Workflow saved: ${filepath}`);

		return NextResponse.json({
			success: true,
			workflow: {
				id: workflow.id,
				name: workflow.name,
				filepath,
			},
			message: "Workflow saved successfully",
		});
	} catch (error) {
		console.error("Failed to save workflow:", error);

		return NextResponse.json(
			{
				error: "Failed to save workflow",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
