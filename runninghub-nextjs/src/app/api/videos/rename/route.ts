import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { writeLog } from "@/lib/logger";

interface RenameRequest {
  video_path: string;
  new_name: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: RenameRequest = await request.json();
    const { video_path, new_name } = data;

    if (!video_path || !new_name) {
      return NextResponse.json(
        { error: "Video path and new name are required" },
        { status: 400 }
      );
    }

    // Resolve paths
    const currentPath = video_path;
    const directory = path.dirname(currentPath);
    
    // Ensure new name has extension if not provided, or preserve extension of original
    let finalNewName = new_name;
    const originalExt = path.extname(currentPath);
    const newExt = path.extname(finalNewName);
    
    // If new name doesn't have an extension, append the original one
    if (!newExt && originalExt) {
        finalNewName += originalExt;
    } else if (newExt && newExt !== originalExt) {
        // Warning: changing extension might make file unreadable, but we allow it if user explicitly typed it.
        // Or we could enforce keeping original extension.
        // For now, let's assume if user typed extension, they know what they are doing, 
        // but if they didn't, we add original.
    }

    const newPath = path.join(directory, finalNewName);

    // Prevent renaming to same path
    if (currentPath === newPath) {
        return NextResponse.json({
            success: true,
            message: `Renamed to ${finalNewName}`, // Technically true
            new_path: newPath,
            new_name: finalNewName
        });
    }

    // Check if source exists
    try {
        await fs.access(currentPath);
    } catch {
         return NextResponse.json(
        { error: "Source video file not found" },
        { status: 404 }
      );
    }

    // Check if destination exists
    try {
        await fs.access(newPath);
        // If we are here, it means the file exists
        return NextResponse.json(
            { error: "A file with that name already exists" },
            { status: 409 }
        );
    } catch {
        // Destination does not exist, which is good
    }

    // Rename
    await fs.rename(currentPath, newPath);
    
    // Log
    await writeLog(`Renamed video: ${path.basename(currentPath)} -> ${finalNewName}`, "info", "rename_action");

    return NextResponse.json({
      success: true,
      message: `Renamed to ${finalNewName}`,
      new_path: newPath,
      new_name: finalNewName
    });

  } catch (error) {
    console.error("Error renaming video:", error);
    return NextResponse.json(
      { error: `Failed to rename video: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
