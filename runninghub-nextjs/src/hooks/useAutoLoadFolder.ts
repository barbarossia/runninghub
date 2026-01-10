import { useEffect, useRef } from 'react';
import { useFolderStore, type PageType } from '@/store/folder-store';
import { API_ENDPOINTS } from '@/constants';
import { toast } from 'sonner';
import type { FolderSelectionResponse } from '@/types';

export type FolderType = 'images' | 'videos' | 'workspace' | 'clip' | 'crop';

interface UseAutoLoadFolderOptions {
  folderType: FolderType;
  onFolderLoaded?: (folder: FolderSelectionResponse, contents?: any) => void;
  enabled?: boolean;
}

const folderTypeToPageType: Record<FolderType, PageType> = {
  images: 'images',
  videos: 'videos',
  workspace: 'workspace',
  clip: 'clip',
  crop: 'crop',
};

/**
 * Hook to automatically load the last opened folder on page mount.
 * The folder state is persisted per-page, so we just validate and restore.
 */
export function useAutoLoadFolder({
  folderType,
  onFolderLoaded,
  enabled = true,
}: UseAutoLoadFolderOptions) {
  const pageType = folderTypeToPageType[folderType];
  const { getSelectedFolder, setSelectedFolder, clearPageFolder } = useFolderStore();

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Get the persisted folder for this page
    const lastFolder = getSelectedFolder(pageType);

    // Only attempt load if we haven't loaded yet AND we have a folder to load
    if (hasLoadedRef.current || !lastFolder) {
      return;
    }

    hasLoadedRef.current = true;

    // Validate and load the last folder
    const validateAndLoadFolder = async () => {
      try {
        // Check if folder still exists by listing its contents
        const response = await fetch(API_ENDPOINTS.FOLDER_LIST, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folder_path: lastFolder.folder_path,
            session_id: lastFolder.session_id,
          }),
        });

        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : { success: false };
        } catch (e) {
          console.error('Failed to parse auto-load response:', text);
          data = { success: false };
        }

        if (data.success || data.images || data.videos) {
          // Folder exists, set it as selected
          setSelectedFolder(pageType, lastFolder);
          onFolderLoaded?.(lastFolder, data);
        } else {
          // Folder no longer exists or is inaccessible
          console.warn(`Last ${folderType} folder is no longer accessible:`, lastFolder.folder_path);

          // Clear the invalid folder from storage
          clearPageFolder(pageType);

          toast.info(`Previous folder is no longer accessible. Please select a folder.`);
        }
      } catch (error) {
        console.error('Error validating last folder:', error);

        // Clear the invalid folder from storage
        clearPageFolder(pageType);

        toast.info('Could not access previous folder. Please select a folder.');
      }
    };

    validateAndLoadFolder();
  }, [enabled, folderType, pageType, getSelectedFolder, setSelectedFolder, clearPageFolder, onFolderLoaded]);
}
