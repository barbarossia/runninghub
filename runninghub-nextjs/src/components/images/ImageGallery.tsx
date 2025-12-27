'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid3x3,
  List,
  Maximize2,
  Search,
  FileImage,
  Heart,
} from 'lucide-react';
import { useImageStore } from '@/store';
import { useImageSelection } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { API_ENDPOINTS } from '@/constants';
import type { ImageFile, ViewMode } from '@/types';

interface ImageGalleryProps {
  images?: ImageFile[];
  onImageClick?: (image: ImageFile) => void;
  onImageDoubleClick?: (image: ImageFile) => void;
  className?: string;
}

export function ImageGallery({
  images: propImages,
  onImageClick,
  onImageDoubleClick,
  className = '',
}: ImageGalleryProps) {
  const store = useImageStore();
  const images = propImages || store.filteredImages;
  const viewMode = store.viewMode;
  const searchQuery = store.searchQuery;
  const selectedExtension = store.selectedExtension;
  const likedImages = store.likedImages;
  const toggleLike = store.toggleLike;

  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Selection hook
  const {
    selectedCount,
    isAllSelected,
    hasSelection,
    toggleImage,
    selectAll,
    deselectAll,
    isImageSelected,
  } = useImageSelection({
    images,
  });

  // Get unique extensions for filter
  const uniqueExtensions = useMemo(() => {
    const extensions = new Set<string>();
    images.forEach((img) => {
      if (img.extension) {
        extensions.add(img.extension);
      }
    });
    return Array.from(extensions).sort();
  }, [images]);

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
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

  // Handle select all toggle
  const handleSelectAllToggle = useCallback(() => {
    if (isAllSelected || selectedCount === images.length) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [isAllSelected, selectedCount, images.length, selectAll, deselectAll]);

  // Handle image click
  const handleImageClick = useCallback(
    (image: ImageFile, event: React.MouseEvent) => {
      toggleImage(image, event);
      onImageClick?.(image);
    },
    [toggleImage, onImageClick]
  );

  // Handle image double click
  const handleImageDoubleClick = useCallback(
    (image: ImageFile) => {
      onImageDoubleClick?.(image);
    },
    [onImageDoubleClick]
  );

  // Get grid columns based on view mode
  const gridCols = useMemo(() => {
    switch (viewMode) {
      case 'grid':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
      case 'large':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 'list':
        return 'grid-cols-1';
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
    }
  }, [viewMode]);

  // Render view mode button
  const renderViewModeButton = useCallback(
    (mode: ViewMode, icon: React.ReactNode) => {
      const isActive = viewMode === mode;
      const labels: Record<ViewMode, string> = {
        grid: 'Grid view',
        list: 'List view',
        large: 'Large grid view',
      };
      return (
        <Button
          variant={isActive ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewModeChange(mode)}
          className="min-w-[40px]"
          aria-label={labels[mode]}
          aria-pressed={isActive}
        >
          {icon}
        </Button>
      );
    },
    [viewMode, handleViewModeChange]
  );

  if (images.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <FileImage className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-lg text-gray-600 mb-2">No images found</p>
        <p className="text-sm text-gray-500">
          {searchQuery || selectedExtension
            ? 'Try adjusting your filters'
            : 'Select a folder to view images'}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Left: Search and filter */}
        <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search images..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              aria-label="Search images by name"
              id="image-search"
            />
          </div>

          {/* Extension filter */}
          <div className="flex gap-1 flex-wrap" role="group" aria-label="Filter by file extension">
            <Button
              variant={selectedExtension === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleExtensionFilter(null)}
              aria-label="Show all images"
              aria-pressed={selectedExtension === null}
            >
              All
            </Button>
            {uniqueExtensions.slice(0, 5).map((ext) => (
              <Button
                key={ext}
                variant={selectedExtension === ext ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleExtensionFilter(ext)}
                aria-label={`Filter by ${ext.replace('.', '').toUpperCase()} files`}
                aria-pressed={selectedExtension === ext}
              >
                {ext.replace('.', '').toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Right: View mode and select all */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Select all checkbox */}
          <div className="flex items-center gap-2 mr-2">
            <Checkbox
              id="select-all"
              checked={isAllSelected || selectedCount === images.length}
              onCheckedChange={handleSelectAllToggle}
            />
            <label
              htmlFor="select-all"
              className="text-sm text-gray-700 cursor-pointer whitespace-nowrap"
            >
              {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
            </label>
          </div>

          {/* View mode buttons */}
          <div className="flex gap-1" role="group" aria-label="View mode">
            {renderViewModeButton('grid', <Grid3x3 className="h-4 w-4" />)}
            {renderViewModeButton('list', <List className="h-4 w-4" />)}
            {renderViewModeButton('large', <Maximize2 className="h-4 w-4" />)}
          </div>
        </div>
      </div>

      {/* Image grid/list */}
      <motion.div
        layout
        role="grid"
        aria-label={`Image gallery - ${images.length} images`}
        className={`grid gap-3 ${gridCols}`}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence mode="popLayout">
          {images.map((image, index) => {
            const isSelected = isImageSelected(image.path);
            const isLiked = likedImages.has(image.path);

            if (viewMode === 'list') {
              // List view
              return (
                <motion.div
                  key={image.path}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15, delay: index * 0.02 }}
                  role="gridcell"
                >
                  <Card
                    className={`p-3 cursor-pointer transition-all border-2 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 shadow-md scale-[1.01]'
                        : 'hover:bg-gray-50 border-transparent'
                    }`}
                    onClick={(e) => handleImageClick(image, e)}
                    onDoubleClick={() => handleImageDoubleClick(image)}
                    aria-label={`${image.name} - ${isSelected ? 'Selected' : 'Not selected'}`}
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleImage(image)}
                        />
                      </div>

                      {/* Thumbnail */}
                      <div className={cn(
                        "relative w-12 h-12 rounded overflow-hidden flex-shrink-0 transition-all",
                        isSelected ? "ring-2 ring-blue-400 ring-offset-1" : "bg-gray-200"
                      )}>
                        <Image
                          src={image.blob_url || `${API_ENDPOINTS.IMAGES_SERVE}?path=${encodeURIComponent(image.path)}`}
                          alt={image.name}
                          fill
                          className="object-contain"
                          sizes="48px"
                          loading="lazy"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-bold truncate",
                          isSelected ? "text-blue-700" : "text-gray-900"
                        )}>
                          {image.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {image.path}
                        </p>
                      </div>

                      {/* Like Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 transition-colors",
                          isLiked ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-red-400"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(image.path);
                        }}
                      >
                        <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                      </Button>

                      {/* Badge */}
                      <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                        {(image.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                  </Card>
                </motion.div>
              );
            }

            // Grid and large view
            return (
              <motion.div
                key={image.path}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                className="relative group"
                role="gridcell"
              >
                <Card
                  className={`overflow-hidden cursor-pointer transition-all ${
                    isSelected
                      ? 'ring-4 ring-blue-500 ring-offset-2 bg-blue-50 shadow-lg scale-[1.02] z-10'
                      : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
                  }`}
                  onClick={(e) => handleImageClick(image, e)}
                  onDoubleClick={() => handleImageDoubleClick(image)}
                  aria-label={`${image.name} - ${isSelected ? 'Selected' : 'Not selected'}`}
                  tabIndex={0}
                >
                  {/* Image */}
                  <div
                    className={`relative bg-gray-200 ${
                      viewMode === 'large' ? 'aspect-square' : 'aspect-square'
                    }`}
                  >
                    <Image
                      src={image.blob_url || `${API_ENDPOINTS.IMAGES_SERVE}?path=${encodeURIComponent(image.path)}`}
                      alt={image.name}
                      fill
                      className={cn(
                        "object-contain p-1 transition-transform",
                        isSelected ? "scale-95" : "group-hover:scale-105"
                      )}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      loading="lazy"
                    />

                    {/* Overlay with checkbox and like button */}
                    <div
                      className={cn(
                        "absolute inset-0 transition-all",
                        isSelected ? 'bg-blue-500/10' : 'bg-black/0 group-hover:bg-black/5'
                      )}
                    >
                      {/* Checkbox on hover/selected */}
                      <div 
                        className={cn(
                          "absolute top-2 left-2 transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleImage(image)}
                        />
                      </div>

                      {/* Like button on hover/liked */}
                      <div
                        className={cn(
                          "absolute top-2 right-2 transition-opacity",
                          isLiked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors",
                            isLiked ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-red-400"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(image.path);
                          }}
                        >
                          <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Info overlay */}
                  <div className={cn(
                    "p-2 border-t transition-colors",
                    isSelected ? "bg-blue-100 border-blue-200" : "bg-white border-gray-100"
                  )}>
                    <p className={cn(
                      "text-xs font-bold truncate",
                      isSelected ? "text-blue-800" : "text-gray-900"
                    )} title={image.name}>
                      {image.name}
                    </p>
                    {viewMode === 'large' && (
                      <p className="text-xs text-gray-500">
                        {(image.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Selection info bar */}
      {hasSelection && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        >
          <Card className="px-4 py-2 shadow-lg">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedCount} image{selectedCount !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={deselectAll}
                className="h-7 text-xs"
              >
                Clear selection
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
