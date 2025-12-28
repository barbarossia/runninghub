'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFolderStore } from '@/store/folder-store';
import { useVideoStore } from '@/store/video-store';
import { useVideoSelectionStore } from '@/store/video-selection-store';
import { useProgressStore } from '@/store/progress-store';
import { useFolderSelection } from '@/hooks/useFolderSelection';
import { useAutoLoadFolder } from '@/hooks/useAutoLoadFolder';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { SelectedFolderHeader } from '@/components/folder/SelectedFolderHeader';
import { FolderSelectionLayout } from '@/components/folder/FolderSelectionLayout';
import { VideoGallery } from '@/components/videos/VideoGallery';
import { VideoSelectionToolbar } from '@/components/videos/VideoSelectionToolbar';
import { ProgressModal } from '@/components/progress/ProgressModal';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { PageHeader } from '@/components/navigation/PageHeader';
import { API_ENDPOINTS, ERROR_MESSAGES } from '@/constants';
import type { VideoFile } from '@/types';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { Video } from 'lucide-react';

export default function VideosPage() {
  const { selectedFolder, clearFolder } = useFolderStore();
  const { videos, setVideos, filteredVideos, updateVideo } = useVideoStore();
  const { deselectAll, deselectVideo } = useVideoSelectionStore();
  const { isProgressModalOpen } = useProgressStore();

  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const { handleFolderSelected } = useFolderSelection({
    folderType: 'videos',
  });

  const handleRefresh = async (silent = false) => {
    if (selectedFolder && !selectedFolder.is_virtual) {
      await loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
      if (!silent) {
        toast.success('Folder contents refreshed');
      }
    } else if (!silent) {
      toast.info('Cannot refresh virtual folder');
    }
  };

  const loadFolderContents = useCallback(async (folderPath: string, sessionId?: string, silent = false) => {
    if (!silent) {
      setIsLoadingFolder(true);
    }
    try {
      const response = await fetch(API_ENDPOINTS.FOLDER_LIST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: folderPath, session_id: sessionId }),
      });

      const data = await response.json();

      if (data.videos) {
        // Filter out MP4 files since they're already in the target format
        const nonMp4Videos = data.videos.filter((video: VideoFile) => video.extension !== '.mp4');
        setVideos(nonMp4Videos);
      }
    } catch (error) {
      console.error('Error loading folder contents:', error);
      if (!silent) {
        toast.error(ERROR_MESSAGES.FOLDER_NOT_FOUND);
      }
    } finally {
      if (!silent) {
        setIsLoadingFolder(false);
      }
    }
  }, [setVideos]);

  // Auto-load last opened folder on mount
  useAutoLoadFolder({
    folderType: 'videos',
    onFolderLoaded: (folder) => {
      // Load folder contents when auto-loaded
      loadFolderContents(folder.folder_path, folder.session_id, true);
    },
  });

  // Load folder contents when folder is selected
  useEffect(() => {
    if (selectedFolder && !selectedFolder.is_virtual) {
      loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
    }
  }, [selectedFolder, loadFolderContents]);

  // Track modal state
  useEffect(() => {
    setIsModalOpen(isProgressModalOpen);
  }, [isProgressModalOpen]);

  const handleConvertVideos = async (selectedPaths: string[]) => {
    try {
      const response = await fetch(API_ENDPOINTS.VIDEOS_CONVERT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: selectedPaths,
          overwrite: true,
          timeout: 3600,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.task_id) {
          setCurrentTaskId(data.task_id);
        }
      } else {
        toast.error(data.error || ERROR_MESSAGES.CONVERSION_FAILED);
      }
    } catch (error) {
      console.error('Error converting videos:', error);
      toast.error(ERROR_MESSAGES.CONVERSION_FAILED);
    }
  };

  const handleRenameVideo = async (video: VideoFile, newName: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.VIDEOS_RENAME, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: video.path,
          new_name: newName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Renamed to ${data.new_name}`);
        
        // Update video in store
        updateVideo(video.path, {
          path: data.new_path,
          name: data.new_name,
        });

        // Update selection: deselect old
        deselectVideo(video.path);

        // Refresh to ensure sync with disk
        handleRefresh(true);
      } else {
        throw new Error(data.error || 'Failed to rename video');
      }
    } catch (error) {
      console.error('Error renaming video:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to rename video');
    }
  };

  const handleDeleteVideo = async (video: VideoFile) => {
    try {
      const response = await fetch(API_ENDPOINTS.VIDEOS_DELETE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: [video.path],
        }),
      });

      const data = await response.json();

      if (data.success) {
        logger.success(`Deleted ${video.name}`, {
          metadata: { videoName: video.name, videoPath: video.path }
        });

        // Refresh folder
        handleRefresh(true);
        
        // Deselect if it was selected
        deselectVideo(video.path);
      } else {
        throw new Error(data.error || 'Failed to delete video');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete video');
    }
  };

  const handleBackToSelection = () => {
    clearFolder();
    setVideos([]);
    deselectAll();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:bg-[#0d1117] dark:from-[#0d1117] dark:to-[#161b22]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <PageHeader
          title="Video Conversion"
          description="Convert video files to MP4 format using FFmpeg"
          showBackButton={!!selectedFolder}
          onBackClick={handleBackToSelection}
          colorVariant="purple"
        />

        {!selectedFolder ? (
          <FolderSelectionLayout
            title="Select Video Folder"
            description="Choose a folder containing videos you want to convert. Supports drag & drop and modern file system access."
            icon={Video}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
            onFolderSelected={handleFolderSelected}
          />
        ) : (
          /* Selected Folder Display */
          <div className="space-y-6">
            <SelectedFolderHeader
              folderName={selectedFolder.folder_name}
              folderPath={selectedFolder.folder_path}
              itemCount={videos.length}
              itemType="videos"
              isVirtual={selectedFolder.is_virtual}
              isLoading={isLoadingFolder}
              onRefresh={handleRefresh}
              colorVariant="purple"
            />

            {/* Selection Toolbar */}
            <VideoSelectionToolbar
              onConvert={handleConvertVideos}
              onRefresh={handleRefresh}
              disabled={isLoadingFolder}
            />

            {/* Video Gallery */}
            <VideoGallery
              videos={filteredVideos}
              isLoading={isLoadingFolder}
              onRefresh={handleRefresh}
              onRename={handleRenameVideo}
              onDelete={handleDeleteVideo}
            />
          </div>
        )}

        {/* Progress Modal */}
        {isModalOpen && (
          <ProgressModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
          />
        )}

        {/* Console Viewer */}
        <ConsoleViewer
          taskId={currentTaskId}
          onRefresh={handleRefresh}
          defaultVisible={true}
        />
      </div>
    </div>
  );
}
