'use client';

import React, { useState } from 'react';
import { useVideoSelectionStore, useCropStore, useVideoStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { CropConfiguration } from '@/components/videos/CropConfiguration';
import { ArrowLeft, Video, Crop, Loader2, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/constants';

export default function CropPage() {
  const { selectedVideos, toggleVideo, selectAll, deselectAll } = useVideoSelectionStore();
  const { videos } = useVideoStore();
  const { cropConfig } = useCropStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  const selectedPaths = Array.from(selectedVideos.keys());
  const hasVideos = videos.length > 0;
  const isAllSelected = hasVideos && selectedPaths.length === videos.length;

  const handleStartCrop = async () => {
    if (selectedPaths.length === 0) {
      toast.error('No videos selected');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(API_ENDPOINTS.VIDEOS_CROP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: selectedPaths,
          crop_config: {
            mode: cropConfig.mode,
            width: cropConfig.customWidth,
            height: cropConfig.customHeight,
            x: cropConfig.customX,
            y: cropConfig.customY,
          },
          output_suffix: cropConfig.outputSuffix,
          preserve_audio: cropConfig.preserveAudio,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTaskId(data.task_id);
        toast.success('Video cropping started');
      } else {
        throw new Error(data.error || 'Failed to start cropping');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error starting crop');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll(videos);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/videos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Videos
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Crop Videos</h1>
        <div className="w-20" />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <CropConfiguration disabled={isProcessing} />
          
          <Button
            className="w-full h-12 text-lg font-bold"
            disabled={isProcessing || selectedPaths.length === 0}
            onClick={handleStartCrop}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Crop className="h-5 w-5 mr-2" />
            )}
            Start Cropping {selectedPaths.length > 0 && `(${selectedPaths.length})`}
          </Button>
        </div>

        <div className="md:col-span-2 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center">
                <Video className="h-4 w-4 mr-2" />
                Select Videos ({videos.length})
              </h3>
              {hasVideos && (
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-8">
                  {isAllSelected ? (
                    <>
                      <Square className="h-4 w-4 mr-2" /> Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 mr-2" /> Select All
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md p-2 bg-gray-50/50">
              {!hasVideos ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No videos loaded.</p>
                  <Link href="/videos" className="text-purple-600 hover:underline text-sm">
                    Select a folder containing videos
                  </Link>
                </div>
              ) : (
                videos.map((video) => {
                  const isSelected = selectedVideos.has(video.path);
                  return (
                    <div
                      key={video.path}
                      className={`flex items-center gap-3 p-2 rounded border transition-colors cursor-pointer ${
                        isSelected ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleVideo(video)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleVideo(video)}
                        className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" title={video.name}>
                          {video.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate" title={video.path}>
                          {video.path}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap">
                        {(video.size / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <ConsoleViewer taskId={taskId} />
        </div>
      </div>
    </div>
  );
}
