import { NextRequest, NextResponse } from 'next/server';
import { rename, stat } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { datasetPath, files } = await request.json();

    if (!datasetPath) {
      return NextResponse.json(
        { success: false, error: 'Dataset path is required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files to move' },
        { status: 400 }
      );
    }

    // Ensure dataset folder exists
    if (!existsSync(datasetPath)) {
      return NextResponse.json(
        { success: false, error: 'Dataset folder does not exist' },
        { status: 404 }
      );
    }

    let movedCount = 0;
    const errors: string[] = [];
    const skipped: string[] = [];

    for (const filePath of files) {
      try {
        // Check if source file exists
        const sourceStats = await stat(filePath);

        const fileName = basename(filePath);
        const destPath = join(datasetPath, fileName);

        // Check if file already exists in dataset
        if (existsSync(destPath)) {
          skipped.push(fileName);
          continue;
        }

        // Move file to dataset (rename is atomic on same filesystem)
        await rename(filePath, destPath);
        movedCount++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${basename(filePath)}: ${errorMsg}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Moved ${movedCount} file${movedCount !== 1 ? 's' : ''} to dataset${skipped.length > 0 ? ` (${skipped.length} skipped - already exist)` : ''}${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
      movedCount,
      skippedCount: skipped.length,
      errorCount: errors.length,
    });
  } catch (error) {
    console.error('Move files to dataset API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to move files to dataset' },
      { status: 500 }
    );
  }
}
