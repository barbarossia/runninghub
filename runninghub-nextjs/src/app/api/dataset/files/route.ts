import { NextRequest, NextResponse } from "next/server";
import { readdir, stat, readFile } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";
import { getFileMetadata } from "@/lib/metadata";

// Supported media extensions
const IMAGE_EXTENSIONS = new Set([
	".jpg",
	".jpeg",
	".png",
	".gif",
	".webp",
	".bmp",
	".tiff",
	".avif",
]);
const VIDEO_EXTENSIONS = new Set([
	".mp4",
	".mov",
	".avi",
	".mkv",
	".webm",
	".flv",
	".wmv",
	".m4v",
]);

// Helper function to read caption file if it exists
async function readCaptionFile(
	mediaPath: string,
): Promise<{ caption: string; captionPath: string } | undefined> {
	const txtPath = mediaPath.replace(/\.[^.]+$/, ".txt");
	if (!existsSync(txtPath)) {
		return undefined;
	}
	try {
		const caption = await readFile(txtPath, "utf-8");
		return { caption, captionPath: txtPath };
	} catch {
		return undefined;
	}
}

export async function POST(request: NextRequest) {
	try {
		const { datasetPath } = await request.json();

		if (!datasetPath) {
			return NextResponse.json(
				{ success: false, error: "Dataset path is required" },
				{ status: 400 },
			);
		}

		// Read all entries in the dataset folder
		const entries = await readdir(datasetPath, { withFileTypes: true });

		const images: any[] = [];
		const videos: any[] = [];

		for (const entry of entries) {
			if (!entry.isFile()) continue;

			const filePath = join(datasetPath, entry.name);
			const ext = extname(entry.name).toLowerCase();

			// Process image files
			if (IMAGE_EXTENSIONS.has(ext)) {
				try {
					const fileStats = await stat(filePath);
					const metadata = await getFileMetadata(filePath, "image");
					const captionData = await readCaptionFile(filePath);

					images.push({
						name: entry.name,
						path: filePath,
						size: fileStats.size,
						width: metadata?.width || 0,
						height: metadata?.height || 0,
						created_at: fileStats.birthtimeMs || fileStats.ctimeMs,
						modified_at: fileStats.mtimeMs,
						caption: captionData?.caption,
						captionPath: captionData?.captionPath,
					});
				} catch (err) {
					// Skip files that can't be read
					console.warn(`Skipping image ${entry.name}:`, err);
				}
			}
			// Process video files
			else if (VIDEO_EXTENSIONS.has(ext)) {
				try {
					const fileStats = await stat(filePath);
					const metadata = (await getFileMetadata(filePath, "video")) as any;
					const captionData = await readCaptionFile(filePath);

					videos.push({
						name: entry.name,
						path: filePath,
						size: fileStats.size,
						width: metadata?.width || 0,
						height: metadata?.height || 0,
						fps: metadata?.fps || 0,
						duration: metadata?.duration || 0,
						thumbnail: undefined,
						created_at: fileStats.birthtimeMs || fileStats.ctimeMs,
						modified_at: fileStats.mtimeMs,
						caption: captionData?.caption,
						captionPath: captionData?.captionPath,
					});
				} catch (err) {
					// Skip files that can't be read
					console.warn(`Skipping video ${entry.name}:`, err);
				}
			}
		}

		return NextResponse.json({ success: true, images, videos });
	} catch (error) {
		console.error("Error loading dataset files:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to load dataset files",
			},
			{ status: 500 },
		);
	}
}
