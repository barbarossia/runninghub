import { useCallback } from 'react';
import { useFolderStore } from '@/store/folder-store';
import { useVideoStore } from '@/store/video-store';
import { useImageStore } from '@/store/image-store';
import type { FolderInfo as FolderSelectorFolderInfo } from '@/components/folder/FolderSelector';

export type FolderType = 'images' | 'videos';

interface UseFolderSelectionOptions {
  folderType: FolderType;
  onFolderLoaded?: () => void;
}

export function useFolderSelection({ folderType, onFolderLoaded }: UseFolderSelectionOptions) {
  const { setSelectedFolder, addRecentFolder } = useFolderStore();
  const { setVideos } = useVideoStore();
  const { setImages } = useImageStore();

  const handleFolderSelected = useCallback(
    (folderInfo: FolderSelectorFolderInfo) => {
      // Set the selected folder in the store
      setSelectedFolder({
        success: true,
        folder_name: folderInfo.name,
        folder_path: folderInfo.path,
        session_id: folderInfo.session_id,
        is_virtual: folderInfo.is_virtual,
        message: 'Folder selected',
      });

      // Add to recent folders
      if (folderInfo.path) {
        addRecentFolder({
          name: folderInfo.name,
          path: folderInfo.path,
          source: (folderInfo.source ||
            (folderInfo.is_virtual ? 'filesystem_api' : 'manual_input')) as
            'filesystem_api' | 'manual_input',
        });
      }

      // Load content based on folder type
      if (folderType === 'videos' && folderInfo.videos && folderInfo.videos.length > 0) {
        setVideos(folderInfo.videos as any[]);
      } else if (folderType === 'images' && folderInfo.images && folderInfo.images.length > 0) {
        setImages(folderInfo.images as any[]);

        // Also set folder contents for images
        const { setFolderContents } = useFolderStore.getState();
        setFolderContents({
          current_path: folderInfo.path,
          parent_path: undefined,
          images: folderInfo.images as any[],
          folders: (folderInfo.folders || []).map((f: any) => ({ ...f, type: 'folder' as const })),
          videos: [],
          is_direct_access: true,
        });
      }

      onFolderLoaded?.();
    },
    [folderType, setSelectedFolder, addRecentFolder, setVideos, setImages, onFolderLoaded]
  );

  return {
    handleFolderSelected,
  };
}
