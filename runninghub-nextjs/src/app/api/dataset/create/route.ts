import { NextRequest, NextResponse } from "next/server";
import { mkdir, cp, readFile, writeFile } from "fs/promises";
import { join, basename } from "path";
import { existsSync } from "fs";
import type {
	CreateDatasetRequest,
	CreateDatasetResponse,
} from "@/types/caption";

// JSON file to track workspace configuration
const WORKSPACE_JSON_FILE = "workspace.json";

// Helper function to read workspace config from JSON file
async function readWorkspaceJson(
	parentPath: string,
): Promise<{ dataset?: any[] }> {
	const jsonPath = join(parentPath, WORKSPACE_JSON_FILE);
	if (!existsSync(jsonPath)) {
		return { dataset: [] };
	}
	try {
		const content = await readFile(jsonPath, "utf-8");
		const data = JSON.parse(content);
		if (!data.dataset) {
			data.dataset = [];
		}
		return data;
	} catch {
		return { dataset: [] };
	}
}

// Helper function to write workspace config to JSON file
async function writeWorkspaceJson(
	parentPath: string,
	data: any,
): Promise<void> {
	const jsonPath = join(parentPath, WORKSPACE_JSON_FILE);
	await writeFile(jsonPath, JSON.stringify(data, null, 2), "utf-8");
}

export async function POST(request: NextRequest) {
	try {
		const data: CreateDatasetRequest = await request.json();
		const { name, files, parentPath } = data;

		// Validate inputs
		if (!name || name.trim() === "") {
			return NextResponse.json(
				{ success: false, error: "Dataset name is required" },
				{ status: 400 },
			);
		}

		// Sanitize dataset name (remove path separators and special chars)
		const sanitizedName = name.trim().replace(/[\/\\:*?"<>|]/g, "_");

		if (!parentPath) {
			return NextResponse.json(
				{ success: false, error: "Parent folder path is required" },
				{ status: 400 },
			);
		}

		// Create dataset folder path
		const datasetPath = join(parentPath, sanitizedName);

		// Check if dataset already exists
		if (existsSync(datasetPath)) {
			return NextResponse.json(
				{ success: false, error: `Dataset "${sanitizedName}" already exists` },
				{ status: 409 },
			);
		}

		// Create dataset folder
		await mkdir(datasetPath, { recursive: true });

		// Copy files to dataset folder (if provided)
		let copiedCount = 0;
		const errors: string[] = [];

		if (files && files.length > 0) {
			for (const filePath of files) {
				try {
					const fileName = basename(filePath);
					const destPath = join(datasetPath, fileName);
					await cp(filePath, destPath);
					copiedCount++;
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : "Unknown error";
					errors.push(`${basename(filePath)}: ${errorMsg}`);
				}
			}
		}

		// Save dataset info to workspace.json file (only name and path)
		const workspaceData = await readWorkspaceJson(parentPath);
		const datasetToSave = {
			name: sanitizedName,
			path: datasetPath,
		};
		workspaceData.dataset = workspaceData.dataset || [];
		workspaceData.dataset.push(datasetToSave);
		await writeWorkspaceJson(parentPath, workspaceData);

		// Response includes all info for the frontend
		const response: CreateDatasetResponse = {
			success: true,
			message:
				files && files.length > 0
					? errors.length === 0
						? `Created dataset "${sanitizedName}" with ${copiedCount} files`
						: `Created dataset "${sanitizedName}" with ${copiedCount} files (${errors.length} failed)`
					: `Created empty dataset "${sanitizedName}"`,
			dataset: {
				name: sanitizedName,
				path: datasetPath,
				parentPath,
				fileCount: copiedCount,
				createdAt: Date.now(),
			},
		};

		if (errors.length > 0) {
			response.error = `Some files failed to copy: ${errors.join(", ")}`;
		}

		return NextResponse.json(response);
	} catch (error) {
		console.error("Dataset create API error:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to create dataset" },
			{ status: 500 },
		);
	}
}
