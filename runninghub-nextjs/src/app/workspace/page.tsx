/**
 * Workspace Page
 * Main page for workflow execution with folder selection, media gallery, workflows, and job history
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/constants';
import type { Workflow, Job } from '@/types/workspace';

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
    setSelectedJob,
    clearJobInputs,
  } = useWorkspaceStore();

  // Local state
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'media' | 'workflows' | 'jobs'>('media');
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>();
  const [activeConsoleTaskId, setActiveConsoleTaskId] = useState<string | null>(null);

  // Custom hooks
  const { loadFolderContents } = useFileSystem();

  const handleRefresh = async (silent = false) => {
    if (selectedFolder) {
      await loadFolderContents(
        selectedFolder.folder_path,
        selectedFolder.session_id,
        silent
      );
    }
  };

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
          if (result) {
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
              duration: file.duration,
              fps: file.fps,
              thumbnail: file.thumbnail ? `/api/images/serve?path=${encodeURIComponent(file.thumbnail)}` : undefined,
              blobUrl: `/api/videos/serve?path=${encodeURIComponent(file.path)}`,
              selected: false,
            }));

            // Combine both types
            setMediaFiles([...imageFiles, ...videoFiles]);
          }
        }
      );
    }
  }, [selectedFolder, loadFolderContents, setMediaFiles]);

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

  const handleDeleteWorkflow = (id: string) => {
    if (confirm('Delete this workflow? This action cannot be undone.')) {
      deleteWorkflow(id);
      toast.success('Workflow deleted');
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

    try {
      const response = await fetch(API_ENDPOINTS.WORKSPACE_EXECUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: workflow.id,
          fileInputs: jobFiles,
          textInputs: jobInputs,
          folderPath: selectedFolder?.folder_path,
        }),
      });

      const data = await response.json();

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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="media" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Media Gallery
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
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Select Files & Run Workflow</h3>
                </div>

                {/* Workflow Selector and Input Builder */}
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Workflow Selector */}
                  <div className="lg:col-span-1">
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

                {/* Media Gallery */}
                <MediaGallery />
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
      </div>
    </div>
  );
}
