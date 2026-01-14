/**
 * Media Gallery Component
 * Displays both images and videos in a grid with multi-select functionality
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Grid3x3,
  List,
  Maximize2,
  Search,
  FileImage,
  FileVideo,
  Check,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Info,
  Copy,
  Loader2,
  AlertCircle,
  PlayCircle,
  Download,
} from 'lucide-react';
import { VideoPreview } from './VideoPreview';
import { useWorkspaceStore } from '@/store/workspace-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { API_ENDPOINTS } from '@/constants';
import { toast } from 'sonner';
import type { MediaFile } from '@/types/workspace';

// Common aspect ratios
const COMMON_ASPECT_RATIOS: [number, number, string][] = [
  [1, 1, '1:1'],
  [4, 3, '4:3'],
  [3, 4, '3:4'],
  [16, 9, '16:9'],
  [9, 16, '9:16'],
  [21, 9, '21:9'],
  [5, 4, '5:4'],
  [4, 5, '4:5'],
  [3, 2, '3:2'],
  [2, 3, '2:3'],
];

function getAspectRatio(width: number, height: number): string {
  if (!width || !height) return 'N/A';

  const ratio = width / height;

  // Find the closest common aspect ratio
  let closestRatio = COMMON_ASPECT_RATIOS[0];
  let minDiff = Math.abs(ratio - (COMMON_ASPECT_RATIOS[0][0] / COMMON_ASPECT_RATIOS[0][1]));

  for (const [w, h, label] of COMMON_ASPECT_RATIOS) {
    const diff = Math.abs(ratio - (w / h));
    if (diff < minDiff) {
      minDiff = diff;
      closestRatio = [w, h, label];
    }
  }

  // Always return the closest common ratio
  return closestRatio[2];
}

export type MediaGalleryMode = 'workspace' | 'dataset';

export interface MediaGalleryProps {
  mode?: MediaGalleryMode;
  onFileClick?: (file: MediaFile) => void;
  onFileDoubleClick?: (file: MediaFile) => void;
  onRename?: (file: MediaFile, newName: string) => Promise<void>;
  onDelete?: (files: MediaFile[]) => Promise<void>;
  onDecode?: (file: MediaFile, password?: string) => Promise<void>;
  onPreview?: (file: MediaFile) => void;
  onExport?: (files: MediaFile[]) => Promise<void>;
  onExportToDataset?: (file: MediaFile) => void;
  className?: string;
}

export function MediaGallery({
  mode = 'workspace',
  onFileClick,
  onFileDoubleClick,
  onRename,
  onDelete,
  onDecode,
  onPreview,
  onExport,
  onExportToDataset,
  className = '',
}: MediaGalleryProps) {
  const {
    mediaFiles,
    datasetMediaFiles,
    viewMode,
    selectedExtension,
    jobFiles,
    toggleMediaFileSelection,
    selectAllMediaFiles,
    deselectAllMediaFiles,
    toggleDatasetFileSelection,
    selectAllDatasetFiles,
    deselectAllDatasetFiles,
    getSelectedMediaFiles,
    getSelectedDatasetFiles,
    setViewMode,
    setSelectedExtension,
    updateMediaFile,
    updateDatasetFile,
  } = useWorkspaceStore();

  // Use the appropriate files based on mode
  const files = mode === 'dataset' ? datasetMediaFiles : mediaFiles;
  const toggleSelection = mode === 'dataset' ? toggleDatasetFileSelection : toggleMediaFileSelection;
  const selectAll = mode === 'dataset' ? selectAllDatasetFiles : selectAllMediaFiles;
  const deselectAll = mode === 'dataset' ? deselectAllDatasetFiles : deselectAllMediaFiles;
  const getSelected = mode === 'dataset' ? getSelectedDatasetFiles : getSelectedMediaFiles;
  const updateFile = mode === 'dataset' ? updateDatasetFile : updateMediaFile;

  const [searchQuery, setSearchQuery] = useState('');
  const [renameDialogFile, setRenameDialogFile] = useState<MediaFile | null>(null);
  const [deleteDialogFile, setDeleteDialogFile] = useState<MediaFile | null>(null);
  const [decodeDialogFile, setDecodeDialogFile] = useState<MediaFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [decodePassword, setDecodePassword] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [validatingFileIds, setValidatingFileIds] = useState<Set<string>>(new Set());

  // Get unique extensions for filter
  const uniqueExtensions = useMemo(() => {
    const extensions = new Set<string>();
    files.forEach((file) => {
      if (file.extension) {
        // Normalize to lowercase for deduplication
        extensions.add(file.extension.toLowerCase());
      }
    });
    return Array.from(extensions).sort();
  }, [files]);

  // Filter files based on search and extension
  const filteredFiles = useMemo(() => {
    const filtered = files.filter((file) => {
      // Extension filter (normalize for case-insensitive comparison)
      if (selectedExtension && file.extension.toLowerCase() !== selectedExtension.toLowerCase()) return false;

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

    // Deduplicate by ID to prevent key collision errors
    const uniqueMap = new Map();
    filtered.forEach(file => {
      if (!uniqueMap.has(file.id)) {
        uniqueMap.set(file.id, file);
      }
    });
    
    return Array.from(uniqueMap.values());
  }, [files, searchQuery, selectedExtension]);

  // Get selected files count
  const selectedCount = useMemo(() => {
    return files.filter((f) => f.selected).length;
  }, [files]);

  const isAllSelected = selectedCount > 0 && selectedCount === filteredFiles.length;

  // Lazy validation: Validate selected images that haven't been validated yet (workspace mode only)
  useEffect(() => {
    // Skip validation in dataset mode
    if (mode === 'dataset') return;

    const selectedImages = files.filter(
      f => f.selected && f.type === 'image' && f.isDuckEncoded === undefined && !validatingFileIds.has(f.id)
    );

    if (selectedImages.length === 0) return;

    console.log(`[MediaGallery] Lazy validating ${selectedImages.length} selected images...`);

    // Mark files as being validated to prevent re-validation
    setValidatingFileIds(prev => {
      const newSet = new Set(prev);
      selectedImages.forEach(f => newSet.add(f.id));
      return newSet;
    });

    const validateImage = async (file: MediaFile) => {
      try {
        // Mark as pending
        updateFile(file.id, { duckValidationPending: true });

        const response = await fetch(API_ENDPOINTS.WORKSPACE_DUCK_VALIDATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: file.path }),
        });

        const data = await response.json();

        console.log(`[MediaGallery] Validation result for ${file.name}:`, data);

        // Update the file with validation result
        updateFile(file.id, {
          isDuckEncoded: data.isDuckEncoded,
          duckRequiresPassword: data.requiresPassword,
          duckValidationPending: false,
        });

        // Remove from validating set
        setValidatingFileIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(file.id);
          return newSet;
        });
      } catch (error) {
        console.error(`[MediaGallery] Failed to validate ${file.name}:`, error);
        updateFile(file.id, {
          isDuckEncoded: false,
          duckValidationPending: false,
        });

        // Remove from validating set
        setValidatingFileIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(file.id);
          return newSet;
        });
      }
    };

    // Validate all selected images in parallel (but limit to 3 at a time to avoid overwhelming)
    const validateWithConcurrency = async (images: MediaFile[], concurrency = 3) => {
      const chunks = [];
      for (let i = 0; i < files.length; i += concurrency) {
        chunks.push(files.slice(i, i + concurrency));
      }

      for (const chunk of chunks) {
        await Promise.allSettled(chunk.map(validateImage));
      }
    };

    validateWithConcurrency(selectedImages);
  }, [files, updateFile, validatingFileIds, mode]);

  // Handle select all toggle
  const handleSelectAllToggle = useCallback(() => {
    if (isAllSelected || selectedCount === filteredFiles.length) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [isAllSelected, selectedCount, filteredFiles.length, selectAll, deselectAll]);

  // Handle file click
  const handleFileClick = useCallback(
    (file: MediaFile, event: React.MouseEvent) => {
      toggleSelection(file.id);
      onFileClick?.(file);
    },
    [toggleSelection, onFileClick]
  );

  // Handle file double click
  const handleFileDoubleClick = useCallback(
    (file: MediaFile) => {
      onFileDoubleClick?.(file);
    },
    [onFileDoubleClick]
  );

  // Helper functions for dialogs
  const setRenameDialogOpen = useCallback((file: MediaFile) => {
    setRenameDialogFile(file);
    setNewFileName(file.name);
  }, []);

  const setDeleteDialogOpen = useCallback((file: MediaFile) => {
    setDeleteDialogFile(file);
  }, []);

  const setDecodeDialogOpen = useCallback((file: MediaFile) => {
    setDecodeDialogFile(file);
    setDecodePassword('');
  }, []);

  const handleDecodeConfirm = async (file?: MediaFile) => {
    const targetFile = file || decodeDialogFile;
    if (!targetFile || !onDecode) return;
    try {
      setIsDecoding(true);
      await onDecode(targetFile, decodePassword || undefined);
      setDecodeDialogFile(null);
      setDecodePassword('');
    } catch (error) {
      console.error('Failed to decode file:', error);
    } finally {
      setIsDecoding(false);
    }
  };

  const handleRenameConfirm = async () => {
    if (!renameDialogFile || !onRename || !newFileName.trim()) return;
    try {
      await onRename(renameDialogFile, newFileName.trim());
      setRenameDialogFile(null);
      setNewFileName('');
    } catch (error) {
      console.error('Failed to rename file:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialogFile || !onDelete) return;
    try {
      await onDelete([deleteDialogFile]);
      setDeleteDialogFile(null);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handlePreviewRequest = (file: MediaFile) => {
    if (onPreview) {
      onPreview(file);
    } else {
      setPreviewFile(file);
    }
  };

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

  // Empty state
  if (filteredFiles.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        {selectedExtension || searchQuery ? (
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

          {/* Extension filter */}
          <div className="flex gap-1" role="group" aria-label="Filter by file extension">
            <Button
              variant={selectedExtension === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedExtension(null)}
              aria-label="Show all files"
              aria-pressed={selectedExtension === null}
            >
              All
            </Button>
            {uniqueExtensions.slice(0, 5).map((ext) => (
              <Button
                key={ext}
                variant={selectedExtension === ext ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedExtension(ext)}
                aria-label={`Filter by ${ext} files`}
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
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'large' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('large')}
              aria-label="Large grid view"
              aria-pressed={viewMode === 'large'}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* File count */}
      <div className="text-sm text-gray-600">
        {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
        {selectedExtension && ` (${selectedExtension.replace('.', '').toUpperCase()})`}
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
                          <>
                            <VideoPreview
                              src={file.blobUrl}
                              className="absolute inset-0 w-full h-full"
                            />
                            <div className="absolute top-1 left-1 pointer-events-none">
                              <PlayCircle 
                                className="h-4 w-4 text-white/90 drop-shadow-md pointer-events-auto cursor-pointer hover:scale-110 transition-transform"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewRequest(file);
                                }}
                              />
                            </div>
                          </>
                        ) : file.thumbnail || file.blobUrl ? (
                          <Image
                            src={file.thumbnail || file.blobUrl || ''}
                            alt={file.name}
                            fill
                            className="object-contain"
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
                            'text-sm font-bold line-clamp-1',
                            isSelected ? 'text-blue-700' : 'text-gray-900'
                          )}
                        >
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">{file.path}</p>
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
                      <>
                        <VideoPreview
                          src={file.blobUrl}
                          className="absolute inset-0 w-full h-full p-1"
                        />
                        <div className="absolute top-2 left-2 z-20 pointer-events-none">
                          <div 
                            className="bg-black/50 rounded-full p-1.5 backdrop-blur-sm text-white/90 shadow-md pointer-events-auto cursor-pointer hover:bg-black/70 transition-all hover:scale-110"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewRequest(file);
                            }}
                          >
                            <PlayCircle className="h-5 w-5" />
                          </div>
                        </div>
                      </>
                    ) : file.type === 'video' && file.thumbnail ? (
                      // Video with thumbnail image
                      <Image
                        src={file.thumbnail}
                        alt={file.name}
                        fill
                        className={cn(
                          'object-contain p-1 transition-transform',
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
                          'object-contain p-1 transition-transform',
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

                    {/* Overlay with checkbox and more menu */}
                    <div
                      className={cn(
                        'absolute inset-0 transition-all pointer-events-none',
                        isSelected ? 'bg-blue-500/10' : 'bg-black/0 group-hover:bg-black/5'
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          'absolute transition-opacity pointer-events-auto',
                          file.type === 'video' ? 'top-10 left-2' : 'top-2 left-2',
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleMediaFileSelection(file.id)} />
                      </div>

                      {/* Duck-encoded indicator with animation */}
                      <AnimatePresence>
                        {file.isDuckEncoded && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            exit={{ scale: 0, rotate: 180, opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 260,
                              damping: 20,
                              delay: 0.1
                            }}
                            className={cn(
                              'absolute z-10 pointer-events-auto',
                              file.type === 'video' ? 'top-2 left-10' : 'top-2 left-2'
                            )}
                          >
                            <motion.div
                              animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, 5, -5, 0]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                repeatDelay: 3
                              }}
                            >
                              <Badge className="bg-green-600 text-xs shadow-lg shadow-green-600/50">
                                🦆 Duck
                              </Badge>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* More menu */}
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
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePreviewRequest(file); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            {onDecode && file.isDuckEncoded && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (file.duckRequiresPassword) {
                                    setDecodeDialogOpen(file);
                                  } else {
                                    handleDecodeConfirm(file);
                                  }
                                }}
                                className="text-green-600 bg-green-50/50 focus:bg-green-100"
                              >
                                <motion.div
                                  animate={{
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 10, -10, 0]
                                  }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    repeatDelay: 2
                                  }}
                                  className="flex items-center"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Decode
                                </motion.div>
                              </DropdownMenuItem>
                            )}
                            {onRename && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameDialogOpen(file); }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                            )}
                            {onExport && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onExport([file]);
                                }}
                                className="text-orange-600 focus:text-orange-700 focus:bg-orange-50"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(file); }} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                    <p className={cn('text-xs font-bold line-clamp-1 h-4', isSelected ? 'text-blue-800' : 'text-gray-900')} title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-1 h-4">
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

      {/* Rename Dialog */}
      {onRename && (
        <AlertDialog open={!!renameDialogFile} onOpenChange={(open) => !open && setRenameDialogFile(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rename File</AlertDialogTitle>
              <AlertDialogDescription>
                Enter a new name for the file. The file extension will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={renameDialogFile?.name}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRenameConfirm} className="bg-blue-600 hover:bg-blue-700">
                Rename
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete Confirmation Dialog */}
      {onDelete && (
        <AlertDialog open={!!deleteDialogFile} onOpenChange={(open) => !open && setDeleteDialogFile(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deleteDialogFile?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The file will be permanently deleted from your file system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Decode Password Dialog */}
      {onDecode && (
        <Dialog open={!!decodeDialogFile} onOpenChange={(open) => !open && setDecodeDialogFile(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decode Duck Image</DialogTitle>
              <DialogDescription>
                This image contains hidden data. Enter password if required.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="decode-password">Password (Optional)</Label>
                <Input
                  id="decode-password"
                  type="password"
                  placeholder="Leave empty if not password-protected"
                  value={decodePassword}
                  onChange={(e) => setDecodePassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDecodeConfirm()}
                  autoFocus
                />
              </div>
              {decodeDialogFile?.duckRequiresPassword && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    This image requires a password to decode.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDecodeDialogFile(null)}
                disabled={isDecoding}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDecodeConfirm()}
                disabled={isDecoding}
                className="bg-green-600 hover:bg-green-700"
              >
                {isDecoding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Decoding...
                  </>
                ) : (
                  'Decode'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Dialog */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={(open) => {
          if (!open) {
            setPreviewFile(null);
            setShowMoreDetails(false);
            setCopiedPath(false);
          }
        }}>
          <DialogContent className="max-w-6xl w-full">
            <DialogHeader>
              <DialogTitle className="line-clamp-1">{previewFile.name}</DialogTitle>
              <DialogDescription className="line-clamp-1">
                {previewFile.type === 'image' ? 'Image' : 'Video'} • {previewFile.extension?.toUpperCase() || 'N/A'}
              </DialogDescription>
            </DialogHeader>

            {/* Two-column layout: Preview on left, Details on right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Preview (2/3 width on large screens) */}
              <div className="lg:col-span-2">
                <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  {previewFile.type === 'video' ? (
                    <video
                      src={previewFile.blobUrl || ''}
                      controls
                      className="max-w-full max-h-[70vh] object-contain"
                      autoPlay
                      preload="metadata"
                    />
                  ) : (
                    <Image
                      src={previewFile.thumbnail || previewFile.blobUrl || ''}
                      alt={previewFile.name}
                      width={previewFile.width || 800}
                      height={previewFile.height || 600}
                      className="w-full h-auto object-contain max-h-[70vh]"
                    />
                  )}
                </div>
              </div>

              {/* Right: Details (1/3 width on large screens) */}
              <div className="lg:col-span-1 space-y-4 bg-white p-4 rounded-lg">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-gray-700">File Information</h3>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600 text-xs">Type</span>
                      <p className="font-medium capitalize">{previewFile.type}</p>
                    </div>

                    <div>
                      <span className="text-gray-600 text-xs">Extension</span>
                      <p className="font-medium">{previewFile.extension?.toUpperCase() || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-gray-600 text-xs">File Size</span>
                      <p className="font-medium">
                        {previewFile.size >= 1024 * 1024
                          ? `${(previewFile.size / (1024 * 1024)).toFixed(2)} MB`
                          : `${(previewFile.size / 1024).toFixed(2)} KB`
                        }
                        <span className="text-gray-500 text-xs ml-1">({previewFile.size.toLocaleString()} bytes)</span>
                      </p>
                    </div>

                    {/* Width - always show */}
                    {previewFile.width ? (
                      <div>
                        <span className="text-gray-600 text-xs">Width</span>
                        <p className="font-medium">{previewFile.width} pixels</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-gray-600 text-xs">Width</span>
                        <p className="font-medium text-gray-400">N/A</p>
                      </div>
                    )}

                    {/* Height - always show */}
                    {previewFile.height ? (
                      <div>
                        <span className="text-gray-600 text-xs">Height</span>
                        <p className="font-medium">{previewFile.height} pixels</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-gray-600 text-xs">Height</span>
                        <p className="font-medium text-gray-400">N/A</p>
                      </div>
                    )}

                    {/* Aspect Ratio - always show if we have dimensions */}
                    {previewFile.width && previewFile.height ? (
                      <div>
                        <span className="text-gray-600 text-xs">Aspect Ratio</span>
                        <p className="font-medium">
                          {getAspectRatio(previewFile.width, previewFile.height)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-gray-600 text-xs">Aspect Ratio</span>
                        <p className="font-medium text-gray-400">N/A</p>
                      </div>
                    )}

                    {previewFile.fps ? (
                      <div>
                        <span className="text-gray-600 text-xs">Frame Rate</span>
                        <p className="font-medium">{previewFile.fps} FPS</p>
                      </div>
                    ) : previewFile.type === 'video' ? (
                      <div>
                        <span className="text-gray-600 text-xs">Frame Rate</span>
                        <p className="font-medium text-gray-400">N/A</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* More Details (collapsible) */}
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMoreDetails(!showMoreDetails)}
                    className="w-full justify-start"
                  >
                    {showMoreDetails ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        More Details
                      </>
                    )}
                  </Button>

                  <AnimatePresence>
                    {showMoreDetails && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2 text-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 text-xs">File Path</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(previewFile.path);
                                setCopiedPath(true);
                                toast.success('File path copied to clipboard');
                                setTimeout(() => setCopiedPath(false), 2000);
                              }}
                            >
                              {copiedPath ? (
                                <>
                                  <Check className="h-3 w-3 mr-1 text-green-600" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded mt-1 border">
                            {previewFile.path}
                          </p>
                        </div>

                        <div>
                          <span className="text-gray-600 text-xs">MIME Type</span>
                          <p className="font-medium bg-gray-50 p-2 rounded mt-1 border">
                            {previewFile.type === 'image' ? 'image/' : 'video/'}{previewFile.extension?.replace('.', '')}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
