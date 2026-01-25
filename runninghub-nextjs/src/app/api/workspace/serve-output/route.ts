/**
 * Output File Serve API
 * Serves output files from workspace job result directories
 * Directory structure: ~/Downloads/workspace/{jobId}/result/
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const filePath = searchParams.get("path");

		if (!filePath) {
			return NextResponse.json(
				{ success: false, error: "File path is required" },
				{ status: 400 },
			);
		}

		// Security: Ensure path is within workspace directory
		// Allowed: ~/Downloads/workspace/{jobId}/result/
		const workspaceDir = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
		);
		const resolvedPath = path.resolve(filePath);

		if (!resolvedPath.startsWith(path.resolve(workspaceDir))) {
			return NextResponse.json(
				{ success: false, error: "Access denied" },
				{ status: 403 },
			);
		}

		// Additional security: Ensure path contains a job ID folder and result subfolder
		// Valid paths: ~/Downloads/workspace/{jobId}/result/{filename}
		const relativePath = path.relative(
			path.resolve(workspaceDir),
			resolvedPath,
		);
		const pathParts = relativePath.split(path.sep);

		if (pathParts.length < 2 || pathParts[1] !== "result") {
			return NextResponse.json(
				{ success: false, error: "Access denied - invalid path structure" },
				{ status: 403 },
			);
		}

		// Read file
		const fileBuffer = await fs.readFile(resolvedPath);
		const ext = path.extname(resolvedPath).toLowerCase();

		// Determine content type
		let contentType = "application/octet-stream";
		if (ext === ".txt") contentType = "text/plain; charset=utf-8";
		else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
		else if (ext === ".png") contentType = "image/png";
		else if (ext === ".gif") contentType = "image/gif";
		else if (ext === ".webp") contentType = "image/webp";

		return new NextResponse(fileBuffer, {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=86400",
			},
		});
	} catch (error) {
		console.error("Serve output error:", error);
		return NextResponse.json(
			{ success: false, error: "File not found" },
			{ status: 404 },
		);
	}
}
