'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFolderStore, useCropFolder } from '@/store/folder-store';
import { useVideoStore } from '@/store/video-store';
import { useVideoSelectionStore } from '@/store/video-selection-store';
import { useProgressStore } from '@/store/progress-store';
import { useCropStore } from '@/store/crop-store';
import { useFolderSelection } from '@/hooks/useFolderSelection';
import { useAutoLoadFolder } from '@/hooks/useAutoLoadFolder';
import { SelectedFolderHeader } from '@/components/folder/SelectedFolderHeader';
import { FolderSelectionLayout } from '@/components/folder/FolderSelectionLayout';
import { VideoGallery } from '@/components/videos/VideoGallery';
import { VideoSelectionToolbar } from '@/components/videos/VideoSelectionToolbar';
import { CropConfiguration } from '@/components/videos/CropConfiguration';
import { ProgressModal } from '@/components/progress/ProgressModal';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { PageHeader } from '@/components/navigation/PageHeader';
import { API_ENDPOINTS, ERROR_MESSAGES } from '@/constants';
import type { VideoFile } from '@/types';
import { buildCustomCropParams, validateCropConfig } from '@/lib/ffmpeg-crop';
import { toast } from 'sonner';
import { Crop } from 'lucide-react';

export default function VideoCropPage() {
  // Use page-specific folder state for crop page
  const { selectedFolder } = useCropFolder();
  const { videos, setVideos, filteredVideos } = useVideoStore();
  const { deselectAll } = useVideoSelectionStore();
  const { isProgressModalOpen } = useProgressStore();
  const { cropConfig } = useCropStore();

  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const { handleFolderSelected } = useFolderSelection({
    folderType: 'crop',
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
        // Show all videos
        setVideos(data.videos);
      }
    } catch (error) {
      console.error('Error loading folder contents:', error);
      toast.error(ERROR_MESSAGES.FOLDER_NOT_FOUND);
    } finally {
      setIsLoadingFolder(false);
    }
  }, [setVideos]);

  // Auto-load last opened folder on mount
  useAutoLoadFolder({
    folderType: 'crop',
    onFolderLoaded: (folder) => {
      // Load folder contents when auto-loaded
      loadFolderContents(folder.folder_path, folder.session_id);
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

  const handleCropVideos = async (selectedPaths: string[]) => {
    // Validate crop configuration
    if (cropConfig.mode === 'custom') {
      const config = {
        x: parseFloat(cropConfig.customX || '0') || 0,
        y: parseFloat(cropConfig.customY || '0') || 0,
        width: parseFloat(cropConfig.customWidth || '50') || 0,
        height: parseFloat(cropConfig.customHeight || '100') || 0,
      };

      const validation = validateCropConfig(config);
      if (!validation.valid) {
        toast.error(validation.error || ERROR_MESSAGES.INVALID_CROP_CONFIG);
        return;
      }
    }

    try {
      // Build crop config for API
      const crop_config = {
        mode: cropConfig.mode,
      };

      // Add custom dimensions if in custom mode
      if (cropConfig.mode === 'custom') {
        const customWidth = cropConfig.customWidth ? parseFloat(cropConfig.customWidth) : undefined;
        const customHeight = cropConfig.customHeight ? parseFloat(cropConfig.customHeight) : undefined;
        const customX = cropConfig.customX ? parseFloat(cropConfig.customX) : undefined;
        const customY = cropConfig.customY ? parseFloat(cropConfig.customY) : undefined;

        const params = buildCustomCropParams({
          customWidth,
          customHeight,
          customX,
          customY,
        });
        Object.assign(crop_config, params);
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

        // Refresh folder contents after cropping completes
        setTimeout(() => {
          if (selectedFolder && !selectedFolder.is_virtual) {
            loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
          }
        }, 2000);
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
    const { clearPageFolder } = useFolderStore.getState();
    clearPageFolder('crop');
    setVideos([]);
    deselectAll();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:bg-[#0d1117] dark:from-[#0d1117] dark:to-[#161b22]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <PageHeader
          title="Video Cropping"
          description="Crop videos to specific regions using FFmpeg"
          showBackButton={!!selectedFolder}
          onBackClick={handleBackToSelection}
          colorVariant="green"
        />

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
          defaultVisible={false}
        />
      </div>
    </div>
  );
}