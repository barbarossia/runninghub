'use client';

import React, { useState, useEffect } from 'react';
import { Video, ChevronDown, ChevronUp, Image as ImageIcon, Settings2 } from 'lucide-react';
import { ClipMode } from '@/types/video-clip';
import { useVideoClipStore } from '@/store/video-clip-store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CLIP_MODES } from '@/constants';

interface VideoClipConfigurationProps {
  onConfigChange?: (config: ReturnType<typeof useVideoClipStore.getState>['clipConfig']) => void;
  disabled?: boolean;
  className?: string;
}

export function VideoClipConfiguration({
  onConfigChange,
  disabled = false,
  className = '',
}: VideoClipConfigurationProps) {
  const { 
    clipConfig, 
    setClipMode, 
    setImageFormat, 
    setQuality, 
    setFrameCount, 
    setIntervalSeconds, 
    setIntervalFrames,
    toggleOrganizeByVideo,
    toggleDeleteOriginal
  } = useVideoClipStore();

  const [isExpanded, setIsExpanded] = useState(false);

  // Notify parent of config changes
  useEffect(() => {
    onConfigChange?.(clipConfig);
  }, [clipConfig, onConfigChange]);

  const handleModeChange = (mode: ClipMode) => {
    setClipMode(mode);
  };

  return (
    <Card
      className={cn(
        'p-4 bg-transparent border-white/10',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      <div className="space-y-4">
        {/* Header */}
        <div 
          className="flex items-center justify-between cursor-pointer group/header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover/header:bg-purple-500/20 transition-colors">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white group-hover/header:text-purple-400 transition-colors">Clip Configuration</h3>
              {!isExpanded && (
                <p className="text-xs text-purple-500/80 font-medium">
                  Mode: {clipConfig.mode.replace('_', ' ')} • Format: {clipConfig.imageFormat.toUpperCase()} {clipConfig.organizeByVideo && '• Organized'} {clipConfig.deleteOriginal && '• Auto-delete'}
                </p>
              )}
            </div>
          </div>
          <div className="text-gray-500 group-hover/header:text-white transition-colors">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Clip Mode Presets */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {[
                { id: CLIP_MODES.LAST_FRAME, label: 'Last Frame' },
                { id: CLIP_MODES.FIRST_FRAME, label: 'First Frame' },
                { id: CLIP_MODES.LAST_FRAMES, label: 'Last N Frames' },
                { id: CLIP_MODES.INTERVAL, label: 'Time Interval' },
                { id: CLIP_MODES.FRAME_INTERVAL, label: 'Frame Interval' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleModeChange(mode.id as ClipMode)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                    clipConfig.mode === mode.id
                      ? 'border-purple-500 bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-medium text-center">{mode.label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              {/* Image Output Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <ImageIcon className="h-4 w-4" />
                  Output Settings
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Format</label>
                    <div className="flex p-1 bg-black/20 rounded-lg border border-white/10">
                      <button
                        onClick={() => setImageFormat('png')}
                        className={cn(
                          "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                          clipConfig.imageFormat === 'png' 
                            ? "bg-purple-500 text-white shadow-sm" 
                            : "text-gray-400 hover:text-white"
                        )}
                      >
                        PNG
                      </button>
                      <button
                        onClick={() => setImageFormat('jpg')}
                        className={cn(
                          "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                          clipConfig.imageFormat === 'jpg' 
                            ? "bg-purple-500 text-white shadow-sm" 
                            : "text-gray-400 hover:text-white"
                        )}
                      >
                        JPG
                      </button>
                    </div>
                  </div>
                  
                  {clipConfig.imageFormat === 'jpg' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Quality (1-100)</label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={clipConfig.quality}
                        onChange={(e) => setQuality(parseInt(e.target.value) || 95)}
                        className="bg-black/20 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={clipConfig.organizeByVideo}
                        onChange={toggleOrganizeByVideo}
                        className="w-4 h-4 rounded border-white/20 bg-black/20 text-purple-500 focus:ring-purple-500/20 focus:ring-offset-0 transition-all cursor-pointer"
                      />
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Organize images by video name</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={clipConfig.deleteOriginal}
                        onChange={toggleDeleteOriginal}
                        className="w-4 h-4 rounded border-white/20 bg-black/20 text-red-500 focus:ring-red-500/20 focus:ring-offset-0 transition-all cursor-pointer"
                      />
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Delete video after processing</span>
                  </label>
                </div>
              </div>

              {/* Mode Specific Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Settings2 className="h-4 w-4" />
                  Extraction Parameters
                </div>

                {clipConfig.mode === CLIP_MODES.LAST_FRAMES && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Frame Count</label>
                    <Input
                      type="number"
                      min="1"
                      value={clipConfig.frameCount}
                      onChange={(e) => setFrameCount(parseInt(e.target.value) || 10)}
                      className="bg-black/20 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20"
                    />
                  </div>
                )}

                {clipConfig.mode === CLIP_MODES.INTERVAL && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Interval (Seconds)</label>
                    <Input
                      type="number"
                      min="1"
                      value={clipConfig.intervalSeconds}
                      onChange={(e) => setIntervalSeconds(parseInt(e.target.value) || 10)}
                      className="bg-black/20 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20"
                    />
                  </div>
                )}

                {clipConfig.mode === CLIP_MODES.FRAME_INTERVAL && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Frame Interval</label>
                    <Input
                      type="number"
                      min="1"
                      value={clipConfig.intervalFrames}
                      onChange={(e) => setIntervalFrames(parseInt(e.target.value) || 1)}
                      className="bg-black/20 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20"
                    />
                  </div>
                )}

                {(clipConfig.mode === CLIP_MODES.FIRST_FRAME || clipConfig.mode === CLIP_MODES.LAST_FRAME) && (
                  <div className="flex items-center justify-center h-full pt-2">
                    <p className="text-xs text-gray-500 italic">No additional parameters for this mode.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
