// Caption Mode
export type CaptionMode = 'generate' | 'replace' | 'append' | 'prepend';

// Resize
export type ResizeMode = 'percentage' | 'dimensions' | 'longest' | 'shortest';
export type AspectRatioStrategy = 'fit' | 'fill' | 'stretch';

// Rename
export type RenamePattern = 'prefix-sequence' | 'suffix-sequence' | 'custom-template';

// Convert
export type OutputFormat = 'jpg' | 'png' | 'webp' | 'avif';

// Configuration interfaces
export interface AICaptionConfig {
  workflowId: string; // RunningHub workflow ID for captioning
  mode: CaptionMode;
  language: 'en' | 'zh' | 'both';
}

export interface ResizeConfig {
  mode: ResizeMode;
  width?: number;
  height?: number;
  percentage?: number;
  aspectRatioStrategy: AspectRatioStrategy;
  outputSuffix?: string;
  deleteOriginal: boolean;
}

export interface RenameConfig {
  pattern: RenamePattern;
  prefix?: string;
  suffix?: string;
  startNumber?: number;
  padding?: number;
  template?: string;
  preserveExtension: boolean;
}

export interface ConvertConfig {
  outputFormat: OutputFormat;
  quality?: number;
  lossless?: boolean;
  outputSuffix?: string;
  deleteOriginal: boolean;
}

// Caption file metadata
export interface CaptionMetadata {
  filePath: string;
  hasCaption: boolean;
  captionPreview?: string; // First 100 chars
  generatedAt?: number;
  workflowId?: string;
}

// Dataset types
export interface Dataset {
  name: string;
  path: string;
  parentPath: string;
  fileCount: number;
  createdAt: number;
}

export interface CreateDatasetRequest {
  name: string;
  files: string[];
  parentPath: string;
}

export interface CreateDatasetResponse {
  success: boolean;
  dataset?: Dataset;
  message: string;
  error?: string;
}

// API Request/Response Types
export interface CaptionRequest {
  images: string[];
  videos: string[];
  operation: 'ai-caption' | 'resize' | 'rename' | 'convert';
  config: AICaptionConfig | ResizeConfig | RenameConfig | ConvertConfig;
  folderPath: string;
}

export interface CaptionResponse {
  success: boolean;
  taskId: string;
  message: string;
  processedCount: number;
  error?: string;
}
