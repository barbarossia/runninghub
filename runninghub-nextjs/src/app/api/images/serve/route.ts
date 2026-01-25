import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const imagePath = searchParams.get("path");

		if (!imagePath) {
			return NextResponse.json(
				{ error: "No image path provided" },
				{ status: 400 },
			);
		}

		// Expand tilde (~) if present
		const expandedPath = imagePath.replace(/^~/, os.homedir());

		// Resolve the full path
		const fullPath = path.resolve(expandedPath);

		try {
			const stats = await fs.stat(fullPath);
			if (!stats.isFile()) {
				return NextResponse.json(
					{ error: "Path is not a file" },
					{ status: 400 },
				);
			}
		} catch {
			return NextResponse.json(
				{ error: "Image file not found" },
				{ status: 404 },
			);
		}

		// Check if the file is an image
		const ext = path.extname(fullPath).toLowerCase();
		const supportedExtensions = [
			".png",
			".jpg",
			".jpeg",
			".gif",
			".bmp",
			".webp",
		];
		if (!supportedExtensions.includes(ext)) {
			return NextResponse.json(
				{ error: "File is not a supported image type" },
				{ status: 400 },
			);
		}

		// Read the file
		const imageBuffer = await fs.readFile(fullPath);

		// Determine content type
		const contentTypeMap: Record<string, string> = {
			".png": "image/png",
			".jpg": "image/jpeg",
			".jpeg": "image/jpeg",
			".gif": "image/gif",
			".bmp": "image/bmp",
			".webp": "image/webp",
		};

		const contentType = contentTypeMap[ext] || "image/jpeg";

		// Return the image with appropriate headers
		return new NextResponse(imageBuffer, {
			headers: {
				"Content-Type": contentType,
				"Content-Length": imageBuffer.length.toString(),
				"Cache-Control": "public, max-age=3600", // Cache for 1 hour
			},
		});
	} catch (error) {
		console.error("Error serving image:", error);
		return NextResponse.json(
			{ error: "Failed to serve image" },
			{ status: 500 },
		);
	}
}
