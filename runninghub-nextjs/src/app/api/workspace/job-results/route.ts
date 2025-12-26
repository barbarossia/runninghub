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

      if (ext === '.txt') {
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

        // Also add to outputs
        outputs.push({
          type: 'file' as const,
          fileName,
          fileType: 'text' as const,
          fileSize: stat.size,
          workspacePath,
        });
      } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        // Image file
        outputs.push({
          type: 'file' as const,
          fileName,
          fileType: 'image' as const,
          fileSize: stat.size,
          workspacePath,
        });
      }
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
