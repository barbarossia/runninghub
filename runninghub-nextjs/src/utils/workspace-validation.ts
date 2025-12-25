/**
 * Workspace Validation Utilities
 * Provides validation functions for workflow parameters and job inputs
 */

import {
  MediaFile,
  WorkflowInputParameter,
  FileInputAssignment,
  Workflow,
  FileValidationResult,
  JobValidationResult,
  ParameterType,
  MediaType,
} from '@/types/workspace';

// ============================================================================
// FILE TYPE DETECTION
// ============================================================================

/**
 * Get file extension from file name
 */
export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex !== -1 ? fileName.slice(lastDotIndex).toLowerCase() : '';
}

/**
 * Get media type from file extension
 */
export function getMediaTypeFromExtension(extension: string): MediaType | null {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'];
  const videoExtensions = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.wmv'];

  const lowerExt = extension.toLowerCase();

  if (imageExtensions.includes(lowerExt)) {
    return 'image';
  }

  if (videoExtensions.includes(lowerExt)) {
    return 'video';
  }

  return null;
}

/**
 * Check if file is an image
 */
export function isImageFile(fileName: string): boolean {
  return getMediaTypeFromExtension(getFileExtension(fileName)) === 'image';
}

/**
 * Check if file is a video
 */
export function isVideoFile(fileName: string): boolean {
  return getMediaTypeFromExtension(getFileExtension(fileName)) === 'video';
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',

    // Videos
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.flv': 'video/x-flv',
    '.wmv': 'video/x-ms-wmv',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

// ============================================================================
// FILE VALIDATION
// ============================================================================

/**
 * Validate file type pattern (e.g., 'image/*', 'video/*')
 */
export function matchesFileTypePattern(
  mediaType: MediaType,
  pattern: string
): boolean {
  const lowerPattern = pattern.toLowerCase();

  // Match wildcard patterns
  if (lowerPattern === 'image/*' || lowerPattern === 'image') {
    return mediaType === 'image';
  }

  if (lowerPattern === 'video/*' || lowerPattern === 'video') {
    return mediaType === 'video';
  }

  // Exact MIME type match
  if (lowerPattern.includes('/')) {
    const mimeType = getMimeTypeFromExtension(mediaType === 'image' ? '.jpg' : '.mp4');
    return mimeType.toLowerCase() === lowerPattern;
  }

  return false;
}

/**
 * Validate if file extension matches allowed extensions
 */
export function matchesExtension(
  fileExtension: string,
  allowedExtensions: string[]
): boolean {
  const lowerFileExt = fileExtension.toLowerCase();
  return allowedExtensions.some((ext) => ext.toLowerCase() === lowerFileExt);
}

/**
 * Validate a file against a workflow parameter
 */
export function validateFileForParameter(
  file: MediaFile,
  parameter: WorkflowInputParameter
): FileValidationResult {
  // Only validate file-type parameters
  if (parameter.type !== 'file') {
    return { valid: true };
  }

  const fileExtension = getFileExtension(file.name);

  // Check file type validation
  if (parameter.validation?.fileType) {
    const fileTypeValid = parameter.validation.fileType.some((pattern) =>
      matchesFileTypePattern(file.type, pattern)
    );

    if (!fileTypeValid) {
      return {
        valid: false,
        error: `Expected ${parameter.validation.fileType.join(' or ')}, got ${file.type}/*`,
      };
    }
  }

  // Check extension validation
  if (parameter.validation?.extensions) {
    if (!matchesExtension(fileExtension, parameter.validation.extensions)) {
      return {
        valid: false,
        error: `Expected ${parameter.validation.extensions.join(', ')}, got ${fileExtension}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate text/number/boolean parameter value
 */
export function validateParameterValue(
  value: string,
  parameter: WorkflowInputParameter
): FileValidationResult {
  // Empty value check for required parameters
  if (parameter.required && (!value || value.trim() === '')) {
    return {
      valid: false,
      error: `Required parameter "${parameter.name}" is empty`,
    };
  }

  // Skip validation for optional empty parameters
  if (!value || value.trim() === '') {
    return { valid: true };
  }

  // Type-specific validation
  switch (parameter.type) {
    case 'number':
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return {
          valid: false,
          error: `Value must be a number, got "${value}"`,
        };
      }

      // Min/max validation
      if (parameter.validation?.min !== undefined && numValue < parameter.validation.min) {
        return {
          valid: false,
          error: `Value must be at least ${parameter.validation.min}, got ${numValue}`,
        };
      }

      if (parameter.validation?.max !== undefined && numValue > parameter.validation.max) {
        return {
          valid: false,
          error: `Value must be at most ${parameter.validation.max}, got ${numValue}`,
        };
      }

      break;

    case 'text':
      const textValue = value.trim();

      // Min/max length validation
      if (parameter.validation?.min !== undefined && textValue.length < parameter.validation.min) {
        return {
          valid: false,
          error: `Text must be at least ${parameter.validation.min} characters`,
        };
      }

      if (parameter.validation?.max !== undefined && textValue.length > parameter.validation.max) {
        return {
          valid: false,
          error: `Text must be at most ${parameter.validation.max} characters`,
        };
      }

      // Pattern validation
      if (parameter.validation?.pattern) {
        const regex = new RegExp(parameter.validation.pattern);
        if (!regex.test(textValue)) {
          return {
            valid: false,
            error: `Text does not match required format`,
          };
        }
      }

      break;

    case 'boolean':
      const lowerValue = value.toLowerCase();
      if (lowerValue !== 'true' && lowerValue !== 'false' && lowerValue !== '1' && lowerValue !== '0') {
        return {
          valid: false,
          error: `Value must be true or false, got "${value}"`,
        };
      }

      break;
  }

  return { valid: true };
}

// ============================================================================
// JOB VALIDATION
// ============================================================================

/**
 * Validate complete job input set
 */
export function validateJobInputs(
  workflow: Workflow,
  fileInputs: FileInputAssignment[],
  textInputs: Record<string, string>
): JobValidationResult {
  const errors: string[] = [];

  // Check all required parameters
  for (const param of workflow.inputs) {
    if (!param.required) continue;

    if (param.type === 'file') {
      // Check if at least one file is assigned
      const assigned = fileInputs.some((f) => f.parameterId === param.id);
      if (!assigned) {
        errors.push(`Required file parameter "${param.name}" is not assigned`);
      }
    } else {
      // Check text/number/boolean parameter
      const value = textInputs[param.id];
      if (!value || value.trim() === '') {
        errors.push(`Required parameter "${param.name}" is empty`);
      }
    }
  }

  // Validate all assigned files
  for (const assignment of fileInputs) {
    if (!assignment.valid) {
      errors.push(`File "${assignment.fileName}" is invalid: ${assignment.validationError}`);
    }
  }

  // Validate text/number inputs
  for (const param of workflow.inputs) {
    if (param.type === 'file') continue;

    const value = textInputs[param.id];
    if (value) {
      const validation = validateParameterValue(value, param);
      if (!validation.valid) {
        errors.push(validation.error || `Invalid value for "${param.name}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get validation error summary for display
 */
export function getValidationErrorSummary(errors: string[]): string {
  if (errors.length === 0) {
    return 'All inputs are valid';
  }

  if (errors.length === 1) {
    return errors[0];
  }

  return `${errors.length} errors:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
}

// ============================================================================
// FILE ASSIGNMENT HELPERS
// ============================================================================

/**
 * Create file input assignment from media file
 */
export function createFileAssignment(
  file: MediaFile,
  parameterId: string,
  parameter?: WorkflowInputParameter
): FileInputAssignment {
  const baseAssignment: FileInputAssignment = {
    parameterId,
    filePath: file.path,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    valid: true,
  };

  // Validate if parameter is provided
  if (parameter) {
    const validation = validateFileForParameter(file, parameter);
    baseAssignment.valid = validation.valid;
    baseAssignment.validationError = validation.error;
  }

  return baseAssignment;
}

/**
 * Filter valid files for a parameter
 */
export function filterValidFilesForParameter(
  files: MediaFile[],
  parameter: WorkflowInputParameter
): MediaFile[] {
  return files.filter((file) => {
    const validation = validateFileForParameter(file, parameter);
    return validation.valid;
  });
}

/**
 * Get invalid files with validation errors
 */
export function getInvalidFilesWithErrors(
  files: MediaFile[],
  parameter: WorkflowInputParameter
): Array<{ file: MediaFile; error: string }> {
  return files
    .map((file) => ({
      file,
      validation: validateFileForParameter(file, parameter),
    }))
    .filter(({ validation }) => !validation.valid)
    .map(({ file, validation }) => ({
      file,
      error: validation.error || 'Unknown validation error',
    }));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format duration in seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format FPS for display
 */
export function formatFPS(fps: number): string {
  return `${fps.toFixed(1)} fps`;
}
