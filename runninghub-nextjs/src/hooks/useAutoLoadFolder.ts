import { useEffect, useRef } from 'react';
import { useFolderStore } from '@/store/folder-store';
import { API_ENDPOINTS } from '@/constants';
import { toast } from 'sonner';
import type { FolderSelectionResponse } from '@/types';

export type FolderType = 'images' | 'videos';

interface UseAutoLoadFolderOptions {
  folderType: FolderType;
  onFolderLoaded?: (folder: FolderSelectionResponse, contents?: any) => void;
  enabled?: boolean;
}

/**
 * Hook to automatically load the last opened folder on page mount.
 * Validates the folder still exists before loading it.
 */
export function useAutoLoadFolder({
  folderType,
  onFolderLoaded,
  enabled = true,
}: UseAutoLoadFolderOptions) {
  const { lastImageFolder, lastVideoFolder, setLastImageFolder, setLastVideoFolder, setSelectedFolder } =
    useFolderStore();

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const lastFolder = folderType === 'images' ? lastImageFolder : lastVideoFolder;

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
          setSelectedFolder(lastFolder);
          onFolderLoaded?.(lastFolder, data);
        } else {
          // Folder no longer exists or is inaccessible
          console.warn(`Last ${folderType} folder is no longer accessible:`, lastFolder.folder_path);

          // Clear the invalid folder from storage
          if (folderType === 'images') {
            setLastImageFolder(null);
          } else {
            setLastVideoFolder(null);
          }

          toast.info(`Previous folder is no longer accessible. Please select a folder.`);
        }
      } catch (error) {
        console.error('Error validating last folder:', error);

        // Clear the invalid folder from storage
        if (folderType === 'images') {
          setLastImageFolder(null);
        } else {
          setLastVideoFolder(null);
        }

        toast.info('Could not access previous folder. Please select a folder.');
      }
    };

    validateAndLoadFolder();
  }, [enabled, folderType, lastImageFolder, lastVideoFolder, setSelectedFolder, onFolderLoaded, setLastImageFolder, setLastVideoFolder]);
}
