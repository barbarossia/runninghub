export interface FileHandleInfo {
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  file?: File;
}

export interface ImageFile {
  name: string;
  path: string;
  size: number;
  type: 'image';
  extension: string;
  width?: number; // Image width in pixels
  height?: number; // Image height in pixels
  thumbnail?: string; // Thumbnail path or URL
  is_virtual?: boolean;
  file_handle_info?: FileHandleInfo;
  blob_url?: string; // Blob URL for virtual files from File System Access API
  created_at?: number; // File creation timestamp (Unix timestamp in ms)
  modified_at?: number; // File modification timestamp (Unix timestamp in ms)

  // Duck encoding status
  isDuckEncoded?: boolean; // True if image contains duck-encoded hidden data
  duckRequiresPassword?: boolean; // True if duck-encoded image requires password
  duckValidationPending?: boolean; // True while validation is in progress

  // Caption from associated txt file (dataset page only)
  caption?: string; // Text content from associated txt file
  captionPath?: string; // Path to the txt file
}

export interface VideoFile {
  name: string;
  path: string;
  size: number;
  type: 'video';
  extension: string;
  width?: number; // Video width in pixels
  height?: number; // Video height in pixels
  fps?: number; // Frames per second
  thumbnail?: string; // Thumbnail path or URL
  duration?: number; // Video duration in seconds
  is_virtual?: boolean;
  file_handle_info?: FileHandleInfo;
  blob_url?: string;
  created_at?: number; // File creation timestamp (Unix timestamp in ms)
  modified_at?: number; // File modification timestamp (Unix timestamp in ms)

  // Caption from associated txt file (dataset page only)
  caption?: string; // Text content from associated txt file
  captionPath?: string; // Path to the txt file
}

export type MediaFile = ImageFile | VideoFile;

export interface FolderItem {
  name: string;
  path: string;
  type: 'folder';
  is_virtual?: boolean;
}

export interface FileSystemContents {
  folders: FolderItem[];
  images: ImageFile[];
  videos: VideoFile[];
  current_path: string;
  parent_path?: string;
  is_direct_access: boolean;
  session_id?: string;
  message?: string;
}

export interface RunningHubConfig {
  api_key: string;
  workflow_id: string;
  api_host: string;
  download_dir: string;
  image_folder: string;
  prefix_path: string;
}

export interface ProcessingTask {
  task_id: string;
  image_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  current_image?: string;
  completed_images?: string[];
  failed_images?: Array<{ path: string; error: string }>;
}

export interface ProcessImagesRequest {
  images: string[];
  node_id?: string;
  timeout?: number;
}

export interface ProcessImagesResponse {
  success: boolean;
  task_id?: string;
  message?: string;
  image_count?: number;
  error?: string;
}

export interface FolderSelectionResponse {
  success: boolean;
  folder_path: string;
  message: string;
  original_input?: string;
  folder_name: string;
  prefix_path?: string;
  relative_path?: string;
  is_under_prefix?: boolean;
  error?: string;
  suggestions?: string[];
  session_id?: string;
  is_virtual?: boolean;
}

export interface NodeInfo {
  id: string;
  name: string;
  description?: string;
}

export interface NodesResponse {
  success: boolean;
  nodes: NodeInfo[];
  output?: string;
  error?: string;
}

export type ViewMode = 'grid' | 'list' | 'large';

export interface SelectionState {
  selectedImages: Set<string>;
  lastSelectedImage?: string;
  isAllSelected: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export interface ConvertVideosRequest {
  videos: string[];
  overwrite?: boolean;
  timeout?: number;
}

export interface ConvertVideosResponse {
  success: boolean;
  task_id?: string;
  message?: string;
  video_count?: number;
  error?: string;
}

export interface VideoConversionTask extends ProcessingTask {
  type: 'video_conversion';
  total_videos: number;
  completed_videos?: string[];
  failed_videos?: Array<{ path: string; error: string }>;
}

export * from './caption';
export * from './crop';
export * from './video-clip';
export * from './workspace';
