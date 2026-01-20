/**
 * YouTube Downloader Component
 * Downloads YouTube videos (including shorts) with cookie support
 */

'use client';

import { useState, useEffect } from 'react';
import { Youtube, Download, Trash2, FolderOpen, AlertCircle } from 'lucide-react';
import { useWorkspaceFolder } from '@/store/folder-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { isValidYouTubeUrl, getYouTubeUrlErrorMessage } from '@/utils/validation';
import { cn } from '@/lib/utils';

// LocalStorage keys
const STORAGE_KEYS = {
  COOKIE_MODE: 'youtube_cookie_mode',
  COOKIE_CONTENT: 'youtube_cookies_content',
  COOKIE_FILE_PATH: 'youtube_cookies_file_path',
};

export interface YoutubeDownloaderProps {
  onDownloadStart?: (taskId: string) => void;
  onDownloadComplete?: (success: boolean) => void;
  className?: string;
}

export function YoutubeDownloader({
  onDownloadStart,
  onDownloadComplete,
  className = '',
}: YoutubeDownloaderProps) {
  const { selectedFolder } = useWorkspaceFolder();

  // URL input state
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  // Cookie input state
  const [cookieMode, setCookieMode] = useState<'paste' | 'file'>('paste');
  const [cookieContent, setCookieContent] = useState('');
  const [cookieFilePath, setCookieFilePath] = useState('');
  const [showCookies, setShowCookies] = useState(false); // Toggle for cookies visibility

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

  // Load persisted cookies on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.COOKIE_MODE) as 'paste' | 'file' | null;
    const savedContent = localStorage.getItem(STORAGE_KEYS.COOKIE_CONTENT);
    const savedPath = localStorage.getItem(STORAGE_KEYS.COOKIE_FILE_PATH);

    if (savedMode) {
      setCookieMode(savedMode);
    }
    if (savedContent) {
      setCookieContent(savedContent);
    }
    if (savedPath) {
      setCookieFilePath(savedPath);
    }
  }, []);

  // Save cookie mode to localStorage when it changes
  const handleCookieModeChange = (mode: 'paste' | 'file') => {
    setCookieMode(mode);
    localStorage.setItem(STORAGE_KEYS.COOKIE_MODE, mode);
  };

  // Save cookie content to localStorage
  const handleCookieContentChange = (value: string) => {
    setCookieContent(value);
    localStorage.setItem(STORAGE_KEYS.COOKIE_CONTENT, value);
  };

  // Save cookie file path to localStorage
  const handleCookieFilePathChange = (value: string) => {
    setCookieFilePath(value);
    localStorage.setItem(STORAGE_KEYS.COOKIE_FILE_PATH, value);
  };

  // Clear all stored cookies
  const handleClearCookies = async () => {
    setCookieContent('');
    setCookieFilePath('');
    localStorage.removeItem(STORAGE_KEYS.COOKIE_CONTENT);
    localStorage.removeItem(STORAGE_KEYS.COOKIE_FILE_PATH);

    // Also clear server-side cookie cache
    try {
      const response = await fetch('/api/youtube/clear-cookies', {
        method: 'POST',
      });

      if (!response.ok) {
        console.warn('Failed to clear server-side cookie cache');
      }
    } catch (error) {
      console.warn('Error clearing server-side cookie cache:', error);
    }

    toast.success('Cookies cleared');
  };

  // Validate URL input
  const validateUrl = (value: string): boolean => {
    if (!value || value.trim() === '') {
      setUrlError('Please enter a YouTube URL');
      return false;
    }

    if (!isValidYouTubeUrl(value)) {
      setUrlError(getYouTubeUrlErrorMessage(value));
      return false;
    }

    setUrlError('');
    return true;
  };

    // Handle URL input change
  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value && urlError) {
      validateUrl(value);
    }
  };

  // Handle download button click
  const handleDownload = async () => {
    // Validate URL
    if (!validateUrl(url)) {
      return;
    }

    // Check if folder is selected
    if (!selectedFolder) {
      toast.error('Please select a folder first');
      return;
    }

    // Validate folder_path exists (session_id is optional)
    if (!selectedFolder.folder_path) {
      console.error('Invalid folder selection:', selectedFolder);
      toast.error('Invalid folder selection. Please select a folder again.');
      return;
    }

    // Log folder info for debugging
    console.log('Folder selection:', {
      folder_path: selectedFolder.folder_path,
      session_id: selectedFolder.session_id,
      folder_name: selectedFolder.folder_name,
      is_virtual: selectedFolder.is_virtual,
    });

    // Check cookie input based on mode
    if (cookieMode === 'paste' && !cookieContent.trim()) {
      toast.warning('No cookies provided. Download will proceed without cookies (public videos only).');
    } else if (cookieMode === 'file' && !cookieFilePath.trim()) {
      toast.error('Please enter cookies file path');
      return;
    }

    setIsDownloading(true);

    try {
     const requestBody = {
      url: url.trim(),
      folderPath: selectedFolder.folder_path,
      sessionId: selectedFolder.session_id,
      cookieMode,
      cookieContent: cookieMode === 'paste' ? cookieContent : undefined,
      cookieFilePath: cookieMode === 'file' ? cookieFilePath : undefined,
      persistCookies: true,
    };

      console.log('Sending YouTube download request:', requestBody);

      const response = await fetch('/api/youtube/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start download');
      }

      toast.success('Download started');
      setUrl(''); // Clear URL input after successful start

      // Notify parent component
      if (onDownloadStart && data.task_id) {
        onDownloadStart(data.task_id);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start download');

      if (onDownloadComplete) {
        onDownloadComplete(false);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const hasCookies = cookieMode === 'paste' ? cookieContent.trim() : cookieFilePath.trim();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Current Folder Info */}
      {selectedFolder ? (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">Download Location</p>
              <p className="text-xs text-blue-600 truncate mt-0.5">
                {selectedFolder.folder_name}
              </p>
              <p className="text-[10px] text-blue-500 truncate">
                {selectedFolder.folder_path}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">No Folder Selected</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Please select a folder to download videos to
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* URL Input */}
      <div className="space-y-2">
        <label htmlFor="youtube-url" className="text-sm font-medium text-gray-700">
          YouTube URL
        </label>
        <Input
          id="youtube-url"
          type="text"
          placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          onBlur={() => url && validateUrl(url)}
          disabled={isDownloading}
          className={cn(
            'font-mono text-sm',
            urlError && 'border-red-300 focus-visible:ring-red-400'
          )}
        />
        {urlError && (
          <p className="text-xs text-red-600 whitespace-pre-line">{urlError}</p>
        )}
      </div>

      {/* Cookie Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCookies(!showCookies)}
            className="h-8 px-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 justify-start"
          >
            {showCookies ? (
              <AlertCircle className="w-4 h-4 mr-2" />
            ) : (
              <FolderOpen className="w-4 h-4 mr-2" />
            )}
            Cookies (Optional)
            <span className="ml-auto">
              {showCookies ? '▲' : '▼'}
            </span>
          </Button>
          {hasCookies && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCookies}
              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {showCookies && (
          <Tabs value={cookieMode} onValueChange={(v) => handleCookieModeChange(v as 'paste' | 'file')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste" className="text-xs">
                Paste Content
              </TabsTrigger>
              <TabsTrigger value="file" className="text-xs">
                File Path
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-2 mt-3">
              <Textarea
                placeholder="Paste your cookies.txt content here...&#10;&#10;Required for private/unlisted videos"
                value={cookieContent}
                onChange={(e) => handleCookieContentChange(e.target.value)}
                disabled={isDownloading}
                className="font-mono text-xs min-h-[120px] resize-y"
              />
              <p className="text-[10px] text-gray-500">
                Cookies are stored locally and reused for future downloads
              </p>
            </TabsContent>

            <TabsContent value="file" className="space-y-2 mt-3">
              <Input
                type="text"
                placeholder="/path/to/cookies.txt"
                value={cookieFilePath}
                onChange={(e) => handleCookieFilePathChange(e.target.value)}
                disabled={isDownloading}
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-gray-500">
                Path to cookies.txt file on your system
              </p>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Download Button */}
      <Button
        onClick={handleDownload}
        disabled={isDownloading || !selectedFolder || !url.trim()}
        className="w-full"
        size="lg"
      >
        {isDownloading ? (
          <>
            <Download className="w-4 h-4 mr-2 animate-pulse" />
            Starting Download...
          </>
        ) : (
          <>
            <Youtube className="w-4 h-4 mr-2" />
            Download Video
          </>
        )}
      </Button>

      {/* Info Card */}
      <Card className="p-3 bg-gray-50 border-gray-200">
        <div className="space-y-1.5 text-xs text-gray-600">
          <p className="font-medium text-gray-700">Supported Formats:</p>
          <ul className="space-y-0.5 ml-4">
            <li>• Regular YouTube videos (youtube.com/watch)</li>
            <li>• YouTube Shorts (youtube.com/shorts)</li>
            <li>• Short URLs (youtu.be)</li>
          </ul>
          <p className="pt-1 font-medium text-gray-700">Features:</p>
          <ul className="space-y-0.5 ml-4">
            <li>• Automatic MP4 conversion</li>
            <li>• Cookie-based authentication (for private videos)</li>
            <li>• Cookies persist across downloads</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
