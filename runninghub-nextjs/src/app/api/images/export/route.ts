/**
 * Export Images API
 * POST - Serves selected image/video files for client-side export
 * Returns file contents encoded as base64 for browser File System Access API
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

interface ExportRequest {
	images: Array<{
		path: string;
		name: string;
		blobUrl?: string;
	}>;
}

interface ExportFileResult {
	name: string;
	path: string;
	base64?: string;
	mimeType?: string;
	error?: string;
}

// MIME type mapping for common image and video formats
const MIME_TYPE_MAP: Record<string, string> = {
	// Images
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".bmp": "image/bmp",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	// Videos
	".mp4": "video/mp4",
	".mov": "video/quicktime",
	".avi": "video/x-msvideo",
	".mkv": "video/x-matroska",
	".webm": "video/webm",
	".flv": "video/x-flv",
	".wmv": "video/x-ms-wmv",
	".m4v": "video/mp4",
};

function getMimeType(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	return MIME_TYPE_MAP[ext] || "application/octet-stream";
}

export async function POST(request: NextRequest) {
	try {
		const body: ExportRequest = await request.json();
		const { images } = body;

		if (!images || !Array.isArray(images) || images.length === 0) {
			return NextResponse.json(
				{ error: "No images provided for export" },
				{ status: 400 },
			);
		}

		const results: ExportFileResult[] = [];
		let successCount = 0;
		let failureCount = 0;

		for (const image of images) {
			const { path: imagePath, name, blobUrl } = image;

			try {
				let fileBuffer: Buffer;
				let mimeType: string;

				// Handle blob URLs (virtual files from File System Access API)
				// For blob URLs, the client will handle fetching directly
				if (blobUrl && blobUrl.startsWith("blob:")) {
					results.push({
						name,
						path: imagePath,
						error: "BLOB_URL", // Signal to client to fetch from blob URL
					});
					failureCount++;
					continue;
				}

				// Expand tilde (~) if present
				const expandedPath = imagePath.replace(/^~/, os.homedir());
				const fullPath = path.resolve(expandedPath);

				// Check if file exists and is accessible
				try {
					const stats = await fs.stat(fullPath);
					if (!stats.isFile()) {
						results.push({
							name,
							path: imagePath,
							error: "Not a file",
						});
						failureCount++;
						continue;
					}
				} catch {
					results.push({
						name,
						path: imagePath,
						error: "File not found",
					});
					failureCount++;
					continue;
				}

				// Read file content
				fileBuffer = await fs.readFile(fullPath);
				mimeType = getMimeType(fullPath);

				// Convert to base64 for client-side use
				const base64 = fileBuffer.toString("base64");

				results.push({
					name,
					path: imagePath,
					base64,
					mimeType,
				});
				successCount++;
			} catch (error) {
				results.push({
					name,
					path: imagePath,
					error: error instanceof Error ? error.message : "Unknown error",
				});
				failureCount++;
			}
		}

		return NextResponse.json({
			success: true,
			results,
			summary: {
				total: images.length,
				success: successCount,
				failure: failureCount,
			},
		});
	} catch (error) {
		console.error("Export API error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Export failed",
			},
			{ status: 500 },
		);
	}
}
