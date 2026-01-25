/**
 * File Validation API
 * POST - Validate files against workflow parameters
 */

import { NextRequest, NextResponse } from "next/server";
import type { WorkflowInputParameter, MediaFile } from "@/types/workspace";
import {
	validateFileForParameter,
	filterValidFilesForParameter,
} from "@/utils/workspace-validation";

interface ValidateFileRequest {
	file: MediaFile;
	parameter: WorkflowInputParameter;
}

interface ValidateFilesRequest {
	files: MediaFile[];
	parameter: WorkflowInputParameter;
}

interface ValidateFileResponse {
	valid: boolean;
	error?: string;
}

interface ValidateFilesResponse {
	valid: MediaFile[];
	invalid: Array<MediaFile & { error: string }>;
	totalCount: number;
	validCount: number;
	invalidCount: number;
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// Single file validation
		if (body.file && body.parameter) {
			const { file, parameter }: ValidateFileRequest = body;

			if (!file || !parameter) {
				return NextResponse.json(
					{
						success: false,
						error: "File and parameter are required",
					} as { success: false; error: string },
					{ status: 400 },
				);
			}

			const result = validateFileForParameter(file, parameter);

			return NextResponse.json({
				success: true,
				...result,
			} as { success: true } & ValidateFileResponse);
		}

		// Multiple files validation
		if (body.files && body.parameter) {
			const { files, parameter }: ValidateFilesRequest = body;

			if (!Array.isArray(files) || !parameter) {
				return NextResponse.json(
					{
						success: false,
						error: "Files array and parameter are required",
					} as { success: false; error: string },
					{ status: 400 },
				);
			}

			const validFiles = filterValidFilesForParameter(files, parameter);
			const invalidFiles = files
				.filter((file) => !validFiles.includes(file))
				.map((file) => {
					const validation = validateFileForParameter(file, parameter);
					return {
						...file,
						error: validation.error || "Unknown validation error",
					};
				});

			return NextResponse.json({
				success: true,
				valid: validFiles,
				invalid: invalidFiles,
				totalCount: files.length,
				validCount: validFiles.length,
				invalidCount: invalidFiles.length,
			} as { success: true } & ValidateFilesResponse);
		}

		// Invalid request
		return NextResponse.json(
			{
				success: false,
				error:
					"Invalid request. Provide either {file, parameter} or {files, parameter}",
			} as { success: false; error: string },
			{ status: 400 },
		);
	} catch (error) {
		console.error("File validation error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to validate files",
			} as { success: false; error: string },
			{ status: 500 },
		);
	}
}
