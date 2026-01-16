'use client';

import { useCallback } from 'react';
import {
  Sparkles,
  Maximize,
  FileEdit,
  FileImage,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseSelectionToolbar } from '@/components/selection/BaseSelectionToolbar';
import { useCaptionStore } from '@/store/caption-store';
import { cn } from '@/lib/utils';
import type { MediaFile } from '@/types/workspace';

interface CaptionSelectionToolbarProps {
  selectedFiles: MediaFile[];
  onExecute: (operation: 'ai-caption' | 'resize' | 'rename' | 'convert') => Promise<void>;
  onCreateDataset: () => void;
  onRefresh: () => Promise<void>;
  onDeselectAll: () => void;
  isProcessing?: boolean;
  disabled?: boolean;
  className?: string;
  showCancelButton?: boolean;
}

export function CaptionSelectionToolbar({
  selectedFiles,
  onExecute,
  onCreateDataset,
  onRefresh,
  onDeselectAll,
  isProcessing = false,
  disabled = false,
  className = '',
  showCancelButton = true,
}: CaptionSelectionToolbarProps) {
  const { activeOperation, aiCaptionWorkflowId } = useCaptionStore();

  const selectedCount = selectedFiles.length;
  const imageCount = selectedFiles.filter((f) => f.type === 'image').length;
  const videoCount = selectedFiles.filter((f) => f.type === 'video').length;

  const handleExecute = useCallback(
    async (operation: 'ai-caption' | 'resize' | 'rename' | 'convert') => {
      await onExecute(operation);
    },
    [onExecute]
  );

  const canExecute = !isProcessing && selectedCount > 0;
  const canCaption = canExecute && !!aiCaptionWorkflowId;
  const toolbarDisabled = disabled || isProcessing;

  return (
    <>
      <BaseSelectionToolbar
        selectedCount={selectedCount}
        className={className}
        badgeColor="bg-purple-600"
        onDeselectAll={onDeselectAll}
        showCancelButton={showCancelButton}
      >
        {(mode) => {
          if (mode === 'expanded') {
            return (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline-block">
                  {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected
                  {imageCount > 0 && ` (${imageCount} image${imageCount !== 1 ? 's' : ''})`}
                  {videoCount > 0 && ` (${videoCount} video${videoCount !== 1 ? 's' : ''})`}
                </span>
              </>
            );
          }

          if (mode === 'expanded-actions') {
            return (
              <>
                {/* Create Dataset Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateDataset}
                  disabled={!canExecute}
                  className="h-9 border-purple-100 bg-purple-50/50 hover:bg-purple-100 text-purple-700"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Dataset
                </Button>

                {/* AI Caption Button */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleExecute('ai-caption')}
                  disabled={!canCaption}
                  className="h-9 bg-purple-600 hover:bg-purple-700"
                  title={!aiCaptionWorkflowId ? 'Configure workflow ID first' : ''}
                >
                  {isProcessing && activeOperation === 'ai-caption' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Caption
                </Button>

                {/* Resize Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExecute('resize')}
                  disabled={!canExecute || videoCount > 0}
                  className="h-9 border-blue-100 bg-blue-50/50 hover:bg-blue-100 text-blue-700"
                >
                  {isProcessing && activeOperation === 'resize' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Maximize className="h-4 w-4 mr-2" />
                  )}
                  Resize
                </Button>

                {/* Rename Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExecute('rename')}
                  disabled={!canExecute}
                  className="h-9 border-green-100 bg-green-50/50 hover:bg-green-100 text-green-700"
                >
                  {isProcessing && activeOperation === 'rename' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileEdit className="h-4 w-4 mr-2" />
                  )}
                  Rename
                </Button>

                {/* Convert Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExecute('convert')}
                  disabled={!canExecute || videoCount > 0}
                  className="h-9 border-orange-100 bg-orange-50/50 hover:bg-orange-100 text-orange-700"
                >
                  {isProcessing && activeOperation === 'convert' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileImage className="h-4 w-4 mr-2" />
                  )}
                  Convert
                </Button>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRefresh()}
                  disabled={isProcessing}
                  className="h-9 border-gray-200 hover:bg-gray-100"
                >
                  Refresh
                </Button>
              </>
            );
          }

          if (mode === 'floating') {
            return (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCreateDataset}
                  disabled={!canExecute}
                  className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                >
                  <FolderOpen className="h-3.5 w-3.5 mr-2 text-purple-400" />
                  <span className="text-xs">Dataset</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExecute('ai-caption')}
                  disabled={!canCaption}
                  className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                >
                  {isProcessing && activeOperation === 'ai-caption' ? (
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-purple-400" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-2 text-purple-400" />
                  )}
                  <span className="text-xs">Caption</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExecute('resize')}
                  disabled={!canExecute || videoCount > 0}
                  className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                >
                  <Maximize className="h-3.5 w-3.5 mr-2 text-blue-400" />
                  <span className="text-xs">Resize</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExecute('rename')}
                  disabled={!canExecute}
                  className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                >
                  <FileEdit className="h-3.5 w-3.5 mr-2 text-green-400" />
                  <span className="text-xs">Rename</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExecute('convert')}
                  disabled={!canExecute || videoCount > 0}
                  className="h-8 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full px-3"
                >
                  <FileImage className="h-3.5 w-3.5 mr-2 text-orange-400" />
                  <span className="text-xs">Convert</span>
                </Button>
              </>
            );
          }

          return null;
        }}
      </BaseSelectionToolbar>
    </>
  );
}
