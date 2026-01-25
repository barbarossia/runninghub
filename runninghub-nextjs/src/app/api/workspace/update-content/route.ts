/**
 * Workspace update content API
 * Directly updates file content at a given path
 * Restricted to files within the workspace directory for security
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { filePath, content } = body;

		if (!filePath || content === undefined) {
			return NextResponse.json(
				{ success: false, error: "File path and content are required" },
				{ status: 400 },
			);
		}

		// Security check: Ensure the path is within the workspace directory
		const workspaceDir = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
		);
		const resolvedPath = path.resolve(
			filePath.replace(/^~/, process.env.HOME || ""),
		);

		if (!resolvedPath.startsWith(path.resolve(workspaceDir))) {
			return NextResponse.json(
				{ success: false, error: "Access denied: Path is outside workspace" },
				{ status: 403 },
			);
		}

		// Ensure the file exists
		try {
			await fs.access(resolvedPath);
		} catch {
			return NextResponse.json(
				{ success: false, error: "File not found" },
				{ status: 404 },
			);
		}

		// Write content
		await fs.writeFile(resolvedPath, content, "utf-8");

		return NextResponse.json({
			success: true,
			message: "File updated successfully",
		});
	} catch (error) {
		console.error("Update content error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to update file",
			},
			{ status: 500 },
		);
	}
}
