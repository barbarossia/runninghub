/**
 * Workspace text save API endpoint
 * Saves edited/translated text content to workspace directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { SaveTextRequest, SaveTextResponse } from '@/types/workspace';
import { ERROR_MESSAGES } from '@/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, content, language, workspacePath } = body as SaveTextRequest;

    // Validate inputs
    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'File ID is required',
        },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content is required',
        },
        { status: 400 }
      );
    }

    if (!language || !['en', 'zh'].includes(language)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid language (must be en or zh)',
        },
        { status: 400 }
      );
    }

    if (!workspacePath) {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.WORKSPACE_NOT_CONFIGURED,
        },
        { status: 400 }
      );
    }

    // Expand tilde in path
    const expandedPath = workspacePath.replace(/^~/, process.env.HOME || '');

    // Check if workspace directory exists
    try {
      await fs.access(expandedPath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.WORKSPACE_NOT_FOUND,
        },
        { status: 404 }
      );
    }

    // Look up the file in the uploaded files
    // For now, we'll use a simple naming convention
    // In production, you'd want to track this properly
    const fileName = `${fileId}_${language}.txt`;
    const filePath = path.join(expandedPath, fileName);

    // Write content to file
    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      savedPath: filePath,
    });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json(
      {
        success: false,
        savedPath: '',
        error: error instanceof Error ? error.message : ERROR_MESSAGES.SAVE_FAILED,
      },
      { status: 500 }
    );
  }
}
