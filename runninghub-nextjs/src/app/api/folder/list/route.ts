import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

async function handleFolderList(folderPath: string, sessionId?: string) {
  try {
    if (!folderPath) {
      return NextResponse.json(
        { error: 'No folder path provided' },
        { status: 400 }
      );
    }

    const folder = path.resolve(folderPath);

    try {
      const stats = await fs.stat(folder);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: 'Path is not a directory' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Folder does not exist' },
        { status: 404 }
      );
    }

    const contents = {
      folders: [] as Array<{
        name: string;
        path: string;
        type: 'folder';
      }>,
      images: [] as Array<{
        name: string;
        path: string;
        size: number;
        type: 'image';
        extension: string;
      }>,
      videos: [] as Array<{
        name: string;
        path: string;
        size: number;
        type: 'video';
        extension: string;
      }>,
      current_path: folder,
      parent_path: path.dirname(folder) !== folder ? path.dirname(folder) : null,
      is_direct_access: false,
    };

    try {
      const items = await fs.readdir(folder);

      for (const item of items) {
        const itemPath = path.join(folder, item);
        try {
          const itemStats = await fs.stat(itemPath);

          if (itemStats.isDirectory()) {
            contents.folders.push({
              name: item,
              path: itemPath,
              type: 'folder',
            });
          } else if (itemStats.isFile()) {
            const extension = path.extname(item).toLowerCase();
            const supportedImageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
            const supportedVideoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv'];

            if (supportedImageExtensions.includes(extension)) {
              contents.images.push({
                name: item,
                path: itemPath,
                size: itemStats.size,
                type: 'image',
                extension,
              });
            } else if (supportedVideoExtensions.includes(extension)) {
              contents.videos.push({
                name: item,
                path: itemPath,
                size: itemStats.size,
                type: 'video',
                extension,
              });
            }
          }
        } catch (itemError) {
          // Skip items we can't access
          console.warn(`Skipping ${item}:`, itemError);
        }
      }

      // Sort folders and images alphabetically
      contents.folders.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      contents.images.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      contents.videos.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
        return NextResponse.json(
          { error: 'Permission denied accessing folder' },
          { status: 403 }
        );
      }
      throw error;
    }

    return NextResponse.json(contents);
  } catch (error) {
    console.error('Error listing folder:', error);
    return NextResponse.json(
      { error: 'Failed to list folder contents' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderPath = searchParams.get('path');
  return handleFolderList(folderPath || '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const folderPath = body.folder_path;
    const sessionId = body.session_id;
    return handleFolderList(folderPath || '', sessionId);
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}