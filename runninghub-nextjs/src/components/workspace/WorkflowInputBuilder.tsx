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
  ArrowRightLeft,
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
    updateMediaFile,
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

  // Adaptive grid columns based on number of items
  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1 max-w-sm'; // Single large item
    if (count <= 4) return 'grid-cols-2 sm:grid-cols-3'; // Medium grid
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'; // Compact grid
  };

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

  // Handle assigning selected files from gallery
  const handleAssignSelected = useCallback(
    (paramId: string) => {
      const selectedFiles = mediaFiles.filter((f) => f.selected);
      if (selectedFiles.length === 0) {
        toast.info("No files selected in gallery");
        return;
      }

      // Assign each selected file to this parameter
      selectedFiles.forEach((file) => {
        assignFileToParameter(file.path, paramId, file);
      });
      
      toast.success(`${selectedFiles.length} file(s) assigned to ${workflow.inputs.find(p => p.id === paramId)?.name}`);
    },
    [mediaFiles, assignFileToParameter, workflow.inputs]
  );

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
            width: uploadedFile.width,
            height: uploadedFile.height,
            selected: false,
            thumbnail: `/api/images/serve?path=${encodeURIComponent(uploadedFile.workspacePath)}`,
          };

          console.log(`[Direct Upload] ${uploadedFile.name} dimensions: ${uploadedFile.width} x ${uploadedFile.height}`);

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
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getInputIcon(param.type)}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{param.name}</span>
                {param.required && <Badge variant="destructive" className="text-xs shrink-0">Required</Badge>}
                {!param.required && <Badge variant="secondary" className="text-xs shrink-0">Optional</Badge>}
              </div>
              {param.description && (
                <p className="text-xs text-gray-500 mt-1 truncate">{param.description}</p>
              )}
            </div>
          </div>

          {/* Validation status */}
          {assigned.length > 0 && (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          )}
          {param.required && assigned.length === 0 && (
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          )}
        </div>

        {/* Assigned files */}
        {assigned.length > 0 && (
          <div className={cn("grid gap-3 mb-3", getGridClass(assigned.length))}>
            {assigned.map((assignment) => {
              // Calculate aspect ratio from image dimensions
              const aspectRatio = assignment.width && assignment.height
                ? assignment.width / assignment.height
                : 1; // Default to square if dimensions unavailable

              // Use padding-bottom hack for aspect ratio
              // padding-bottom as percentage = (height / width) * 100
              const paddingBottom = aspectRatio > 0 ? `${(1 / aspectRatio) * 100}%` : '100%';
              const aspectStyle = {
                paddingBottom
              };

              return (
                <div
                  key={assignment.filePath}
                  className="relative group"
                  style={aspectStyle}
                >
                  <Card className="absolute inset-0 group-hover:ring-2 group-hover:ring-blue-500 transition-all cursor-default overflow-hidden">
                    {/* Thumbnail fills entire card */}
                    <div className="absolute inset-0">
                      {assignment.fileType === 'image' ? (
                        <img
                          src={`/api/images/serve?path=${encodeURIComponent(assignment.filePath)}`}
                          alt={assignment.fileName}
                          className="h-full w-full object-contain"
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            if (img.naturalWidth && img.naturalHeight) {
                              // Check if we need to update dimensions (if missing or different)
                              if (!assignment.width || !assignment.height || 
                                  assignment.width !== img.naturalWidth || 
                                  assignment.height !== img.naturalHeight) {
                                console.log(`[Auto-Detect] Updating dimensions for ${assignment.fileName}: ${img.naturalWidth}x${img.naturalHeight}`);
                                updateMediaFile(assignment.filePath, {
                                  width: img.naturalWidth,
                                  height: img.naturalHeight
                                });
                              }
                            }
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-gray-200 text-gray-400">
                          <Video className="h-12 w-12" />
                        </div>
                      )}
                    </div>

                    {/* Validation badge - always visible if invalid */}
                    {!assignment.valid && (
                      <Badge variant="destructive" className="absolute top-2 left-2 text-xs z-10">
                        {assignment.validationError}
                      </Badge>
                    )}

                    {/* Hover overlay with gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Info and controls - reveal on hover */}
                    <div className="absolute inset-0 p-3 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Top: Filename */}
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-xs font-medium text-white truncate flex-1 drop-shadow-lg"
                          title={assignment.fileName}
                        >
                          {assignment.fileName}
                        </p>
                      </div>

                      {/* Bottom: File size and remove button */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-white/90 drop-shadow-lg">
                          {formatFileSize(assignment.fileSize)}
                        </p>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 shrink-0"
                          onClick={() => removeFileAssignment(assignment.filePath)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
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
            
            <div className="flex flex-wrap justify-center gap-2 mb-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById(`file-upload-${param.id}`)?.click()}
                disabled={isUploading}
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

              <Button
                variant="secondary"
                onClick={() => handleAssignSelected(param.id)}
                disabled={isUploading || mediaFiles.filter(f => f.selected).length === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Assign Selected
              </Button>
            </div>
            
            <p className="text-xs text-gray-500">
              {isDraggedOver ? (
                <span className="text-blue-600 font-medium">Drop files here...</span>
              ) : (
                <span>Browse, drag & drop, or select from gallery</span>
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
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getInputIcon(param.type)}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{param.name}</span>
                {param.required && <Badge variant="destructive" className="text-xs shrink-0">Required</Badge>}
                {!param.required && <Badge variant="secondary" className="text-xs shrink-0">Optional</Badge>}
              </div>
              {param.description && (
                <p className="text-xs text-gray-500 mt-1 truncate">{param.description}</p>
              )}
            </div>
          </div>

          {/* Validation status */}
          {value && <CheckCircle2 className={cn('h-5 w-5 shrink-0', isValid ? 'text-green-600' : 'text-yellow-600')} />}
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

  // Check for swap capability
  const fileParams = useMemo(() => workflow.inputs.filter(p => p.type === 'file'), [workflow.inputs]);
  const canSwap = fileParams.length === 2;

  const handleSwapInputs = useCallback(() => {
    if (!canSwap) return;
    
    const [p1, p2] = fileParams;
    const files1 = getAssignedFiles(p1.id);
    const files2 = getAssignedFiles(p2.id);
    
    // Helper to reconstruct media file object
    const getMediaFile = (assignment: any): MediaFile => {
      const found = mediaFiles.find(f => f.path === assignment.filePath);
      if (found) return found;
      return {
        id: assignment.filePath,
        path: assignment.filePath,
        name: assignment.fileName,
        size: assignment.fileSize,
        type: assignment.fileType,
        width: assignment.width,
        height: assignment.height,
        extension: assignment.fileName.split('.').pop() ? '.' + assignment.fileName.split('.').pop() : '',
        selected: false,
        thumbnail: undefined // Optional
      };
    };

    // Swap files
    // Move files from p2 to p1
    files2.forEach(f => assignFileToParameter(f.filePath, p1.id, getMediaFile(f)));
    // Move files from p1 to p2
    files1.forEach(f => assignFileToParameter(f.filePath, p2.id, getMediaFile(f)));

    toast.success('Inputs swapped');
  }, [canSwap, fileParams, getAssignedFiles, mediaFiles, assignFileToParameter]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Input parameters */}
      <div className="space-y-4">
        {canSwap && (
           <div className="flex justify-end -mb-2">
             <Button variant="ghost" size="sm" onClick={handleSwapInputs} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
               <ArrowRightLeft className="w-4 h-4 mr-2" />
               Swap Inputs
             </Button>
           </div>
        )}

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
