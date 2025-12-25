/**
 * Workspace image serve API endpoint
 * Serves uploaded images from the workspace directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { useWorkspaceStore } from '@/store/workspace-store';
import { ERROR_MESSAGES } from '@/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Look up file in store
    const file = useWorkspaceStore.getState().uploadedFiles.find(
      (f) => f.id === fileId
    );

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'File not found',
        },
        { status: 404 }
      );
    }

    // Read file from disk
    const filePath = file.workspacePath;

    try {
      const fileBuffer = await fs.readFile(filePath);

      // Determine content type based on file extension
      const ext = path.extname(file.name).toLowerCase();
      let contentType = 'image/jpeg';

      switch (ext) {
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.webp':
          contentType = 'image/webp';
          break;
        case '.jpg':
        case '.jpeg':
        default:
          contentType = 'image/jpeg';
          break;
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        },
      });
    } catch (readError) {
      console.error('Failed to read file:', readError);
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.FILE_NOT_FOUND,
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Serve error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
      },
      { status: 500 }
    );
  }
}
