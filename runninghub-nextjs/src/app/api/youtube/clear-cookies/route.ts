import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(request: NextRequest) {
	try {
		const cacheDir = path.join(process.cwd(), ".cache");
		const cookieFile = path.join(cacheDir, "youtube_cookies.txt");

		// Check if cookie file exists
		try {
			await fs.unlink(cookieFile);
			return NextResponse.json({
				success: true,
				message: "Cookie cache cleared successfully",
			});
		} catch (err: any) {
			if (err.code === "ENOENT") {
				return NextResponse.json({
					success: true,
					message: "No cached cookies found",
				});
			}
			throw err;
		}
	} catch (error) {
		console.error("Error clearing cookie cache:", error);
		return NextResponse.json(
			{ error: "Failed to clear cookie cache" },
			{ status: 500 },
		);
	}
}
