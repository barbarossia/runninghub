/**
 * Job Results API
 * Reads output files from job directory and returns as job results
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Job directory: ~/Downloads/workspace/{jobId}/
    const workspaceJobDir = path.join(
      process.env.HOME || '~',
      'Downloads',
      'workspace',
      jobId
    );

    const resultDir = path.join(workspaceJobDir, 'result');

    // Check if result directory exists
    try {
      await fs.access(resultDir);
    } catch {
      // No results yet
      return NextResponse.json({
        success: true,
        results: null,
      });
    }

    // Read all files in result directory
    const files = await fs.readdir(resultDir);

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        results: null,
      });
    }

    const outputs: any[] = [];
    const textOutputs: any[] = [];

    for (const file of files) {
      const filePath = path.join(resultDir, file);
      const stat = await fs.stat(filePath);

      if (!stat.isFile()) continue;

      const ext = path.extname(file).toLowerCase();
      const fileName = file;
      const workspacePath = filePath;

      // Determine file type
      let fileType: 'text' | 'image' | 'video' | 'file' = 'file';
      
      if (['.txt', '.md', '.json', '.xml', '.csv', '.log'].includes(ext)) {
        fileType = 'text';
      } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
        fileType = 'image';
      } else if (['.mp4', '.mov', '.avi', '.webm', '.mkv'].includes(ext)) {
        fileType = 'video';
      }

      if (fileType === 'text') {
        // Read text file content
        const content = await fs.readFile(filePath, 'utf-8');

        textOutputs.push({
          fileName,
          filePath: workspacePath,
          content: {
            original: content,
            en: undefined,
            zh: undefined,
          },
          autoTranslated: false,
          translationError: undefined,
        });
      }

      // Add to outputs list (all files)
      outputs.push({
        type: 'file' as const,
        fileName,
        fileType,
        fileSize: stat.size,
        path: workspacePath, // Use absolute path for API consistency
        workspacePath, // Keep for backward compatibility if needed
      });
    }

    const results = {
      outputs,
      textOutputs,
    };

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error('Job results error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get job results',
      },
      { status: 500 }
    );
  }
}
