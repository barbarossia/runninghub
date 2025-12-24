'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFolderStore } from '@/store/folder-store';
import { useVideoStore } from '@/store/video-store';
import { useVideoSelectionStore } from '@/store/video-selection-store';
import { useProgressStore } from '@/store/progress-store';
import { useCropStore } from '@/store/crop-store';
import { useFolderSelection } from '@/hooks/useFolderSelection';
import { SelectedFolderHeader } from '@/components/folder/SelectedFolderHeader';
import { FolderSelectionLayout } from '@/components/folder/FolderSelectionLayout';
import { VideoGallery } from '@/components/videos/VideoGallery';
import { VideoSelectionToolbar } from '@/components/videos/VideoSelectionToolbar';
import { CropConfiguration } from '@/components/videos/CropConfiguration';
import { ProgressModal } from '@/components/progress/ProgressModal';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { API_ENDPOINTS, ERROR_MESSAGES } from '@/constants';
import type { VideoFile } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, Crop } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VideoCropPage() {
  const { selectedFolder, clearFolder } = useFolderStore();
  const { videos, setVideos, filteredVideos } = useVideoStore();
  const { deselectAll } = useVideoSelectionStore();
  const { isProgressModalOpen } = useProgressStore();
  const { cropConfig } = useCropStore();

  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const { handleFolderSelected } = useFolderSelection({
    folderType: 'videos',
  });

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
        // Only show MP4 files for cropping
        const mp4Videos = data.videos.filter((video: VideoFile) => video.extension === '.mp4');
        setVideos(mp4Videos);
      }
    } catch (error) {
      console.error('Error loading folder contents:', error);
      toast.error(ERROR_MESSAGES.FOLDER_NOT_FOUND);
    } finally {
      setIsLoadingFolder(false);
    }
  }, [setVideos]);

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

  const handleCropVideos = async (selectedPaths: string[]) => {
    try {
      // Build crop config for API
      const crop_config: {
        mode: string;
        width?: string;
        height?: string;
        x?: string;
        y?: string;
      } = {
        mode: cropConfig.mode,
      };

      // Add custom dimensions if in custom mode
      if (cropConfig.mode === 'custom') {
        if (cropConfig.customWidth) crop_config.width = cropConfig.customWidth;
        if (cropConfig.customHeight) crop_config.height = cropConfig.customHeight;
        if (cropConfig.customX) crop_config.x = cropConfig.customX;
        if (cropConfig.customY) crop_config.y = cropConfig.customY;
      }

      const response = await fetch(API_ENDPOINTS.VIDEOS_CROP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: selectedPaths,
          crop_config,
          output_suffix: cropConfig.outputSuffix || '_cropped',
          preserve_audio: cropConfig.preserveAudio || false,
          timeout: 3600,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.task_id) {
          setCurrentTaskId(data.task_id);
        }
      } else {
        toast.error(data.error || ERROR_MESSAGES.CROP_FAILED);
      }
    } catch (error) {
      console.error('Error cropping videos:', error);
      toast.error(ERROR_MESSAGES.CROP_FAILED);
    }
  };

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
        // Refresh folder contents after renaming
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
        // Refresh folder contents after deleting
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Video Cropping</h1>
            <p className="text-muted-foreground mt-1">
              Crop videos to specific regions using FFmpeg
            </p>
          </div>

          {selectedFolder && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToSelection}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Selection
            </Button>
          )}
        </div>

        {!selectedFolder ? (
          <FolderSelectionLayout
            title="Select Video Folder"
            description="Choose a folder containing videos you want to crop. Supports drag & drop and modern file system access."
            icon={Crop}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
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
              colorVariant="green"
            />

            {/* Crop Configuration */}
            <CropConfiguration disabled={isLoadingFolder} />

            {/* Selection Toolbar */}
            <VideoSelectionToolbar
              onCrop={handleCropVideos}
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
