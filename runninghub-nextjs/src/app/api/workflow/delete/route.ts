import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

/**
 * Expand ~/ prefix in path to user home directory
 */
function expandHomePath(path: string): string {
	if (path.startsWith("~/")) {
		return join(homedir(), path.slice(2));
	}
	return path;
}

/**
 * DELETE /api/workflow/delete
 * Delete a workflow from the workspace folder
 */
export async function DELETE(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const workflowId = searchParams.get("id");

		// Validate workflow ID
		if (!workflowId) {
			return NextResponse.json(
				{ error: "Workflow ID is required" },
				{ status: 400 },
			);
		}

		// Get workspace path from env or use default
		const workspacePath = process.env.WORKSPACE_PATH || "~/Downloads/workspace";
		const expandedPath = expandHomePath(workspacePath);
		const workflowsDir = join(expandedPath, "workflows");
		const filename = `${workflowId}.json`;
		const filepath = join(workflowsDir, filename);

		// Delete workflow file
		try {
			await unlink(filepath);
			console.log(`Workflow deleted: ${filepath}`);
		} catch (error: any) {
			if (error.code === "ENOENT") {
				console.warn(`Workflow file not found: ${filepath}`);
				// If file doesn't exist, we consider it "deleted" from our perspective
			} else {
				throw error;
			}
		}

		return NextResponse.json({
			success: true,
			message: "Workflow deleted successfully",
		});
	} catch (error) {
		console.error("Failed to delete workflow:", error);

		return NextResponse.json(
			{
				error: "Failed to delete workflow",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
