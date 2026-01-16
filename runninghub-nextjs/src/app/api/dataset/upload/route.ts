import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const datasetPath = formData.get("datasetPath") as string;
    const files = formData.getAll("files") as File[];

    // Validate inputs
    if (!datasetPath) {
      return NextResponse.json(
        { success: false, error: "Dataset path is required" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files to upload" },
        { status: 400 }
      );
    }

    // Check if dataset exists
    if (!existsSync(datasetPath)) {
      return NextResponse.json(
        { success: false, error: "Dataset does not exist" },
        { status: 404 }
      );
    }

    // Upload files to dataset
    let uploadedCount = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Sanitize filename
        const sanitizedName = file.name.replace(/[\/\\:*?"<>|]/g, "_");
        const filePath = join(datasetPath, sanitizedName);

        // Convert file to buffer and write
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);
        uploadedCount++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${file.name}: ${errorMsg}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0 || uploadedCount > 0,
      message: errors.length === 0
        ? `Uploaded ${uploadedCount} files to dataset`
        : `Uploaded ${uploadedCount} files (${errors.length} failed)`,
      uploadedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Dataset upload API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
