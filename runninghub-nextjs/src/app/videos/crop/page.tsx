'use client';

import React, { useState } from 'react';
import { useVideoSelectionStore, useCropStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
import { CropConfiguration } from '@/components/videos/CropConfiguration';
import { ArrowLeft, Video, Crop, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/constants';

export default function CropPage() {
  const { selectedVideos } = useVideoSelectionStore();
  const { cropConfig } = useCropStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  const selectedPaths = Array.from(selectedVideos.keys());

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
            <h3 className="font-semibold mb-3 flex items-center">
              <Video className="h-4 w-4 mr-2" />
              Selected Videos
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {selectedPaths.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No videos selected for cropping.</p>
              ) : (
                selectedPaths.map((path) => (
                  <div key={path} className="text-xs p-2 bg-gray-50 rounded border truncate">
                    {path}
                  </div>
                ))
              )}
            </div>
          </Card>

          <ConsoleViewer taskId={taskId} />
        </div>
      </div>
    </div>
  );
}
