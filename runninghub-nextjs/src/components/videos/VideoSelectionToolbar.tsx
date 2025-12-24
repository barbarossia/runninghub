'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  RefreshCw,
  X,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  Crop,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVideoSelectionStore, useVideoStore } from '@/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { API_ENDPOINTS } from '@/constants';
import { RenameVideoDialog } from './RenameVideoDialog';
import { VideoFile } from '@/types';

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
  const hasSelection = selectedCount > 0;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
    if (!hasSelection || !onConvert) return;

    setIsProcessing(true);
    try {
      await onConvert(selectedPaths);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to convert videos');
    } finally {
      setIsProcessing(false);
    }
  }, [hasSelection, onConvert, selectedPaths]);

  // Handle crop
  const handleCrop = useCallback(async () => {
    if (!hasSelection || !onCrop) return;
    onCrop(selectedPaths);
  }, [hasSelection, onCrop, selectedPaths]);

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

  const toolbarDisabled = disabled || !hasSelection || isProcessing;

  return (
    <AnimatePresence>
      {hasSelection && (
        <>
          {isExpanded ? (
            /* Expanded Mode (Sticky at top) */
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={cn(
                "sticky top-4 z-50 bg-white/95 backdrop-blur-md border border-purple-100 rounded-xl shadow-lg p-3 mb-6 flex flex-col gap-3",
                className
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="text-sm px-3 py-1 bg-purple-600">
                    {selectedCount} selected
                  </Badge>
                  <span className="text-sm text-muted-foreground hidden sm:inline-block">
                    Select videos to convert
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Rename Button (Only for single selection) */}
                  {selectedCount === 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRenameDialogOpen(true)}
                      disabled={toolbarDisabled}
                      className="h-9 px-3 border-purple-200 hover:bg-purple-50 text-purple-700"
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
                      className="h-9 px-6 bg-purple-600 hover:bg-purple-700 shadow-md"
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
                    <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 hover:bg-gray-100" onClick={handleRefresh} disabled={disabled} title="Refresh folder">
                      <RefreshCw className="h-4 w-4 text-gray-600" />
                    </Button>
                  )}
                  
                  <div className="w-px h-6 bg-gray-200 mx-1" />

                  <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 hover:bg-gray-100" onClick={() => setIsExpanded(false)} title="Minimize to floating bar">
                    <Minimize2 className="h-4 w-4 text-gray-600" />
                  </Button>

                  <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-gray-900" onClick={handleDeselectAll} title="Clear selection">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Floating Mode (Compact bar at bottom) */
            <motion.div
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 50, x: '-50%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={cn("fixed bottom-8 left-1/2 z-50 flex items-center gap-2 p-1.5 px-3 bg-gray-900/95 border border-gray-700 rounded-full shadow-2xl backdrop-blur-md", className)}
            >
              <div className="flex items-center border-r border-gray-700 pr-3 mr-1">
                <span className="text-xs font-bold text-white whitespace-nowrap">
                  {selectedCount} <span className="text-gray-400 font-normal">selected</span>
                </span>
              </div>

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
                <Button variant="default" size="sm" onClick={handleConvert} disabled={toolbarDisabled} className="h-8 bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 shadow-lg shadow-purple-900/20">
                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                  <span className="text-xs font-bold">{isProcessing ? '...' : 'Convert'}</span>
                </Button>
              )}

              {onCrop && (
                <Button variant="default" size="sm" onClick={handleCrop} disabled={toolbarDisabled} className="h-8 bg-green-600 hover:bg-green-500 text-white rounded-full px-4 shadow-lg shadow-green-900/20">
                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crop className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                  <span className="text-xs font-bold">{isProcessing ? '...' : 'Crop'}</span>
                </Button>
              )}

              <div className="w-px h-4 bg-gray-700 mx-1" />

              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(true)} className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full" title="Expand to card">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>

              <Button variant="ghost" size="icon" onClick={handleDeselectAll} className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full" title="Clear selection">
                <X className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}

          {/* Rename Dialog */}
          <RenameVideoDialog
            video={selectedVideo}
            isOpen={isRenameDialogOpen}
            onClose={() => setIsRenameDialogOpen(false)}
            onRename={handleRename}
          />
        </>
      )}
    </AnimatePresence>
  );
}
