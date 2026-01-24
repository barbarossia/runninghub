'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useResizeConfigStore } from '@/store/resize-config-store';
import { motion } from 'framer-motion';
import {
  Pencil,
  Trash2,
  Loader2,
  X,
  Play,
  Eye,
  AlertCircle,
  Scissors,
  Download,
  Zap,
  Maximize2,
  FileText,
  MessageSquare,
  Database,
  FilePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BaseSelectionToolbar } from '@/components/selection/BaseSelectionToolbar';
import { QuickRunWorkflowDialog } from '@/components/workspace/QuickRunWorkflowDialog';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { MediaFile, Workflow } from '@/types/workspace';

interface MediaSelectionToolbarProps {
  selectedFiles: MediaFile[];
  onRename?: (file: MediaFile, newName: string) => Promise<void>;
  onDelete?: (files: MediaFile[]) => Promise<void>;
  onDecode?: (file: MediaFile, password?: string, progress?: { current: number; total: number }) => Promise<void>;
  onRunWorkflow?: (workflowId?: string) => void;
  onClip?: (files: MediaFile[]) => Promise<void>;
  onPreview?: (file: MediaFile) => void;
  onExport?: (files: MediaFile[]) => Promise<void>;
  onConvertFps?: (files: MediaFile[]) => Promise<void>;
  onResize?: (files: MediaFile[], longestEdge?: number, deleteOriginal?: boolean) => Promise<void>;
  onCaption?: (files: MediaFile[]) => Promise<void>; // Caption videos using workflow
  onAddCaption?: (files: MediaFile[]) => Promise<void>; // Manually add caption (empty txt)
  onExportToDataset?: () => void; // Export selected files to dataset
  onDeselectAll?: () => void;
  disabled?: boolean;
  className?: string;
  showCancelButton?: boolean;
  skipResizeDialog?: boolean; // If true, resize directly without showing dialog
  showCaptionButton?: boolean; // Only show caption button in dataset tab
}

