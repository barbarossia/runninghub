import { ImageFile, FolderItem } from '@/types';
import { SUPPORTED_IMAGE_EXTENSIONS } from '@/constants';

export function isImageFile(fileName: string): boolean {
  const extension = fileName.toLowerCase().split('.').pop();
  return extension ? SUPPORTED_IMAGE_EXTENSIONS.includes(`.${extension}`) : false;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getRelativePath(fullPath: string, basePath: string): string {
  try {
    return fullPath.replace(basePath, '').replace(/^\//, '');
  } catch {
    return fullPath;
  }
}

export function sortFileSystemItems<T extends ImageFile | FolderItem>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

export function validateFilePath(filePath: string): boolean {
  // Basic path validation - can be enhanced
  if (!filePath || typeof filePath !== 'string') return false;

  // Check for dangerous patterns
  const dangerousPatterns = [
    /\.\./,  // Parent directory traversal
    /^\/\//, // Double slash at start
  ];

  return !dangerousPatterns.some(pattern => pattern.test(filePath));
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? `.${parts.pop()}` : '';
}

export function generateFileId(file: ImageFile | FolderItem): string {
  return `${file.type}-${file.name}-${file.path}`;
}

export function truncateFileName(fileName: string, maxLength: number = 20): string {
  if (fileName.length <= maxLength) return fileName;

  const extension = getFileExtension(fileName);
  const nameWithoutExt = fileName.slice(0, fileName.length - extension.length);
  const truncateLength = maxLength - extension.length - 3; // 3 for "..."

  return `${nameWithoutExt.slice(0, truncateLength)}...${extension}`;
}