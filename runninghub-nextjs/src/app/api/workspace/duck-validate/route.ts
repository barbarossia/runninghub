import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

/**
 * Duck Validation API
 * Validates if an image contains duck-encoded hidden data
 */

export async function POST(request: NextRequest) {
	try {
		const { imagePath } = await request.json();

		// Validation
		if (!imagePath) {
			return NextResponse.json(
				{ error: "Image path is required" },
				{ status: 400 },
			);
		}

		// Validate file exists
		if (!fs.existsSync(imagePath)) {
			return NextResponse.json(
				{ error: "Image file not found", isDuckEncoded: false },
				{ status: 404 },
			);
		}

		// Validate file type (only images can be duck-encoded)
		const validExtensions = [".png", ".jpg", ".jpeg"];
		const ext = path.extname(imagePath).toLowerCase();
		if (!validExtensions.includes(ext)) {
			return NextResponse.json({
				isDuckEncoded: false,
				requiresPassword: false,
			});
		}

		// Fast pre-check: Skip validation for decoded files
		const filename = path.basename(imagePath).toLowerCase();
		if (filename.includes("_decoded") || filename.includes("-decoded")) {
			console.log("[Duck Validate] Skipping decoded file:", imagePath);
			return NextResponse.json({
				isDuckEncoded: false,
				requiresPassword: false,
			});
		}

		// Fast pre-check: Skip validation for recovered files
		if (filename.includes("_recovered") || filename.includes("-recovered")) {
			console.log("[Duck Validate] Skipping recovered file:", imagePath);
			return NextResponse.json({
				isDuckEncoded: false,
				requiresPassword: false,
			});
		}

		// Try to decode the image with an empty password to validate
		// This is more reliable than trying to use internal functions
		// We'll check the specific error messages to determine if it's duck-encoded

		// Create a temp output path for validation (we won't keep the result)
		const tempDir = "/tmp";
		const tempFileName = `duck_validate_${Date.now()}.bin`;
		const tempOutputPath = path.join(tempDir, tempFileName);

		try {
			// Build duck-decode command with empty password
			const args = ["-m", "runninghub_cli.cli", "duck-decode", imagePath];
			args.push("--out", tempOutputPath);

			console.log("[Duck Validate] Executing: python", args.join(" "));

			// Execute decode command with timeout
			const apiKey =
				process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY ||
				process.env.RUNNINGHUB_API_KEY;
			const workflowId =
				process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID ||
				process.env.RUNNINGHUB_WORKFLOW_ID;

			if (!apiKey) {
				console.error("[Duck Validate] RUNNINGHUB_API_KEY not configured");
				return NextResponse.json({
					isDuckEncoded: false,
					requiresPassword: false,
					error: "API configuration error",
				});
			}

			const output = execSync(
				`python ${args.map((arg) => `"${arg}"`).join(" ")}`,
				{
					encoding: "utf-8",
					timeout: 5000, // 5 seconds timeout for validation (reduced from 30s for better UX)
					stdio: ["pipe", "pipe", "pipe"],
					env: {
						...process.env,
						RUNNINGHUB_API_KEY: apiKey,
						RUNNINGHUB_WORKFLOW_ID: workflowId || "",
					},
				},
			);

			console.log(
				"[Duck Validate] Validation succeeded (no password required)",
			);
			console.log("[Duck Validate] Output:", output.slice(0, 200));

			// Decode succeeded - no password required
			return NextResponse.json({
				isDuckEncoded: true,
				requiresPassword: false,
			});
		} catch (error: any) {
			// Extract stderr for detailed error messages
			const stderr = error.stderr || "";
			const stdout = error.stdout || "";
			const errorMessage = error.message || "";

			console.error("[Duck Validate] Command failed");
			console.error(
				"[Duck Validate] Error message:",
				errorMessage.slice(0, 200),
			);
			console.error("[Duck Validate] Stderr:", stderr.slice(0, 500));
			console.error("[Duck Validate] Stdout:", stdout.slice(0, 200));

			// Combine all error sources for checking
			const fullError = `${stderr} ${stdout} ${errorMessage}`;

			// Check for specific error messages to determine duck encoding status

			// Wrong password → duck-encoded with password required
			if (
				fullError.includes("Wrong password") ||
				fullError.includes("密码错误")
			) {
				console.log("[Duck Validate] Password required");
				return NextResponse.json({
					isDuckEncoded: true,
					requiresPassword: true,
				});
			}

			// Insufficient data / Payload invalid / Header corrupted → not duck-encoded
			if (
				fullError.includes("Insufficient image data") ||
				fullError.includes("图像数据不足") ||
				fullError.includes("Payload length invalid") ||
				fullError.includes("载荷长度异常") ||
				fullError.includes("Header corrupted") ||
				fullError.includes("文件头损坏")
			) {
				console.log("[Duck Validate] Not duck-encoded (invalid data)");
				return NextResponse.json({
					isDuckEncoded: false,
					requiresPassword: false,
				});
			}

			// Any other error → not duck-encoded
			console.log("[Duck Validate] Not duck-encoded (other error)");
			return NextResponse.json({
				isDuckEncoded: false,
				requiresPassword: false,
			});
		} finally {
			// Clean up temp file if it was created
			try {
				if (fs.existsSync(tempOutputPath)) {
					fs.unlinkSync(tempOutputPath);
				}
			} catch (e) {
				// Ignore cleanup errors
			}
		}
	} catch (error) {
		console.error("Duck validation error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Validation failed",
				isDuckEncoded: false,
				requiresPassword: false,
			},
			{ status: 500 },
		);
	}
}
