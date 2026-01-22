'use client';

import React, { useState, useEffect } from 'react';
import { Video, Image as ImageIcon, Settings2 } from 'lucide-react';
import { ClipMode } from '@/types/video-clip';
import { useVideoClipStore } from '@/store/video-clip-store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ConfigurationCard } from '@/components/ui/ConfigurationCard';
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
    toggleDeleteOriginal,
    toggleSaveToWorkspace,
  } = useVideoClipStore();

  // Notify parent of config changes
  useEffect(() => {
    onConfigChange?.(clipConfig);
  }, [clipConfig, onConfigChange]);

  const handleModeChange = (mode: ClipMode) => {
    setClipMode(mode);
  };

  return (
    <ConfigurationCard
      title="Clip Configuration"
      icon={Video}
      variant="light"
      iconBgColor="bg-purple-100"
      iconColor="text-purple-600"
      disabled={disabled}
      className={className}
    >
      <div className="space-y-4">
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
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <span className="text-xs font-medium text-center">{mode.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
          {/* Image Output Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <ImageIcon className="h-4 w-4" />
              Output Settings
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">Format</label>
                <div className="flex p-1 bg-gray-100 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setImageFormat('png')}
                    className={cn(
                      "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      clipConfig.imageFormat === 'png'
                        ? "bg-purple-500 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
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
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    JPG
                  </button>
                </div>
              </div>

              {clipConfig.imageFormat === 'jpg' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">Quality (1-100)</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={clipConfig.quality}
                    onChange={(e) => setQuality(parseInt(e.target.value) || 95)}
                    className="border-gray-300 bg-white text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* File Organization Options */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Settings2 className="h-4 w-4" />
              File Organization
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={clipConfig.organizeByVideo}
                    onChange={toggleOrganizeByVideo}
                    className="w-4 h-4 rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-500 focus:ring-offset-2 transition-all cursor-pointer"
                    disabled={clipConfig.saveToWorkspace}
                  />
                </div>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Organize images by video name</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={clipConfig.deleteOriginal}
                    onChange={toggleDeleteOriginal}
                    className="w-4 h-4 rounded border-gray-300 bg-white text-red-600 focus:ring-red-500 focus:ring-offset-2 transition-all cursor-pointer"
                  />
                </div>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Delete video after processing</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={clipConfig.saveToWorkspace}
                    onChange={toggleSaveToWorkspace}
                    className="w-4 h-4 rounded border-gray-300 bg-blue-600 focus:ring-blue-500 focus:ring-offset-2 transition-all cursor-pointer"
                  />
                </div>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Save to workspace</span>
              </label>
            </div>

            {clipConfig.organizeByVideo && clipConfig.saveToWorkspace && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-yellow-600 text-sm">⚠️</span>
                <span className="text-sm text-yellow-800">
                  <strong>Conflicting options:</strong> Cannot organize by video name and save to workspace simultaneously.
                </span>
              </div>
            )}
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
          {/* Image Output Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <ImageIcon className="h-4 w-4" />
              Output Settings
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">Format</label>
                <div className="flex p-1 bg-gray-100 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setImageFormat('png')}
                    className={cn(
                      "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      clipConfig.imageFormat === 'png'
                        ? "bg-purple-500 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
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
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    JPG
                  </button>
                </div>
              </div>

              {clipConfig.imageFormat === 'jpg' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">Quality (1-100)</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={clipConfig.quality}
                    onChange={(e) => setQuality(parseInt(e.target.value) || 95)}
                    className="border-gray-300 bg-white text-gray-900 focus:border-purple-500 focus:ring-purple-500"
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
                    className="w-4 h-4 rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-500 focus:ring-offset-2 transition-all cursor-pointer"
                  />
                </div>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Organize images by video name</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={clipConfig.deleteOriginal}
                    onChange={toggleDeleteOriginal}
                    className="w-4 h-4 rounded border-gray-300 bg-white text-red-600 focus:ring-red-500 focus:ring-offset-2 transition-all cursor-pointer"
                  />
                </div>
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Delete video after processing</span>
              </label>
            </div>
          </div>

          {/* Mode Specific Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Settings2 className="h-4 w-4" />
              Extraction Parameters
            </div>

            {clipConfig.mode === CLIP_MODES.LAST_FRAMES && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">Frame Count</label>
                <Input
                  type="number"
                  min="1"
                  value={1}
                  disabled
                  className="border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Last frame mode always extracts only 1 frame</p>
              </div>
            )}

            {clipConfig.mode === CLIP_MODES.INTERVAL && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">Interval (Seconds)</label>
                <Input
                  type="number"
                  min="1"
                  value={clipConfig.intervalSeconds}
                  onChange={(e) => setIntervalSeconds(parseInt(e.target.value) || 10)}
                  className="border-gray-300 bg-white text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            )}

            {clipConfig.mode === CLIP_MODES.FRAME_INTERVAL && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">Frame Interval</label>
                <Input
                  type="number"
                  min="1"
                  value={clipConfig.intervalFrames}
                  onChange={(e) => setIntervalFrames(parseInt(e.target.value) || 1)}
                  className="border-gray-300 bg-white text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            )}

            {(clipConfig.mode === CLIP_MODES.FIRST_FRAME || clipConfig.mode === CLIP_MODES.LAST_FRAME) && (
              <div className="flex items-center justify-center h-full pt-2">
                <p className="text-xs text-gray-600 italic">No additional parameters for this mode.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ConfigurationCard>
  );
}
