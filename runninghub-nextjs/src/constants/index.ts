export const ENVIRONMENT_VARIABLES = {
  API_KEY: process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY,
  WORKFLOW_ID: process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID,
  API_HOST: process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || 'www.runninghub.cn',
  DOWNLOAD_DIR: process.env.RUNNINGHUB_DOWNLOAD_DIR || '~/Downloads',
  IMAGE_FOLDER: process.env.RUNNINGHUB_IMAGE_FOLDER || '.',
  PREFIX_PATH: process.env.RUNNINGHUB_PREFIX_PATH || '~',
  PYTHON_CLI_PATH: process.env.PYTHON_CLI_PATH || '../',
  DEFAULT_TIMEOUT: parseInt(process.env.DEFAULT_TIMEOUT || '600'),
  DEFAULT_NODE_ID: process.env.DEFAULT_NODE_ID || '203',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  MAX_FILES_COUNT: parseInt(process.env.MAX_FILES_COUNT || '100'),
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

  // Tasks
  NODES: '/api/nodes',
  SESSION_CLEAR: '/api/session/clear',
} as const;

export const ERROR_MESSAGES = {
  NO_FOLDER_SELECTED: 'No folder selected',
  FOLDER_NOT_FOUND: 'Folder does not exist',
  PERMISSION_DENIED: 'Permission denied accessing folder',
  NO_IMAGES_SELECTED: 'No images selected for processing',
  NO_VIDEOS_SELECTED: 'No videos selected for conversion',
  NO_VIDEOS_SELECTED_FOR_CROP: 'No videos selected for cropping',
  CONFIG_NOT_INITIALIZED: 'Failed to initialize configuration',
  PROCESSING_FAILED: 'Failed to start image processing',
  CONVERSION_FAILED: 'Failed to start video conversion',
  CROP_FAILED: 'Failed to start video cropping',
  INVALID_CROP_CONFIG: 'Invalid crop configuration',
  FILE_NOT_FOUND: 'File not found',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: 'File size exceeds limit',
  NETWORK_ERROR: 'Network error occurred',
  FFMPEG_NOT_AVAILABLE: 'FFmpeg is not installed or not accessible',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

export const SUCCESS_MESSAGES = {
  FOLDER_SELECTED: 'Folder selected successfully',
  IMAGES_PROCESSED: 'Images processed successfully',
  IMAGES_DELETED: 'Images deleted successfully',
  VIDEOS_CONVERTED: 'Videos converted successfully',
  VIDEOS_CROPPED: 'Videos cropped successfully',
  SESSION_CLEARED: 'Session cleared successfully',
} as const;

export const LOADING_MESSAGES = {
  PROCESSING_IMAGES: 'Processing images...',
  CONVERTING_VIDEOS: 'Converting videos...',
  CROPPING_VIDEOS: 'Cropping videos...',
  LOADING_FOLDER: 'Loading folder contents...',
  DELETING_IMAGES: 'Deleting images...',
  FETCHING_NODES: 'Fetching available nodes...',
} as const;

export const CROP_PRESETS = {
  LEFT_HALF: 'left',
  RIGHT_HALF: 'right',
  CENTER: 'center',
  CUSTOM: 'custom',
} as const;

export const DEFAULT_CROP_CONFIG = {
  mode: 'left',
  outputSuffix: '_cropped',
  preserveAudio: false,
} as const;