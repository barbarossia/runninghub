'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFolderStore } from '@/store/folder-store';
import { useVideoStore } from '@/store/video-store';
import { useVideoSelectionStore } from '@/store/video-selection-store';
import { useProgressStore } from '@/store/progress-store';
import { useVideoClipStore } from '@/store/video-clip-store';
import { useFolderSelection } from '@/hooks/useFolderSelection';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { SelectedFolderHeader } from '@/components/folder/SelectedFolderHeader';
import { FolderSelectionLayout } from '@/components/folder/FolderSelectionLayout';
import { VideoGallery } from '@/components/videos/VideoGallery';
import { VideoClipSelectionToolbar } from '@/components/videos/VideoClipSelectionToolbar';
import { VideoClipConfiguration } from '@/components/videos/VideoClipConfiguration';
import { ProgressModal } from '@/components/progress/ProgressModal';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { API_ENDPOINTS, ERROR_MESSAGES, SUPPORTED_VIDEO_EXTENSIONS } from '@/constants';
import type { VideoFile } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VideoClipPage() {
  const { selectedFolder, clearFolder } = useFolderStore();
  const { videos, setVideos, filteredVideos } = useVideoStore();
  const { deselectAll, deselectVideo } = useVideoSelectionStore();
  const { isProgressModalOpen } = useProgressStore();
  const { clipConfig } = useVideoClipStore();

  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const loadFolderContents = useCallback(async (folderPath: string, sessionId?: string) => {
    setIsLoadingFolder(true);
    try {
      const response = await fetch(API_ENDPOINTS.FOLDER_LIST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: folderPath, session_id: sessionId }),
      });

      const data = await response.json();

      if (data.videos) {
        // Show all supported videos
        setVideos(data.videos);
      }
    } catch (error) {
      console.error('Error loading folder contents:', error);
      toast.error(ERROR_MESSAGES.FOLDER_NOT_FOUND);
    } finally {
      setIsLoadingFolder(false);
    }
  }, [setVideos]);

  const handleRefresh = useCallback(async (silent = false) => {
    if (selectedFolder && !selectedFolder.is_virtual) {
      await loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
      if (!silent) {
        toast.success('Folder contents refreshed');
      }
    } else if (!silent) {
      toast.info('Cannot refresh virtual folder');
    }
  }, [selectedFolder, loadFolderContents]);

  // Track progress and refresh on completion
  useProgressTracking({
    onTaskComplete: (taskId) => {
      if (taskId === currentTaskId) {
        toast.success('Clipping task completed');
        handleRefresh(true);
        
        // If delete original was enabled, we should clear the selection
        // since the original files are now gone
        if (clipConfig.deleteOriginal) {
          deselectAll();
        }
      }
    },
    onTaskFail: (taskId, error) => {
      if (taskId === currentTaskId) {
        toast.error(`Clipping task failed: ${error}`);
      }
    }
  });

  const { handleFolderSelected } = useFolderSelection({
    folderType: 'videos',
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

  const handleClipVideos = async (selectedPaths: string[]) => {
    try {
      const response = await fetch(API_ENDPOINTS.VIDEOS_CLIP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: selectedPaths,
          clip_config: clipConfig,
          timeout: 3600,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.task_id) {
          setCurrentTaskId(data.task_id);
        }
      } else {
        toast.error(data.error || ERROR_MESSAGES.CLIP_FAILED);
      }
    } catch (error) {
      console.error('Error clipping videos:', error);
      toast.error(ERROR_MESSAGES.CLIP_FAILED);
    }
  };

  const handleBackToSelection = () => {
    clearFolder();
    setVideos([]);
    deselectAll();
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
        if (selectedFolder && !selectedFolder.is_virtual) {
          await loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
        }
      } else {
        toast.error(data.error || ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    } catch (error) {
      console.error('Error renaming video:', error);
      toast.error(ERROR_MESSAGES.UNKNOWN_ERROR);
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
        toast.success(`Deleted ${video.name}`);
        if (selectedFolder && !selectedFolder.is_virtual) {
          await loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
        }
      } else {
        toast.error(data.error || ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error(ERROR_MESSAGES.UNKNOWN_ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Video Clipping</h1>
            <p className="text-sm text-gray-600 mt-1">
              Extract images from videos using Python Video Clip tool
            </p>
          </div>

          {selectedFolder && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToSelection}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Selection
            </Button>
          )}
        </div>

        {!selectedFolder ? (
          <FolderSelectionLayout
            title="Select Video Folder"
            description="Choose a folder containing videos you want to clip images from."
            icon={Scissors}
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

            {/* Clip Configuration */}
            <VideoClipConfiguration disabled={isLoadingFolder} />

            {/* Selection Toolbar */}
            <VideoClipSelectionToolbar
              onClip={handleClipVideos}
              onRefresh={() => handleRefresh(true)}
              disabled={isLoadingFolder}
            />

            {/* Video Gallery */}
            <VideoGallery
              videos={filteredVideos}
              isLoading={isLoadingFolder}
              onRefresh={() => handleRefresh(true)}
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
