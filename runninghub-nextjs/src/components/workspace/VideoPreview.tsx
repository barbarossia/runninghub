'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface VideoPreviewProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
}

export function VideoPreview({ src, className, ...props }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Track the play promise to prevent AbortError
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (!video) return;

    // Start playing and store the promise
    playPromiseRef.current = video.play();
    
    // Handle potential errors (like AbortError) locally
    playPromiseRef.current.catch((error) => {
      // Ignore AbortError which happens if we pause quickly
      if (error.name !== 'AbortError') {
        console.error('Video play error:', error);
      }
    });
  };

  const handleMouseLeave = () => {
    const video = videoRef.current;
    if (!video) return;

    // Check if there's a pending play operation
    if (playPromiseRef.current !== null) {
      playPromiseRef.current
        .then(() => {
          // Only pause if the video is still playing (guard against race conditions)
          if (!video.paused) {
            video.pause();
            video.currentTime = 0;
          }
        })
        .catch(() => {
          // Play failed, so no need to pause
        })
        .finally(() => {
            playPromiseRef.current = null;
        });
    } else {
      // No pending play, safe to pause
      video.pause();
      video.currentTime = 0;
    }
  };

  return (
    <video
      ref={videoRef}
      src={src}
      className={cn('object-contain', className)}
      muted
      preload="metadata"
      playsInline
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    />
  );
}
