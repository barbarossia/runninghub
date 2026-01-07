'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MediaFile } from '@/types/workspace';
import { Copy, Check, Download } from 'lucide-react';
import { toast } from 'sonner';

interface ImagePreviewModalProps {
  file: MediaFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImagePreviewModal({ file, isOpen, onClose }: ImagePreviewModalProps) {
  const [copiedPath, setCopiedPath] = React.useState(false);

  if (!file) return null;

  const getImageSrc = (file: MediaFile) => {
    // Handle blobUrl if available
    if ((file as any).blobUrl) return (file as any).blobUrl;

    // Fallback to server endpoint
    return `/api/images/serve?path=${encodeURIComponent(file.path)}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = getImageSrc(file);
    link.download = file.name;
    link.click();
    toast.success('Download started');
  };

  const imageSrc = getImageSrc(file);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        setCopiedPath(false);
      }
    }}>
      <DialogContent className="max-w-5xl w-full p-0 overflow-hidden bg-white dark:bg-gray-900">
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="line-clamp-1">{file.name}</DialogTitle>
            <DialogDescription className="line-clamp-1">
              IMAGE • {file.extension?.toUpperCase() || 'N/A'}
            </DialogDescription>
          </DialogHeader>

          {/* Two-column layout: Preview on left, Details on right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Preview (2/3 width on large screens) */}
            <div className="lg:col-span-2">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
                <img
                  src={imageSrc}
                  alt={file.name}
                  className="w-full h-full object-contain max-h-[600px]"
                />
              </div>
            </div>

            {/* Right: Details (1/3 width on large screens) */}
            <div className="lg:col-span-1 space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              {/* Basic Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">File Information</h3>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Type</span>
                    <p className="font-medium capitalize text-gray-900 dark:text-gray-100">Image</p>
                  </div>

                  <div>
                    <span className="text-gray-500 text-xs">Extension</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{file.extension?.toUpperCase() || 'N/A'}</p>
                  </div>

                  <div>
                    <span className="text-gray-500 text-xs">File Size</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {file.size >= 1024 * 1024
                        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                        : `${(file.size / 1024).toFixed(2)} KB`
                      }
                      <span className="text-gray-500 text-xs ml-1">({file.size.toLocaleString()} bytes)</span>
                    </p>
                  </div>

                  {/* Resolution */}
                  {(file as any).width && (file as any).height ? (
                    <div>
                      <span className="text-gray-500 text-xs">Resolution</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {(file as any).width} x {(file as any).height}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="w-full justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(file.path);
                    setCopiedPath(true);
                    toast.success('File path copied to clipboard');
                    setTimeout(() => setCopiedPath(false), 2000);
                  }}
                  className="w-full justify-start"
                >
                  {copiedPath ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Path
                    </>
                  )}
                </Button>
              </div>

              {/* More Details */}
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">File Path</span>
                  <p className="font-mono text-xs break-all bg-white dark:bg-gray-950 p-2 rounded mt-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {file.path}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 text-xs">MIME Type</span>
                  <p className="font-medium bg-white dark:bg-gray-950 p-2 rounded mt-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    image/{file.extension?.replace('.', '') || 'unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
