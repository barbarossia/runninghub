import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * GET /api/files/read-txt
 * Read the content of a txt file
 * Query params: path - absolute path to the txt file
 */
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const filePath = searchParams.get("path");

		if (!filePath) {
			return NextResponse.json(
				{ error: "File path is required" },
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

		// Check if file exists
		try {
			await fs.access(normalizedPath);
		} catch {
			return NextResponse.json({ error: "File not found" }, { status: 404 });
		}

		// Check if it's a txt file
		if (!normalizedPath.toLowerCase().endsWith(".txt")) {
			return NextResponse.json(
				{ error: "File must be a .txt file" },
				{ status: 400 },
			);
		}

		// Read file content
		const content = await fs.readFile(normalizedPath, "utf-8");

		return NextResponse.json({
			success: true,
			content,
			path: normalizedPath,
		});
	} catch (error) {
		console.error("Error reading txt file:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json(
			{ error: "Failed to read file", details: errorMessage },
			{ status: 500 },
		);
	}
}
