'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Pencil,
  Trash2,
  Loader2,
  X,
  Play,
  Eye,
  AlertCircle,
  Scissors,
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
  onDecode?: (file: MediaFile, password?: string) => Promise<void>;
  onRunWorkflow?: (workflowId?: string) => void;
  onClip?: (files: MediaFile[]) => Promise<void>;
  onPreview?: (file: MediaFile) => void;
  disabled?: boolean;
  className?: string;
}

export function MediaSelectionToolbar({
  selectedFiles,
  onRename,
  onDelete,
  onDecode,
  onRunWorkflow,
  onClip,
  onPreview,
  disabled = false,
  className = '',
}: MediaSelectionToolbarProps) {
  const selectedCount = selectedFiles.length;
  const isSingleSelection = selectedCount === 1;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDecodeDialog, setShowDecodeDialog] = useState(false);
  const [showQuickRunDialog, setShowQuickRunDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [decodePassword, setDecodePassword] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isClipping, setIsClipping] = useState(false);

  // Get workflows from store
  const { workflows } = useWorkspaceStore();

  // Handle rename
  const handleRename = useCallback(async () => {
    if (!onRename || !isSingleSelection) return;

    setIsRenaming(true);
    try {
      await onRename(selectedFiles[0], newFileName);
      setShowRenameDialog(false);
      setNewFileName('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename file');
    } finally {
      setIsRenaming(false);
    }
  }, [onRename, isSingleSelection, selectedFiles, newFileName]);

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
    try {
      await onDelete(selectedFiles);
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete files');
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, selectedFiles]);

  // Handle decode
  const handleDecode = useCallback(async () => {
    if (!onDecode || !isSingleSelection) return;

    setIsDecoding(true);
    try {
      await onDecode(selectedFiles[0], decodePassword);
      setShowDecodeDialog(false);
      setDecodePassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to decode image');
    } finally {
      setIsDecoding(false);
    }
  }, [onDecode, isSingleSelection, selectedFiles, decodePassword]);

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    // This will be handled by the parent component
    // The toolbar just emits an event
  }, []);

  // Handle quick run workflow
  const handleQuickRunConfirm = useCallback((workflowId: string) => {
    if (onRunWorkflow) {
      onRunWorkflow(workflowId);
    }
  }, [onRunWorkflow]);

  // Handle clip
  const handleClip = useCallback(async () => {
    if (!onClip) return;

    setIsClipping(true);
    try {
      const videoFiles = selectedFiles.filter(f => f.type === 'video');
      await onClip(videoFiles);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clip videos');
    } finally {
      setIsClipping(false);
    }
  }, [onClip, selectedFiles]);

  // Handle preview
  const handlePreview = useCallback(() => {
    if (!onPreview) return;

    const videoFiles = selectedFiles.filter(f => f.type === 'video');
    if (videoFiles.length === 0) {
      toast.error('No video files selected');
      return;
    }

    // Preview the first selected video
    onPreview(videoFiles[0]);
  }, [onPreview, selectedFiles]);

  const toolbarDisabled = disabled || isRenaming || isDeleting || isDecoding || isClipping;

  return (
    <>
      <BaseSelectionToolbar
        selectedCount={selectedCount}
        className={className}
        badgeColor="bg-purple-600"
        onDeselectAll={handleDeselectAll}
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

                {/* Preview - only when videos are selected */}
                {onPreview && selectedFiles.some(f => f.type === 'video') && (
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

                {/* Decode - only for single duck-encoded images */}
                {isSingleSelection && onDecode && selectedFiles[0]?.isDuckEncoded && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const file = selectedFiles[0];
                      if (file.duckRequiresPassword) {
                        setDecodePassword('');
                        setShowDecodeDialog(true);
                      } else {
                        handleDecode();
                      }
                    }}
                    disabled={toolbarDisabled}
                    className="h-9 border-green-100 bg-green-50/50 hover:bg-green-100 text-green-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Decode
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
                {onPreview && selectedFiles.some(f => f.type === 'video') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreview}
                    disabled={toolbarDisabled}
                    className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                    title="Preview Video"
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
      {onDecode && isSingleSelection && selectedFiles[0]?.isDuckEncoded && (
        <Dialog open={showDecodeDialog} onOpenChange={setShowDecodeDialog}>
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
                  onKeyDown={(e) => e.key === 'Enter' && handleDecode()}
                  autoFocus
                />
              </div>
              {selectedFiles[0]?.duckRequiresPassword && (
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
