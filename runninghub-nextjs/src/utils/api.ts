import { API_ENDPOINTS, ERROR_MESSAGES } from '@/constants';

interface ProcessDirectFileItem {
  name: string;
  isDirectory: boolean;
  size?: number;
  type?: string;
  handle?: unknown;
}

interface ProcessDirectRequest {
  folder_name: string;
  files: ProcessDirectFileItem[];
  source: string;
  full_path?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || ''}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || ERROR_MESSAGES.UNKNOWN_ERROR,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors or other unexpected errors
    throw new ApiError(
      ERROR_MESSAGES.NETWORK_ERROR,
      0,
      error
    );
  }
}

export const api = {
  // Folder operations
  selectFolder: (folderPath: string) =>
    apiRequest(API_ENDPOINTS.FOLDER_SELECT, {
      method: 'POST',
      body: JSON.stringify({ folder_path: folderPath }),
    }),

  listFolder: () =>
    apiRequest(API_ENDPOINTS.FOLDER_LIST),

  validatePath: (path: string) =>
    apiRequest(API_ENDPOINTS.FOLDER_VALIDATE_PATH, {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  processFolderDirect: (folderData: ProcessDirectRequest) =>
    apiRequest(API_ENDPOINTS.FOLDER_PROCESS_DIRECT, {
      method: 'POST',
      body: JSON.stringify(folderData),
    }),

  getPrefixPath: () =>
    apiRequest(API_ENDPOINTS.CONFIG_PREFIX_PATH),

  // Image operations
  processImages: (images: string[], nodeId?: string, timeout?: number) =>
    apiRequest(API_ENDPOINTS.IMAGES_PROCESS, {
      method: 'POST',
      body: JSON.stringify({
        images,
        node_id: nodeId,
        timeout,
      }),
    }),

  deleteImages: (images: string[]) =>
    apiRequest(API_ENDPOINTS.IMAGES_DELETE, {
      method: 'DELETE',
      body: JSON.stringify({ images }),
    }),

  // Configuration
  getNodes: () =>
    apiRequest(API_ENDPOINTS.NODES),

  clearSession: () =>
    apiRequest(API_ENDPOINTS.SESSION_CLEAR, {
      method: 'POST',
    }),
};

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}