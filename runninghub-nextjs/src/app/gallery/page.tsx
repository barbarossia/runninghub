'use client';

import { useState, useEffect, useCallback } from 'react';
import FolderSelector, { FolderInfo as FolderSelectorFolderInfo } from '@/components/folder/FolderSelector';
import { ImageGallery, ImageProcessConfig } from '@/components/images';
import { ImageGallerySkeleton } from '@/components/images/ImageGallerySkeleton';
import { SelectionToolbar } from '@/components/selection';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  AlertCircle,
  Home,
  Images,
  ArrowLeft,
  RefreshCw,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  useFolderStore,
  useImageStore,
  useSelectionStore,
  useProcessStore,
} from '@/store';
import { useFileSystem } from '@/hooks';
import { API_ENDPOINTS, ENVIRONMENT_VARIABLES } from '@/constants';
import type { ImageFile } from '@/types';

export default function GalleryPage() {
  // Store state
  const { selectedFolder, isLoadingFolder } = useFolderStore();
  const { images, isLoadingImages, error: imageError } = useImageStore();
  const { deselectAll } = useSelectionStore();
  const { config: processConfig, setConfig: setProcessConfig } = useProcessStore();

  // Local state
  const [localError, setLocalError] = useState<string>('');
  const [nodes, setNodes] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedNode, setSelectedNode] = useState<string>(
    ENVIRONMENT_VARIABLES.DEFAULT_NODE_ID
  );
  const [activeConsoleTaskId, setActiveConsoleTaskId] = useState<string | null>(null);

  // Custom hooks
  const { loadFolderContents } = useFileSystem();

  // Combine errors
  const error = localError || imageError;

  // Load nodes on mount
  useEffect(() => {
    loadNodes();
  }, []);

  // Load folder contents when folder is selected
  useEffect(() => {
    if (selectedFolder) {
      loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
    }
  }, [selectedFolder, loadFolderContents]);

  const loadNodes = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.NODES);
      const data = await response.json();

      if (data.success && data.nodes) {
        setNodes(data.nodes);
      }
    } catch (err) {
      console.error('Failed to load nodes:', err);
      toast.error('Failed to load available nodes');
    }
  };

  const handleFolderSelected = (folderInfo: FolderSelectorFolderInfo) => {
    setLocalError('');

    // Set the selected folder in the store
    const { setSelectedFolder, addRecentFolder } = useFolderStore.getState();
    setSelectedFolder({
      success: true,
      folder_name: folderInfo.name,
      folder_path: folderInfo.path,
      session_id: folderInfo.session_id,
      is_virtual: folderInfo.is_virtual,
      message: 'Folder selected',
    });

    // Add to recent folders if we have a path
    if (folderInfo.path) {
      addRecentFolder({
        name: folderInfo.name,
        path: folderInfo.path,
        source: folderInfo.source as 'filesystem_api' | 'manual_input',
      });
    }

    // If File System Access API provided images directly, load them into the store
    if (folderInfo.images && folderInfo.images.length > 0) {
      const { setImages } = useImageStore.getState();
      setImages(folderInfo.images);

      // Also set folder contents
      const { setFolderContents } = useFolderStore.getState();
      setFolderContents({
        current_path: folderInfo.path,
        parent_path: undefined,
        images: folderInfo.images,
        folders: (folderInfo.folders || []).map(f => ({ ...f, type: 'folder' as const })),
        videos: [], // Initialize empty videos array for gallery
        is_direct_access: true,
      });
    }
    // Otherwise, the useEffect will load contents via API
  };

  const handleError = (errorMessage: string) => {
    setLocalError(errorMessage);
  };

  const handleBackToSelection = () => {
    const { clearFolder } = useFolderStore.getState();
    clearFolder();
    useImageStore.getState().setImages([]);
    deselectAll();
    setLocalError('');
  };

  const handleRefresh = async (silent = false) => {
    if (selectedFolder) {
      await loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id, silent);
    }
  };

  const handleDelete = async (selectedPaths: string[]) => {
    try {
      const response = await fetch(API_ENDPOINTS.IMAGES_DELETE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: selectedPaths }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete images');
      }

      // Reload folder contents
      if (selectedFolder) {
        await loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
      }

      deselectAll();
      toast.success(`Deleted ${selectedPaths.length} image${selectedPaths.length !== 1 ? 's' : ''}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete images';
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleProcess = async (selectedPaths: string[]) => {
    if (!selectedFolder) {
      toast.error('No folder selected');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.IMAGES_PROCESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: selectedPaths,
          node_id: selectedNode,
          folder_path: selectedFolder.folder_path,
          session_id: selectedFolder.session_id,
          params: {
            '231:text': processConfig.triggerWord,
            '235:value': processConfig.width.toString(),
            '236:value': processConfig.height.toString(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process images');
      }

      // Start tracking progress
      if (data.task_id) {
        setActiveConsoleTaskId(data.task_id);
      }

      deselectAll();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process images';
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleImageClick = useCallback((image: ImageFile) => {
    // Could open image preview modal here
    console.log('Image clicked:', image);
  }, []);

  const handleImageDoubleClick = useCallback((image: ImageFile) => {
    // Could open image in full screen or download here
    console.log('Image double clicked:', image);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>

            {selectedFolder && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToSelection}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Selection
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Images className="h-3 w-3 mr-1" />
              RunningHub Gallery
            </Badge>
            <ThemeToggle />
          </div>
        </div>

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
          /* Folder Selection */
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Select Image Folder
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Choose a folder containing images to process using RunningHub AI workflows.
                You can use modern File System Access API or manual folder input.
              </p>
            </div>

            <FolderSelector
              onFolderSelected={handleFolderSelected}
              onError={handleError}
            />

            {/* Feature Cards */}
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
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
                    <Settings className="h-5 w-5 text-green-600" />
                    Manual Input
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Direct folder path input for advanced users and server deployment.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">Flexible</Badge>
                      <Badge variant="secondary" className="text-xs">Server-ready</Badge>
                      <Badge variant="secondary" className="text-xs">Absolute paths</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Selected Folder Display */
          <div className="space-y-6">
            {/* Compact Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-gray-900 truncate">
                    {selectedFolder.folder_name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span 
                      className="truncate max-w-[300px] sm:max-w-[500px]" 
                      title={selectedFolder.folder_path}
                    >
                      {selectedFolder.folder_path}
                    </span>
                    <Badge variant="secondary" className="h-5 px-1.5 font-normal text-[10px]">
                      {images.length} images
                    </Badge>
                    {selectedFolder.is_virtual && (
                      <Badge variant="outline" className="h-5 px-1.5 font-normal text-[10px]">
                        FS API
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100"
                  onClick={() => handleRefresh(false)}
                  disabled={isLoadingImages}
                  title="Refresh folder"
                >
                  <RefreshCw className={`h-4 w-4 text-gray-600 ${isLoadingImages ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Selection Toolbar */}
            <SelectionToolbar
              onProcess={handleProcess}
              onDelete={handleDelete}
              nodes={nodes}
              selectedNode={selectedNode}
              onNodeChange={setSelectedNode}
            />

            {/* Process Config */}
            <ImageProcessConfig
              config={processConfig}
              onConfigChange={setProcessConfig}
            />

            {/* Image Gallery */}
            {isLoadingFolder || isLoadingImages ? (
              <ImageGallerySkeleton viewMode={useImageStore.getState().viewMode} count={12} />
            ) : (
              <ImageGallery
                onImageClick={handleImageClick}
                onImageDoubleClick={handleImageDoubleClick}
              />
            )}
          </div>
        )}

        {/* Console Viewer */}
        <ConsoleViewer 
          onRefresh={handleRefresh} 
          autoRefreshInterval={5000} 
          taskId={activeConsoleTaskId}
        />
      </div>
    </div>
  );
}
