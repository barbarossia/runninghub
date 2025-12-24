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
} from 'lucide-react';
import { useVideoStore, useVideoSelectionStore } from '@/store';
import { useVideoSelection } from '@/hooks/useVideoSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SUPPORTED_VIDEO_EXTENSIONS, VIEW_MODES, API_ENDPOINTS } from '@/constants';
import type { VideoFile } from '@/types';
import { VideoPlayerModal } from './VideoPlayerModal';

interface VideoGalleryProps {
  videos?: VideoFile[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function VideoGallery({
  videos: propVideos,
  isLoading = false,
  onRefresh,
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
    selectedVideos,
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

  // Get grid columns based on view mode
  const getGridCols = () => {
    switch (viewMode) {
      case 'large':
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 'list':
        return 'grid-cols-1';
      case 'grid':
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
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
        <div className={cn('grid gap-4', getGridCols())}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-muted animate-pulse rounded-lg" />
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
          className={cn('grid gap-4', getGridCols())}
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
}

function VideoCard({ video, index, isSelected, viewMode, onToggle, onPlay }: VideoCardProps) {
  const isListMode = viewMode === 'list';
  
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative group"
    >
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-lg',
          isSelected && 'ring-2 ring-primary',
          isListMode && 'flex items-center gap-4 p-4'
        )}
        onClick={onToggle}
      >
        {/* Checkbox */}
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            className="pointer-events-none bg-background/50 backdrop-blur-sm"
            aria-label={`Select ${video.name}`}
          />
        </div>

        {/* Video thumbnail */}
        <div
          className={cn(
            'relative bg-muted flex items-center justify-center overflow-hidden',
            !isListMode && 'aspect-video rounded-t-lg',
            isListMode && 'w-32 h-20 flex-shrink-0 rounded-md'
          )}
        >
          <video
            src={videoSrc}
            className="w-full h-full object-cover"
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
          
          {/* Play Overlay */}
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handlePlayClick}
          >
            <div className="bg-black/50 rounded-full p-2 backdrop-blur-sm text-white transform transition-transform hover:scale-110">
              <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
          </div>

          {/* Format badge */}
          <Badge className="absolute bottom-2 right-2 pointer-events-none" variant="secondary">
            {video.extension.replace('.', '').toUpperCase()}
          </Badge>
        </div>

        {/* Video info */}
        <div className={cn('p-4', isListMode && 'flex-1 min-w-0')}>
          <p className="font-medium truncate text-sm" title={video.name}>
            {video.name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {(video.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/10 pointer-events-none rounded-lg" />
        )}
      </Card>
    </motion.div>
  );
}
