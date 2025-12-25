/**
 * Media Gallery Component
 * Displays both images and videos in a grid with multi-select functionality
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Grid3x3,
  List,
  Search,
  FileImage,
  FileVideo,
  Check,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { API_ENDPOINTS } from '@/constants';
import type { MediaFile } from '@/types/workspace';

export interface MediaGalleryProps {
  onFileClick?: (file: MediaFile) => void;
  onFileDoubleClick?: (file: MediaFile) => void;
  className?: string;
}

export function MediaGallery({
  onFileClick,
  onFileDoubleClick,
  className = '',
}: MediaGalleryProps) {
  const {
    mediaFiles,
    viewMode,
    jobFiles,
    toggleMediaFileSelection,
    selectAllMediaFiles,
    deselectAllMediaFiles,
    getSelectedMediaFiles,
  } = useWorkspaceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');

  // Filter files based on search and type
  const filteredFiles = useMemo(() => {
    return mediaFiles.filter((file) => {
      // Type filter
      if (typeFilter === 'image' && file.type !== 'image') return false;
      if (typeFilter === 'video' && file.type !== 'video') return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          file.name.toLowerCase().includes(query) ||
          file.path.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [mediaFiles, searchQuery, typeFilter]);

  // Get selected files count
  const selectedCount = useMemo(() => {
    return mediaFiles.filter((f) => f.selected).length;
  }, [mediaFiles]);

  const isAllSelected = selectedCount > 0 && selectedCount === filteredFiles.length;

  // Handle view mode toggle
  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    useWorkspaceStore.getState().setViewMode(mode);
  }, []);

  // Handle select all toggle
  const handleSelectAllToggle = useCallback(() => {
    if (isAllSelected || selectedCount === filteredFiles.length) {
      deselectAllMediaFiles();
    } else {
      selectAllMediaFiles();
    }
  }, [isAllSelected, selectedCount, filteredFiles.length, selectAllMediaFiles, deselectAllMediaFiles]);

  // Handle file click
  const handleFileClick = useCallback(
    (file: MediaFile, event: React.MouseEvent) => {
      toggleMediaFileSelection(file.id);
      onFileClick?.(file);
    },
    [toggleMediaFileSelection, onFileClick]
  );

  // Handle file double click
  const handleFileDoubleClick = useCallback(
    (file: MediaFile) => {
      onFileDoubleClick?.(file);
    },
    [onFileDoubleClick]
  );

  // Get grid columns based on view mode
  const gridCols = useMemo(() => {
    return viewMode === 'grid'
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
      : 'grid-cols-1';
  }, [viewMode]);

  // Empty state
  if (filteredFiles.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        {typeFilter !== 'all' || searchQuery ? (
          <>
            <Search className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 mb-2">No files found</p>
            <p className="text-sm text-gray-500">Try adjusting your filters</p>
          </>
        ) : (
          <>
            <FileImage className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 mb-2">No media files</p>
            <p className="text-sm text-gray-500">Select a folder to view media files</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Left: Search and filter */}
        <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search media files by name"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-1" role="group" aria-label="Filter by file type">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('all')}
              aria-label="Show all files"
              aria-pressed={typeFilter === 'all'}
            >
              All
            </Button>
            <Button
              variant={typeFilter === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('image')}
              aria-label="Show images only"
              aria-pressed={typeFilter === 'image'}
            >
              Images
            </Button>
            <Button
              variant={typeFilter === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('video')}
              aria-label="Show videos only"
              aria-pressed={typeFilter === 'video'}
            >
              Videos
            </Button>
          </div>
        </div>

        {/* Right: View mode and select all */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Select all checkbox */}
          <div className="flex items-center gap-2 mr-2">
            <Checkbox
              id="select-all-media"
              checked={isAllSelected || selectedCount === filteredFiles.length}
              onCheckedChange={handleSelectAllToggle}
            />
            <label
              htmlFor="select-all-media"
              className="text-sm text-gray-700 cursor-pointer whitespace-nowrap"
            >
              {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
            </label>
          </div>

          {/* View mode buttons */}
          <div className="flex gap-1" role="group" aria-label="View mode">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewModeChange('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewModeChange('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* File count */}
      <div className="text-sm text-gray-600">
        {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
        {typeFilter !== 'all' && ` (${typeFilter})`}
        {searchQuery && ' matching "' + searchQuery + '"'}
      </div>

      {/* File grid/list */}
      <motion.div
        layout
        role="grid"
        aria-label={`Media gallery - ${filteredFiles.length} files`}
        className={cn('grid gap-3', gridCols)}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence mode="popLayout">
          {filteredFiles.map((file, index) => {
            const isSelected = file.selected || false;

            if (viewMode === 'list') {
              // List view
              return (
                <motion.div
                  key={file.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15, delay: index * 0.02 }}
                  role="gridcell"
                >
                  <Card
                    className={cn(
                      'p-3 cursor-pointer transition-all border-2',
                      isSelected
                        ? 'bg-blue-50 border-blue-500 shadow-md scale-[1.01]'
                        : 'hover:bg-gray-50 border-transparent'
                    )}
                    onClick={(e) => handleFileClick(file, e)}
                    onDoubleClick={() => handleFileDoubleClick(file)}
                    aria-label={`${file.name} - ${isSelected ? 'Selected' : 'Not selected'}`}
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleMediaFileSelection(file.id)} />
                      </div>

                      {/* Thumbnail/Icon */}
                      <div
                        className={cn(
                          'relative w-12 h-12 rounded overflow-hidden flex-shrink-0 flex items-center justify-center transition-all',
                          isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : 'bg-gray-100'
                        )}
                      >
                        {file.type === 'video' && file.blobUrl ? (
                          <video
                            src={file.blobUrl}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                          />
                        ) : file.thumbnail || file.blobUrl ? (
                          <Image
                            src={file.thumbnail || file.blobUrl || ''}
                            alt={file.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                            loading="lazy"
                          />
                        ) : file.type === 'image' ? (
                          <FileImage className="h-6 w-6 text-gray-400" />
                        ) : (
                          <FileVideo className="h-6 w-6 text-gray-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm font-bold truncate',
                            isSelected ? 'text-blue-700' : 'text-gray-900'
                          )}
                        >
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{file.path}</p>
                      </div>

                      {/* Badge */}
                      <Badge variant={isSelected ? 'default' : 'secondary'} className="text-xs">
                        {file.type === 'image' ? (
                          <>IMG {file.extension?.replace('.', '').toUpperCase()}</>
                        ) : (
                          <>VID {file.extension?.replace('.', '').toUpperCase()}</>
                        )}
                      </Badge>
                    </div>
                  </Card>
                </motion.div>
              );
            }

            // Grid view
            return (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                className="relative group"
                role="gridcell"
              >
                <Card
                  className={cn(
                    'overflow-hidden cursor-pointer transition-all',
                    isSelected
                      ? 'ring-4 ring-blue-500 ring-offset-2 bg-blue-50 shadow-lg scale-[1.02] z-10'
                      : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
                  )}
                  onClick={(e) => handleFileClick(file, e)}
                  onDoubleClick={() => handleFileDoubleClick(file)}
                  aria-label={`${file.name} - ${isSelected ? 'Selected' : 'Not selected'}`}
                  tabIndex={0}
                >
                  {/* Thumbnail/Icon */}
                  <div className="relative bg-gray-100 aspect-square">
                    {file.type === 'video' && file.blobUrl ? (
                      // Video with blobUrl - show video element
                      <video
                        src={file.blobUrl}
                        className="w-full h-full object-cover p-1"
                        muted
                        preload="metadata"
                      />
                    ) : file.type === 'video' && file.thumbnail ? (
                      // Video with thumbnail image
                      <Image
                        src={file.thumbnail}
                        alt={file.name}
                        fill
                        className={cn(
                          'object-cover p-1 transition-transform',
                          isSelected ? 'scale-95' : 'group-hover:scale-105'
                        )}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        loading="lazy"
                      />
                    ) : file.thumbnail || file.blobUrl ? (
                      // Image with thumbnail or blobUrl
                      <Image
                        src={file.thumbnail || file.blobUrl || ''}
                        alt={file.name}
                        fill
                        className={cn(
                          'object-cover p-1 transition-transform',
                          isSelected ? 'scale-95' : 'group-hover:scale-105'
                        )}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        loading="lazy"
                      />
                    ) : (
                      // No preview available - show icon
                      <div className="w-full h-full flex items-center justify-center">
                        {file.type === 'image' ? (
                          <FileImage className="h-12 w-12 text-gray-400" />
                        ) : (
                          <FileVideo className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                    )}

                    {/* Overlay with checkbox */}
                    <div
                      className={cn(
                        'absolute inset-0 transition-all',
                        isSelected ? 'bg-blue-500/10' : 'bg-black/0 group-hover:bg-black/5'
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          'absolute top-2 left-2 transition-opacity',
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleMediaFileSelection(file.id)} />
                      </div>
                    </div>
                  </div>

                  {/* Info overlay */}
                  <div
                    className={cn(
                      'p-2 border-t transition-colors',
                      isSelected ? 'bg-blue-100 border-blue-200' : 'bg-white border-gray-100'
                    )}
                  >
                    <p
                      className={cn(
                        'text-xs font-bold truncate',
                        isSelected ? 'text-blue-800' : 'text-gray-900'
                      )}
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Selection info bar */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        >
          <Card className="px-4 py-2 shadow-lg">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected
              </span>
              <Button variant="ghost" size="sm" onClick={deselectAllMediaFiles} className="h-7 text-xs">
                Clear selection
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
