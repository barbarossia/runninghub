'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FolderOpen,
  HardDrive,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  Globe,
  Clock,
} from 'lucide-react';
import {
  getFileSystemAccessStatus,
  openDirectoryPicker,
  getDirectoryInfo,
  convertToProcessableFormat,
  getFallbackInstructions,
  createDirectoryData,
} from '@/utils/filesystem-api';
import { apiRequest } from '@/utils/api';
import { useFolderStore } from '@/store';
import { ImageFile, VideoFile, FolderItem } from '@/types';

export interface FolderInfo {
  name: string;
  path: string;
  session_id?: string;
  is_virtual?: boolean;
  source?: string;
  images?: ImageFile[];
  videos?: VideoFile[];
  folders?: FolderItem[];
}

interface FolderSelectorProps {
  onFolderSelected: (folderInfo: FolderInfo) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function FolderSelector({
  onFolderSelected,
  onError,
  className = '',
}: FolderSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [manualPath, setManualPath] = useState<string>('');
  const [fileSystemStatus, setFileSystemStatus] = useState({
    supported: false,
    secureContext: false,
    available: false,
    message: 'Checking browser compatibility...'
  });
  const [lastUsedFolder, setLastUsedFolder] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [validationLoading, setValidationLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { recentFolders } = useFolderStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Check file system API status on component mount (client-side only)
  useEffect(() => {
    const status = getFileSystemAccessStatus();
    setFileSystemStatus(status);
    setMounted(true);
  }, []);

  const handleFolderPicker = async () => {
    if (!fileSystemStatus.available) {
      onError?.('File System Access API is not available in this browser');
      return;
    }

    setIsLoading(true);
    setValidationError('');

    try {
      const directoryHandle = await openDirectoryPicker();

      if (!directoryHandle) {
        return; // User cancelled
      }

      const directoryInfo = await getDirectoryInfo(directoryHandle);

      // Convert to processable format with blob URLs
      const { images, videos, folders, cleanup } = convertToProcessableFormat(directoryInfo.entries);

      // Cleanup previous blob URLs
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      cleanupRef.current = cleanup;

      // Create directory data for API
      const directoryData = createDirectoryData(directoryHandle, directoryInfo.entries);

      // Process the folder via API
      const response = await apiRequest('/api/folder/process-direct', {
        method: 'POST',
        body: JSON.stringify(directoryData),
      }) as {
        success: boolean;
        virtual_path?: string;
        actual_path?: string;
        session_id?: string;
        error?: string;
      };

      if (response.success) {
        setSelectedFolder(directoryInfo.name);
        setLastUsedFolder(directoryInfo.name);

        onFolderSelected({
          name: directoryInfo.name,
          path: response.virtual_path || response.actual_path || '',
          images,
          videos,
          source: 'filesystem_api',
          session_id: response.session_id,
          is_virtual: !!response.virtual_path,
        });
      } else {
        throw new Error(response.error || 'Failed to process folder');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to select folder';
      setValidationError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualInput = async (pathOverride?: string) => {
    const pathToUse = pathOverride || manualPath;
    
    if (!pathToUse.trim()) {
      setValidationError('Please enter a folder path');
      return;
    }

    setValidationLoading(true);
    setValidationError('');
    
    // Update local state if using override
    if (pathOverride) {
      setManualPath(pathOverride);
    }

    try {
      // Validate the path first
      const validateResponse = await apiRequest('/api/folder/validate-path', {
        method: 'POST',
        body: JSON.stringify({ path: pathToUse }),
      }) as {
        exists: boolean;
        is_directory: boolean;
        error?: string;
      };

      if (!validateResponse.exists) {
        setValidationError('Folder does not exist');
        return;
      }

      if (!validateResponse.is_directory) {
        setValidationError('Path is not a directory');
        return;
      }

      // Select the folder
      const response = await apiRequest('/api/folder/select', {
        method: 'POST',
        body: JSON.stringify({ folder_path: pathToUse }),
      }) as {
        success: boolean;
        folder_name?: string;
        folder_path?: string;
        relative_path?: string;
        is_under_prefix?: boolean;
        error?: string;
      };

      if (response.success) {
        setSelectedFolder(response.folder_name || '');
        setLastUsedFolder(response.folder_name || '');

        onFolderSelected({
          name: response.folder_name || '',
          path: response.folder_path || '',
          source: 'manual_input',
        });
      } else {
        throw new Error(response.error || 'Failed to select folder');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to select folder';
      setValidationError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualInput();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`w-full max-w-2xl mx-auto ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Select Folder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* File System API Status */}
        <Alert className={fileSystemStatus.available ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
          <div className="flex items-center gap-2">
            {fileSystemStatus.available ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            )}
            <AlertDescription className="text-sm">
              {fileSystemStatus.message}
            </AlertDescription>
          </div>
        </Alert>

        {/* File System Access API Option */}
        {fileSystemStatus.available && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Modern File System Access</span>
              <Badge variant="secondary" className="text-xs">Recommended</Badge>
            </div>

            <Button
              onClick={handleFolderPicker}
              disabled={isLoading}
              className="w-full"
              variant="default"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Selecting Folder...
                </>
              ) : (
                <>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Choose Folder with File System Access
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              Use your browser&apos;s modern folder picker for secure, cross-platform folder access.
            </p>
          </div>
        )}

        {(fileSystemStatus.available && !fileSystemStatus.secureContext) && <Separator />}

        {/* Manual Input Option */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Manual Folder Path</span>
            <Badge variant="outline" className="text-xs">Classic</Badge>
          </div>

          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="/path/to/your/folder"
              disabled={validationLoading}
            />
            <Button
              onClick={() => handleManualInput()}
              disabled={validationLoading || !manualPath.trim()}
              variant="outline"
            >
              {validationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Select'
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Enter the full path to your image folder manually.
          </p>
        </div>

        {/* Recent Folders */}
        {mounted && recentFolders.length > 0 && (
          <div className="space-y-3">
             <Separator />
             <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Recent Folders</span>
             </div>
             
             <div className="grid gap-2">
                {recentFolders.map((folder, index) => (
                   <Button
                      key={`${folder.path}-${index}`}
                      variant="ghost"
                      className="justify-start h-auto py-2 px-3 hover:bg-gray-100"
                      onClick={() => handleManualInput(folder.path)}
                   >
                      <div className="flex flex-col items-start gap-1 w-full overflow-hidden">
                         <div className="flex items-center gap-2 w-full">
                            <FolderOpen className="h-3 w-3 text-gray-500 shrink-0" />
                            <span className="font-medium text-sm truncate">{folder.name}</span>
                            <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">
                               {folder.source === 'filesystem_api' ? 'FS' : 'Manual'}
                            </Badge>
                         </div>
                         <span className="text-xs text-gray-500 truncate w-full text-left">
                            {folder.path}
                         </span>
                      </div>
                   </Button>
                ))}
             </div>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-red-700">
              {validationError}
            </AlertDescription>
          </Alert>
        )}

        {/* Selected Folder Display */}
        {selectedFolder && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Selected: {selectedFolder}
              </span>
            </div>
            {lastUsedFolder && (
              <p className="text-xs text-green-600 mt-1">
                Last used: {lastUsedFolder}
              </p>
            )}
          </div>
        )}

        {/* Fallback Instructions */}
        {mounted && !fileSystemStatus.available && (
          <Alert className="border-blue-200 bg-blue-50">
            <Globe className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <div className="space-y-2">
                <p className="font-medium">Browser Compatibility Notice</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {getFallbackInstructions().instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Quick Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Use the File System Access option for the best experience</li>
            <li>Manual input works with absolute and relative paths</li>
            <li>Supported image formats: JPG, PNG, GIF, BMP, WebP</li>
            <li>Folders are automatically scanned for images</li>
          </ul>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
}