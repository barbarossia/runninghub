/**
 * Upload File to RunningHub API
 * Uploads local files to RunningHub servers before workflow execution
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const { filePath } = await request.json();

		if (!filePath) {
			return NextResponse.json(
				{
					success: false,
					error: "File path is required",
				},
				{ status: 400 },
			);
		}

		// Validate file exists
		const fs = await import("fs/promises");
		try {
			await fs.access(filePath);
		} catch {
			return NextResponse.json(
				{
					success: false,
					error: "File does not exist",
				},
				{ status: 404 },
			);
		}

		// Upload to RunningHub
		const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
		if (!apiKey) {
			throw new Error("RUNNINGHUB_API_KEY not configured");
		}

		const { default: FormData } = await import("form-data");
		const fsRead = await import("fs");
		const form = new FormData();

		form.append("file", fsRead.createReadStream(filePath));
		form.append("apiKey", apiKey);
		form.append("fileType", "input");

		const response = await fetch(
			"https://www.runninghub.cn/task/openapi/upload",
			{
				method: "POST",
				body: form as any,
				headers: {
					Host: "www.runninghub.cn",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		if (data.code === 0 && data.data?.fileName) {
			return NextResponse.json({
				success: true,
				fileName: data.data.fileName,
			});
		} else {
			throw new Error(data.msg || "Upload failed");
		}
	} catch (error) {
		console.error("Upload to RunningHub error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Upload failed",
			},
			{ status: 500 },
		);
	}
}
