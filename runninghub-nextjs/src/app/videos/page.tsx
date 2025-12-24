'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFolderStore } from '@/store/folder-store';
import { useVideoStore } from '@/store/video-store';
import { useVideoSelectionStore } from '@/store/video-selection-store';
import { useProgressStore } from '@/store/progress-store';
import { useFolderSelection } from '@/hooks/useFolderSelection';
import { SelectedFolderHeader } from '@/components/folder/SelectedFolderHeader';
import { FolderSelectionLayout } from '@/components/folder/FolderSelectionLayout';
import { VideoGallery } from '@/components/videos/VideoGallery';
import { VideoSelectionToolbar } from '@/components/videos/VideoSelectionToolbar';
import { ProgressModal } from '@/components/progress/ProgressModal';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { API_ENDPOINTS, ERROR_MESSAGES } from '@/constants';
import type { VideoFile } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VideosPage() {
  const { selectedFolder, clearFolder } = useFolderStore();
  const { videos, setVideos, filteredVideos } = useVideoStore();
  const { deselectAll } = useVideoSelectionStore();
  const { isProgressModalOpen } = useProgressStore();

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
        // Filter out MP4 files since they're already in the target format
        const nonMp4Videos = data.videos.filter((video: VideoFile) => video.extension !== '.mp4');
        setVideos(nonMp4Videos);
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

        // Refresh folder contents after conversion completes
        setTimeout(() => {
          if (selectedFolder && !selectedFolder.is_virtual) {
            loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
          }
        }, 2000);
      } else {
        toast.error(data.error || ERROR_MESSAGES.CONVERSION_FAILED);
      }
    } catch (error) {
      console.error('Error converting videos:', error);
      toast.error(ERROR_MESSAGES.CONVERSION_FAILED);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Video Conversion</h1>
            <p className="text-muted-foreground mt-1">
              Convert video files to MP4 format using FFmpeg
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
          autoRefreshInterval={undefined}
        />
      </div>
    </div>
  );
}
