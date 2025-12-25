/**
 * Workspace file upload API endpoint
 * Handles uploading images to the workspace directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { FileUploadRequest, FileUploadResponse } from '@/types/workspace';
import { ERROR_MESSAGES } from '@/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files, workspacePath } = body as {
      files: FileUploadRequest[];
      workspacePath: string;
    };

    // Validate workspace path
    if (!workspacePath) {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.WORKSPACE_NOT_CONFIGURED,
        },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No files provided',
        },
        { status: 400 }
      );
    }

    // Expand tilde in path
    const expandedPath = workspacePath.replace(/^~/, process.env.HOME || '');

    // Ensure workspace directory exists
    try {
      await fs.mkdir(expandedPath, { recursive: true });
    } catch (mkdirError) {
      console.error('Failed to create workspace directory:', mkdirError);
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.WORKSPACE_NOT_FOUND,
        },
        { status: 400 }
      );
    }

    const uploadedFiles: FileUploadResponse[] = [];

    // Process each file
    for (const file of files) {
      try {
        // Generate unique ID for file
        const fileId = crypto.randomBytes(16).toString('hex');

        // Decode base64 data
        const buffer = Buffer.from(file.data, 'base64');

        // Construct file path
        const filePath = path.join(expandedPath, file.name);

        // Write file to disk
        await fs.writeFile(filePath, buffer);

        uploadedFiles.push({
          id: fileId,
          name: file.name,
          workspacePath: filePath,
        });
      } catch (fileError) {
        console.error(`Failed to save file ${file.name}:`, fileError);
        // Continue with other files
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.UPLOAD_FAILED,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      uploadedFiles,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UPLOAD_FAILED,
      },
      { status: 500 }
    );
  }
}
