'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFolderStore } from '@/store/folder-store';
import { useImageStore } from '@/store/image-store';
import { useSelectionStore } from '@/store/selection-store';
import { useFolderSelection } from '@/hooks/useFolderSelection';
import { useAutoLoadFolder } from '@/hooks/useAutoLoadFolder';
import { SelectedFolderHeader } from '@/components/folder/SelectedFolderHeader';
import { FolderSelectionLayout } from '@/components/folder/FolderSelectionLayout';
import { ImageGallery } from '@/components/images';
import { ImageProcessConfig } from '@/components/images';
import { ImageGallerySkeleton } from '@/components/images/ImageGallerySkeleton';
import { MediaSortControls } from '@/components/images';
import { SelectionToolbar } from '@/components/selection';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  AlertCircle,
  Images,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { useFolderStore as useLegacyFolderStore, useImageStore as useLegacyImageStore, useSelectionStore as useLegacySelectionStore, useProcessStore } from '@/store';
import { useFileSystem } from '@/hooks';
import { API_ENDPOINTS, ENVIRONMENT_VARIABLES } from '@/constants';
import type { ImageFile } from '@/types';

export default function GalleryPage() {
  // Store state - use new modular stores
  const { selectedFolder, isLoadingFolder } = useFolderStore();
  const { images, isLoadingImages, error: imageError, sortField, sortDirection } = useImageStore();
  const { deselectAll } = useSelectionStore();

  // Use legacy stores for process config (until migrated)
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

  const handleRefresh = async (silent = false) => {
    if (selectedFolder) {
      await loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id, silent);
    }
  };

  // Use folder selection hook with error handling
  const { handleFolderSelected } = useFolderSelection({
    folderType: 'images',
  });

  // Load nodes on mount
  useEffect(() => {
    loadNodes();
  }, []);

  // Auto-load last opened folder on mount
  useAutoLoadFolder({
    folderType: 'images',
    onFolderLoaded: (folder) => {
      // Load folder contents when auto-loaded
      loadFolderContents(folder.folder_path, folder.session_id);
    },
  });

  // Load folder contents when folder is selected
  useEffect(() => {
    if (selectedFolder) {
      loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
    }
  }, [selectedFolder, loadFolderContents]);

  // Always reload files when page mounts or navigation occurs
  useEffect(() => {
    if (selectedFolder) {
      // Silent refresh on page mount/navigation
      loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id, true);
    }
  }, []); // Empty dependency array = runs once on mount

  // Combine errors
  const error = localError || imageError;

  const loadNodes = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.NODES);
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : { success: false };
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
      }

      if (data.success && data.nodes) {
        setNodes(data.nodes);
      }
    } catch (err) {
      console.error('Failed to load nodes:', err);
      toast.error('Failed to load available nodes');
    }
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

  const handleDelete = async (selectedPaths: string[]) => {
    try {
      const response = await fetch(API_ENDPOINTS.IMAGES_DELETE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: selectedPaths }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : { success: false, error: 'Empty response' };
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete images');
      }

      // Reload folder contents
      if (selectedFolder) {
        await loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
      }

      deselectAll();
      logger.success(`Deleted ${selectedPaths.length} image${selectedPaths.length !== 1 ? 's' : ''}`, {
        metadata: { count: selectedPaths.length, paths: selectedPaths.slice(0, 3) }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete images';
      logger.error(errorMessage, {
        metadata: { count: selectedPaths.length, error: errorMessage }
      });
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
          deleteOriginal: processConfig.deleteOriginal,
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

  const handleSortChange = useCallback((field: typeof sortField, direction: typeof sortDirection) => {
    useImageStore.getState().setSorting(field, direction);
  }, []);

  // Feature cards for gallery
  const featureCards = (
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
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:bg-[#0d1117] dark:from-[#0d1117] dark:to-[#161b22]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <PageHeader
          badgeText="RunningHub Gallery"
          icon={Images}
          showBackButton={!!selectedFolder}
          onBackClick={handleBackToSelection}
          colorVariant="blue"
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
            title="Select Image Folder"
            description="Choose a folder containing images to process using RunningHub AI workflows. You can use modern File System Access API or manual folder input."
            icon={Images}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
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
              itemCount={images.length}
              itemType="images"
              isVirtual={selectedFolder.is_virtual}
              isLoading={isLoadingImages}
              onRefresh={() => handleRefresh(false)}
              colorVariant="blue"
            />

            {/* Selection Toolbar */}
            <SelectionToolbar
              onProcess={handleProcess}
              onDelete={handleDelete}
              nodes={nodes}
              selectedNode={selectedNode}
              onNodeChange={setSelectedNode}
            />

            {/* Sort Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MediaSortControls
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                />
              </div>
            </div>

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
          taskId={activeConsoleTaskId}
          defaultVisible={false}
        />
      </div>
    </div>
  );
}
