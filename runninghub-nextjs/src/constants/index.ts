export const ENVIRONMENT_VARIABLES = {
  API_KEY: process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY,
  WORKFLOW_ID: process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID,
  API_HOST: process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || 'www.runninghub.cn',
  DOWNLOAD_DIR: process.env.RUNNINGHUB_DOWNLOAD_DIR || '~/Downloads',
  IMAGE_FOLDER: process.env.RUNNINGHUB_IMAGE_FOLDER || '.',
  CLIP_OUTPUT_FOLDER: process.env.RUNNINGHUB_CLIP_OUTPUT_FOLDER || 'clipped_images',
  PREFIX_PATH: process.env.RUNNINGHUB_PREFIX_PATH || '~',
  PYTHON_CLI_PATH: process.env.PYTHON_CLI_PATH || '../',
  DEFAULT_TIMEOUT: parseInt(process.env.DEFAULT_TIMEOUT || '600'),
  DEFAULT_NODE_ID: process.env.DEFAULT_NODE_ID || '203',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  MAX_FILES_COUNT: parseInt(process.env.MAX_FILES_COUNT || '100'),
  WORKSPACE_PATH: process.env.WORKSPACE_PATH || '~/Downloads/workspace',
  WORKSPACE_WORKFLOW_ID: process.env.WORKSPACE_WORKFLOW_ID || null,
} as const;

export const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];

export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv'];

export const SUPPORTED_MEDIA_EXTENSIONS = [
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_VIDEO_EXTENSIONS,
];

export const KEYBOARD_SHORTCUTS = {
  SELECT_ALL: 'a',
  DESELECT_ALL: 'Escape',
  DELETE_SELECTED: 'Delete',
  TOGGLE_VIEW: 'v',
  NAVIGATE_UP: 'ArrowUp',
  NAVIGATE_DOWN: 'ArrowDown',
  NAVIGATE_LEFT: 'ArrowLeft',
  NAVIGATE_RIGHT: 'ArrowRight',
  PROCESS_IMAGES: 'Enter',
  REFRESH_FOLDER: 'r',
} as const;

export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
  LARGE: 'large',
} as const;

export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

import { CropMode } from '@/types/crop';

export const API_ENDPOINTS = {
  FOLDER_SELECT: '/api/folder/select',
  FOLDER_LIST: '/api/folder/list',
  FOLDER_VALIDATE_PATH: '/api/folder/validate-path',
  FOLDER_PROCESS_DIRECT: '/api/folder/process-direct',
  CONFIG_PREFIX_PATH: '/api/config/prefix-path',
  IMAGES_PROCESS: '/api/images/process',
  IMAGES_DELETE: '/api/images/delete',
  IMAGES_SERVE: '/api/images/serve',
  VIDEOS_CONVERT: '/api/videos/convert',
  VIDEOS_SERVE: '/api/videos/serve',
  VIDEOS_RENAME: '/api/videos/rename',
  VIDEOS_DELETE: '/api/videos/delete',
  VIDEOS_CROP: '/api/videos/crop',
  VIDEOS_CLIP: '/api/videos/clip',

  // Tasks
  NODES: '/api/nodes',
  SESSION_CLEAR: '/api/session/clear',

  // Workspace
  WORKSPACE_UPLOAD: '/api/workspace/upload',
  WORKSPACE_PROCESS: '/api/workspace/process',
  WORKSPACE_SAVE: '/api/workspace/save',
  WORKSPACE_SERVE: '/api/workspace/serve',
  WORKSPACE_EXECUTE: '/api/workspace/execute',
  WORKSPACE_JOB_RESULTS: '/api/workspace/job-results',
  WORKSPACE_SERVE_OUTPUT: '/api/workspace/serve-output',
  WORKSPACE_UPDATE_CONTENT: '/api/workspace/update-content',

  // Workflows
  WORKFLOW_SAVE: '/api/workflow/save',
  WORKFLOW_DELETE: '/api/workflow/delete',
} as const;

