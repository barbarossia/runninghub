'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid3x3,
  List,
  Maximize2,
  Search,
  Filter,
  Check,
  FileVideo,
  RefreshCw,
  PlayCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Scissors,
  Zap,
} from 'lucide-react';
import { useVideoStore } from '@/store';
import { useVideoSelection } from '@/hooks/useVideoSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { VideoFile } from '@/types';
import { VideoPlayerModal } from './VideoPlayerModal';

interface VideoGalleryProps {
  videos?: VideoFile[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onRename?: (video: VideoFile, newName: string) => Promise<void>;
  onDelete?: (video: VideoFile) => Promise<void>;
  onCrop?: (video: VideoFile) => void;
  onConvertFps?: (video: VideoFile) => void;
  className?: string;
}

export function VideoGallery({
  videos: propVideos,
  isLoading = false,
  onRefresh,
  onRename,
  onDelete,
  onCrop,
  onConvertFps,
  className = '',
}: VideoGalleryProps) {
  const store = useVideoStore();
  const videos = propVideos || store.filteredVideos;
  const viewMode = store.viewMode;
  const searchQuery = store.searchQuery;
  const selectedExtension = store.selectedExtension;

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [playingVideo, setPlayingVideo] = useState<VideoFile | null>(null);

  // Selection hook
  const {
    selectedCount,
    isAllSelected,
    hasSelection,
    toggleVideo,
    selectAll,
    deselectAll,
    isVideoSelected,
  } = useVideoSelection({
    videos,
  });

  // Get unique extensions for filter
  const uniqueExtensions = useMemo(() => {
    const extensions = new Set<string>();
    videos.forEach((vid) => {
      if (vid.extension) {
        extensions.add(vid.extension);
      }
    });
    return Array.from(extensions).sort();
  }, [videos]);

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (mode: 'grid' | 'list' | 'large') => {
      store.setViewMode(mode);
    },
    [store]
  );

  // Handle search
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      // Debounce search
      const timer = setTimeout(() => {
        store.setSearchQuery(value);
      }, 300);
      return () => clearTimeout(timer);
    },
    [store]
  );

  // Handle extension filter
  const handleExtensionFilter = useCallback(
    (extension: string | null) => {
      store.setSelectedExtension(extension);
    },
    [store]
  );

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [isAllSelected, deselectAll, selectAll]);

  // Handle play video
  const handlePlayVideo = useCallback((video: VideoFile) => {
    setPlayingVideo(video);
  }, []);

  // Get grid columns based on view mode (matching MediaGallery)
  const getGridCols = () => {
    switch (viewMode) {
      case 'large':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 'list':
        return 'grid-cols-1';
      case 'grid':
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Search and filters skeleton */}
        <div className="flex gap-4 items-center">
          <div className="h-10 flex-1 bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
        </div>
        {/* Grid skeleton */}
        <div className={cn('grid gap-3', getGridCols())}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-lg">
        <FileVideo className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg mb-2">No videos found</p>
        <p className="text-muted-foreground text-sm">
          Videos will appear here when you select a folder containing supported video files
        </p>
        {onRefresh && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={onRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex border rounded-md" role="group" aria-label="View mode">
            {(
              [
                { mode: 'grid', icon: Grid3x3, label: 'Grid' },
                { mode: 'list', icon: List, label: 'List' },
                { mode: 'large', icon: Maximize2, label: 'Large' },
              ] as const
            ).map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange(mode)}
                className="rounded-none"
                aria-label={label}
                aria-pressed={viewMode === mode}
              >
                <Icon className="w-4 h-4" />
              </Button>
            ))}
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Extension filter */}
        <div className="flex gap-1 flex-wrap" role="group" aria-label="Filter by file extension">
          <Button
            variant={selectedExtension === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleExtensionFilter(null)}
          >
            All ({videos.length})
          </Button>
          {uniqueExtensions.slice(0, 5).map((ext) => (
            <Button
              key={ext}
              variant={selectedExtension === ext ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleExtensionFilter(ext)}
            >
              {ext.replace('.', '').toUpperCase()}
              <Badge variant="secondary" className="ml-1">
                {videos.filter((v) => v.extension === ext).length}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Select all */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          className="whitespace-nowrap"
        >
          {isAllSelected ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Deselect All
            </>
          ) : (
            <>
              <Filter className="w-4 h-4 mr-2" />
              Select All ({videos.length})
            </>
          )}
        </Button>
      </div>

      {/* Video count */}
      {hasSelection && (
        <div className="text-sm text-muted-foreground">
          {selectedCount} of {videos.length} videos selected
        </div>
      )}

      {/* Video Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn('grid gap-3', getGridCols())}
        >
          {videos.map((video, index) => (
            <VideoCard
              key={video.path}
              video={video}
              index={index}
              isSelected={isVideoSelected(video.path)}
              viewMode={viewMode}
              onToggle={() => toggleVideo(video)}
              onPlay={() => handlePlayVideo(video)}
              onRename={onRename}
              onDelete={onDelete}
              onCrop={onCrop}
              onConvertFps={onConvertFps}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Video Player Modal */}
      <VideoPlayerModal
        video={playingVideo}
        isOpen={!!playingVideo}
        onClose={() => setPlayingVideo(null)}
      />
    </div>
  );
}

