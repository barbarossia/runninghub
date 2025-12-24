'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Video, RefreshCw, Pencil, Scissors, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoSelectionStore, useVideoStore } from '@/store';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/constants';
import { RenameVideoDialog } from './RenameVideoDialog';
import { VideoFile } from '@/types';
import { BaseSelectionToolbar } from '@/components/selection/BaseSelectionToolbar';

interface VideoClipSelectionToolbarProps {
  onClip?: (selectedPaths: string[]) => void;
  onRefresh?: () => void;
  disabled?: boolean;
  className?: string;
}

export function VideoClipSelectionToolbar({
  onClip,
  onRefresh,
  disabled = false,
  className = '',
}: VideoClipSelectionToolbarProps) {
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

  // Handle clip
  const handleClip = useCallback(async () => {
    if (!onClip) return;

    setIsProcessing(true);
    try {
      await onClip(selectedPaths);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clip videos');
    } finally {
      setIsProcessing(false);
    }
  }, [onClip, selectedPaths]);

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
        videoStore.updateVideo(video.path, {
          path: data.new_path,
          name: data.new_name,
        });
        store.deselectVideo(video.path);
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
                Select videos to extract images
              </span>
            );
          }

          if (mode === 'expanded-actions') {
            return (
              <>
                {selectedCount === 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRenameDialogOpen(true)}
                    disabled={toolbarDisabled}
                    className="h-9 px-3 border-purple-100 bg-purple-50/50 hover:bg-purple-100 text-purple-700"
                    title="Rename video"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </Button>
                )}

                {onClip && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleClip}
                    disabled={toolbarDisabled || selectedCount === 0}
                    className="h-9 px-6 bg-purple-600 hover:bg-purple-700 shadow-md"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Scissors className="h-4 w-4 mr-2" />}
                    {isProcessing ? 'Processing...' : 'Clip Images'}
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

                {onClip && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleClip}
                    disabled={toolbarDisabled || selectedCount === 0}
                    className="h-8 bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 shadow-lg shadow-purple-900/20"
                  >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                    <span className="text-xs font-bold">{isProcessing ? '...' : 'Clip'}</span>
                  </Button>
                )}
              </>
            );
          }

          return null;
        }}
      </BaseSelectionToolbar>

      <RenameVideoDialog
        video={selectedVideo}
        isOpen={isRenameDialogOpen}
        onClose={() => setIsRenameDialogOpen(false)}
        onRename={handleRename}
      />
    </>
  );
}
