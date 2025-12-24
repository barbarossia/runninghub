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