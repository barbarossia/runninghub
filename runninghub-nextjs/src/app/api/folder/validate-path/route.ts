import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface ValidateRequest {
  path: string;
}

interface RelativeInfo {
  relative_path: string | null;
  is_relative: boolean;
  is_under_prefix: boolean;
  combined_path?: string;
}

interface ValidateResponse {
  exists: boolean;
  path: string;
  is_directory: boolean;
  message: string;
  combined_path?: string;
  used_prefix?: boolean;
  relative_path?: string | null;
  is_relative?: boolean;
  is_under_prefix?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const data: ValidateRequest = await request.json();
    const inputPath = data.path;

    if (!inputPath) {
      return NextResponse.json(
        { error: 'No path provided' },
        { status: 400 }
      );
    }

    const folderPath = path.resolve(inputPath);
    const prefixPath = process.env.RUNNINGHUB_PREFIX_PATH || os.homedir();

    let exists = false;
    let isDirectory = false;
    let relativeInfo: RelativeInfo | null = null;
    let combinedPath: string | null = null;
    let combinedExists = false;

    try {
      const stats = await fs.stat(folderPath);
      exists = true;
      isDirectory = stats.isDirectory();
    } catch {
      exists = false;
    }

    // Check if it's a relative path and try combining with prefix
    if (!path.isAbsolute(inputPath)) {
      combinedPath = path.join(prefixPath, inputPath);
      try {
        const combinedStats = await fs.stat(combinedPath);
        combinedExists = combinedStats.isDirectory();
      } catch {
        combinedExists = false;
      }

      if (combinedExists) {
        relativeInfo = {
          relative_path: inputPath,
          is_relative: true,
          is_under_prefix: true,
          combined_path: combinedPath,
        };
      } else {
        relativeInfo = {
          relative_path: inputPath,
          is_relative: true,
          is_under_prefix: false,
          combined_path: combinedPath,
        };
      }
    } else {
      // First check if it's an absolute path
      if (exists) {
        try {
          const relativePath = path.relative(prefixPath, folderPath);
          relativeInfo = {
            relative_path: relativePath,
            is_relative: false,
            is_under_prefix: !relativePath.startsWith('..'),
          };
        } catch {
          // Absolute path is not under prefix
          relativeInfo = {
            relative_path: null,
            is_relative: false,
            is_under_prefix: false,
          };
        }
      }
    }

    const response: ValidateResponse = {
      exists: exists || combinedExists,
      path: folderPath,
      is_directory: isDirectory || combinedExists,
      message: (exists || combinedExists) ? 'Path exists' : 'Path does not exist',
    };

    // Add combined path info if it was used
    if (combinedPath) {
      response.combined_path = combinedPath;
      response.used_prefix = true;
    }

    if (relativeInfo) {
      Object.assign(response, relativeInfo);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error validating path:', error);
    return NextResponse.json(
      { error: 'Failed to validate path' },
      { status: 500 }
    );
  }
}