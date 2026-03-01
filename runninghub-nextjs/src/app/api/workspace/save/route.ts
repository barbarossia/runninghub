/**
 * Workspace text save API endpoint
 * Saves edited/translated text content to workspace directory
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { SaveTextRequest, SaveTextResponse } from "@/types/workspace";
import { ERROR_MESSAGES } from "@/constants";
import { getWorkspaceDir } from "@/lib/workspace-path";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { fileId, content, language } = body as SaveTextRequest;

		// Validate inputs
		if (!fileId) {
			return NextResponse.json(
				{
					success: false,
					error: "File ID is required",
				},
				{ status: 400 },
			);
		}

		if (!content) {
			return NextResponse.json(
				{
					success: false,
					error: "Content is required",
				},
				{ status: 400 },
			);
		}

		if (!language || !["en", "zh"].includes(language)) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid language (must be en or zh)",
				},
				{ status: 400 },
			);
		}

		// Get workspace directory from centralized utility
		const workspaceDir = getWorkspaceDir();

		// Validate workspace directory exists
		try {
			await fs.access(workspaceDir);
		} catch {
			return NextResponse.json(
				{
					success: false,
					error: ERROR_MESSAGES.WORKSPACE_NOT_FOUND,
				},
				{ status: 404 },
			);
		}

		// Save file in workspace directory
		const fileName = `${fileId}_${language}.txt`;
		const filePath = path.join(workspaceDir, fileName);

		// Write content to file
		await fs.writeFile(filePath, content, "utf-8");

		return NextResponse.json({
			success: true,
			savedPath: filePath,
		});
	} catch (error) {
		console.error("Save error:", error);
		return NextResponse.json(
			{
				success: false,
				savedPath: "",
				error:
					error instanceof Error ? error.message : ERROR_MESSAGES.SAVE_FAILED,
			},
			{ status: 500 },
		);
	}
}
