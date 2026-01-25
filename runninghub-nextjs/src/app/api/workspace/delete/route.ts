import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { writeLog } from "@/lib/logger";

interface DeleteRequest {
	paths: string[];
}

export async function POST(request: NextRequest) {
	try {
		const data: DeleteRequest = await request.json();
		const { paths } = data;

		if (!paths || paths.length === 0) {
			return NextResponse.json(
				{ error: "No files selected for deletion" },
				{ status: 400 },
			);
		}

		const deleted: string[] = [];
		const failed: Array<{ path: string; error: string }> = [];

		for (const filePath of paths) {
			try {
				// Validate the path is within acceptable bounds
				const resolvedPath = path.resolve(filePath);
				const normalizedPath = path.normalize(resolvedPath);

				// Security check
				if (
					normalizedPath.includes("..") ||
					normalizedPath.includes("/System/") ||
					normalizedPath.includes("/Windows/")
				) {
					failed.push({ path: filePath, error: "Invalid path" });
					continue;
				}

				// Check if it exists
				const stats = await fs.stat(normalizedPath);
				if (stats.isFile()) {
					await fs.unlink(normalizedPath);
					deleted.push(normalizedPath);
					await writeLog(
						`Deleted file: ${path.basename(normalizedPath)}`,
						"info",
						"file_operation",
					);
				} else {
					failed.push({ path: filePath, error: "Not a file" });
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				failed.push({ path: filePath, error: errorMessage });
			}
		}

		const response = {
			success: true,
			deleted_count: deleted.length,
			failed_count: failed.length,
			deleted,
			failed,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error deleting files:", error);
		return NextResponse.json(
			{ error: "Failed to delete files" },
			{ status: 500 },
		);
	}
}
