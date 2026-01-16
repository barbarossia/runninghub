/**
 * Quick Run Workflow Dialog
 * Dialog for selecting a workflow and confirming file assignments
 */

'use client';

import { useState, useMemo } from 'react';
import { Play, AlertCircle, Video, ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { MediaFile, Workflow } from '@/types/workspace';
import { validateFileForParameter } from '@/utils/workspace-validation';

export interface QuickRunWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: MediaFile[];
  workflows: Workflow[];
  onConfirm: (workflowId: string) => void;
}

export function QuickRunWorkflowDialog({
  open,
  onOpenChange,
  selectedFiles,
  workflows,
  onConfirm,
}: QuickRunWorkflowDialogProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');

  // Calculate compatibility statistics
  const compatibilityStats = useMemo(() => {
    if (!selectedWorkflow) {
      return { compatible: 0, incompatible: 0, total: selectedFiles.length };
    }

    const workflow = workflows.find((w) => w.id === selectedWorkflow);
    if (!workflow) {
      return { compatible: 0, incompatible: 0, total: selectedFiles.length };
    }

    const fileParams = workflow.inputs.filter((input) => input.type === 'file');
    let compatible = 0;
    let incompatible = 0;

    selectedFiles.forEach((file) => {
      const isCompatible = fileParams.some((param) =>
        validateFileForParameter(file, param).valid
      );
      if (isCompatible) {
        compatible++;
      } else {
        incompatible++;
      }
    });

    return { compatible, incompatible, total: selectedFiles.length };
  }, [selectedWorkflow, selectedFiles, workflows]);

  const handleConfirm = () => {
    if (selectedWorkflow) {
      onConfirm(selectedWorkflow);
      onOpenChange(false);
      setSelectedWorkflow('');
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedWorkflow('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Run Workflow with Selected Files</DialogTitle>

        {/* File count and preview */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">
              {selectedFiles.length} file(s) selected
            </Label>
            {selectedWorkflow && (
              <div className="flex gap-1">
                <Badge variant="default" className="text-xs">
                  {compatibilityStats.compatible} compatible
                </Badge>
                {compatibilityStats.incompatible > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {compatibilityStats.incompatible} incompatible
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* File preview thumbnails */}
          <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
            {selectedFiles.slice(0, 5).map((file) => (
              <div
                key={file.id}
                className="flex-shrink-0 w-16 h-16 rounded border overflow-hidden bg-gray-50 relative group"
              >
                {file.type === 'video' ? (
                  <video
                    src={file.thumbnail || file.blobUrl || `/api/videos/serve?path=${encodeURIComponent(file.path)}`}
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : file.type === 'image' ? (
                  <img
                    src={file.thumbnail || `/api/images/serve?path=${encodeURIComponent(file.path)}`}
                    alt={file.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback if serving fails
                      e.currentTarget.src = "";
                      e.currentTarget.className = "hidden";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 bg-gray-100">
                    {file.extension || 'FILE'}
                  </div>
                )}

                {/* Type icon overlay */}
                <div className="absolute top-0.5 right-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                  {file.type === 'video' ? (
                    <div className="bg-black/50 rounded-full p-0.5">
                      <Video className="h-2.5 w-2.5 text-white" />
                    </div>
                  ) : (
                    <div className="bg-blue-500/50 rounded-full p-0.5">
                      <ImageIcon className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {selectedFiles.length > 5 && (
              <div className="flex-shrink-0 w-16 h-16 rounded bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                +{selectedFiles.length - 5}
              </div>
            )}
          </div>
        </div>

        {/* Workflow selector */}
        <div className="mb-4">
          <Label htmlFor="workflow-select" className="mb-2 block">
            Select Workflow
          </Label>
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger id="workflow-select">
              <SelectValue placeholder="Choose a workflow..." />
            </SelectTrigger>
            <SelectContent className="z-[100] max-w-md" position="popper" align="start">
              {workflows.length === 0 ? (
                <div className="p-2 text-sm text-gray-500 text-center">
                  No workflows configured
                </div>
              ) : (
                workflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Warning if incompatible files */}
        {selectedWorkflow && compatibilityStats.incompatible > 0 && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {compatibilityStats.incompatible} file(s) may not be compatible with
              this workflow and will not be assigned.
            </AlertDescription>
          </Alert>
        )}

        {/* No compatible files warning */}
        {selectedWorkflow && compatibilityStats.compatible === 0 && selectedFiles.length > 0 && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              None of the selected files are compatible with this workflow. Please
              select a different workflow or choose different files.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedWorkflow || compatibilityStats.compatible === 0}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Confirm & Assign Files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