// Video Card Component
interface VideoCardProps {
  video: VideoFile;
  index: number;
  isSelected: boolean;
  viewMode: 'grid' | 'list' | 'large';
  onToggle: () => void;
  onPlay: () => void;
  onRename?: (video: VideoFile, newName: string) => Promise<void>;
  onDelete?: (video: VideoFile) => Promise<void>;
  onCrop?: (video: VideoFile) => void;
  onConvertFps?: (video: VideoFile) => void;
}

function VideoCard({ video, index, isSelected, viewMode, onToggle, onPlay, onRename, onDelete, onCrop, onConvertFps }: VideoCardProps) {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newName, setNewName] = useState(video.name);

  const videoSrc = useMemo(() => {
    if (video.blob_url) {
      return video.blob_url;
    }
    return `/api/videos/serve?path=${encodeURIComponent(video.path)}`;
  }, [video]);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay();
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenameDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleRenameConfirm = async () => {
    if (onRename && newName.trim() && newName !== video.name) {
      await onRename(video, newName.trim());
      setIsRenameDialogOpen(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      await onDelete(video);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      className="relative group"
    >
      <Card
        className={cn(
          'overflow-hidden cursor-pointer transition-all',
          isSelected
            ? 'ring-4 ring-blue-500 ring-offset-2 bg-blue-50 shadow-lg scale-[1.02] z-10'
            : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
        )}
        onClick={onToggle}
      >
        {/* Video thumbnail */}
        <div className="relative bg-gray-100 aspect-square">
          <video
            src={videoSrc}
            className="absolute inset-0 w-full h-full object-contain p-1"
            preload="metadata"
            muted
            playsInline
            onMouseOver={(e) => {
              const vid = e.currentTarget;
              vid.play().catch(() => {});
            }}
            onMouseOut={(e) => {
              const vid = e.currentTarget;
              vid.pause();
              vid.currentTime = 0;
            }}
          />

          {/* Overlay with controls */}
          <div
            className={cn(
              'absolute inset-0 transition-all pointer-events-none',
              isSelected ? 'bg-blue-500/10' : 'bg-black/0 group-hover:bg-black/5'
            )}
          >
            {/* Play Button */}
            <div className="absolute top-2 left-2 z-20 pointer-events-none">
              <div
                className="bg-black/50 rounded-full p-1.5 backdrop-blur-sm text-white shadow-md pointer-events-auto cursor-pointer hover:bg-black/70 transition-all hover:scale-110"
                onClick={handlePlayClick}
              >
                <PlayCircle className="h-5 w-5" />
              </div>
            </div>

            {/* Checkbox */}
            <div
              className={cn(
                'absolute transition-opacity pointer-events-auto top-10 left-2',
                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggle}
              />
            </div>

            {/* Format badge */}
            <Badge className="absolute bottom-2 right-2 pointer-events-none" variant="secondary">
              {video.extension.replace('.', '').toUpperCase()}
            </Badge>

            {/* More menu */}
            {(onRename || onDelete || onCrop || onConvertFps) && (
              <div
                className={cn(
                  'absolute top-2 right-2 transition-opacity pointer-events-auto',
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 shadow-sm"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handlePlayClick}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    {onCrop && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onCrop(video);
                        }}
                        className="text-green-600 focus:text-green-700 focus:bg-green-50"
                      >
                        <Scissors className="h-4 w-4 mr-2" />
                        Crop
                      </DropdownMenuItem>
                    )}
                    {onConvertFps && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onConvertFps(video);
                        }}
                        className="text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Convert
                      </DropdownMenuItem>
                    )}
                    {onRename && (
                      <DropdownMenuItem onClick={handleRenameClick}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* Info section */}
        <div
          className={cn(
            'p-2 border-t transition-colors',
            isSelected ? 'bg-blue-100 border-blue-200' : 'bg-white border-gray-100'
          )}
        >
          <p className={cn('text-xs font-bold line-clamp-1 h-4', isSelected ? 'text-blue-800' : 'text-gray-900')} title={video.name}>
            {video.name}
          </p>
          <p className="text-xs text-gray-500 line-clamp-1 h-4">
            {(video.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>
      </Card>

      {/* Rename Dialog */}
      {onRename && (
        <AlertDialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rename Video</AlertDialogTitle>
              <AlertDialogDescription>
                Enter a new name for the video. The file extension will be preserved automatically.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={video.name}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameConfirm();
                  } else if (e.key === 'Escape') {
                    setIsRenameDialogOpen(false);
                    setNewName(video.name);
                  }
                }}
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setIsRenameDialogOpen(false);
                setNewName(video.name);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleRenameConfirm}>
                Rename
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete Confirmation Dialog */}
      {onDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Video?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{video.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  );
}
