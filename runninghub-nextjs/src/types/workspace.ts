/**
 * Workspace type definitions
 * Handles workspace file management, text content, and translation
 */

export type Language = 'en' | 'zh' | 'auto';

export type WorkspaceFileStatus = 'uploaded' | 'processing' | 'completed' | 'error';

/**
 * Workspace file metadata
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
 * Text content with bilingual support
 */
export interface WorkspaceTextContent {
  original: string;
  en: string;
  zh: string;
  lastModified: number;
  originalLanguage?: Language;
}

/**
 * Translation request
 */
export interface TranslationRequest {
  text: string;
  from: Language;
  to: Language;
}

/**
 * Translation response
 */
export interface TranslationResponse {
  success: boolean;
  translatedText: string;
  detectedLanguage?: string;
  error?: string;
}

/**
 * Workspace configuration
 */
export interface WorkspaceConfig {
  path: string;
  workflowId: string | null;
}

/**
 * Upload progress
 */
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
}

/**
 * File upload request
 */
export interface FileUploadRequest {
  name: string;
  data: string; // Base64 encoded
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  id: string;
  name: string;
  workspacePath: string;
}

/**
 * Process request
 */
export interface ProcessRequest {
  files: string[];
  workflowId: string;
  workspacePath: string;
}

/**
 * Process response
 */
export interface ProcessResponse {
  success: boolean;
  taskId: string;
  message: string;
  error?: string;
}

/**
 * Save text request
 */
export interface SaveTextRequest {
  fileId: string;
  content: string;
  language: 'en' | 'zh';
  workspacePath: string;
}

/**
 * Save text response
 */
export interface SaveTextResponse {
  success: boolean;
  savedPath: string;
  error?: string;
}
