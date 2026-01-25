import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { writeLog } from "@/lib/logger";

interface RenameRequest {
	path: string;
	newName: string;
}

export async function POST(request: NextRequest) {
	try {
		const data: RenameRequest = await request.json();
		const { path: currentPath, newName } = data;

		if (!currentPath || !newName) {
			return NextResponse.json(
				{ error: "File path and new name are required" },
				{ status: 400 },
			);
		}

		// Resolve directory
		const directory = path.dirname(currentPath);

		// Ensure new name has extension if not provided, or preserve extension of original
		let finalNewName = newName;
		const originalExt = path.extname(currentPath);
		const newExt = path.extname(finalNewName);

		// If new name doesn't have an extension, append the original one
		if (!newExt && originalExt) {
			finalNewName += originalExt;
		}

		const newPath = path.join(directory, finalNewName);

		// Prevent renaming to same path
		if (currentPath === newPath) {
			return NextResponse.json({
				success: true,
				message: `Renamed to ${finalNewName}`,
				newPath,
				newName: finalNewName,
			});
		}

		// Check if source exists
		try {
			await fs.access(currentPath);
		} catch {
			return NextResponse.json(
				{ error: "Source file not found" },
				{ status: 404 },
			);
		}

		// Check if destination exists
		try {
			await fs.access(newPath);
			return NextResponse.json(
				{ error: "A file with that name already exists" },
				{ status: 409 },
			);
		} catch {
			// Destination does not exist, safe to rename
		}

		// Rename
		await fs.rename(currentPath, newPath);

		// Log
		await writeLog(
			`Renamed file: ${path.basename(currentPath)} -> ${finalNewName}`,
			"info",
			"file_operation",
		);

		return NextResponse.json({
			success: true,
			message: `Renamed to ${finalNewName}`,
			newPath,
			newName: finalNewName,
		});
	} catch (error) {
		console.error("Error renaming file:", error);
		return NextResponse.json(
			{
				error: `Failed to rename file: ${error instanceof Error ? error.message : String(error)}`,
			},
			{ status: 500 },
		);
	}
}
