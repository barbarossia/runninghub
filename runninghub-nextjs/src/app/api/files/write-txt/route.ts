import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface WriteTxtRequest {
	path: string;
	content: string;
}

/**
 * POST /api/files/write-txt
 * Write content to a txt file
 * Body: { path: string, content: string }
 */
export async function POST(request: NextRequest) {
	try {
		const data: WriteTxtRequest = await request.json();
		const { path: filePath, content } = data;

		if (!filePath) {
			return NextResponse.json(
				{ error: "File path is required" },
				{ status: 400 },
			);
		}

		if (content === undefined || content === null) {
			return NextResponse.json(
				{ error: "Content is required" },
				{ status: 400 },
			);
		}

		// Resolve and normalize the path for security
		const resolvedPath = path.resolve(filePath);
		const normalizedPath = path.normalize(resolvedPath);

		// Security check: prevent path traversal
		if (normalizedPath.includes("..")) {
			return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
		}

		// Check if it's a txt file
		if (!normalizedPath.toLowerCase().endsWith(".txt")) {
			return NextResponse.json(
				{ error: "File must be a .txt file" },
				{ status: 400 },
			);
		}

		// Ensure the directory exists
		const dir = path.dirname(normalizedPath);
		try {
			await fs.access(dir);
		} catch {
			// Directory doesn't exist, create it
			await fs.mkdir(dir, { recursive: true });
		}

		// Write content to file
		await fs.writeFile(normalizedPath, content, "utf-8");

		return NextResponse.json({
			success: true,
			path: normalizedPath,
			message: "File saved successfully",
		});
	} catch (error) {
		console.error("Error writing txt file:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json(
			{ error: "Failed to write file", details: errorMessage },
			{ status: 500 },
		);
	}
}
