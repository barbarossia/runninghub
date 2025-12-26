'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Pencil,
  Trash2,
  Loader2,
  X,
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BaseSelectionToolbar } from '@/components/selection/BaseSelectionToolbar';
import type { MediaFile } from '@/types/workspace';

interface MediaSelectionToolbarProps {
  selectedFiles: MediaFile[];
  onRename?: (file: MediaFile, newName: string) => Promise<void>;
  onDelete?: (files: MediaFile[]) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function MediaSelectionToolbar({
  selectedFiles,
  onRename,
  onDelete,
  disabled = false,
  className = '',
}: MediaSelectionToolbarProps) {
  const selectedCount = selectedFiles.length;
  const isSingleSelection = selectedCount === 1;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    // This will be handled by the parent component
    // The toolbar just emits an event
  }, []);

  const toolbarDisabled = disabled || isRenaming || isDeleting;

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
    </>
  );
}