export const ERROR_MESSAGES = {
  NO_FOLDER_SELECTED: 'No folder selected',
  FOLDER_NOT_FOUND: 'Folder does not exist',
  PERMISSION_DENIED: 'Permission denied accessing folder',
  NO_IMAGES_SELECTED: 'No images selected for processing',
  NO_VIDEOS_SELECTED: 'No videos selected for conversion',
  NO_VIDEOS_SELECTED_FOR_CROP: 'No videos selected for cropping',
  NO_VIDEOS_SELECTED_FOR_CLIP: 'No videos selected for clipping',
  CONFIG_NOT_INITIALIZED: 'Failed to initialize configuration',
  PROCESSING_FAILED: 'Failed to start image processing',
  CONVERSION_FAILED: 'Failed to start video conversion',
  CROP_FAILED: 'Failed to start video cropping',
  CLIP_FAILED: 'Failed to start video clipping',
  INVALID_CROP_CONFIG: 'Invalid crop configuration',
  INVALID_CLIP_CONFIG: 'Invalid clip configuration',
  FILE_NOT_FOUND: 'File not found',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: 'File size exceeds limit',
  NETWORK_ERROR: 'Network error occurred',
  FFMPEG_NOT_AVAILABLE: 'FFmpeg is not installed or not accessible',
  UNKNOWN_ERROR: 'An unknown error occurred',
  // Workspace errors
  WORKSPACE_NOT_CONFIGURED: 'Workspace path not configured',
  WORKSPACE_NOT_FOUND: 'Workspace directory does not exist',
  NO_FILES_SELECTED: 'No files selected for processing',
  NO_WORKFLOW_ID: 'Workflow ID not configured',
  UPLOAD_FAILED: 'Failed to upload files to workspace',
  SAVE_FAILED: 'Failed to save text file',
  TRANSLATION_FAILED: 'Failed to translate text',
} as const;

export const SUCCESS_MESSAGES = {
  FOLDER_SELECTED: 'Folder selected successfully',
  IMAGES_PROCESSED: 'Images processed successfully',
  IMAGES_DELETED: 'Images deleted successfully',
  VIDEOS_CONVERTED: 'Videos converted successfully',
  VIDEOS_CROPPED: 'Videos cropped successfully',
  VIDEOS_CLIPPED: 'Videos clipped successfully',
  SESSION_CLEARED: 'Session cleared successfully',
  // Workspace success messages
  FILES_UPLOADED: 'Files uploaded successfully',
  FILES_PROCESSED: 'Files processed successfully',
  TEXT_SAVED: 'Text saved successfully',
} as const;

export const LOADING_MESSAGES = {
  PROCESSING_IMAGES: 'Processing images...',
  CONVERTING_VIDEOS: 'Converting videos...',
  CROPPING_VIDEOS: 'Cropping videos...',
  CLIPPING_VIDEOS: 'Clipping videos...',
  LOADING_FOLDER: 'Loading folder contents...',
  DELETING_IMAGES: 'Deleting images...',
  FETCHING_NODES: 'Fetching available nodes...',
} as const;

export const CROP_PRESETS = {
  LEFT_HALF: 'left' as CropMode,
  RIGHT_HALF: 'right' as CropMode,
  CENTER: 'center' as CropMode,
  TOP_HALF: 'top' as CropMode,
  BOTTOM_HALF: 'bottom' as CropMode,
  CUSTOM: 'custom' as CropMode,
};

export const DEFAULT_CROP_CONFIG = {
  mode: 'left',
  outputSuffix: '_cropped',
  preserveAudio: false,
} as const;

export const CLIP_MODES = {
  LAST_FRAME: 'last_frame',
  FIRST_FRAME: 'first_frame',
  LAST_FRAMES: 'last_frames',
  INTERVAL: 'interval',
  FRAME_INTERVAL: 'frame_interval',
} as const;

export const DEFAULT_CLIP_CONFIG = {
  mode: CLIP_MODES.LAST_FRAME,
  imageFormat: 'png',
  quality: 95,
  frameCount: 10,
  intervalSeconds: 10,
  intervalFrames: 1,
  organizeByVideo: true,
  deleteOriginal: false,
} as const;