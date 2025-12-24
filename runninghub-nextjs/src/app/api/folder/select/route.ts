import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const folderPath = data.folder_path;

    if (!folderPath) {
      return NextResponse.json(
        { error: 'No folder path provided' },
        { status: 400 }
      );
    }

    // Resolve the folder path using different strategies
    const originalPath = folderPath;
    const folder = await resolveFolderPath(folderPath);

    if (!folder) {
      const suggestions = generateFolderSuggestions(originalPath);
      return NextResponse.json(
        {
          error: `Folder does not exist: ${originalPath}`,
          suggestions,
        },
        { status: 404 }
      );
    }

    const resolvedPath = path.resolve(folder);
    const folderName = path.basename(folder);

    // Calculate relative path from prefix
    let relativePath: string | null = null;
    const prefixPath = process.env.RUNNINGHUB_PREFIX_PATH || os.homedir();

    try {
      relativePath = path.relative(prefixPath, folder);
    } catch {
      // Folder is not under prefix path
      relativePath = null;
    }

    const response = {
      success: true,
      folder_path: resolvedPath,
      message: `Folder selected: ${folderName}`,
      original_input: originalPath,
      folder_name: folderName,
      prefix_path: prefixPath,
      relative_path: relativePath,
      is_under_prefix: relativePath !== null && !relativePath.startsWith('..'),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error selecting folder:', error);
    return NextResponse.json(
      { error: 'Failed to select folder' },
      { status: 500 }
    );
  }
}

async function resolveFolderPath(folderPath: string): Promise<string | null> {
  try {
    // Initialize config to get prefix path
    const prefixPath = process.env.RUNNINGHUB_PREFIX_PATH || os.homedir();

    // Expand user home directory
    let expandedPath = folderPath;
    if (folderPath.startsWith('~')) {
      expandedPath = path.join(os.homedir(), folderPath.slice(1));
    }

    // Direct check (absolute path)
    try {
      const stats = await fs.stat(expandedPath);
      if (stats.isDirectory()) {
        return expandedPath;
      }
    } catch {
      // Path doesn't exist, continue to next strategy
    }

    // If it's a relative path, combine with prefix path
    if (!path.isAbsolute(expandedPath)) {
      const combinedPath = path.join(prefixPath, expandedPath);
      try {
        const stats = await fs.stat(combinedPath);
        if (stats.isDirectory()) {
          return combinedPath;
        }
      } catch {
        // Combined path doesn't exist
      }
    }

    // Try common user directories as fallback
    const currentUsername = os.userInfo().username;
    const possiblePrefixes = [
      prefixPath,
      `/Users/${currentUsername}`,
      '/Users/barbarossia',
      '/Users/username',
      os.homedir(),
      '/tmp',
    ];

    const folderName = path.basename(folderPath);

    // Try different base directories
    for (const prefix of possiblePrefixes) {
      const testPath = path.join(prefix, folderName);
      try {
        const stats = await fs.stat(testPath);
        if (stats.isDirectory()) {
          return testPath;
        }
      } catch {
        // Path doesn't exist, continue
      }
    }

    // Try with parent directory structure preserved
    for (const prefix of possiblePrefixes) {
      const testPath = path.join(prefix, folderPath.replace(/^[/~]+/, ''));
      try {
        const stats = await fs.stat(testPath);
        if (stats.isDirectory()) {
          return testPath;
        }
      } catch {
        // Path doesn't exist, continue
      }
    }

    return null;
  } catch (error) {
    console.error('Error resolving folder path:', error);
    return null;
  }
}

function generateFolderSuggestions(folderPath: string): string[] {
  const prefixPath = process.env.RUNNINGHUB_PREFIX_PATH || os.homedir();
  const folderName = path.basename(folderPath);
  const currentUsername = os.userInfo().username;

  const suggestions = [
    path.join(prefixPath, folderName),
    prefixPath,
    folderPath, // Relative to prefix
    `/Users/${currentUsername}/${folderName}`,
    `/Users/${currentUsername}/Pictures/${folderName}`,
    `/Users/${currentUsername}/Desktop/${folderName}`,
    `/Users/${currentUsername}/Downloads/${folderName}`,
    `/tmp/${folderName}`,
    path.join(os.homedir(), folderName),
    folderPath, // Original input
  ];

  // Remove duplicates while preserving order
  const seen = new Set<string>();
  return suggestions.filter(suggestion => {
    if (seen.has(suggestion)) {
      return false;
    }
    seen.add(suggestion);
    return true;
  });
}