export function MediaSelectionToolbar({
  selectedFiles,
  onRename,
  onDelete,
  onDecode,
  onRunWorkflow,
  onClip,
  onPreview,
  onExport,
  onConvertFps,
  onResize,
  onCaption,
  onAddCaption,
  onExportToDataset,
  onDeselectAll,
  disabled = false,
  className = '',
  showCancelButton = true,
  skipResizeDialog = false,
  showCaptionButton = false,
}: MediaSelectionToolbarProps) {
  const selectedCount = selectedFiles.length;
  const isSingleSelection = selectedCount === 1;

  // Count duck-encoded images in selection
  const duckEncodedCount = useMemo(() => {
    const count = selectedFiles.filter(f => f.type === 'image' && f.isDuckEncoded).length;
    console.log('[MediaSelectionToolbar] Duck-encoded count:', count, 'selectedFiles:', selectedFiles.length);
    console.log('[MediaSelectionToolbar] Selected files with isDuckEncoded:', selectedFiles.map(f => ({ name: f.name, type: f.type, isDuckEncoded: f.isDuckEncoded })));
    return count;
  }, [selectedFiles]);

  const hasDuckEncodedImages = duckEncodedCount > 0;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDecodeDialog, setShowDecodeDialog] = useState(false);
  const [showQuickRunDialog, setShowQuickRunDialog] = useState(false);
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [decodePassword, setDecodePassword] = useState('');
  const [longestEdge, setLongestEdge] = useState('768');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isClipping, setIsClipping] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCaptioning, setIsCaptioning] = useState(false);
  const [captionProgress, setCaptionProgress] = useState({ current: 0, total: 0 });
  const [decodeProgress, setDecodeProgress] = useState({ current: 0, total: 0 });

  // Get workflows from store
  const { workflows } = useWorkspaceStore();

  // Get resize config from store
  const { deleteOriginal, setDeleteOriginal } = useResizeConfigStore();

  // Handle rename
  const handleRename = useCallback(async () => {
    if (!onRename || !isSingleSelection) return;

    setIsRenaming(true);
    try {
      await onRename(selectedFiles[0], newFileName);
      setShowRenameDialog(false);
      setNewFileName('');
      onDeselectAll?.(); // Clear selection after action
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename file');
    } finally {
      setIsRenaming(false);
    }
  }, [onRename, isSingleSelection, selectedFiles, newFileName, onDeselectAll]);

  // Open rename dialog
  const openRenameDialog = useCallback(() => {
    if (isSingleSelection) {
      setNewFileName(selectedFiles[0].name);
      setShowRenameDialog(true);
    }
  }, [isSingleSelection, selectedFiles]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    setShowDeleteDialog(false); // Close dialog immediately
    try {
      await onDelete(selectedFiles);
      onDeselectAll?.(); // Clear selection after action
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete files');
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, selectedFiles, onDeselectAll]);

  // Handle decode (single or batch)
  const handleDecode = useCallback(async () => {
    if (!onDecode || duckEncodedCount === 0) return;

    setIsDecoding(true);
    setShowDecodeDialog(false); // Close dialog immediately
    setDecodeProgress({ current: 0, total: duckEncodedCount });

    try {
      // Filter duck-encoded images
      const duckEncodedFiles = selectedFiles.filter(f => f.type === 'image' && f.isDuckEncoded);

      // Decode each file with progress tracking
      for (let i = 0; i < duckEncodedFiles.length; i++) {
        await onDecode(duckEncodedFiles[i], decodePassword, {
          current: i + 1,
          total: duckEncodedFiles.length
        });
        setDecodeProgress({ current: i + 1, total: duckEncodedCount });
      }

      setShowDecodeDialog(false);
      setDecodePassword('');
      setDecodeProgress({ current: 0, total: 0 });
      onDeselectAll?.(); // Clear selection after action
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to decode images');
    } finally {
      setIsDecoding(false);
      setDecodeProgress({ current: 0, total: 0 });
    }
  }, [onDecode, duckEncodedCount, selectedFiles, decodePassword, onDeselectAll]);

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    if (onDeselectAll) {
      onDeselectAll();
    }
  }, [onDeselectAll]);

  // Handle quick run workflow
  const handleQuickRunConfirm = useCallback((workflowId: string) => {
    if (onRunWorkflow) {
      onRunWorkflow(workflowId);
      onDeselectAll?.(); // Clear selection after action
    }
  }, [onRunWorkflow, onDeselectAll]);

  // Handle clip
  const handleClip = useCallback(async () => {
    if (!onClip) return;

    setIsClipping(true);
    try {
      const videoFiles = selectedFiles.filter(f => f.type === 'video');
      await onClip(videoFiles);
      onDeselectAll?.(); // Clear selection after action
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clip videos');
    } finally {
      setIsClipping(false);
    }
  }, [onClip, selectedFiles, onDeselectAll]);

  // Handle preview
  const handlePreview = useCallback(() => {
    if (!onPreview) return;

    // Preview the first selected file (image or video)
    if (selectedFiles.length === 0) {
      toast.error('No files selected');
      return;
    }

    onPreview(selectedFiles[0]);
  }, [onPreview, selectedFiles]);

  // Handle export
  const handleExportClick = useCallback(() => {
    if (!onExport || selectedFiles.length === 0) return;
    onExport(selectedFiles);
    onDeselectAll?.(); // Clear selection after action
  }, [onExport, selectedFiles, onDeselectAll]);

  // Handle FPS convert
  const handleConvertFpsClick = useCallback(() => {
    if (!onConvertFps || selectedFiles.length === 0) return;
    onConvertFps(selectedFiles);
    onDeselectAll?.(); // Clear selection after action
  }, [onConvertFps, selectedFiles, onDeselectAll]);

  // Open resize dialog (or call directly if skipping dialog)
  const openResizeDialog = useCallback(async () => {
    console.log('[openResizeDialog] Called', { selectedFiles: selectedFiles.length, skipResizeDialog, hasOnResize: !!onResize });
    if (selectedFiles.length === 0) {
      toast.error('No files selected');
      return;
    }

    if (skipResizeDialog) {
      // Call resize directly using page config (undefined means use config from store)
      try {
        console.log('[openResizeDialog] Calling onResize with files:', selectedFiles);
        toast.info(`Resizing ${selectedFiles.length} file(s)...`);
        await onResize?.(selectedFiles, undefined, undefined);
        console.log('[openResizeDialog] Resize completed');
      } catch (err) {
        console.error('Resize failed:', err);
        toast.error('Failed to resize files');
      }
    } else {
      setShowResizeDialog(true);
    }
  }, [selectedFiles, skipResizeDialog, onResize]);

  // Handle resize
  const handleResize = useCallback(async () => {
    if (!onResize) return;

    const edge = parseInt(longestEdge);
    if (isNaN(edge) || edge <= 0) {
      toast.error('Please enter a valid longest edge value');
      return;
    }

    setIsResizing(true);
    try {
      await onResize(selectedFiles, edge, deleteOriginal);
      setShowResizeDialog(false);
      toast.success(`Resized ${selectedFiles.length} file(s)`);
      onDeselectAll?.(); // Clear selection after action
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resize files');
    } finally {
      setIsResizing(false);
    }
  }, [onResize, selectedFiles, longestEdge, deleteOriginal, onDeselectAll]);

  // Handle caption
  const handleCaption = useCallback(async () => {
    if (!onCaption) return;

    // Filter media files (video or image)
    const mediaFiles = selectedFiles.filter(f => f.type === 'video' || f.type === 'image');
    if (mediaFiles.length === 0) {
      toast.error('No media files selected for captioning');
      return;
    }

    // Fire and forget - run in background
    toast.success(`Started captioning ${mediaFiles.length} media file(s)`);
    
    // Deselect files immediately to hide toolbar and return control
    if (onDeselectAll) {
      onDeselectAll();
    }

    (async () => {
      try {
        for (let i = 0; i < mediaFiles.length; i++) {
          await onCaption([mediaFiles[i]]);
        }
        toast.success(`Captioned ${mediaFiles.length} media file(s)`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to caption media');
      }
    })();
  }, [onCaption, selectedFiles, onDeselectAll]);

  const toolbarDisabled = disabled || isRenaming || isDeleting || isDecoding || isClipping || isResizing || isCaptioning;

  // Debug: Log decode button visibility
  console.log('[MediaSelectionToolbar] Decode button should show:', hasDuckEncodedImages && onDecode, {
    hasDuckEncodedImages,
    onDecode: !!onDecode,
    duckEncodedCount
  });

  return (
    <>
      <BaseSelectionToolbar
        selectedCount={selectedCount}
        className={className}
        badgeColor="bg-purple-600"
        onDeselectAll={handleDeselectAll}
        showCancelButton={showCancelButton}
      >
        {(mode) => {
          if (mode === 'expanded') {
            return (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline-block">
                  {selectedCount === 1
                    ? '1 file selected - use the buttons below to actions'
                    : `${selectedCount} files selected - choose an action`}
                </span>
              </>
            );
          }

          if (mode === 'expanded-actions') {
            return (
              <>
                {/* Run Workflow */}
                {onRunWorkflow && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowQuickRunDialog(true)}
                    disabled={toolbarDisabled}
                    className="h-9 bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Workflow
                  </Button>
                )}

                {/* Preview - when image or video files are selected */}
                {onPreview && selectedFiles.some(f => f.type === 'image' || f.type === 'video') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={toolbarDisabled}
                    className="h-9 border-green-100 bg-green-50/50 hover:bg-green-100 text-green-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                )}

                {/* Clip - only when videos are selected */}
                {onClip && selectedFiles.some(f => f.type === 'video') && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleClip}
                    disabled={toolbarDisabled}
                    className="h-9 bg-purple-600 hover:bg-purple-700"
                  >
                    {isClipping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Scissors className="h-4 w-4 mr-2" />}
                    {isClipping ? 'Processing...' : 'Clip Videos'}
                  </Button>
                )}

                {/* Add Caption (Manual) - only if selection has no caption */}
                {showCaptionButton && onAddCaption && selectedFiles.some(f => !f.captionPath && (f.type === 'video' || f.type === 'image')) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const filesWithoutCaption = selectedFiles.filter(f => !f.captionPath);
                        onAddCaption(filesWithoutCaption);
                        onDeselectAll?.();
                    }}
                    disabled={toolbarDisabled}
                    className="h-9 border-yellow-100 bg-yellow-50/50 hover:bg-yellow-100 text-yellow-700"
                    title="Add caption text file"
                  >
                    <FilePlus className="h-4 w-4 mr-2" />
                    Add Caption
                  </Button>
                )}

                {/* Caption - only for videos/images in dataset tab */}
                {showCaptionButton && onCaption && selectedFiles.some(f => f.type === 'video' || f.type === 'image') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCaption}
                    disabled={toolbarDisabled}
                    className="h-9 border-teal-100 bg-teal-50/50 hover:bg-teal-100 text-teal-700"
                    title="Generate AI captions for media"
                  >
                    {isCaptioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                    {isCaptioning
                      ? `Captioning ${captionProgress.current}/${captionProgress.total}...`
                      : `Caption ${selectedCount > 1 ? selectedCount : ''}`
                    }
                  </Button>
                )}

                {/* Export - for images and videos */}
                {onExport && selectedFiles.some(f => f.type === 'image' || f.type === 'video') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportClick}
                    disabled={toolbarDisabled}
                    className="h-9 border-orange-100 bg-orange-50/50 hover:bg-orange-100 text-orange-700"
                    title="Export to folder"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                )}

                {/* FPS Convert - for videos */}
                {onConvertFps && selectedFiles.some(f => f.type === 'video') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConvertFpsClick}
                    disabled={toolbarDisabled}
                    className="h-9 border-blue-100 bg-blue-50/50 hover:bg-blue-100 text-blue-700"
                    title="Convert video FPS"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    FPS Convert
                  </Button>
                )}

                {/* Resize - for images and videos */}
                {onResize && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openResizeDialog}
                    disabled={toolbarDisabled}
                    className="h-9 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700"
                    title="Resize by longest edge"
                  >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Resize
                  </Button>
                )}

                {onExportToDataset && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExportToDataset}
                    disabled={toolbarDisabled}
                    className="h-9 border-purple-100 bg-purple-50/50 hover:bg-purple-100 text-purple-700"
                    title="Export to dataset"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Dataset
                  </Button>
                )}

                {/* Rename - only for single selection */}
                {isSingleSelection && onRename && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openRenameDialog}
                    disabled={toolbarDisabled}
                    className="h-9 border-blue-100 bg-blue-50/50 hover:bg-blue-100 text-blue-700"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </Button>
                )}

                {/* Decode - for single or multiple duck-encoded images */}
                {hasDuckEncodedImages && onDecode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Check if any duck-encoded file requires password
                      const requiresPassword = selectedFiles
                        .filter(f => f.type === 'image' && f.isDuckEncoded)
                        .some(f => f.duckRequiresPassword);

                      if (requiresPassword) {
                        setDecodePassword('');
                        setShowDecodeDialog(true);
                      } else {
                        handleDecode();
                      }
                    }}
                    disabled={toolbarDisabled}
                    className="h-9 border-green-100 bg-green-50/50 hover:bg-green-100 text-green-700 shadow-md shadow-green-200/50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {duckEncodedCount === 1 ? '🦆 Decode' : `🦆 Decode ${duckEncodedCount}`}
                  </Button>
                )}

                {/* Delete - for single or multiple */}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={toolbarDisabled}
                    title={selectedCount === 1 ? 'Delete selected file' : `Delete ${selectedCount} files`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            );
          }

          if (mode === 'floating') {
            return (
              <>
                {/* Run Workflow */}
                {onRunWorkflow && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickRunDialog(true)}
                    disabled={toolbarDisabled}
                    className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                    title="Run Workflow"
                  >
                    <Play className="h-3.5 w-3.5 mr-2 text-blue-400" />
                    <span className="text-xs">Run Workflow</span>
                  </Button>
                )}

                {/* Preview - floating mode */}
                {onPreview && selectedFiles.some(f => f.type === 'image' || f.type === 'video') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreview}
                    disabled={toolbarDisabled}
                    className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                    title="Preview File"
                  >
                    <Eye className="h-3.5 w-3.5 mr-2 text-green-400" />
                    <span className="text-xs">Preview</span>
                  </Button>
                )}

                {/* Clip - floating mode */}
                {onClip && selectedFiles.some(f => f.type === 'video') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClip}
                    disabled={toolbarDisabled}
                    className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                    title="Clip Videos"
                  >
                    {isClipping ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Scissors className="h-3.5 w-3.5 mr-2 text-purple-400" />}
                    <span className="text-xs">{isClipping ? '...' : 'Clip'}</span>
                  </Button>
                )}

                {/* Add Caption (Manual) - floating mode */}
                {showCaptionButton && onAddCaption && selectedFiles.some(f => !f.captionPath && (f.type === 'video' || f.type === 'image')) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        const filesWithoutCaption = selectedFiles.filter(f => !f.captionPath);
                        onAddCaption(filesWithoutCaption);
                        onDeselectAll?.();
                    }}
                    disabled={toolbarDisabled}
                    className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                    title="Add caption text file"
                  >
                    <FilePlus className="h-3.5 w-3.5 mr-2 text-yellow-400" />
                    <span className="text-xs">Add Caption</span>
                  </Button>
                )}

                {/* Caption - floating mode */}
                {showCaptionButton && onCaption && selectedFiles.some(f => f.type === 'video' || f.type === 'image') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCaption}
                    disabled={toolbarDisabled}
                    className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                    title="Generate AI captions"
                  >
                    {isCaptioning ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5 mr-2 text-teal-400" />}
                    <span className="text-xs">{isCaptioning ? `${captionProgress.current}/${captionProgress.total}` : 'Caption'}</span>
                  </Button>
                )}

                {/* Export - floating mode */}
                {onExport && selectedFiles.some(f => f.type === 'image' || f.type === 'video') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportClick}
                    disabled={toolbarDisabled}
                    className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                    title="Export to folder"
                  >
                    <Download className="h-3.5 w-3.5 mr-2 text-orange-400" />
                    <span className="text-xs">Export</span>
                  </Button>
                )}

                {/* FPS Convert - floating mode */}
                {onConvertFps && selectedFiles.some(f => f.type === 'video') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleConvertFpsClick}
                    disabled={toolbarDisabled}
                    className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                    title="Convert video FPS"
                  >
                    <Zap className="h-3.5 w-3.5 mr-2 text-blue-400" />
                    <span className="text-xs">FPS</span>
                  </Button>
                )}

                {/* Rename - only for single selection */}
                {isSingleSelection && onRename && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openRenameDialog}
                    disabled={toolbarDisabled}
                    className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-2 text-green-400" />
                    <span className="text-xs">Rename</span>
                  </Button>
                )}

                {onExportToDataset && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onExportToDataset}
                    disabled={toolbarDisabled}
                    className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                    title="Export to dataset"
                  >
                    <Database className="h-3.5 w-3.5 mr-2 text-purple-400" />
                    <span className="text-xs">Dataset</span>
                  </Button>
                )}

                {/* Decode - for single or multiple duck-encoded images in floating mode */}
                {hasDuckEncodedImages && onDecode && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Check if any duck-encoded file requires password
                        const requiresPassword = selectedFiles
                          .filter(f => f.type === 'image' && f.isDuckEncoded)
                          .some(f => f.duckRequiresPassword);

                        if (requiresPassword) {
                          setDecodePassword('');
                          setShowDecodeDialog(true);
                        } else {
                          handleDecode();
                        }
                      }}
                      disabled={toolbarDisabled}
                      className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3 relative overflow-hidden"
                      title={duckEncodedCount === 1 ? 'Decode Duck Image' : `Decode ${duckEncodedCount} Duck Images`}
                    >
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-green-400/30 to-green-600/30"
                        animate={{
                          x: ['-100%', '100%']
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 1,
                          ease: "linear"
                        }}
                      />
                      <span className="relative flex items-center">
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
                          <Eye className="h-3.5 w-3.5 mr-2 text-green-400" />
                          <span className="text-xs">
                            {duckEncodedCount === 1 ? '🦆 Decode' : `🦆 ${duckEncodedCount}`}
                          </span>
                        </motion.div>
                      </span>
                    </Button>
                  </motion.div>
                )}

                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={toolbarDisabled}
                    className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-full"
                    title={selectedCount === 1 ? 'Delete' : `Delete ${selectedCount} files`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            );
          }

          return null;
        }}
      </BaseSelectionToolbar>

      {/* Rename Dialog */}
      {onRename && isSingleSelection && (
        <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename File</DialogTitle>
              <DialogDescription>
                Enter a new name for the file. The file extension will be preserved.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={selectedFiles[0]?.name}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRenameDialog(false)}
                disabled={isRenaming}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={isRenaming || !newFileName.trim() || newFileName === selectedFiles[0]?.name}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRenaming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  'Rename'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {onDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {selectedCount === 1 ? selectedFiles[0]?.name : `${selectedCount} files`}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedCount === 1
                  ? 'This action cannot be undone. The file will be permanently deleted from your file system.'
                  : `This action cannot be undone. ${selectedCount} files will be permanently deleted from your file system.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Decode Password Dialog */}
      {onDecode && hasDuckEncodedImages && (
        <Dialog open={showDecodeDialog} onOpenChange={setShowDecodeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {duckEncodedCount === 1
                  ? 'Decode Duck Image'
                  : `Decode ${duckEncodedCount} Duck Images`
                }
              </DialogTitle>
              <DialogDescription>
                {duckEncodedCount === 1
                  ? 'This image contains hidden data. Enter password if required.'
                  : `These ${duckEncodedCount} images contain hidden data. Enter password if required.`
                }
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
                  onKeyDown={(e) => e.key === 'Enter' && handleDecode()}
                  autoFocus
                />
              </div>

              {/* Show password required alert if any file requires it */}
              {selectedFiles.some(f => f.type === 'image' && f.isDuckEncoded && f.duckRequiresPassword) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {duckEncodedCount === 1
                      ? 'This image requires a password to decode.'
                      : 'Some images require a password to decode.'
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Show batch progress if decoding */}
              {isDecoding && decodeProgress.total > 1 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Decoding progress:</span>
                    <span className="font-medium">{decodeProgress.current} / {decodeProgress.total}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-600 h-full transition-all duration-300"
                      style={{
                        width: `${(decodeProgress.current / decodeProgress.total) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDecodeDialog(false)}
                disabled={isDecoding}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDecode}
                disabled={isDecoding}
                className="bg-green-600 hover:bg-green-700"
              >
                {isDecoding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {decodeProgress.total > 1
                      ? `Decoding ${decodeProgress.current}/${decodeProgress.total}...`
                      : 'Decoding...'
                    }
                  </>
                ) : (
                  duckEncodedCount === 1 ? 'Decode' : `Decode ${duckEncodedCount} Images`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Resize Dialog */}
      {onResize && (
        <Dialog open={showResizeDialog} onOpenChange={setShowResizeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resize {selectedCount === 1 ? 'File' : `${selectedCount} Files`}</DialogTitle>
              <DialogDescription>
                Scale images and videos by specifying the longest edge. The aspect ratio will be preserved.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="longest-edge">Longest Edge (pixels)</Label>
                <Input
                  id="longest-edge"
                  type="number"
                  min="1"
                  placeholder="e.g., 768"
                  value={longestEdge}
                  onChange={(e) => setLongestEdge(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResize()}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Example: A 720×1280 video with longest edge 768 will be resized to 432×768
                </p>
              </div>

              {/* Delete original option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delete-original-resize"
                  checked={deleteOriginal}
                  onCheckedChange={(checked) => setDeleteOriginal(checked === true)}
                />
                <Label
                  htmlFor="delete-original-resize"
                  className="text-sm font-normal cursor-pointer"
                >
                  Delete original files after resize
                </Label>
              </div>

              {/* Show selected files info */}
              <div className="text-sm text-muted-foreground">
                {selectedCount} file(s) will be processed
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowResizeDialog(false)}
                disabled={isResizing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResize}
                disabled={isResizing || !longestEdge.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isResizing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resizing...
                  </>
                ) : (
                  'Resize'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Run Workflow Dialog */}
      {onRunWorkflow && (
        <QuickRunWorkflowDialog
          open={showQuickRunDialog}
          onOpenChange={setShowQuickRunDialog}
          selectedFiles={selectedFiles}
          workflows={workflows}
          onConfirm={handleQuickRunConfirm}
        />
      )}
    </>
  );
}
