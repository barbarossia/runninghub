import type { FileHandleInfo, ImageFile, VideoFile, FolderItem } from '@/types';

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite'; startIn?: WellKnownDirectory | FileSystemHandle }) => Promise<FileSystemDirectoryHandle>;
  }
}

export interface DirectoryEntry {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  handle?: FileSystemHandle;
  file?: File;
  size?: number;
  type?: string;
  is_virtual?: boolean;
  file_handle_info?: FileHandleInfo;
}

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAPISupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'showDirectoryPicker' in window;
}

/**
 * Check if File System Access API is available in secure context
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext;
}

/**
 * Get file system access status
 */
export function getFileSystemAccessStatus(): {
  supported: boolean;
  secureContext: boolean;
  available: boolean;
  message: string;
} {
  const supported = isFileSystemAPISupported();
  const secureContext = isSecureContext();

  return {
    supported,
    secureContext,
    available: supported && secureContext,
    message: !secureContext
      ? 'File System Access API requires a secure context (HTTPS or localhost)'
      : !supported
      ? 'File System Access API is not supported in this browser'
      : 'File System Access API is available'
  };
}

/**
 * Open directory picker and get directory handle
 */
export async function openDirectoryPicker(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAPISupported()) {
    throw new Error('File System Access API is not supported');
  }

  try {
    const handle = await window.showDirectoryPicker?.({
      mode: 'read',
      startIn: 'pictures' // Start in pictures directory if available
    });

    return handle || null;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null; // User cancelled
    }
    throw error;
  }
}

/**
 * Read directory contents recursively
 */
