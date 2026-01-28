import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

/**
 * API endpoint to copy a file from the workspace outputs to the current workspace folder
 *
 * POST /api/workspace/copy-to-folder
 * Body: { sourcePath: string, targetFolder: string, fileName?: string }
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { sourcePath, targetFolder, fileName, jobId, jobOutputPath } = body;

		if (!sourcePath || !targetFolder) {
			return NextResponse.json(
				{ success: false, error: "Missing sourcePath or targetFolder" },
				{ status: 400 },
			);
		}

		// Verify source file exists
		if (!existsSync(sourcePath)) {
			return NextResponse.json(
				{ success: false, error: "Source file does not exist" },
				{ status: 404 },
			);
		}

		// Get the filename from source path if not provided
		const finalFileName = fileName || path.basename(sourcePath);

		// Security: Prevent path traversal via fileName
		if (finalFileName.includes("/") || finalFileName.includes("\\")) {
			return NextResponse.json(
				{ success: false, error: "Invalid filename" },
				{ status: 400 },
			);
		}

		const targetPath = path.join(targetFolder, finalFileName);

		// Ensure target directory exists
		if (!existsSync(targetFolder)) {
			await mkdir(targetFolder, { recursive: true });
		}

		// Read source file and write to target
		const fileContent = await readFile(sourcePath);
		await writeFile(targetPath, fileContent);

		if (jobId && jobOutputPath) {
			try {
				const jobFilePath = path.join(
					process.env.HOME || "~",
					"Downloads",
					"workspace",
					jobId,
					"job.json",
				);
				const jobContent = await readFile(jobFilePath, "utf-8");
				const job = JSON.parse(jobContent);
				const savedOutputPaths = Array.isArray(job.savedOutputPaths)
					? job.savedOutputPaths
					: [];
				if (!savedOutputPaths.includes(jobOutputPath)) {
					savedOutputPaths.push(jobOutputPath);
					await writeFile(
						jobFilePath,
						JSON.stringify({ ...job, savedOutputPaths }, null, 2),
					);
				}
			} catch (error) {
				console.warn("Failed to update job saved outputs:", error);
			}
		}

		return NextResponse.json({
			success: true,
			targetPath,
			fileName: finalFileName,
		});
	} catch (error) {
		console.error("Error copying file to folder:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to copy file",
			},
			{ status: 500 },
		);
	}
}
