/**
 * Workspace type definitions
 * Handles workspace file management, text content, translation, workflows, and jobs
 */

// ============================================================================
// LEGACY TYPES (Backward Compatibility)
// ============================================================================

export type Language = 'en' | 'zh' | 'auto';

export type WorkspaceFileStatus = 'uploaded' | 'processing' | 'completed' | 'error';

/**
 * Workspace file metadata (legacy)
 * @deprecated Use MediaFile instead
 */
export interface WorkspaceFile {
  id: string;
  name: string;
  originalPath: string;
  workspacePath: string;
  status: WorkspaceFileStatus;
  uploadedAt: number;
  textContent?: WorkspaceTextContent;
  errorMessage?: string;
}

/**
 * Text content with bilingual support (legacy)
 * @deprecated Use TextContent in JobResult instead
 */
export interface WorkspaceTextContent {
  original: string;
  en: string;
  zh: string;
  lastModified: number;
  originalLanguage?: Language;
}

export interface TranslationRequest {
  text: string;
  from: Language;
  to: Language;
}

export interface TranslationResponse {
  success: boolean;
  translatedText: string;
  detectedLanguage?: string;
  error?: string;
}

/**
 * Workspace configuration (legacy)
 * @deprecated Use Workflow[] and job management instead
 */
export interface WorkspaceConfig {
  path: string;
  workflowId: string | null;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
}

export interface FileUploadRequest {
  name: string;
  data: string; // Base64 encoded
}

export interface FileUploadResponse {
  id: string;
  name: string;
  workspacePath: string;
  width?: number;
  height?: number;
}

export interface ProcessRequest {
  files: string[];
  workflowId: string;
  workspacePath: string;
}

export interface ProcessResponse {
  success: boolean;
  taskId: string;
  message: string;
  error?: string;
}

export interface SaveTextRequest {
  fileId: string;
  content: string;
  language: 'en' | 'zh';
  workspacePath: string;
}

export interface SaveTextResponse {
  success: boolean;
  savedPath: string;
  error?: string;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

/**
 * Node information from CLI
 */
export interface CliNode {
  id: number;
  name: string;
  type: string;
  description: string;
  inputType?: 'image' | 'video' | 'text' | 'number' | 'boolean';
}

/**
 * Workflow template configuration
 */
export interface WorkflowTemplate {
  workflowId: string;
  workflowName: string;
  nodes: CliNode[];
  fetchedAt: number;
}

/**
 * Parameter type for workflow inputs
 */
export type ParameterType = 'text' | 'file' | 'number' | 'boolean';

/**
 * Validation rules for workflow parameters
 */
export interface ParameterValidation {
  /** File type patterns (e.g., ['image/*', 'video/*']) */
  fileType?: string[];
  /** File extensions (e.g., ['.jpg', '.png', '.mp4']) */
  extensions?: string[];
  /** Minimum value (for numbers) or minimum length (for text) */
  min?: number;
  /** Maximum value (for numbers) or maximum length (for text) */
  max?: number;
  /** Regex pattern for text validation */
  pattern?: string;
  /** Media file type for file inputs ('image' or 'video') */
  mediaType?: 'image' | 'video';
}

/**
 * Workflow input parameter definition
 */
export interface WorkflowInputParameter {
  id: string;
  name: string;
  type: ParameterType;
  required: boolean;
  defaultValue?: string | number | boolean;
  placeholder?: string;
  description?: string;
  validation?: ParameterValidation;
}

/**
 * Workflow output definition
 */
export interface WorkflowOutput {
  type: 'none' | 'text' | 'image' | 'mixed';
  description?: string;
}

/**
 * Workflow configuration
 * Represents a user-configured workflow with input parameters
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  inputs: WorkflowInputParameter[];
  output?: WorkflowOutput;
  createdAt: number;
  updatedAt: number;
  sourceWorkflowId?: string; // Original workflow ID from .env.local
  sourceType?: 'template' | 'custom'; // How this workflow was created
}

// ============================================================================
// FILE TYPES
// ============================================================================

/**
 * Media file type
 */
export type MediaType = 'image' | 'video';

/**
 * Media file with enhanced metadata
 */
export interface MediaFile {
  id: string;
  name: string;
  path: string;
  type: MediaType;
  extension: string;
  size: number; // File size in bytes

  // Image-specific metadata
  width?: number; // Image width in pixels
  height?: number; // Image height in pixels
  format?: string; // Image format (JPEG, PNG, etc.)

