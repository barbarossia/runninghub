'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VideoFile } from '@/types';

interface VideoPlayerModalProps {
  video: VideoFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoPlayerModal({ video, isOpen, onClose }: VideoPlayerModalProps) {
  if (!video) return null;

  const getVideoSrc = (video: VideoFile) => {
    if (video.blob_url) {
      return video.blob_url;
    }
    // Fallback to server endpoint
    return `/api/videos/serve?path=${encodeURIComponent(video.path)}`;
  };

  const videoSrc = getVideoSrc(video);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-black border-gray-800">
        <DialogHeader className="p-4 bg-background/90 absolute top-0 left-0 right-0 z-10 backdrop-blur-sm transition-opacity opacity-0 hover:opacity-100">
          <DialogTitle className="text-white truncate">{video.name}</DialogTitle>
          <DialogDescription className="text-gray-300 text-xs">
            {video.extension.toUpperCase()} • {(video.size / (1024 * 1024)).toFixed(2)} MB
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center w-full h-full bg-black aspect-video">
          <video
            src={videoSrc}
            controls
            autoPlay
            className="w-full h-full object-contain"
            playsInline
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
