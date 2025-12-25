/**
 * Workspace Page
 * Main page for workspace management with image upload, processing, and text editing
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useWorkspace } from '@/hooks/useWorkspace';
import { WorkspaceUploadArea } from '@/components/workspace/WorkspaceUploadArea';
import { WorkspaceToolbar } from '@/components/workspace/WorkspaceToolbar';
import { WorkspaceGrid } from '@/components/workspace/WorkspaceGrid';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { PageHeader } from '@/components/navigation/PageHeader';
import { SelectedFolderHeader } from '@/components/folder/SelectedFolderHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Settings, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { ENVIRONMENT_VARIABLES, ERROR_MESSAGES } from '@/constants';

export default function WorkspacePage() {
  const router = useRouter();
  const {
    config,
    uploadedFiles,
    selectedFiles,
    isProcessing,
    activeTaskId,
    setWorkflowId,
    setConfig,
  } = useWorkspaceStore();

  const { uploadImages, processImages, clearAll } = useWorkspace({
    onUploadComplete: (files) => {
      toast.success(`Uploaded ${files.length} file(s)`);
    },
    onProcessComplete: (taskId) => {
      toast.success('Processing started');
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const [workflowInput, setWorkflowInput] = useState(config.workflowId || '');
  const [showWorkflowConfig, setShowWorkflowConfig] = useState(!config.workflowId);

  // Redirect to home if workspace path is not configured
  useEffect(() => {
    if (!ENVIRONMENT_VARIABLES.WORKSPACE_PATH) {
      toast.error(ERROR_MESSAGES.WORKSPACE_NOT_CONFIGURED);
      router.push('/');
    }
  }, [router]);

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleUpload = async (files: File[]) => {
    await uploadImages(files);
  };

  const handleProcessSelected = async (fileIds: string[]) => {
    if (!config.workflowId) {
      toast.error(ERROR_MESSAGES.NO_WORKFLOW_ID);
      setShowWorkflowConfig(true);
      return;
    }

    await processImages(fileIds);
  };

  const handleClearAll = () => {
    clearAll();
    toast.info('Workspace cleared');
  };

  const handleSaveWorkflowId = () => {
    if (!workflowInput.trim()) {
      toast.error('Workflow ID is required');
      return;
    }

    setWorkflowId(workflowInput.trim());
    setShowWorkflowConfig(false);
    toast.success('Workflow ID saved');
  };

  if (!ENVIRONMENT_VARIABLES.WORKSPACE_PATH) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <PageHeader
          badgeText="RunningHub Workspace"
          icon={Settings}
          showBackButton={false}
          colorVariant="purple"
        />

        {/* Workflow Configuration Modal */}
        {showWorkflowConfig && (
          <Card className="mb-6 border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Settings className="h-5 w-5" />
                Configure Workflow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workflow-id">RunningHub Workflow ID</Label>
                  <Input
                    id="workflow-id"
                    placeholder="Enter your workflow ID"
                    value={workflowInput}
                    onChange={(e) => setWorkflowInput(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    This workflow will process uploaded images and generate text files
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveWorkflowId} className="flex-1">
                    Save Workflow ID
                  </Button>
                  {config.workflowId && (
                    <Button
                      variant="outline"
                      onClick={() => setShowWorkflowConfig(false)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workspace Path Display */}
        {uploadedFiles.length > 0 && (
          <SelectedFolderHeader
            folderName="Workspace"
            folderPath={ENVIRONMENT_VARIABLES.WORKSPACE_PATH}
            itemCount={uploadedFiles.length}
            itemType="images"
            isVirtual={false}
            isLoading={isProcessing}
            onRefresh={() => {}}
            colorVariant="purple"
          />
        )}

        {/* Main Content */}
        {uploadedFiles.length === 0 ? (
          <>
            <WorkspaceUploadArea onUpload={handleUpload} isUploading={isProcessing} />

            {/* Workspace Info */}
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderOpen className="h-5 w-5 text-purple-600" />
                    Workspace Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Upload images to your workspace folder and process them
                      through RunningHub AI workflows to generate text content.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        Image Upload
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        AI Processing
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        Bilingual Text
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5 text-purple-600" />
                    Translation Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Edit and translate text content between English and Chinese.
                      Powered by Chrome AI Translator API with fallback support.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        English ↔ Chinese
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        Real-time Translation
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        Save to Disk
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <WorkspaceToolbar
              onProcessSelected={handleProcessSelected}
              onClearAll={handleClearAll}
            />
            <WorkspaceGrid />
          </div>
        )}

        {/* Console Viewer */}
        <ConsoleViewer
          onRefresh={() => {}}
          taskId={activeTaskId}
          defaultVisible={true}
        />
      </div>
    </div>
  );
}
