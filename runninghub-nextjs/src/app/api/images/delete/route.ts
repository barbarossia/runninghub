import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { writeLog } from "@/lib/logger";

interface DeleteRequest {
	images: string[];
}

export async function DELETE(request: NextRequest) {
	try {
		const data: DeleteRequest = await request.json();
		const { images } = data;

		if (!images || images.length === 0) {
			return NextResponse.json(
				{ error: "No images selected for deletion" },
				{ status: 400 },
			);
		}

		const deleted: string[] = [];
		const failed: Array<{ path: string; error: string }> = [];

		for (const imagePath of images) {
			try {
				// Validate the path is within acceptable bounds (basic security)
				const resolvedPath = path.resolve(imagePath);

				// Additional security: ensure we're not trying to delete system files
				const normalizedPath = path.normalize(resolvedPath);
				if (
					normalizedPath.includes("..") ||
					normalizedPath.includes("/System/") ||
					normalizedPath.includes("/Windows/")
				) {
					failed.push({ path: imagePath, error: "Invalid path" });
					continue;
				}

				// Check if it exists and is a file
				const stats = await fs.stat(normalizedPath);
				if (stats.isFile()) {
					await fs.unlink(normalizedPath);
					deleted.push(normalizedPath);
					await writeLog(
						`Deleted image: ${path.basename(normalizedPath)}`,
						"info",
						"delete_action",
					);
				} else {
					failed.push({ path: imagePath, error: "Not a file" });
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				failed.push({ path: imagePath, error: errorMessage });
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
		console.error("Error deleting images:", error);
		return NextResponse.json(
			{ error: "Failed to delete images" },
			{ status: 500 },
		);
	}
}
