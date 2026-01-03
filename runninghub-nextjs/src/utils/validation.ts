import { ENVIRONMENT_VARIABLES } from '@/constants';

export function validateEnvironment(): {
  isValid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const required = [
    'NEXT_PUBLIC_RUNNINGHUB_API_KEY',
    'NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID',
  ];

  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  // Optional but recommended variables
  const recommended = [
    'RUNNINGHUB_DOWNLOAD_DIR',
    'RUNNINGHUB_IMAGE_FOLDER',
    'RUNNINGHUB_PREFIX_PATH',
  ];

  recommended.forEach(key => {
    if (!process.env[key]) {
      warnings.push(`Optional environment variable not set: ${key}`);
    }
  });

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

export function validateImageFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  const maxSize = ENVIRONMENT_VARIABLES.MAX_FILE_SIZE;
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
  ];

  if (!supportedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Unsupported file type',
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    };
  }

  return { isValid: true };
}

export function validateFolderPath(path: string): {
  isValid: boolean;
  error?: string;
} {
  if (!path || typeof path !== 'string') {
    return {
      isValid: false,
      error: 'Folder path is required',
    };
  }

  if (path.length > 4096) {
    return {
      isValid: false,
      error: 'Folder path is too long',
    };
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /\.\./,  // Parent directory traversal
    /[<>:"|?*]/, // Invalid characters in Windows paths
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(path)) {
      return {
        isValid: false,
        error: 'Folder path contains invalid characters',
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate if a URL is a valid YouTube URL
 * Supports regular YouTube URLs, youtu.be short URLs, and YouTube Shorts
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmedUrl = url.trim();

  // Regular YouTube URL patterns
  const youtubePatterns = [
    // Standard YouTube URLs (youtube.com/watch?v=...)
    /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=[\w-]+/,
    // YouTube Shorts (youtube.com/shorts/...)
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
    // Short URLs (youtu.be/...)
    /^https?:\/\/youtu\.be\/[\w-]+/,
    // Embedded videos (youtube.com/embed/...)
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
  ];

  return youtubePatterns.some((pattern) => pattern.test(trimmedUrl));
}

/**
 * Extract the video ID from a YouTube URL
 * Returns null if the URL is invalid or no video ID can be extracted
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();

  // Pattern to extract video ID from various YouTube URL formats
  const patterns = [
    // youtube.com/watch?v=VIDEO_ID
    /[?&]v=([\w-]+)/,
    // youtube.com/shorts/VIDEO_ID
    /\/shorts\/([\w-]+)/,
    // youtu.be/VIDEO_ID
    /youtu\.be\/([\w-]+)/,
    // youtube.com/embed/VIDEO_ID
    /\/embed\/([\w-]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmedUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get a user-friendly error message for invalid YouTube URLs
 */
export function getYouTubeUrlErrorMessage(url: string): string {
  if (!url || url.trim() === '') {
    return 'Please enter a YouTube URL';
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'URL must start with http:// or https://';
  }

  return 'Invalid YouTube URL. Supported formats:\n• youtube.com/watch?v=...\n• youtube.com/shorts/...\n• youtu.be/...';
}