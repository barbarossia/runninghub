'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Video, RefreshCw, Pencil, Scissors, Loader2, Eye, Zap, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoSelectionStore, useVideoStore } from '@/store';
// For backward compatibility, we still import stores but use props when provided
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/constants';
import { RenameVideoDialog } from './RenameVideoDialog';
import { VideoFile } from '@/types';
import { BaseSelectionToolbar } from '@/components/selection/BaseSelectionToolbar';

interface VideoClipSelectionToolbarProps {
  selectedCount: number;
  onClip?: (selectedPaths: string[]) => void;
  onRefresh?: () => void;
  onRename?: (video: VideoFile, newName: string) => Promise<void>;
  onPreview?: (selectedPaths: string[]) => void;
  onDeselectAll?: () => void;
  onConvertFps?: (selectedPaths: string[]) => void;
  onDelete?: (selectedPaths: string[]) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  clipButtonText?: string;
  showCancelButton?: boolean;
}

export function VideoClipSelectionToolbar({
  selectedCount,
  onClip,
  onRefresh,
  onRename,
  onPreview,
  onDeselectAll,
  onConvertFps,
  onDelete,
  disabled = false,
  className = '',
  label = 'Select videos to extract images',
  clipButtonText = 'Clip',
  showCancelButton = true,
}: VideoClipSelectionToolbarProps) {
  // For backward compatibility with standalone clip page
  const store = useVideoSelectionStore();
  const videoStore = useVideoStore();

  // Default rename handler for backward compatibility
  const defaultRenameHandler = async (video: VideoFile, newName: string) => {
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

  // Use prop or fallback to default handler
  const handleRenameCallback = onRename || defaultRenameHandler;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  // Get selected paths (only used in standalone clip page)
  const selectedPaths = useMemo(() => {
    return Array.from(store.selectedVideos.keys());
  }, [store.selectedVideos]);

  // Get the single selected video for rename (from store)
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
      // Clear selection after action
      if (onDeselectAll) {
        onDeselectAll();
      } else {
        store.deselectAll();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clip videos');
    } finally {
      setIsProcessing(false);
    }
  }, [onClip, selectedPaths, onDeselectAll, store]);

  // Handle FPS convert
  const handleConvertFps = useCallback(async () => {
    if (!onConvertFps) return;

    setIsProcessing(true);
    try {
      await onConvertFps(selectedPaths);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to convert video FPS');
    } finally {
      setIsProcessing(false);
    }
  }, [onConvertFps, selectedPaths]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!onDelete) return;

    setIsProcessing(true);
    try {
      await onDelete(selectedPaths);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete videos');
    } finally {
      setIsProcessing(false);
    }
  }, [onDelete, selectedPaths]);

  // Handle preview
  const handlePreview = useCallback(() => {
    if (!onPreview) return;

    if (selectedPaths.length === 0) {
      toast.error('No videos selected');
      return;
    }

    // Preview the first selected video
    onPreview([selectedPaths[0]]);
  }, [onPreview, selectedPaths]);

  // Handle rename (now uses callback)
  const handleRename = async (video: VideoFile, newName: string) => {
    await handleRenameCallback(video, newName);
    setIsRenameDialogOpen(false);
  };

  // Handle refresh
  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  // Handle deselect all
  const handleDeselectAllCallback = useCallback(() => {
    if (onDeselectAll) {
      onDeselectAll();
    } else {
      // Fallback to store method
      store.deselectAll();
    }
  }, [onDeselectAll, store]);

  const toolbarDisabled = disabled || isProcessing;

  return (
    <>
      <BaseSelectionToolbar
        selectedCount={selectedCount}
        className={className}
        onDeselectAll={handleDeselectAllCallback}
        showCancelButton={showCancelButton}
      >
        {(mode) => {
          if (mode === 'expanded') {
            return (
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {label}
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

                {onPreview && selectedCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={toolbarDisabled}
                    className="h-9 px-3 border-green-100 bg-green-50/50 hover:bg-green-100 text-green-700"
                    title="Preview video"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                )}

                {onConvertFps && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConvertFps}
                    disabled={toolbarDisabled || selectedCount === 0}
                    className="h-9 px-3 border-blue-100 bg-blue-50/50 hover:bg-blue-100 text-blue-700"
                    title="Convert video FPS"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                    Convert
                  </Button>
                )}

                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={toolbarDisabled || selectedCount === 0}
                    className="h-9 px-3 border-red-100 bg-red-50/50 hover:bg-red-100 text-red-700"
                    title="Delete videos"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}

                {onClip && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleClip}
                    disabled={toolbarDisabled || selectedCount === 0}
                    className="h-9 px-6 bg-green-600 hover:bg-green-700 shadow-md"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Scissors className="h-4 w-4 mr-2" />}
                    {isProcessing ? 'Processing...' : clipButtonText}
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

                {onPreview && selectedCount > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePreview}
                    disabled={toolbarDisabled}
                    className="h-8 w-8 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-full"
                    title="Preview video"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}

                {onConvertFps && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleConvertFps}
                    disabled={toolbarDisabled || selectedCount === 0}
                    className="h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full px-3 shadow-lg shadow-blue-900/20"
                    title="Convert video FPS"
                  >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1 fill-current" />}
                    <span className="text-xs font-bold">Convert</span>
                  </Button>
                )}

                {onDelete && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleDelete}
                    disabled={toolbarDisabled || selectedCount === 0}
                    className="h-8 bg-red-600 hover:bg-red-500 text-white rounded-full px-3 shadow-lg shadow-red-900/20"
                    title="Delete videos"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1 fill-current" />
                    <span className="text-xs font-bold">Delete</span>
                  </Button>
                )}

                {onClip && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleClip}
                    disabled={toolbarDisabled || selectedCount === 0}
                    className="h-8 bg-green-600 hover:bg-green-500 text-white rounded-full px-3 shadow-lg shadow-green-900/20"
                  >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5 mr-1 fill-current" />}
                    <span className="text-xs font-bold">{isProcessing ? '...' : clipButtonText}</span>
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
