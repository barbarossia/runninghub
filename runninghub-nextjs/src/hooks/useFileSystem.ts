import { useState, useCallback } from 'react';
import { useFolderStore, useImageStore } from '@/store';
import { API_ENDPOINTS } from '@/constants';
import type { FolderSelectionResponse, FileSystemContents, ImageFile, VideoFile } from '@/types';

interface VirtualFolderData {
  name: string;
  path: string;
  is_virtual: boolean;
  source?: string;
  images?: ImageFile[];
  videos?: VideoFile[];
}

interface UseFileSystemReturn {
  // State
  isSelecting: boolean;
  isLoading: boolean;
  error: string | null;

  // Folder operations
  selectFolder: (folderInput: string, isVirtual?: boolean, virtualData?: VirtualFolderData) => Promise<FolderSelectionResponse | null>;
  loadFolderContents: (folderPath: string, sessionId?: string, silent?: boolean) => Promise<FileSystemContents | null>;
  validatePath: (path: string) => Promise<{ valid: boolean; message?: string; relativePath?: string }>;

  // Clear
  clearCurrentFolder: () => void;
}

export function useFileSystem(): UseFileSystemReturn {
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setLoadingFolder, setLoadingContents, setSelectedFolder, setFolderContents, setError: setStoreError } = useFolderStore();
  const { setLoadingImages, setImages, setError: setImageError } = useImageStore();

  const selectFolder = useCallback(async (
    folderInput: string,
    isVirtual = false,
    virtualData?: VirtualFolderData
  ): Promise<FolderSelectionResponse | null> => {
    setIsSelecting(true);
    setError(null);
    setLoadingFolder(true);
    setStoreError(null);

    try {
      const endpoint = isVirtual ? API_ENDPOINTS.FOLDER_PROCESS_DIRECT : API_ENDPOINTS.FOLDER_SELECT;
      const payload = isVirtual
        ? { folder_path: folderInput, is_virtual: true, virtual_data: virtualData }
        : { folder_path: folderInput };

        const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data: FolderSelectionResponse;
      try {
        data = text ? JSON.parse(text) : { success: false, error: 'Empty response' };
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to select folder');
      }

      setSelectedFolder(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select folder';
      setError(errorMessage);
      setStoreError(errorMessage);
      return null;
    } finally {
      setIsSelecting(false);
      setLoadingFolder(false);
    }
  }, [setLoadingFolder, setSelectedFolder, setStoreError]);

  const loadFolderContents = useCallback(async (
    folderPath: string,
    sessionId?: string,
    silent = false
  ): Promise<FileSystemContents | null> => {
    if (!silent) {
      setError(null);
      setLoadingContents(true);
      setLoadingImages(true);
    }

    try {
              const response = await fetch(API_ENDPOINTS.FOLDER_LIST, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                folder_path: folderPath,
                session_id: sessionId,
              }),
            });
      
            const text = await response.text();
            let data: FileSystemContents;
            try {
              data = text ? JSON.parse(text) : { message: 'Empty response', success: false };
            } catch (e) {
              throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
            }
      
            if (!response.ok) {        throw new Error(data.message || 'Failed to load folder contents');
      }

      // Update folder contents in store
      setFolderContents(data);

      // Update images in image store
      setImages(data.images || []);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load folder contents';
      if (!silent) {
        setError(errorMessage);
        setStoreError(errorMessage);
        setImageError(errorMessage);
      }
      return null;
    } finally {
      if (!silent) {
        setLoadingContents(false);
        setLoadingImages(false);
      }
    }
  }, [setLoadingContents, setLoadingImages, setFolderContents, setImages, setStoreError, setImageError]);

  const validatePath = useCallback(async (
    path: string
  ): Promise<{ valid: boolean; message?: string; relativePath?: string }> => {
    try {
              const response = await fetch(API_ENDPOINTS.FOLDER_VALIDATE_PATH, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path }),
            });
      
            const text = await response.text();
            let data;
            try {
              data = text ? JSON.parse(text) : { error: 'Empty response' };
            } catch (e) {
              throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
            }
      
            if (!response.ok) {        return { valid: false, message: data.error || 'Invalid path' };
      }

      return {
        valid: data.valid || data.exists,
        message: data.message,
        relativePath: data.relative_path,
      };
    } catch (err) {
      return {
        valid: false,
        message: err instanceof Error ? err.message : 'Failed to validate path',
      };
    }
  }, []);

  const clearCurrentFolder = useCallback(() => {
    const { clearFolder } = useFolderStore.getState();
    clearFolder();
    setImages([]);
    setError(null);
  }, [setImages]);

  return {
    isSelecting,
    isLoading: useFolderStore.getState().isLoadingFolder || useFolderStore.getState().isLoadingContents,
    error,
    selectFolder,
    loadFolderContents,
    validatePath,
    clearCurrentFolder,
  };
}
