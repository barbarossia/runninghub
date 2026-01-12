import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getFileMetadata } from '@/lib/metadata';

/**
 * Process items with concurrency limit
 */
async function processWithConcurrency<T, R>(
  items: T[],
  limit: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then((result) => {
      results.push(result);
      const idx = executing.indexOf(promise as any);
      if (idx > -1) executing.splice(idx, 1);
    });

    executing.push(promise);

    // When limit is reached, wait for one to finish
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

interface FileItem {
  name: string;
  path: string;
  size: number;
  extension: string;
  createdAt: number;
  modifiedAt: number;
  mediaType: 'image' | 'video';
}

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
        width?: number;
        height?: number;
        created_at?: number;
        modified_at?: number;
      }>,
      videos: [] as Array<{
        name: string;
        path: string;
        size: number;
        type: 'video';
        extension: string;
        width?: number;
        height?: number;
        fps?: number;
        duration?: number;
        thumbnail?: string;
        created_at?: number;
        modified_at?: number;
      }>,
      current_path: folder,
      parent_path: path.dirname(folder) !== folder ? path.dirname(folder) : null,
      is_direct_access: false,
    };

    const supportedImageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
    const supportedVideoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv'];

    try {
      const items = await fs.readdir(folder);

      // First pass: collect all items and categorize them (fast operations only)
      const folders: Array<{ name: string; path: string; type: 'folder' }> = [];
      const files: FileItem[] = [];

      for (const item of items) {
        const itemPath = path.join(folder, item);

        // Skip 'encoded' folder (contains original duck-encoded images after decode)
        if (item === 'encoded') {
          continue;
        }

        try {
          const itemStats = await fs.stat(itemPath);

          if (itemStats.isDirectory()) {
            folders.push({
              name: item,
              path: itemPath,
              type: 'folder',
            });
          } else if (itemStats.isFile()) {
            const extension = path.extname(item).toLowerCase();

            if (supportedImageExtensions.includes(extension)) {
              files.push({
                name: item,
                path: itemPath,
                size: itemStats.size,
                extension,
                createdAt: itemStats.birthtime?.getTime() || 0,
                modifiedAt: itemStats.mtime?.getTime() || 0,
                mediaType: 'image',
              });
            } else if (supportedVideoExtensions.includes(extension)) {
              files.push({
                name: item,
                path: itemPath,
                size: itemStats.size,
                extension,
                createdAt: itemStats.birthtime?.getTime() || 0,
                modifiedAt: itemStats.mtime?.getTime() || 0,
                mediaType: 'video',
              });
            }
          }
        } catch (itemError) {
          // Skip items we can't access
          console.warn(`Skipping ${item}:`, itemError);
        }
      }

      // Add folders immediately (no metadata needed)
      contents.folders.push(...folders);

      // Second pass: extract metadata in parallel with concurrency limit
      // Process up to 8 files concurrently for better performance
      const processedFiles = await processWithConcurrency(
        files,
        8,
        async (file: FileItem) => {
          try {
            const metadata = await getFileMetadata(file.path, file.mediaType);

            if (file.mediaType === 'image') {
              return {
                name: file.name,
                path: file.path,
                size: file.size,
                type: 'image' as const,
                extension: file.extension,
                width: metadata?.width,
                height: metadata?.height,
                created_at: file.createdAt,
                modified_at: file.modifiedAt,
              };
            } else {
              const videoMetadata = metadata as any;
              return {
                name: file.name,
                path: file.path,
                size: file.size,
                type: 'video' as const,
                extension: file.extension,
                width: videoMetadata?.width,
                height: videoMetadata?.height,
                fps: videoMetadata?.fps,
                duration: videoMetadata?.duration,
                created_at: file.createdAt,
                modified_at: file.modifiedAt,
              };
            }
          } catch (error) {
            // If metadata extraction fails, still include the file without metadata
            console.warn(`Failed to extract metadata for ${file.name}:`, error);
            if (file.mediaType === 'image') {
              return {
                name: file.name,
                path: file.path,
                size: file.size,
                type: 'image' as const,
                extension: file.extension,
                created_at: file.createdAt,
                modified_at: file.modifiedAt,
              };
            } else {
              return {
                name: file.name,
                path: file.path,
                size: file.size,
                type: 'video' as const,
                extension: file.extension,
                created_at: file.createdAt,
                modified_at: file.modifiedAt,
              };
            }
          }
        }
      );

      // Separate images and videos
      for (const file of processedFiles) {
        if (file.type === 'image') {
          contents.images.push(file);
        } else {
          contents.videos.push(file);
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
