'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  Play,
  Download,
  Copy,
  Move,
  RefreshCw,
  X,
  Check,
  Info,
  ChevronDown,
  Settings,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { useSelectionStore } from '@/store';
import { KEYBOARD_SHORTCUTS } from '@/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SelectionToolbarProps {
  onProcess?: (selectedPaths: string[]) => void;
  onDelete?: (selectedPaths: string[]) => void;
  onDownload?: (selectedPaths: string[]) => void;
  onMove?: (selectedPaths: string[]) => void;
  onCopy?: (selectedPaths: string[]) => void;
  onRefresh?: () => void;
  nodes?: Array<{ id: string; name: string }>;
  selectedNode?: string;
  onNodeChange?: (nodeId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SelectionToolbar({
  onProcess,
  onDelete,
  onDownload,
  onMove,
  onCopy,
  onRefresh,
  nodes = [],
  selectedNode,
  onNodeChange,
  disabled = false,
  className = '',
}: SelectionToolbarProps) {
  const store = useSelectionStore();
  const selectedCount = store.selectedImages.size;
  const hasSelection = selectedCount > 0;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get selected paths
  const selectedPaths = useMemo(() => {
    return Array.from(store.selectedImages.keys());
  }, [store.selectedImages]);

  // Handle process
  const handleProcess = useCallback(async () => {
    if (!hasSelection || !onProcess) return;

    setIsProcessing(true);
    try {
      await onProcess(selectedPaths);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process images');
    } finally {
      setIsProcessing(false);
    }
  }, [hasSelection, onProcess, selectedPaths, selectedCount]);

  // Handle delete with confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!hasSelection || !onDelete) return;

    try {
      await onDelete(selectedPaths);
      store.deselectAll();
      toast.success(`Deleted ${selectedCount} image${selectedCount !== 1 ? 's' : ''}`);
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete images');
    }
  }, [hasSelection, onDelete, selectedPaths, selectedCount, store]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!hasSelection || !onDownload) return;
    onDownload(selectedPaths);
  }, [hasSelection, onDownload, selectedPaths]);

  // Handle move
  const handleMove = useCallback(() => {
    if (!hasSelection || !onMove) return;
    onMove(selectedPaths);
  }, [hasSelection, onMove, selectedPaths]);

  // Handle copy
  const handleCopy = useCallback(() => {
    if (!hasSelection || !onCopy) return;
    onCopy(selectedPaths);
  }, [hasSelection, onCopy, selectedPaths]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    store.deselectAll();
  }, [store]);

  // Handle node change
  const handleNodeChange = useCallback(
    (nodeId: string) => {
      onNodeChange?.(nodeId);
    },
    [onNodeChange]
  );

  const toolbarDisabled = disabled || !hasSelection || isProcessing;

  return (
    <>
      <AnimatePresence>
        {hasSelection && (
          isExpanded ? (
            /* Expanded Mode (Sticky at top of gallery area) */
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={cn(
                "sticky top-4 z-30 bg-white/95 backdrop-blur-md border border-blue-100 rounded-xl shadow-lg p-3 mb-6 flex flex-col gap-3",
                className
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="text-sm px-3 py-1 bg-blue-600">
                    {selectedCount} selected
                  </Badge>

                  {nodes.length > 0 && onNodeChange && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 border-blue-100 bg-blue-50/50 hover:bg-blue-100 text-blue-700">
                          <Settings className="h-4 w-4 mr-2" />
                          <span className="max-w-[150px] truncate">
                            {selectedNode ? nodes.find((n) => n.id === selectedNode)?.name : 'Select Node'}
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        {nodes.map((node) => (
                          <DropdownMenuItem
                            key={node.id}
                            onClick={() => handleNodeChange(node.id)}
                            className={cn("focus:bg-blue-50 focus:text-blue-700", selectedNode === node.id ? 'bg-blue-50 text-blue-700 font-bold' : '')}
                          >
                            <Check className={cn("h-4 w-4 mr-2", selectedNode === node.id ? 'opacity-100' : 'opacity-0')} />
                            {node.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleProcess} 
                    disabled={toolbarDisabled}
                    className="h-9 px-6 bg-blue-600 hover:bg-blue-700 shadow-md"
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    {isProcessing ? 'Processing...' : 'Start Processing'}
                  </Button>
                  
                  <div className="w-px h-6 bg-gray-200 mx-1" />

                  <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 hover:bg-gray-100" onClick={() => setIsExpanded(false)} title="Minimize to floating bar">
                    <Minimize2 className="h-4 w-4 text-gray-600" />
                  </Button>

                  <Button variant="outline" size="icon" className="h-9 w-9 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setShowDeleteDialog(true)} disabled={toolbarDisabled} title="Delete selected">
                    <Trash2 className="h-4 w-4" />
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
              className={cn("fixed bottom-8 left-1/2 z-40 flex items-center gap-2 p-1.5 px-3 bg-gray-900/95 border border-gray-700 rounded-full shadow-2xl backdrop-blur-md", className)}
            >
              <div className="flex items-center border-r border-gray-700 pr-3 mr-1">
                <span className="text-xs font-bold text-white whitespace-nowrap">
                  {selectedCount} <span className="text-gray-400 font-normal">selected</span>
                </span>
              </div>

              {nodes.length > 0 && onNodeChange && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3">
                      <Settings className="h-3.5 w-3.5 mr-2 text-blue-400" />
                      <span className="text-xs max-w-[100px] truncate">
                        {selectedNode ? nodes.find((n) => n.id === selectedNode)?.name : 'Select Node'}
                      </span>
                      <ChevronDown className="h-3 w-3 ml-1 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" side="top" className="w-56 bg-gray-900 border-gray-700 text-gray-300">
                    {nodes.map((node) => (
                      <DropdownMenuItem
                        key={node.id}
                        onClick={() => handleNodeChange(node.id)}
                        className={cn("focus:bg-gray-800 focus:text-white", selectedNode === node.id ? 'bg-gray-800 text-blue-400' : '')}
                      >
                        <Check className={cn("h-3.5 w-3.5 mr-2", selectedNode === node.id ? 'opacity-100' : 'opacity-0')} />
                        <span className="text-xs">{node.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {onProcess && (
                <Button variant="default" size="sm" onClick={handleProcess} disabled={toolbarDisabled} className="h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 shadow-lg shadow-blue-900/20">
                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                  <span className="text-xs font-bold">{isProcessing ? '...' : 'Process'}</span>
                </Button>
              )}

              <div className="w-px h-4 bg-gray-700 mx-1" />

              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(true)} className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full" title="Expand to card">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>

              {onDelete && (
                <Button variant="ghost" size="icon" onClick={() => setShowDeleteDialog(true)} disabled={toolbarDisabled} className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-full" title="Delete selected">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}

              <Button variant="ghost" size="icon" onClick={handleDeselectAll} className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full" title="Clear selection">
                <X className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} image{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected images will be permanently
              deleted from your file system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
