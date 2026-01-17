import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink, rename } from 'fs/promises';
import { join, dirname, extname, basename } from 'path';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { getFileMetadata } from '@/lib/metadata';

interface ResizeRequest {
  files: Array<{
    path: string;
    type: 'image' | 'video';
    width: number;
    height: number;
  }>;
  longestEdge: number;
  outputSuffix?: string;
  deleteOriginal?: boolean;
}

interface ProgressUpdate {
  type: 'start' | 'progress' | 'complete' | 'error';
  fileIndex: number;
  total: number;
  fileName: string;
  message?: string;
}

// Calculate new dimensions maintaining aspect ratio
function calculateDimensions(originalWidth: number, originalHeight: number, longestEdge: number) {
  const maxDimension = Math.max(originalWidth, originalHeight);

  if (maxDimension <= longestEdge) {
    // Already smaller than target, no resize needed
    return { width: originalWidth, height: originalHeight };
  }

  const scale = longestEdge / maxDimension;
  // Ensure dimensions are even numbers (required by many codecs like h264)
  const width = Math.round(originalWidth * scale);
  const height = Math.round(originalHeight * scale);
  
  return {
    width: width % 2 === 0 ? width : width + 1,
    height: height % 2 === 0 ? height : height + 1,
  };
}

// Run FFmpeg command for video resize
function runFFmpegResize(inputPath: string, outputPath: string, width: number, height: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vf', `scale=${width}:${height}`,
      '-c:a', 'copy', // Copy audio without re-encoding
      '-y', // Overwrite output file
      outputPath,
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed: ${stderr}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

// Run sharp/ffmpeg for image resize
function runImageResize(inputPath: string, outputPath: string, width: number, height: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use FFmpeg for images too (simpler, already a dependency)
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vf', `scale=${width}:${height}`,
      '-y',
      outputPath,
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Image resize failed: ${stderr}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const data: ResizeRequest = await request.json();
    const { files, longestEdge, outputSuffix = '_resized', deleteOriginal = false } = data;

    console.log('[Resize API] Request:', { filesCount: files?.length, longestEdge, outputSuffix, deleteOriginal });
    console.log('[Resize API] Files:', files.map(f => ({ name: f.path, type: f.type, width: f.width, height: f.height })));

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    if (!longestEdge || longestEdge <= 0) {
      return NextResponse.json(
        { success: false, error: 'Longest edge must be greater than 0' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = basename(file.path);

      // If dimensions are missing/invalid, try to fetch them
      if (!file.width || !file.height) {
        console.log(`[Resize API] Missing dimensions for ${fileName}, fetching metadata...`);
        const metadata = await getFileMetadata(file.path, file.type);
        if (metadata) {
          file.width = metadata.width;
          file.height = metadata.height;
          console.log(`[Resize API] Fetched dimensions: ${file.width}x${file.height}`);
        } else {
          console.warn(`[Resize API] Failed to fetch metadata for ${fileName}, proceeding with 0x0 (might skip)`);
        }
      }

      console.log(`[Resize API] Processing ${fileName}: ${file.width}x${file.height} -> target: ${longestEdge}`);

      // Calculate new dimensions
      const newDimensions = calculateDimensions(file.width, file.height, longestEdge);

      console.log(`[Resize API] New dimensions:`, newDimensions);

      // Check if resize is actually needed
      if (newDimensions.width === file.width && newDimensions.height === file.height) {
        console.log(`[Resize API] Skipping ${fileName}: already within target size`);
        results.push({
          fileName,
          originalSize: `${file.width}x${file.height}`,
          newSize: `${file.width}x${file.height}`,
          skipped: true,
          message: 'Already within target size',
        });
        continue;
      }

      // Generate output path
      const parsedPath = dirname(file.path);
      const parsedName = basename(file.path, extname(file.path));
      const parsedExt = extname(file.path);

      let outputPath: string;
      let finalPath: string;

      if (deleteOriginal) {
        // When deleting original, use temp file first, then replace original
        // This preserves the association with txt files (image.jpg stays image.jpg)
        outputPath = join(tmpdir(), `${parsedName}_${Date.now()}${parsedExt}`);
        finalPath = file.path; // Will replace original
      } else {
        // When keeping original, add suffix to output
        outputPath = join(parsedPath, `${parsedName}${outputSuffix}${parsedExt}`);
        finalPath = outputPath;
      }

      // Ensure output directory exists
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
      }

      try {
        console.log(`[Resize API] Running resize for ${fileName} -> ${outputPath}`);
        // Perform resize based on file type
        if (file.type === 'video') {
          await runFFmpegResize(file.path, outputPath, newDimensions.width, newDimensions.height);
        } else {
          await runImageResize(file.path, outputPath, newDimensions.width, newDimensions.height);
        }
        console.log(`[Resize API] Resize complete for ${fileName}`);

        // If deleteOriginal is true, replace the original file
        if (deleteOriginal) {
          await unlink(file.path); // Delete original
          await rename(outputPath, finalPath); // Move temp file to original location
        }

        results.push({
          fileName,
          originalSize: `${file.width}x${file.height}`,
          newSize: `${newDimensions.width}x${newDimensions.height}`,
          outputPath: finalPath,
          replacedOriginal: deleteOriginal,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${fileName}: ${errorMsg}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      total: files.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Resize API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to resize files' },
      { status: 500 }
    );
  }
}
