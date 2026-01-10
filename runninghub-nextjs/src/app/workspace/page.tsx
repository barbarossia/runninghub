/**
 * Workspace Page
 * Main page for workflow execution with folder selection, media gallery, workflows, and job history
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useFolderStore, useWorkspaceFolder } from '@/store/folder-store';
import { useVideoClipStore } from '@/store/video-clip-store';
import { useVideoSelectionStore } from '@/store/video-selection-store';
import { useFolderSelection } from '@/hooks/useFolderSelection';
import { useAutoLoadFolder } from '@/hooks/useAutoLoadFolder';
import { useFileSystem } from '@/hooks';
import { FolderSelectionLayout } from '@/components/folder/FolderSelectionLayout';
import { SelectedFolderHeader } from '@/components/folder/SelectedFolderHeader';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaGallery } from '@/components/workspace/MediaGallery';
import { MediaSelectionToolbar } from '@/components/workspace/MediaSelectionToolbar';
import { MediaSortControls } from '@/components/images';
import { QuickRunWorkflowDialog } from '@/components/workspace/QuickRunWorkflowDialog';
import { WorkflowList } from '@/components/workspace/WorkflowList';
import { WorkflowEditor } from '@/components/workspace/WorkflowEditor';
import { WorkflowSelector } from '@/components/workspace/WorkflowSelector';
import { WorkflowInputBuilder } from '@/components/workspace/WorkflowInputBuilder';
import { JobList } from '@/components/workspace/JobList';
import { JobDetail } from '@/components/workspace/JobDetail';
import { YoutubeDownloader } from '@/components/workspace/YoutubeDownloader';
import { VideoClipConfiguration } from '@/components/videos/VideoClipConfiguration';
import { VideoClipSelectionToolbar } from '@/components/videos/VideoClipSelectionToolbar';
import { VideoGallery } from '@/components/videos/VideoGallery';
import { VideoPlayerModal } from '@/components/videos/VideoPlayerModal';
import { ImagePreviewModal } from '@/components/workspace/ImagePreviewModal';
import {
  Settings,
  FolderOpen,
  Workflow as WorkflowIcon,
  Clock,
  AlertCircle,
  Plus,
  Upload,
  Play,
  Youtube,
  Scissors,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { API_ENDPOINTS } from '@/constants';
import type { Workflow, Job, MediaFile, FileInputAssignment } from '@/types/workspace';

export default function WorkspacePage() {
  // Folder store state - use page-specific folder state for workspace page
  const { selectedFolder } = useWorkspaceFolder();

  // Workspace store state
  const {
    mediaFiles,
    selectedWorkflowId,
    workflows,
    jobs,
    selectedJobId,
    mediaSortField,
    mediaSortDirection,
    setMediaFiles,
    setSelectedWorkflow,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    addJob,
    updateJob,
    setSelectedJob,
    clearJobInputs,
    getSelectedMediaFiles,
    deselectAllMediaFiles,
    autoAssignSelectedFilesToWorkflow,
    updateMediaFile,
    fetchJobs,
    setMediaSorting,
  } = useWorkspaceStore();

  // Local state
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'media' | 'youtube' | 'clip' | 'run-workflow' | 'workflows' | 'jobs'>('media');
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>();
  const [activeConsoleTaskId, setActiveConsoleTaskId] = useState<string | null>(null);
  const [showQuickRunDialog, setShowQuickRunDialog] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<MediaFile | null>(null);
  const [previewImage, setPreviewImage] = useState<MediaFile | null>(null);

  // Get selected files from store
  const selectedFiles = useMemo(() => getSelectedMediaFiles(), [mediaFiles]);

  // Filter videos for Clip tab
  const filteredVideos = useMemo(() => {
    return mediaFiles.filter(file => file.type === 'video');
  }, [mediaFiles]);

  // Get selected videos from videoSelectionStore for Clip tab
  const { selectedVideos: clipSelectedVideos } = useVideoSelectionStore();

  // Get selected video count for Clip tab
  const selectedVideoCount = clipSelectedVideos.size;

  // Type adapter: MediaFile to VideoFile for Clip tab
  const adaptedVideos = useMemo(() => {
    return filteredVideos.map(file => ({
      path: file.path,
      name: file.name,
      size: file.size,
      type: 'video' as const,
      extension: file.name.split('.').pop() || '',
      width: file.width,
      height: file.height,
      fps: file.fps,
      duration: file.duration,
      thumbnail: file.thumbnail,
      created_at: file.created_at,
      modified_at: file.modified_at,
    }));
  }, [filteredVideos]);

  // Custom hooks
  const { loadFolderContents } = useFileSystem({ pageType: 'workspace' });

  // Validate duck encoding for all images in parallel
  const validateAllImagesForDuck = useCallback(async (imageFiles: MediaFile[]) => {
    const imagesOnly = imageFiles.filter(f => f.type === 'image');

    if (imagesOnly.length === 0) return;

    console.log(`[Workspace] Validating duck encoding for ${imagesOnly.length} images in parallel...`);

    // Mark all images as pending validation
    imagesOnly.forEach(file => {
      updateMediaFile(file.id, { duckValidationPending: true });
    });

    // Validate all images in parallel
    const validationPromises = imagesOnly.map(async (file) => {
      try {
        const response = await fetch(API_ENDPOINTS.WORKSPACE_DUCK_VALIDATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: file.path }),
        });

        const data = await response.json();

        console.log(`[Workspace] Validation result for ${file.name}:`, data);

        // Update the file with validation result
        console.log(`[Workspace] Updating ${file.name} with isDuckEncoded=${data.isDuckEncoded}`);
        updateMediaFile(file.id, {
          isDuckEncoded: data.isDuckEncoded,
          duckRequiresPassword: data.requiresPassword,
          duckValidationPending: false,
        });
        console.log(`[Workspace] Updated ${file.name}, new state:`, mediaFiles.find(f => f.id === file.id)?.isDuckEncoded);
      } catch (error) {
        console.error(`[Workspace] Failed to validate ${file.name}:`, error);
        updateMediaFile(file.id, {
          isDuckEncoded: false,
          duckValidationPending: false,
        });
      }
    });

    // Wait for all validations to complete (but don't block UI)
    Promise.allSettled(validationPromises);
  }, [updateMediaFile]);

  // Helper to process and update media files
  const processFolderContents = useCallback((result: any) => {
    if (!result) return;

    // DEBUG: Log raw API data
    console.log('[processFolderContents] Raw API result images:', result.images?.slice(0, 3));
    console.log('[processFolderContents] First image dimensions:', result.images?.[0]?.width, 'x', result.images?.[0]?.height);

    // Convert images to MediaFile format with serve URLs
    const imageFiles = (result.images || []).map((file: any) => {
      // DEBUG: Log each file's dimensions
      // console.log(`[processFolderContents] Processing ${file.name}: width=${file.width}, height=${file.height}`);

      return {
        id: file.path,
        name: file.name,
        path: file.path,
        type: 'image' as const,
        extension: file.name.split('.').pop() || '',
        size: file.size || 0,
        width: file.width,
        height: file.height,
        created_at: file.created_at,
        modified_at: file.modified_at,
        thumbnail: `/api/images/serve?path=${encodeURIComponent(file.path)}`,
        selected: false,
        // Initialize duck encoding fields
        isDuckEncoded: undefined,
        duckRequiresPassword: undefined,
        duckValidationPending: false,
      };
    });

    // Convert videos to MediaFile format with serve URLs
    const videoFiles = (result.videos || []).map((file: any) => ({
      id: file.path,
      name: file.name,
      path: file.path,
      type: 'video' as const,
      extension: file.name.split('.').pop() || '',
      size: file.size || 0,
      width: file.width,
      height: file.height,
      fps: file.fps,
      duration: file.duration,
      created_at: file.created_at,
      modified_at: file.modified_at,
      thumbnail: file.thumbnail ? `/api/images/serve?path=${encodeURIComponent(file.thumbnail)}` : undefined,
      blobUrl: `/api/videos/serve?path=${encodeURIComponent(file.path)}`,
      selected: false,
    }));

    // Combine both types and deduplicate by ID (path)
    const allFiles = [...imageFiles, ...videoFiles];
    const uniqueMap = new Map();
    const duplicates: string[] = [];

    allFiles.forEach(file => {
      if (uniqueMap.has(file.id)) {
        duplicates.push(file.id);
      } else {
        uniqueMap.set(file.id, file);
      }
    });

    if (duplicates.length > 0) {
      console.warn('Duplicate files detected and removed:', duplicates);
    }

    const uniqueFiles = Array.from(uniqueMap.values());
    setMediaFiles(uniqueFiles as MediaFile[]);

    // NOTE: Disabled automatic validation on folder load for performance
    // Images will be validated lazily when selected instead
    // validateAllImagesForDuck(uniqueFiles as MediaFile[]);
  }, [setMediaFiles, validateAllImagesForDuck]);

  const handleRefresh = useCallback(async (silent = false) => {
    if (selectedFolder) {
      const result = await loadFolderContents(
        selectedFolder.folder_path,
        selectedFolder.session_id,
        silent
      );
      processFolderContents(result);
    }
  }, [selectedFolder, loadFolderContents, processFolderContents]);

  const handleTaskComplete = useCallback((taskId: string, status: 'completed' | 'failed') => {
    // Find job associated with this task
    const job = jobs.find(j => j.taskId === taskId);
    if (job) {
      updateJob(job.id, {
        status: status,
        completedAt: Date.now()
      });

      // Fetch fresh job data from server to get error field
      fetchJobs();

      if (status === 'completed') {
        logger.success('Job completed successfully', {
          metadata: { jobId: job.id, taskId, status }
        });
        handleRefresh(true); // Refresh folder contents to show new files
      } else {
        // Note: Error message will be available after fetchJobs() completes
        logger.error(`Job failed`, {
          metadata: { jobId: job.id, taskId, status }
        });
      }
    }
  }, [jobs, updateJob, handleRefresh, fetchJobs]);

  const handleStatusChange = useCallback((taskId: string, status: string) => {
    // Map task status to job status
    let jobStatus: Job['status'] = 'pending';
    if (status === 'processing') jobStatus = 'running';
    else if (status === 'completed') jobStatus = 'completed';
    else if (status === 'failed') jobStatus = 'failed';

    // Find and update job
    const job = jobs.find(j => j.taskId === taskId);
    if (job && job.status !== jobStatus) {
      updateJob(job.id, { 
        status: jobStatus,
        startedAt: jobStatus === 'running' ? (job.startedAt || Date.now()) : job.startedAt
      });
    }
  }, [jobs, updateJob]);

  // Use folder selection hook for workspace
  const { handleFolderSelected } = useFolderSelection({
    folderType: 'workspace',
  });

  // Auto-load last opened folder on mount
  useAutoLoadFolder({
    folderType: 'workspace',
    onFolderLoaded: (folder, contents) => {
      // Folder is automatically set as selected by the hook
      // If contents were provided during validation, use them directly
      if (contents) {
        processFolderContents(contents);
      }
      // Otherwise, the useEffect below will load contents when selectedFolder changes
    },
  });

  // Load folder contents when folder is selected
  useEffect(() => {
    if (selectedFolder) {
      loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id).then(
        (result) => {
          processFolderContents(result);
        }
      );
    }
  }, [selectedFolder, loadFolderContents, processFolderContents]);

  // Refresh folder when switching to Media Gallery tab
  useEffect(() => {
    if (activeTab === 'media' && selectedFolder) {
      handleRefresh(true); // Silent refresh when switching to media tab
    }
  }, [activeTab, selectedFolder, handleRefresh]);

  // Fallback: Validate duck encoding for selected images (only if not already validated on load)
  // NOTE: Most images are validated in parallel on load via validateAllImagesForDuck()
  // This is a fallback for images that weren't validated for some reason
  useEffect(() => {
    const validateSelectedImages = async () => {
      // Only validate single selections for duck decoding
      if (selectedFiles.length !== 1) return;

      const file = selectedFiles[0];

      // Only validate images
      if (file.type !== 'image') return;

      // Skip if already validated (true or false) or validation is in progress
      if (file.isDuckEncoded !== undefined || file.duckValidationPending) return;

      console.log('[Workspace] Fallback: Validating duck encoding for selected image:', file.name);

      // Mark as pending to prevent duplicate validations
      updateMediaFile(file.id, { duckValidationPending: true });

      try {
        const response = await fetch(API_ENDPOINTS.WORKSPACE_DUCK_VALIDATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: file.path }),
        });

        const data = await response.json();

        console.log('[Workspace] Validation result for', file.name, ':', data);

        updateMediaFile(file.id, {
          isDuckEncoded: data.isDuckEncoded,
          duckRequiresPassword: data.requiresPassword,
          duckValidationPending: false,
        });
      } catch (error) {
        console.error(`[Workspace] Failed to validate ${file.name}:`, error);
        updateMediaFile(file.id, { duckValidationPending: false });
      }
    };

    validateSelectedImages();
  }, [selectedFiles, updateMediaFile]);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleBackToSelection = () => {
    const { setSelectedFolder, clearPageFolder } = useFolderStore.getState();
    const { setMediaFiles } = useWorkspaceStore.getState();
    clearPageFolder('workspace');
    setMediaFiles([]);
    setError('');
  };

  const handleSaveWorkflow = (workflow: Workflow) => {
    if (editingWorkflow) {
      updateWorkflow(workflow.id, workflow);
      logger.success('Workflow updated', {
        metadata: { workflowId: workflow.id, workflowName: workflow.name }
      });
    } else {
      addWorkflow(workflow);
      logger.success('Workflow created', {
        metadata: { workflowId: workflow.id, workflowName: workflow.name }
      });
    }
    setIsEditingWorkflow(false);
    setEditingWorkflow(undefined);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setIsEditingWorkflow(true);
  };

  const handleRunJob = async (data?: { fileInputs: FileInputAssignment[]; textInputs: Record<string, string> }) => {
    if (!selectedWorkflowId) {
      toast.error('Please select a workflow');
      return;
    }

    const workflow = workflows.find((w) => w.id === selectedWorkflowId);
    if (!workflow) {
      toast.error('Workflow not found');
      return;
    }

    if (!data) {
      toast.error('No job data provided');
      return;
    }

    const { fileInputs, textInputs } = data;

    // Check if this is a re-run from Job Detail page
    const currentJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) : null;
    const isReRun = currentJob?.workflowId === workflow.id;

    // Generate series metadata
    let seriesId: string | undefined;
    let runNumber = 1;
    let parentJobId: string | undefined;

    if (isReRun && currentJob?.seriesId) {
      // Reuse seriesId from current job
      seriesId = currentJob.seriesId;
      runNumber = (currentJob.runNumber || 0) + 1;
      parentJobId = currentJob.id;
    } else {
      // Create new series
      seriesId = `${workflow.id}_${Date.now()}`;
      runNumber = 1;
    }

    try {
      const response = await fetch(API_ENDPOINTS.WORKSPACE_EXECUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: workflow.id,
          sourceWorkflowId: workflow.sourceWorkflowId,
          workflowName: workflow.name,
          fileInputs: fileInputs,
          textInputs: textInputs,
          folderPath: selectedFolder?.folder_path,
          deleteSourceFiles: false,
          parentJobId,
          seriesId,
        }),
      });

      const text = await response.text();
      let resp;
      try {
        resp = text ? JSON.parse(text) : { success: false, error: 'Empty response' };
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
      }

      if (!response.ok || !resp.success) {
        throw new Error(resp.error || 'Failed to execute job');
      }

      // Create job in store with series metadata
      const newJob: Job = {
        id: resp.jobId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        fileInputs: fileInputs,
        textInputs: textInputs,
        status: 'pending',
        taskId: resp.taskId,
        createdAt: Date.now(),
        folderPath: selectedFolder?.folder_path,
        deleteSourceFiles: false,
        parentJobId,
        seriesId,
        runNumber,
      };

      addJob(newJob);

      // Select the newly created job
      setSelectedJob(newJob.id);

      // Start tracking progress
      if (resp.taskId) {
        setActiveConsoleTaskId(resp.taskId);
      }

      // Clear jobFiles after starting a new job (not a re-run)
      // Re-runs from Job Detail use job's own inputs, not global jobFiles
      if (!isReRun) {
        clearJobInputs();
      }

      // DO switch to jobs tab - go to Job Detail page to see results
      setActiveTab('jobs');
      toast.success(`Job #${runNumber} started. View results and run variations.`);
      logger.success(`Job #${runNumber} started`, {
        taskId: resp.taskId,
        metadata: {
          workflowId: workflow.id,
          jobId: resp.jobId,
          workflowName: workflow.name,
          seriesId,
          runNumber,
          parentJobId
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute job';
      logger.error(errorMessage, {
        metadata: { workflowId: workflow.id, error: errorMessage }
      });
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (confirm('Delete this workflow? This action cannot be undone.')) {
      try {
        const response = await fetch(`${API_ENDPOINTS.WORKFLOW_DELETE}?id=${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const text = await response.text();
          let errorData;
          try {
            errorData = text ? JSON.parse(text) : { error: 'Unknown error' };
          } catch (e) {
            errorData = { error: `Server error: ${response.status}` };
          }
          throw new Error(errorData.error || 'Failed to delete workflow from server');
        }

        deleteWorkflow(id);
        logger.success('Workflow deleted', {
          metadata: { workflowId: id }
        });
      } catch (error) {
        console.error('Delete workflow error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete workflow';
        logger.error('Failed to delete workflow', {
          metadata: { workflowId: id, error: errorMessage }
        });
      }
    }
  };

  const handleAddWorkflow = () => {
    setEditingWorkflow(undefined);
    setIsEditingWorkflow(true);
  };

  // NOTE: jobInputs initialization removed - now handled locally in WorkflowInputBuilder

  // Handler for quick run workflow from Media Gallery
  const handleQuickRunWorkflow = useCallback((workflowId?: string) => {
    if (!workflowId) {
      // If no workflowId provided, just open the dialog
      setShowQuickRunDialog(true);
      return;
    }

    // Auto-assign files to workflow
    autoAssignSelectedFilesToWorkflow(workflowId);

    // Switch to Run Workflow tab
    setActiveTab('run-workflow');

    toast.success('Files assigned to workflow. You can now run the job.');
  }, [autoAssignSelectedFilesToWorkflow]);

  const handleRenameFile = async (file: MediaFile, newName: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.WORKSPACE_RENAME, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path, newName }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename file');
      }

      // Silent refresh to update UI without toast
      await handleRefresh(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename file';
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleDeleteFile = async (files: MediaFile[]) => {
    try {
      const response = await fetch(API_ENDPOINTS.WORKSPACE_DELETE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: files.map(f => f.path) }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete files');
      }

      // Silent refresh to update UI without toast
      await handleRefresh(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleDecodeFile = async (file: MediaFile, password?: string, progress?: { current: number; total: number }) => {
    try {
      const response = await fetch(API_ENDPOINTS.WORKSPACE_DUCK_DECODE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duckImagePath: file.path,
          password: password || '',
          jobId: selectedFolder?.session_id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to decode image');
      }

      // Show different message for batch vs single
      if (progress && progress.total > 1) {
        toast.success(`[${progress.current}/${progress.total}] Decoded: ${file.name}`);
      } else {
        toast.success(`Successfully decoded: ${file.name}`);
      }

      // Refresh gallery to show decoded file and hide original
      // For batch operations, only refresh at the end (when current === total)
      if (!progress || progress.current === progress.total) {
        await handleRefresh(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decode image';
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleClipVideos = async (selectedPaths: string[]) => {
    const { clipConfig } = useVideoClipStore.getState();

    try {
      const response = await fetch(API_ENDPOINTS.VIDEOS_CLIP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: selectedPaths,
          clip_config: clipConfig,
          timeout: 3600,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActiveConsoleTaskId(data.task_id);
        toast.success(`Started clipping ${selectedPaths.length} video${selectedPaths.length > 1 ? 's' : ''}`);
      } else {
        toast.error(data.error || 'Failed to start clipping');
      }
    } catch (error) {
      console.error('Error clipping videos:', error);
      toast.error('Failed to start clipping');
    }
  };

  const handleClipSingleVideo = useCallback((video: MediaFile) => {
    handleClipVideos([video.path]);
  }, []);

  const handleVideoSelectionChange = useCallback((videoPath: string, selected: boolean) => {
    updateMediaFile(videoPath, { selected });
  }, [updateMediaFile]);

  const handleRenameVideo = async (video: any, newName: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.VIDEOS_RENAME, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: video.path,
          new_name: newName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Renamed to ${data.new_name}`);
        await handleRefresh(true);
      } else {
        toast.error(data.error || 'Failed to rename video');
      }
    } catch (error) {
      console.error('Error renaming video:', error);
      toast.error('Failed to rename video');
    }
  };

  const handleDeleteVideo = async (video: any) => {
    try {
      const response = await fetch(API_ENDPOINTS.VIDEOS_DELETE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: [video.path],
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Video deleted');
        await handleRefresh(true);
      } else {
        toast.error(data.error || 'Failed to delete video');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  const handlePreviewFile = useCallback((file: MediaFile) => {
    if (file.type === 'video') {
      setPreviewVideo(file);
    } else if (file.type === 'image') {
      setPreviewImage(file);
    } else {
      toast.error('Preview is only available for image and video files');
    }
  }, []);

  const handleSortChange = useCallback((field: typeof mediaSortField, direction: typeof mediaSortDirection) => {
    setMediaSorting(field, direction);
  }, [setMediaSorting]);

  // Feature cards for workspace
  const featureCards = (
    <div className="grid md:grid-cols-2 gap-6 mt-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="h-5 w-5 text-purple-600" />
            File System Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Modern, secure folder selection directly in your browser.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">Secure</Badge>
              <Badge variant="secondary" className="text-xs">Cross-platform</Badge>
              <Badge variant="secondary" className="text-xs">No Upload</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <WorkflowIcon className="h-5 w-5 text-indigo-600" />
            Workflow Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Configure custom workflows with input parameters and job history tracking.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">Flexible</Badge>
              <Badge variant="secondary" className="text-xs">Parameterized</Badge>
              <Badge variant="secondary" className="text-xs">Re-runnable</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:bg-[#0d1117] dark:from-[#0d1117] dark:to-[#161b22]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <PageHeader
          badgeText="RunningHub Workspace"
          icon={Settings}
          showBackButton={!!selectedFolder}
          onBackClick={handleBackToSelection}
          colorVariant="purple"
        />

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {!selectedFolder ? (
          <FolderSelectionLayout
            title="Select Workspace Folder"
            description="Choose a folder containing media files to process using RunningHub AI workflows. Configure custom workflows and track job history."
            icon={Settings}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
            onFolderSelected={handleFolderSelected}
            onError={handleError}
            features={featureCards}
          />
        ) : (
          /* Selected Folder Display */
          <div className="space-y-6">
            <SelectedFolderHeader
              folderName={selectedFolder.folder_name}
              folderPath={selectedFolder.folder_path}
              itemCount={mediaFiles.length}
              itemType="images"
              isVirtual={selectedFolder.is_virtual}
              isLoading={false}
              onRefresh={() => handleRefresh(false)}
              colorVariant="purple"
            />

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="media" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Media Gallery
                </TabsTrigger>
                <TabsTrigger value="youtube" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube
                </TabsTrigger>
                <TabsTrigger value="clip" className="flex items-center gap-2">
                  <Scissors className="h-4 w-4" />
                  Clip
                </TabsTrigger>
                <TabsTrigger value="run-workflow" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Run Workflow
                </TabsTrigger>
                <TabsTrigger value="workflows" className="flex items-center gap-2">
                  <WorkflowIcon className="h-4 w-4" />
                  Workflows
                </TabsTrigger>
                <TabsTrigger value="jobs" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Job History
                </TabsTrigger>
              </TabsList>

              {/* Media Gallery Tab */}
              <TabsContent value="media" className="space-y-6 mt-6">
                {/* Media Selection Toolbar */}
                {selectedFiles.length > 0 && (
                <MediaSelectionToolbar
                  selectedFiles={selectedFiles}
                  onRename={handleRenameFile}
                  onDelete={handleDeleteFile}
                  onDecode={handleDecodeFile}
                  onRunWorkflow={handleQuickRunWorkflow}
                  onClip={async (files) => {
                    const videoPaths = files.map(f => f.path);
                    await handleClipVideos(videoPaths);
                  }}
                  onPreview={handlePreviewFile}
                />
                )}

                {/* Sort Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MediaSortControls
                      sortField={mediaSortField}
                      sortDirection={mediaSortDirection}
                      onSortChange={handleSortChange}
                    />
                  </div>
                </div>

                {/* Media Gallery */}
                <MediaGallery
                  onRename={handleRenameFile}
                  onDelete={handleDeleteFile}
                  onDecode={handleDecodeFile}
                  onClipVideo={handleClipSingleVideo}
                  onPreview={handlePreviewFile}
                />
              </TabsContent>

              {/* YouTube Download Tab */}
              <TabsContent value="youtube" className="mt-6">
                <div className="max-w-2xl mx-auto">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold">Download YouTube Videos</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Download videos from YouTube (including shorts) directly to your workspace folder
                    </p>
                  </div>
                  <YoutubeDownloader
                    onDownloadStart={(taskId) => {
                      setActiveConsoleTaskId(taskId);
                    }}
                    onDownloadComplete={(success) => {
                      if (success) {
                        // Refresh media gallery to show downloaded video
                        handleRefresh(false);
                      }
                      setActiveConsoleTaskId(null);
                    }}
                  />
                </div>
              </TabsContent>

              {/* Clip Tab */}
              <TabsContent value="clip" className="space-y-6 mt-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold">Video Clipping</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Extract images from videos using FFmpeg. Videos are automatically filtered from your workspace folder.
                  </p>
                </div>

                {/* Clip Configuration */}
                <VideoClipConfiguration />

                {/* Selection Toolbar */}
                <VideoClipSelectionToolbar
                  selectedCount={selectedVideoCount}
                  onClip={(selectedPaths) => handleClipVideos(selectedPaths)}
                  onRefresh={() => handleRefresh(true)}
                  onRename={handleRenameVideo}
                  onPreview={(selectedPaths) => {
                    if (selectedPaths.length > 0) {
                      const video = filteredVideos.find(v => v.path === selectedPaths[0]);
                      if (video) {
                        handlePreviewFile(video);
                      }
                    }
                  }}
                  disabled={false}
                />

                {/* Video Gallery - filtered to videos only */}
                <VideoGallery
                  videos={adaptedVideos}
                  isLoading={false}
                  onRefresh={() => handleRefresh(true)}
                  onRename={handleRenameVideo}
                  onDelete={handleDeleteVideo}
                />
              </TabsContent>

              {/* Run Workflow Tab */}
              <TabsContent value="run-workflow" className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Select Files & Run Workflow</h3>
                </div>

                {/* Workflow Selector and Input Builder */}
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Workflow Selector */}
                  <div className="lg:col-span-1 overflow-visible">
                    <WorkflowSelector onAddWorkflow={handleAddWorkflow} />
                  </div>

                  {/* Workflow Input Builder */}
                  <div className="lg:col-span-2">
                    {selectedWorkflowId && workflows.find((w) => w.id === selectedWorkflowId) ? (
                      <WorkflowInputBuilder
                        workflow={workflows.find((w) => w.id === selectedWorkflowId)!}
                        onRunJob={handleRunJob}
                      />
                    ) : (
                      <Card className="p-8 text-center text-gray-500">
                        <WorkflowIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-sm">Select a workflow to configure inputs</p>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Workflows Tab */}
              <TabsContent value="workflows" className="mt-6">
                <WorkflowList />
              </TabsContent>

              {/* Jobs Tab */}
              <TabsContent value="jobs" className="mt-6">
                {selectedJobId ? (
                  <JobDetail
                    jobId={selectedJobId}
                    onBack={() => setSelectedJob(null)}
                  />
                ) : (
                  <JobList onJobClick={(job) => setSelectedJob(job.id)} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Console Viewer */}
        <ConsoleViewer
          onRefresh={handleRefresh}
          onTaskComplete={handleTaskComplete}
          onStatusChange={handleStatusChange}
          taskId={activeConsoleTaskId}
          defaultVisible={false}
        />

        {/* Workflow Editor Dialog */}
        {isEditingWorkflow && (
          <WorkflowEditor
            workflow={editingWorkflow}
            onSave={handleSaveWorkflow}
            onCancel={() => {
              setIsEditingWorkflow(false);
              setEditingWorkflow(undefined);
            }}
            onDelete={editingWorkflow ? handleDeleteWorkflow : undefined}
            open={isEditingWorkflow}
          />
        )}

        {/* Quick Run Workflow Dialog */}
        <QuickRunWorkflowDialog
          open={showQuickRunDialog}
          onOpenChange={setShowQuickRunDialog}
          selectedFiles={selectedFiles}
          workflows={workflows}
          onConfirm={handleQuickRunWorkflow}
        />

        {/* Video Player Modal */}
        <VideoPlayerModal
          video={previewVideo ? {
            path: previewVideo.path,
            name: previewVideo.name,
            size: previewVideo.size,
            type: 'video' as const,
            extension: previewVideo.extension || '',
            blob_url: previewVideo.blobUrl,
            duration: previewVideo.duration,
            created_at: previewVideo.created_at || 0,
            modified_at: previewVideo.modified_at || 0,
            width: previewVideo.width,
            height: previewVideo.height,
            fps: previewVideo.fps,
          } : null}
          isOpen={!!previewVideo}
          onClose={() => setPreviewVideo(null)}
        />

        {/* Image Preview Modal */}
        <ImagePreviewModal
          file={previewImage}
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
        />
      </div>
    </div>
  );
}
