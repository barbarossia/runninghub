/**
 * Workspace file upload API endpoint
 * Handles uploading images to the workspace directory
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { FileUploadRequest, FileUploadResponse } from "@/types/workspace";
import { ERROR_MESSAGES } from "@/constants";
import { getFileMetadata } from "@/lib/metadata";
import { getWorkspaceDir } from "@/lib/workspace-path";

export async function POST(request: NextRequest) {
	try {
		const contentType = request.headers.get("content-type") || "";
		const isMultipart = contentType.includes("multipart/form-data");
		const isJson = contentType.includes("application/json");
		let files: FileUploadRequest[] = [];
		let multipartFiles: File[] = [];

		if (isMultipart) {
			const formData = await request.formData();
			const formFiles = formData.getAll("files").filter((value) => value instanceof File);
			multipartFiles = formFiles as File[];

			if (multipartFiles.length === 0) {
				const fallbackFiles: File[] = [];
				for (const value of formData.values()) {
					if (value instanceof File) {
						fallbackFiles.push(value);
					}
				}
				multipartFiles = fallbackFiles;
			}
		} else if (isJson) {
			const body = await request.json();
			const payload = body as { files: FileUploadRequest[] };
			files = payload.files || [];
		} else {
			return NextResponse.json(
				{
					success: false,
					error: "Unsupported content type",
				},
				{ status: 415 },
			);
		}

		if (files.length === 0 && multipartFiles.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error: "No files provided",
				},
				{ status: 400 },
			);
		}

		// Get workspace directory from centralized utility
		const workspaceDir = getWorkspaceDir();

		// Ensure workspace directory exists
		try {
			await fs.mkdir(workspaceDir, { recursive: true });
		} catch (mkdirError) {
			console.error("Failed to create workspace directory:", mkdirError);
			return NextResponse.json(
				{
					success: false,
					error: ERROR_MESSAGES.WORKSPACE_NOT_FOUND,
				},
				{ status: 400 },
			);
		}

		const uploadedFiles: FileUploadResponse[] = [];

		const supportedImageExtensions = [
			".png",
			".jpg",
			".jpeg",
			".gif",
			".bmp",
			".webp",
		];
		const supportedVideoExtensions = [
			".mp4",
			".webm",
			".mkv",
			".avi",
			".mov",
			".flv",
		];

		const saveUploadedFile = async (fileName: string, buffer: Buffer) => {
			const fileId = crypto.randomBytes(16).toString("hex");
			const filePath = path.join(workspaceDir, fileName);
			await fs.writeFile(filePath, buffer);

			const fileExtension = path.extname(fileName).toLowerCase();
			let width: number | undefined;
			let height: number | undefined;

			if (supportedImageExtensions.includes(fileExtension)) {
				const metadata = await getFileMetadata(filePath, "image");
				width = metadata?.width;
				height = metadata?.height;
				console.log(`[Upload] ${fileName} dimensions: ${width} x ${height}`);
			} else if (supportedVideoExtensions.includes(fileExtension)) {
				const metadata = (await getFileMetadata(filePath, "video")) as any;
				width = metadata?.width;
				height = metadata?.height;
			}

			uploadedFiles.push({
				id: fileId,
				name: fileName,
				workspacePath: filePath,
				width,
				height,
			});
		};

		for (const file of files) {
			try {
				const buffer = Buffer.from(file.data, "base64");
				await saveUploadedFile(file.name, buffer);
			} catch (fileError) {
				console.error(`Failed to save file ${file.name}:`, fileError);
				// Continue with other files
			}
		}

		for (const file of multipartFiles) {
			try {
				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);
				await saveUploadedFile(file.name, buffer);
			} catch (fileError) {
				console.error(`Failed to save file ${file.name}:`, fileError);
			}
		}

		if (uploadedFiles.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error: ERROR_MESSAGES.UPLOAD_FAILED,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			uploadedFiles,
		});
	} catch (error) {
		console.error("Upload error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : ERROR_MESSAGES.UPLOAD_FAILED,
			},
			{ status: 500 },
		);
	}
}