export async function readDirectory(
  handle: FileSystemDirectoryHandle,
  path: string = '',
  maxDepth: number = 2,
  currentDepth: number = 0
): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = [];

  if (currentDepth >= maxDepth) {
    return entries;
  }

  try {
    for await (const [name, entryHandle] of handle.entries()) {
      const entryPath = path ? `${path}/${name}` : name;

      if (entryHandle.kind === 'file') {
        const file = await (entryHandle as FileSystemFileHandle).getFile();
        const extension = file.name.split('.').pop()?.toLowerCase();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        const videoExtensions = ['webm', 'mkv', 'avi', 'mov', 'flv', 'mp4'];

        // Include image and video files
        if (extension) {
          if (imageExtensions.includes(extension)) {
            entries.push({
              name,
              path: entryPath,
              kind: 'file',
              handle: entryHandle,
              file,
              size: file.size,
              type: 'image',
              is_virtual: true,
              file_handle_info: {
                handle: entryHandle as FileSystemFileHandle,
                file: file
              }
            });
          } else if (videoExtensions.includes(extension)) {
            entries.push({
              name,
              path: entryPath,
              kind: 'file',
              handle: entryHandle,
              file,
              size: file.size,
              type: 'video',
              is_virtual: true,
              file_handle_info: {
                handle: entryHandle as FileSystemFileHandle,
                file: file
              }
            });
          }
        }
      } else if (entryHandle.kind === 'directory') {
        // Include directory
        entries.push({
          name,
          path: entryPath,
          kind: 'directory',
          handle: entryHandle,
          is_virtual: true,
          file_handle_info: {
            handle: entryHandle as unknown as FileSystemDirectoryHandle
          }
        });

        // Recursively read subdirectories if within depth limit
        if (currentDepth < maxDepth - 1) {
          try {
            const subEntries = await readDirectory(
              entryHandle as unknown as FileSystemDirectoryHandle,
              entryPath,
              maxDepth,
              currentDepth + 1
            );
            entries.push(...subEntries);
          } catch (error) {
            console.warn(`Could not read subdirectory ${entryPath}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
    throw error;
  }

  return entries;
}

/**
 * Get directory info from File System Access API
 */
export async function getDirectoryInfo(
  handle: FileSystemDirectoryHandle
): Promise<{
  name: string;
  entries: DirectoryEntry[];
  imageCount: number;
  videoCount: number;
  folderCount: number;
}> {
  const entries = await readDirectory(handle);
  const images = entries.filter(entry => entry.type === 'image');
  const videos = entries.filter(entry => entry.type === 'video');
  const folders = entries.filter(entry => entry.kind === 'directory');

  return {
    name: handle.name,
    entries,
    imageCount: images.length,
    videoCount: videos.length,
    folderCount: folders.length
  };
}

/**
 * Convert directory entries to processable format
 */
export interface ProcessableFormatResult {
  images: ImageFile[];
  videos: VideoFile[];
  folders: FolderItem[];
  cleanup: () => void;
}

export function convertToProcessableFormat(
  entries: DirectoryEntry[]
): ProcessableFormatResult {
  const images: ImageFile[] = [];
  const videos: VideoFile[] = [];
  const folders: FolderItem[] = [];
  const blobUrls: string[] = [];

  entries.forEach(entry => {
    if (entry.kind === 'file' && entry.file) {
      const extension = entry.name.split('.').pop()?.toLowerCase() || '';

      // Create blob URL for the file
      let blobUrl: string | undefined;
      if (entry.file) {
        blobUrl = URL.createObjectURL(entry.file);
        blobUrls.push(blobUrl);
      }

      if (entry.type === 'video') {
        const fileObj: VideoFile = {
          name: entry.name,
          path: entry.path,
          size: entry.size || 0,
          type: 'video',
          extension: `.${extension}`,
          is_virtual: true,
          file_handle_info: entry.file_handle_info,
          blob_url: blobUrl
        };
        videos.push(fileObj);
      } else {
        // Default to image or if type is image
        const fileObj: ImageFile = {
          name: entry.name,
          path: entry.path,
          size: entry.size || 0,
          type: 'image',
          extension: `.${extension}`,
          is_virtual: true,
          file_handle_info: entry.file_handle_info,
          blob_url: blobUrl
        };
        images.push(fileObj);
      }
    } else if (entry.kind === 'directory') {
      folders.push({
        name: entry.name,
        path: entry.path,
        type: 'folder',
        is_virtual: true
      });
    }
  });

  // Return cleanup function to revoke blob URLs when done
  const cleanup = () => {
    blobUrls.forEach(url => URL.revokeObjectURL(url));
  };

  return { images, videos, folders, cleanup };
}

/**
 * Fallback function for browsers without File System Access API
 */
export function getFallbackInstructions(): {
  available: boolean;
  message: string;
  instructions: string[];
} {
  const status = getFileSystemAccessStatus();

  if (status.available) {
    return {
      available: true,
      message: 'File System Access API is available',
      instructions: []
    };
  }

  return {
    available: false,
    message: status.message,
    instructions: [
      'Use a modern browser that supports File System Access API (Chrome, Edge)',
      'Ensure you are on a secure connection (HTTPS or localhost)',
      'Alternatively, you can use the manual folder input option',
      'For production deployment, ensure your app is served over HTTPS'
    ]
  };
}

/**
 * Create directory data for API processing
 */
export interface DirectoryDataFileItem {
  name: string;
  isDirectory: boolean;
  size?: number;
  type?: string;
  handle?: FileSystemHandle;
}

export interface DirectoryData {
  folder_name: string;
  files: DirectoryDataFileItem[];
  source: string;
  full_path?: string;
}

export function createDirectoryData(
  handle: FileSystemDirectoryHandle,
  entries: DirectoryEntry[]
): DirectoryData {
  return {
    folder_name: handle.name,
    files: entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.kind === 'directory',
      size: entry.size,
      type: entry.kind === 'file' ? entry.file?.type : 'directory',
      handle: entry.handle
    })),
    source: 'filesystem_api',
    // Note: We don't have access to the actual file system path in File System Access API
    full_path: undefined
  };
}