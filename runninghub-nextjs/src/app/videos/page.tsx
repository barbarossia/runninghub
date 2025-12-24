'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFolderStore } from '@/store/folder-store';
import { useVideoStore } from '@/store/video-store';
import { useVideoSelectionStore } from '@/store/video-selection-store';
import { useProgressStore } from '@/store/progress-store';
import FolderSelector, { FolderInfo as FolderSelectorFolderInfo } from '@/components/folder/FolderSelector';
import { VideoGallery } from '@/components/videos/VideoGallery';
import { VideoSelectionToolbar } from '@/components/videos/VideoSelectionToolbar';
import { ProgressModal } from '@/components/progress/ProgressModal';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { API_ENDPOINTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/constants';
import { toast } from 'sonner';
import { FolderOpen, ArrowLeft, RefreshCw, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { VideoFile } from '@/types';

export default function VideosPage() {
  const router = useRouter();
  const { selectedFolder, setSelectedFolder, addRecentFolder, clearFolder } = useFolderStore();
  const { videos, setVideos, filteredVideos } = useVideoStore();
  const { deselectAll } = useVideoSelectionStore();
  const { isProgressModalOpen } = useProgressStore();

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
        setVideos(data.videos);
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

  const handleFolderSelected = (folderInfo: FolderSelectorFolderInfo) => {
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
        source: (folderInfo.source || (folderInfo.is_virtual ? 'filesystem_api' : 'manual_input')) as 'filesystem_api' | 'manual_input',
      });
    }

    // If File System Access API provided videos directly, load them into the store
    if (folderInfo.videos && folderInfo.videos.length > 0) {
      setVideos(folderInfo.videos);
    }
  };

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

  const handleCropVideos = (selectedPaths: string[]) => {
    if (selectedPaths.length > 0) {
      router.push('/videos/crop');
    }
  };

  const handleRefresh = () => {
    if (selectedFolder && !selectedFolder.is_virtual) {
      loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
    } else {
      toast.info('Cannot refresh virtual folder');
    }
    toast.success('Folder contents refreshed');
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
          /* Folder Selection */
          <div className="space-y-8">
            <div className="text-center py-8">
              <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Select Video Folder</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Choose a folder containing videos you want to convert. 
                Supports drag & drop and modern file system access.
              </p>
            </div>
            
            <FolderSelector
              onFolderSelected={handleFolderSelected}
            />
          </div>
        ) : (
          /* Selected Folder Display */
          <div className="space-y-6">
            {/* Compact Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-gray-900 truncate">
                    {selectedFolder.folder_name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span 
                      className="truncate max-w-[300px] sm:max-w-[500px]" 
                      title={selectedFolder.folder_path}
                    >
                      {selectedFolder.folder_path}
                    </span>
                    <Badge variant="secondary" className="h-5 px-1.5 font-normal text-[10px]">
                      {videos.length} videos
                    </Badge>
                    {selectedFolder.is_virtual && (
                      <Badge variant="outline" className="h-5 px-1.5 font-normal text-[10px]">
                        FS API
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100"
                  onClick={handleRefresh}
                  disabled={isLoadingFolder}
                  title="Refresh folder"
                >
                  <RefreshCw className={`h-4 w-4 text-gray-600 ${isLoadingFolder ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Selection Toolbar */}
            <VideoSelectionToolbar
              onConvert={handleConvertVideos}
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
        <ConsoleViewer taskId={currentTaskId} />
      </div>
    </div>
  );
}
