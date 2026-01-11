/**
 * Job Input Editor Component
 * Reusable input editor that can be embedded in JobDetail
 * Allows editing and re-running jobs with modified inputs
 */

'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type {
  Workflow,
  FileInputAssignment,
} from '@/types/workspace';

export interface JobInputEditorProps {
  workflowId: string;
  initialTextInputs: Record<string, string>;
  initialFileInputs: FileInputAssignment[];
  onInputsChange: (inputs: {
    textInputs: Record<string, string>;
    fileInputs: FileInputAssignment[];
  }) => void;
  onRunJob: () => void;
  isRunning?: boolean;
  className?: string;
}

export function JobInputEditor({
  workflowId,
  initialTextInputs,
  initialFileInputs,
  onInputsChange,
  onRunJob,
  isRunning = false,
  className = ''
}: JobInputEditorProps) {
  const { workflows, mediaFiles } = useWorkspaceStore();
  const [localInputs, setLocalInputs] =
    useState<Record<string, string>>(initialTextInputs);
  const [fileValidationErrors, setFileValidationErrors] = useState<
    Record<string, string>
  >({});

  const workflow = workflows.find((w) => w.id === workflowId);

  // Update local inputs when initial inputs change
  useEffect(() => {
    setLocalInputs(initialTextInputs);
  }, [initialTextInputs]);

  // Validate file existence
  // For job files: check if file is either in mediaFiles OR exists in job folder
  // Job folder files (~/Downloads/workspace/jobId/*) are valid even if not in mediaFiles
  useEffect(() => {
    const validateFiles = async () => {
      const errors: Record<string, string> = {};

      // Check file existence via API for accurate validation
      for (const file of initialFileInputs) {
        // Skip validation for job folder files - they're managed by the job system
        const isJobFolderFile = file.filePath.includes('/workspace/') ||
                                file.filePath.includes('\\workspace\\');

        if (isJobFolderFile) {
          // Job folder files are considered valid (they were copied when job ran)
          continue;
        }

        // For non-job files, check if they exist in mediaFiles
        const fileExists = mediaFiles.some((mf) => mf.path === file.filePath);
        if (!fileExists) {
          errors[file.filePath] = 'Source file no longer available';
        }
      }

      setFileValidationErrors(errors);
    };

    validateFiles();
  }, [initialFileInputs, mediaFiles]);

  if (!workflow) {
    return (
      <Card className={cn('p-4', className)}>
        <p className="text-sm text-gray-500">Workflow not found</p>
      </Card>
    );
  }

  // Get valid parameter IDs from the current workflow
  const validParameterIds = new Set(
    workflow.inputs.filter((p) => p.type === 'file').map((p) => p.id)
  );

  // Filter file inputs to only include parameters in the current workflow
  const validFileInputs = initialFileInputs.filter((file) =>
    validParameterIds.has(file.parameterId)
  );

  // Group file inputs by parameter
  const fileInputsByParam = validFileInputs.reduce((acc, assignment) => {
    if (!acc[assignment.parameterId]) {
      acc[assignment.parameterId] = [];
    }
    acc[assignment.parameterId].push(assignment);
    return acc;
  }, {} as Record<string, FileInputAssignment[]>);

  // Check if any files are missing
  const hasMissingFiles = Object.keys(fileValidationErrors).length > 0;

  // Handle text input change
  const handleTextInputChange = (paramId: string, value: string) => {
    const newInputs = { ...localInputs, [paramId]: value };
    setLocalInputs(newInputs);
    onInputsChange({
      textInputs: newInputs,
      fileInputs: validFileInputs,
    });
  };

  // Get file type icon
  const getFileIcon = (fileType: 'image' | 'video') => {
    return fileType === 'image' ? (
      <ImageIcon className="h-4 w-4" />
    ) : (
      <Video className="h-4 w-4" />
    );
  };

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900">Job Inputs</h3>
        <p className="text-xs text-gray-500 mt-1">Edit inputs and run job</p>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* File validation warning */}
        {hasMissingFiles && (
          <Alert variant="destructive" className="py-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Some source files are no longer available. Re-assign files from the gallery or the job may fail.
            </AlertDescription>
          </Alert>
        )}

        {/* File Inputs */}
        {workflow.inputs
          .filter((p) => p.type === 'file')
          .map((param) => {
            const assignedFiles = fileInputsByParam[param.id] || [];

            return (
              <div key={param.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {param.name}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <Badge variant="outline" className="text-xs">
                    {assignedFiles.length} file{assignedFiles.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {assignedFiles.length === 0 ? (
                  <div className="text-sm text-gray-400 italic p-2 bg-gray-50 rounded border border-dashed border-gray-300">
                    No files assigned
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {assignedFiles.map((file, idx) => {
                      const hasError = fileValidationErrors[file.filePath];

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'relative aspect-square bg-gray-100 rounded overflow-hidden border',
                            hasError ? 'border-red-300' : 'border-gray-200'
                          )}
                        >
                          {file.fileType === 'image' ? (
                            <img
                              src={`/api/images/serve?path=${encodeURIComponent(
                                file.filePath
                              )}`}
                              alt={file.fileName}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                // Image failed to load
                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M18 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"%3E%3Cpath d="M10 10l4 4-4 4"%3E%3C/svg%3E';
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-gray-400">
                              <Video className="h-8 w-8" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1">
                            <p
                              className="text-white text-xs truncate"
                              title={file.fileName}
                            >
                              {file.fileName}
                            </p>
                          </div>
                          {hasError && (
                            <div className="absolute top-1 right-1 bg-red-500 rounded-full p-1">
                              <AlertTriangle className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Show file errors */}
                {assignedFiles.some((f) => fileValidationErrors[f.filePath]) && (
                  <div className="text-xs text-red-600 flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>Some files are no longer available. Job may fail.</span>
                  </div>
                )}

                {param.description && (
                  <p className="text-xs text-gray-500">{param.description}</p>
                )}
              </div>
            );
          })}

        {/* Text Inputs */}
        {workflow.inputs
          .filter((p) => p.type !== 'file')
          .map((param) => {
            const value = localInputs[param.id] || '';
            const isLongText = value.length > 100 || param.type === 'text';

            return (
              <div key={param.id} className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {param.name}
                  {param.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {isLongText ? (
                  <Textarea
                    value={value}
                    onChange={(e) =>
                      handleTextInputChange(param.id, e.target.value)
                    }
                    placeholder={param.placeholder || param.description || ''}
                    className="min-h-[100px] resize-none"
                    rows={4}
                  />
                ) : (
                  <Input
                    type={param.type === 'number' ? 'number' : 'text'}
                    value={value}
                    onChange={(e) =>
                      handleTextInputChange(param.id, e.target.value)
                    }
                    placeholder={param.placeholder || param.description || ''}
                  />
                )}

                {param.description && (
                  <p className="text-xs text-gray-500">{param.description}</p>
                )}
              </div>
            );
          })}
      </div>

      {/* Footer - Run Button */}
      <div className="p-4 border-t bg-gray-50 space-y-2">
        {hasMissingFiles && (
          <Alert className="py-2">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Missing files detected. Consider re-assigning files from the gallery.
            </AlertDescription>
          </Alert>
        )}
        <Button
          onClick={onRunJob}
          disabled={isRunning}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Job...
            </>
          ) : (
            'Run Job with These Inputs'
          )}
        </Button>
      </div>
    </Card>
  );
}
