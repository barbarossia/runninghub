/**
 * Workflow Input Builder Component
 * Displays workflow parameters and handles file/text input assignments
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Type,
  Hash,
  ToggleLeft,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Upload,
  Loader2,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useFolderStore } from '@/store/folder-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { validateFileForParameter, filterValidFilesForParameter, formatFileSize } from '@/utils/workspace-validation';
import type { Workflow, WorkflowInputParameter, MediaFile } from '@/types/workspace';
import { toast } from 'sonner';

export interface WorkflowInputBuilderProps {
  workflow: Workflow;
  onRunJob?: () => void;
  className?: string;
}

export function WorkflowInputBuilder({ workflow, onRunJob, className = '' }: WorkflowInputBuilderProps) {
  const {
    mediaFiles,
    jobFiles,
    jobInputs,
    assignFileToParameter,
    removeFileAssignment,
    setJobTextInput,
    validateJobInputs,
    addMediaFile,
  } = useWorkspaceStore();

  const { selectedFolder } = useFolderStore();

  const [deleteSourceFiles, setDeleteSourceFiles] = useState(false);
  const [draggedOverParam, setDraggedOverParam] = useState<string | null>(null);
  const [uploadingParams, setUploadingParams] = useState<Record<string, boolean>>({});

  // Group assigned files by parameter
  const assignedFilesByParam = useMemo(() => {
    const grouped = new Map<string, typeof jobFiles>();
    jobFiles.forEach((assignment) => {
      const existing = grouped.get(assignment.parameterId) || [];
      grouped.set(assignment.parameterId, [...existing, assignment]);
    });
    return grouped;
  }, [jobFiles]);

  // Get invalid files count for a parameter
  const getInvalidFilesCount = useCallback(
    (param: WorkflowInputParameter) => {
      const invalid = mediaFiles.filter((file) => {
        const validation = validateFileForParameter(file, param);
        return !validation.valid;
      });
      return invalid.length;
    },
    [mediaFiles]
  );

  // Handle file drop on parameter
  const handleDrop = useCallback(
    (e: React.DragEvent, param: WorkflowInputParameter) => {
      e.preventDefault();
      setDraggedOverParam(null);

      const selectedFiles = mediaFiles.filter((f) => f.selected);
      if (selectedFiles.length === 0) return;

      // Assign each selected file to this parameter
      selectedFiles.forEach((file) => {
        assignFileToParameter(file.path, param.id, file);
      });
    },
    [mediaFiles, assignFileToParameter]
  );

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, paramId: string) => {
    e.preventDefault();
    setDraggedOverParam(paramId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDraggedOverParam(null);
  }, []);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, paramId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!selectedFolder) {
      toast.error("No folder selected");
      return;
    }

    setUploadingParams(prev => ({ ...prev, [paramId]: true }));

    try {
      // Process each selected file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Convert to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
        });

        // Upload
        const response = await fetch('/api/workspace/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: [{ name: file.name, data: base64Data }],
            workspacePath: selectedFolder.folder_path
          })
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Upload failed');

        // Add to mediaFiles store
        if (data.uploadedFiles && data.uploadedFiles.length > 0) {
          const uploadedFile = data.uploadedFiles[0];
          const newMediaFile: MediaFile = {
            id: uploadedFile.workspacePath,
            name: uploadedFile.name,
            path: uploadedFile.workspacePath,
            type: file.type.startsWith('video') ? 'video' : 'image',
            extension: file.name.split('.').pop() ? '.' + file.name.split('.').pop() : '',
            size: file.size,
            width: 0,
            height: 0,
            selected: false,
            thumbnail: `/api/images/serve?path=${encodeURIComponent(uploadedFile.workspacePath)}`,
          };

          addMediaFile(newMediaFile);
          assignFileToParameter(newMediaFile.path, paramId, newMediaFile);
        }
      }
      
      toast.success("File(s) uploaded and assigned");
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Upload failed: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploadingParams(prev => ({ ...prev, [paramId]: false }));
      // Reset input
      e.target.value = '';
    }
  };

  // Get assigned files for parameter
  const getAssignedFiles = useCallback(
    (paramId: string) => {
      return assignedFilesByParam.get(paramId) || [];
    },
    [assignedFilesByParam]
  );

  // Validation result
  const validationResult = useMemo(() => {
    return validateJobInputs(workflow);
  }, [workflow, jobFiles, jobInputs, validateJobInputs]);

  // Get input icon based on type
  const getInputIcon = (type: WorkflowInputParameter['type']) => {
    switch (type) {
      case 'file':
        return <Upload className="h-4 w-4" />;
      case 'text':
        return <Type className="h-4 w-4" />;
      case 'number':
        return <Hash className="h-4 w-4" />;
      case 'boolean':
        return <ToggleLeft className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Render file input parameter
  const renderFileInput = (param: WorkflowInputParameter) => {
    const assigned = getAssignedFiles(param.id);
    const invalidCount = getInvalidFilesCount(param);
    const validFiles = filterValidFilesForParameter(mediaFiles, param);
    const isDraggedOver = draggedOverParam === param.id;
    const isUploading = uploadingParams[param.id] || false;

    return (
      <div
        key={param.id}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 transition-all',
          isDraggedOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        )}
        onDrop={(e) => handleDrop(e, param)}
        onDragOver={(e) => handleDragOver(e, param.id)}
        onDragLeave={handleDragLeave}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getInputIcon(param.type)}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{param.name}</span>
                {param.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                {!param.required && <Badge variant="secondary" className="text-xs">Optional</Badge>}
              </div>
              {param.description && (
                <p className="text-xs text-gray-500 mt-1">{param.description}</p>
              )}
            </div>
          </div>

          {/* Validation status */}
          {assigned.length > 0 && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
          {param.required && assigned.length === 0 && (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          )}
        </div>

        {/* Assigned files */}
        {assigned.length > 0 && (
          <div className="space-y-2 mb-3">
            {assigned.map((assignment) => (
              <Card key={assignment.filePath} className="p-2 flex items-center gap-2 bg-gray-50">
                {assignment.fileType === 'image' ? (
                  <ImageIcon className="h-4 w-4 text-blue-600" />
                ) : (
                  <Video className="h-4 w-4 text-purple-600" />
                )}
                <span className="text-sm flex-1 truncate">{assignment.fileName}</span>
                <span className="text-xs text-gray-500">{formatFileSize(assignment.fileSize)}</span>
                {!assignment.valid && (
                  <Badge variant="destructive" className="text-xs">
                    {assignment.validationError}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeFileAssignment(assignment.filePath)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Button Area */}
        {assigned.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <input
              type="file"
              id={`file-upload-${param.id}`}
              className="hidden"
              onChange={(e) => handleFileUpload(e, param.id)}
              disabled={isUploading}
            />
            
            <Button
              variant="outline"
              onClick={() => document.getElementById(`file-upload-${param.id}`)?.click()}
              disabled={isUploading}
              className="mb-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Browse & Upload
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500">
              {isDraggedOver ? (
                <span className="text-blue-600 font-medium">Drop files here...</span>
              ) : (
                <span>Or select files from the gallery below</span>
              )}
            </p>
          </div>
        )}

        {/* Invalid files warning */}
        {invalidCount > 0 && (
          <Alert className="mt-3 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-xs text-yellow-800">
              {invalidCount} file{invalidCount !== 1 ? 's' : ''} filtered out (invalid type)
            </AlertDescription>
          </Alert>
        )}

        {/* Valid files count */}
        <div className="mt-2 text-xs text-gray-500">
          {validFiles.length} valid file{validFiles.length !== 1 ? 's' : ''} available
        </div>
      </div>
    );
  };

  // Render text/number/boolean input
  const renderTextInput = (param: WorkflowInputParameter) => {
    const value = jobInputs[param.id] || param.defaultValue?.toString() || '';
    const isValid = !param.required || value.trim() !== '';

    return (
      <div key={param.id} className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getInputIcon(param.type)}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{param.name}</span>
                {param.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                {!param.required && <Badge variant="secondary" className="text-xs">Optional</Badge>}
              </div>
              {param.description && (
                <p className="text-xs text-gray-500 mt-1">{param.description}</p>
              )}
            </div>
          </div>

          {/* Validation status */}
          {value && <CheckCircle2 className={cn('h-5 w-5', isValid ? 'text-green-600' : 'text-yellow-600')} />}
        </div>

        {param.type === 'boolean' ? (
          <div className="flex items-center gap-2">
            <Checkbox
              id={param.id}
              checked={value === 'true' || value === '1'}
              onCheckedChange={(checked) => setJobTextInput(param.id, checked === true ? 'true' : 'false')}
            />
            <label htmlFor={param.id} className="text-sm">
              {param.placeholder || 'Enable this option'}
            </label>
          </div>
        ) : param.type === 'number' ? (
          <Input
            type="number"
            value={value}
            onChange={(e) => setJobTextInput(param.id, e.target.value)}
            placeholder={param.placeholder || `Enter ${param.name.toLowerCase()}`}
            min={param.validation?.min}
            max={param.validation?.max}
            step="any"
          />
        ) : (
          <Textarea
            value={value}
            onChange={(e) => setJobTextInput(param.id, e.target.value)}
            placeholder={param.placeholder || `Enter ${param.name.toLowerCase()}`}
            rows={3}
            maxLength={param.validation?.max}
          />
        )}

        {/* Validation hints */}
        {param.validation && (
          <div className="mt-2 text-xs text-gray-500">
            {param.validation.min !== undefined && param.type === 'text' && (
              <span>Min {param.validation.min} characters. </span>
            )}
            {param.validation.max !== undefined && param.type === 'text' && (
              <span>Max {param.validation.max} characters.</span>
            )}
            {param.validation.min !== undefined && param.type === 'number' && (
              <span>Min: {param.validation.min}. </span>
            )}
            {param.validation.max !== undefined && param.type === 'number' && (
              <span>Max: {param.validation.max}.</span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Handle run job
  const handleRunJob = useCallback(() => {
    if (validationResult.valid) {
      // Store deleteSourceFiles preference
      onRunJob?.();
    }
  }, [validationResult, deleteSourceFiles, onRunJob]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Input parameters */}
      <div className="space-y-4">
        {workflow.inputs.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This workflow has no input parameters defined. Please edit the workflow to add parameters.
            </AlertDescription>
          </Alert>
        ) : (
          workflow.inputs.map((param) => {
            if (param.type === 'file') {
              return renderFileInput(param);
            } else {
              return renderTextInput(param);
            }
          })
        )}
      </div>

      {/* Post-processing options */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Post-Processing Options</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="delete-source-files"
              checked={deleteSourceFiles}
              onCheckedChange={(checked) => setDeleteSourceFiles(checked === true)}
            />
            <div className="flex-1">
              <label htmlFor="delete-source-files" className="text-sm font-medium cursor-pointer">
                Delete source files after successful completion
              </label>
              <p className="text-xs text-gray-500 mt-1">
                {deleteSourceFiles ? (
                  <span className="text-orange-600">
                    Warning: {jobFiles.length} source file{jobFiles.length !== 1 ? 's' : ''} will be permanently deleted
                  </span>
                ) : (
                  <span>Source files will be preserved after processing</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Validation errors */}
      {!validationResult.valid && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-800">
            <div className="font-medium mb-1">Please fix the following errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {validationResult.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Run button */}
      <Button
        onClick={handleRunJob}
        disabled={!validationResult.valid}
        className="w-full"
        size="lg"
      >
        Run Job
      </Button>
    </div>
  );
}
