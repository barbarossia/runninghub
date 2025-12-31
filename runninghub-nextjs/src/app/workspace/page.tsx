/**
 * Workspace Page
 * Main page for workflow execution with folder selection, media gallery, workflows, and job history
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useFolderStore } from '@/store/folder-store';
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
import {
  Settings,
  FolderOpen,
  Workflow as WorkflowIcon,
  Clock,
  AlertCircle,
  Plus,
  Upload,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { API_ENDPOINTS } from '@/constants';
import type { Workflow, Job, MediaFile, FileInputAssignment } from '@/types/workspace';

export default function WorkspacePage() {
  // Folder store state - selectedFolder comes from here
  const { selectedFolder } = useFolderStore();

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
  const [activeTab, setActiveTab] = useState<'media' | 'run-workflow' | 'workflows' | 'jobs'>('media');
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>();
  const [activeConsoleTaskId, setActiveConsoleTaskId] = useState<string | null>(null);
  const [showQuickRunDialog, setShowQuickRunDialog] = useState(false);

  // Get selected files from store
  const selectedFiles = useMemo(() => getSelectedMediaFiles(), [mediaFiles]);

  // Custom hooks
  const { loadFolderContents } = useFileSystem();

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
  }, [setMediaFiles]);

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

  // Use folder selection hook (using 'images' type for workspace)
  const { handleFolderSelected } = useFolderSelection({
    folderType: 'images',
  });

  // Auto-load last opened folder on mount
  useAutoLoadFolder({
    folderType: 'images',
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

  // Clear job inputs when workflow changes to prevent contamination
  useEffect(() => {
    // Clear file assignments when user switches to a different workflow
    // This prevents inputs from previous workflow from being included in new jobs
    clearJobInputs();
  }, [selectedWorkflowId, clearJobInputs]);

  // Validate duck encoding for selected images (only when selected, not all images)
  useEffect(() => {
    const validateSelectedImages = async () => {
      // Only validate single selections for duck decoding
      if (selectedFiles.length !== 1) return;

      const file = selectedFiles[0];

      // Only validate images
      if (file.type !== 'image') return;

      // Skip if already validated (true or false) or validation is in progress
      if (file.isDuckEncoded !== undefined || file.duckValidationPending) return;

      console.log('[Workspace] Validating duck encoding for selected image:', file.name);

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
    const { setSelectedFolder } = useFolderStore.getState();
    const { setMediaFiles } = useWorkspaceStore.getState();
    setSelectedFolder(null);
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

      // DON'T clear inputs - Job Detail page will manage its own inputs
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

  const handleDecodeFile = async (file: MediaFile, password?: string) => {
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

      toast.success(`Successfully decoded: ${file.name}`);

      // Refresh gallery to show decoded file and hide original
      await handleRefresh(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decode image';
      toast.error(errorMessage);
      throw err;
    }
  };

  const handlePreviewFile = (file: MediaFile) => {
    // Preview is handled internally by MediaGallery component
    console.log('Preview file:', file);
  };

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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="media" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Media Gallery
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
                  onPreview={handlePreviewFile}
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
          defaultVisible={true}
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
      </div>
    </div>
  );
}
