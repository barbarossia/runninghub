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
import { API_ENDPOINTS } from '@/constants';
import type { Workflow, Job, MediaFile } from '@/types/workspace';

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

    // Convert images to MediaFile format with serve URLs
    const imageFiles = (result.images || []).map((file: any) => ({
      id: file.path,
      name: file.name,
      path: file.path,
      type: 'image' as const,
      extension: file.name.split('.').pop() || '',
      size: file.size || 0,
      width: file.width,
      height: file.height,
      thumbnail: `/api/images/serve?path=${encodeURIComponent(file.path)}`,
      selected: false,
    }));

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
      
      if (status === 'completed') {
        toast.success('Job completed successfully');
        handleRefresh(true); // Refresh folder contents to show new files
      } else {
        toast.error('Job failed');
      }
    }
  }, [jobs, updateJob, handleRefresh]);

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
    onFolderLoaded: (folder) => {
      // Folder is automatically set as selected by the hook
      // The useEffect below will load contents when selectedFolder changes
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
      toast.success('Workflow updated');
    } else {
      addWorkflow(workflow);
      toast.success('Workflow created');
    }
    setIsEditingWorkflow(false);
    setEditingWorkflow(undefined);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setIsEditingWorkflow(true);
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
        toast.success('Workflow deleted');
      } catch (error) {
        console.error('Delete workflow error:', error);
        toast.error('Failed to delete workflow');
      }
    }
  };

  const handleAddWorkflow = () => {
    setEditingWorkflow(undefined);
    setIsEditingWorkflow(true);
  };

  const handleRunJob = async () => {
    if (!selectedWorkflowId) {
      toast.error('Please select a workflow');
      return;
    }

    const workflow = workflows.find((w) => w.id === selectedWorkflowId);
    if (!workflow) {
      toast.error('Workflow not found');
      return;
    }

    const { jobFiles, jobInputs, validateJobInputs } = useWorkspaceStore.getState();
    const validationResult = validateJobInputs(workflow);

    if (!validationResult.valid) {
      toast.error('Please fix validation errors before running');
      return;
    }

    // Auto-assign selected files if any
    autoAssignSelectedFilesToWorkflow(workflow.id);

    try {
      const response = await fetch(API_ENDPOINTS.WORKSPACE_EXECUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: workflow.id,                        // Actual workflow ID
          sourceWorkflowId: workflow.sourceWorkflowId,    // Template ID for CLI
          fileInputs: jobFiles,
          textInputs: jobInputs,
          folderPath: selectedFolder?.folder_path,
          deleteSourceFiles: false,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : { success: false, error: 'Empty response' };
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute job');
      }

      // Create job in store
      const newJob: Job = {
        id: data.jobId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        fileInputs: jobFiles,
        textInputs: jobInputs,
        status: 'pending',
        taskId: data.taskId,
        createdAt: Date.now(),
        folderPath: selectedFolder?.folder_path,
        deleteSourceFiles: false, // Will be set from checkbox in next phase
      };

      addJob(newJob);

      // Select the newly created job
      setSelectedJob(newJob.id);

      // Start tracking progress
      if (data.taskId) {
        setActiveConsoleTaskId(data.taskId);
      }

      // Clear job inputs and switch to jobs tab
      clearJobInputs();
      setActiveTab('jobs');
      toast.success('Job started');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute job';
      toast.error(errorMessage);
    }
  };

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
      // For now, just show a toast - actual API integration to be added
      toast.success(`Rename "${file.name}" to "${newName}" - API integration pending`);
      // TODO: Implement actual rename API call
      // const response = await fetch(API_ENDPOINTS.WORKSPACE_RENAME, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ path: file.path, newName }),
      // });
      // Then reload folder contents
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename file';
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleDeleteFile = async (files: MediaFile[]) => {
    try {
      // For now, just show a toast - actual API integration to be added
      toast.success(`Delete ${files.length} file${files.length !== 1 ? 's' : ''} - API integration pending`);
      // TODO: Implement actual delete API call
      // Then reload folder contents
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      toast.error(errorMessage);
      throw err;
    }
  };

  const handlePreviewFile = (file: MediaFile) => {
    // Preview is handled internally by MediaGallery component
    console.log('Preview file:', file);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
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
                    onRunWorkflow={handleQuickRunWorkflow}
                  />
                )}

                {/* Media Gallery */}
                <MediaGallery
                  onRename={handleRenameFile}
                  onDelete={handleDeleteFile}
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