  // Video-specific metadata
  duration?: number; // Video duration in seconds
  fps?: number; // Frames per second
  bitrate?: number; // Video bitrate
  codec?: string; // Video codec

  // Preview
  thumbnail?: string; // Thumbnail URL
  blobUrl?: string; // Blob URL for preview

  // Status
  selected?: boolean;
}

/**
 * Detailed metadata for a media file
 */
export interface MediaFileDetail {
  file: MediaFile;
  metadata: {
    // Common metadata
    createdDate: string;
    modifiedDate: string;
    mimeType: string;

    // Image-specific metadata
    exif?: {
      cameraMake?: string;
      cameraModel?: string;
      iso?: number;
      aperture?: string;
      shutterSpeed?: string;
      focalLength?: string;
    };

    // Video-specific metadata
    audio?: {
      codec: string;
      sampleRate: number;
      channels: number;
    };
  };
}

// ============================================================================
// JOB TYPES
// ============================================================================

/**
 * Job status
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * File input assignment to a workflow parameter
 */
export interface FileInputAssignment {
  parameterId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: MediaType;
  valid: boolean;
  validationError?: string;
  width?: number; // Image width in pixels
  height?: number; // Image height in pixels
}

/**
 * Job execution result
 */
export interface JobResult {
  outputs: Array<{
    parameterId?: string;
    type: 'file' | 'text';
    path?: string;
    content?: string;
    metadata?: Record<string, any>;
    // Output file metadata
    fileName?: string;
    fileType?: 'text' | 'image';
    fileSize?: number;
    workspacePath?: string; // Path in ~/Downloads/workspace/{jobId}/result/
  }>;
  summary?: string;

  // Source file cleanup tracking
  sourceFilesDeleted?: boolean;
  deletedSourceFiles?: string[];
  deletionErrors?: Array<{ path: string; error: string }>;

  // Text output content (for txt files)
  textOutputs?: Array<{
    fileName: string;
    filePath: string;
    content: {
      original: string;
      en?: string; // Translated to English
      zh?: string; // Translated to Chinese
    };
    autoTranslated?: boolean; // Track if translation was automatic
    translationError?: string; // Translation failures
  }>;
}

/**
 * Job - represents a single workflow execution
 */
export interface Job {
  id: string;
  workflowId: string;
  workflowName: string;
  fileInputs: FileInputAssignment[];
  textInputs: Record<string, string>;
  status: JobStatus;
  taskId?: string;
  startedAt?: number;
  completedAt?: number;
  results?: JobResult;
  error?: string;
  createdAt: number;
  folderPath?: string;

  // Post-processing cleanup
  deleteSourceFiles: boolean; // Whether to delete source files after completion
  deletedSourceFiles?: string[]; // List of deleted source file paths (after completion)
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Job validation result
 */
export interface JobValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// REQUEST/RESPONSE TYPES FOR NEW API
// ============================================================================

/**
 * Execute job request
 */
export interface ExecuteJobRequest {
  workflowId: string;           // Actual workflow ID (for loading output config)
  sourceWorkflowId?: string;    // Template ID (for CLI)
  fileInputs: Array<{
    parameterId: string;
    filePath: string;
  }>;
  textInputs: Record<string, string>;
  folderPath?: string;
  deleteSourceFiles: boolean;
}

/**
 * Execute job response
 */
export interface ExecuteJobResponse {
  success: boolean;
  taskId: string;
  jobId: string;
  message: string;
  error?: string;
}

/**
 * File metadata request
 */
export interface FileMetadataRequest {
  filePath: string;
}

/**
 * File metadata response
 */
export interface FileMetadataResponse {
  success: boolean;
  file: MediaFile;
  metadata: MediaFileDetail['metadata'];
  error?: string;
}

/**
 * File rename request
 */
export interface FileRenameRequest {
  oldPath: string;
  newName: string;
}

/**
 * File rename response
 */
export interface FileRenameResponse {
  success: boolean;
  newPath: string;
  error?: string;
}

/**
 * File delete request
 */
export interface FileDeleteRequest {
  paths: string[];
}

/**
 * File delete response
 */
export interface FileDeleteResponse {
  success: boolean;
  deletedCount: number;
  errors?: Array<{ path: string; error: string }>;
}

/**
 * File validation request
 */
export interface ValidateFileRequest {
  filePath: string;
  parameter: WorkflowInputParameter;
}

/**
 * File validation response
 */
export interface ValidateFileResponse {
  valid: boolean;
  error?: string;
}
