'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Video, RefreshCw, Pencil, Crop, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoSelectionStore, useVideoStore } from '@/store';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/constants';
import { RenameVideoDialog } from './RenameVideoDialog';
import { VideoFile } from '@/types';
import { BaseSelectionToolbar } from '@/components/selection/BaseSelectionToolbar';

interface VideoSelectionToolbarProps {
  onConvert?: (selectedPaths: string[]) => void;
  onCrop?: (selectedPaths: string[]) => void;
  onRefresh?: () => void;
  disabled?: boolean;
  className?: string;
}

export function VideoSelectionToolbar({
  onConvert,
  onCrop,
  onRefresh,
  disabled = false,
  className = '',
}: VideoSelectionToolbarProps) {
  const store = useVideoSelectionStore();
  const videoStore = useVideoStore();
  const selectedCount = store.selectedVideos.size;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  // Get selected paths
  const selectedPaths = useMemo(() => {
    return Array.from(store.selectedVideos.keys());
  }, [store.selectedVideos]);

  // Get the single selected video for rename
  const selectedVideo = useMemo(() => {
    if (selectedCount !== 1) return null;
    return store.selectedVideos.values().next().value || null;
  }, [selectedCount, store.selectedVideos]);

  // Handle convert
  const handleConvert = useCallback(async () => {
    if (!onConvert) return;

    setIsProcessing(true);
    try {
      await onConvert(selectedPaths);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to convert videos');
    } finally {
      setIsProcessing(false);
    }
  }, [onConvert, selectedPaths]);

  // Handle crop
  const handleCrop = useCallback(async () => {
    if (!onCrop) return;

    setIsProcessing(true);
    try {
      await onCrop(selectedPaths);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to crop videos');
    } finally {
      setIsProcessing(false);
    }
  }, [onCrop, selectedPaths]);

  // Handle rename
  const handleRename = async (video: VideoFile, newName: string) => {
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
        videoStore.updateVideo(video.path, {
          path: data.new_path,
          name: data.new_name,
        });

        // Update selection: deselect old, (optionally) select new
        store.deselectVideo(video.path);

        // Refresh folder to ensure sync
        onRefresh?.();
      } else {
        throw new Error(data.error || 'Failed to rename video');
      }
    } catch (error) {
      console.error('Error renaming video:', error);
      throw error;
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    store.deselectAll();
  }, [store]);

  const toolbarDisabled = disabled || isProcessing;

  return (
    <>
      <BaseSelectionToolbar
        selectedCount={selectedCount}
        className={className}
        onDeselectAll={handleDeselectAll}
      >
        {(mode) => {
          if (mode === 'expanded') {
            return (
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                Select videos to convert or crop
              </span>
            );
          }

          if (mode === 'expanded-actions') {
            return (
              <>
                {/* Rename Button (Only for single selection) */}
                {selectedCount === 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRenameDialogOpen(true)}
                    disabled={toolbarDisabled}
                    className="h-9 px-3 border-blue-100 bg-blue-50/50 hover:bg-blue-100 text-blue-700"
                    title="Rename video"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </Button>
                )}

                {onConvert && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleConvert}
                    disabled={toolbarDisabled}
                    className="h-9 px-6 bg-blue-600 hover:bg-blue-700 shadow-md"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
                    {isProcessing ? 'Converting...' : 'Convert to MP4'}
                  </Button>
                )}

                {onCrop && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCrop}
                    disabled={toolbarDisabled}
                    className="h-9 px-6 bg-green-600 hover:bg-green-700 shadow-md"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crop className="h-4 w-4 mr-2" />}
                    {isProcessing ? 'Cropping...' : 'Crop Videos'}
                  </Button>
                )}

                {onRefresh && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-gray-200 hover:bg-gray-100"
                    onClick={handleRefresh}
                    disabled={disabled}
                    title="Refresh folder"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-600" />
                  </Button>
                )}
              </>
            );
          }

          if (mode === 'floating') {
            return (
              <>
                {/* Rename Button (Compact) */}
                {selectedCount === 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsRenameDialogOpen(true)}
                    disabled={toolbarDisabled}
                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}

                {onConvert && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleConvert}
                    disabled={toolbarDisabled}
                    className="h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 shadow-lg shadow-blue-900/20"
                  >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                    <span className="text-xs font-bold">{isProcessing ? '...' : 'Convert'}</span>
                  </Button>
                )}

                {onCrop && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCrop}
                    disabled={toolbarDisabled}
                    className="h-8 bg-green-600 hover:bg-green-500 text-white rounded-full px-4 shadow-lg shadow-green-900/20"
                  >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crop className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                    <span className="text-xs font-bold">{isProcessing ? '...' : 'Crop'}</span>
                  </Button>
                )}
              </>
            );
          }

          return null;
        }}
      </BaseSelectionToolbar>

      {/* Rename Dialog */}
      <RenameVideoDialog
        video={selectedVideo}
        isOpen={isRenameDialogOpen}
        onClose={() => setIsRenameDialogOpen(false)}
        onRename={handleRename}
      />
    </>
  );
}
