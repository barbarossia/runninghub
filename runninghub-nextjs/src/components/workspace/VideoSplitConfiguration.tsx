'use client';

import React, { useEffect } from 'react';
import { Scissors, Settings2, Clock, Hash } from 'lucide-react';
import { useVideoSplitStore } from '@/store/video-split-store';
import { ConfigurationCard } from '@/components/ui/ConfigurationCard';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface VideoSplitConfigurationProps {
  onConfigChange?: (config: ReturnType<typeof useVideoSplitStore.getState>['splitOptions']) => void;
  disabled?: boolean;
  className?: string;
}

export function VideoSplitConfiguration({
  onConfigChange,
  disabled = false,
  className = '',
}: VideoSplitConfigurationProps) {
  const {
    splitOptions,
    setSplitMode,
    setSegmentDuration,
    setSegmentCount,
    toggleDeleteOriginal,
  } = useVideoSplitStore();

  // Notify parent of config changes
  useEffect(() => {
    onConfigChange?.(splitOptions);
  }, [splitOptions, onConfigChange]);

  const handleModeChange = (mode: 'duration' | 'count') => {
    setSplitMode(mode);
  };

  // Calculate estimated segments
  const estimatedSegments = splitOptions.mode === 'duration'
    ? 'Based on duration'
    : splitOptions.segmentCount;

  return (
    <ConfigurationCard
      title="Split Configuration"
      icon={Scissors}
      variant="light"
      iconBgColor="bg-indigo-100"
      iconColor="text-indigo-600"
      disabled={disabled}
      className={className}
      subtitle={
        <>
          {splitOptions.mode === 'duration'
            ? `Every ${splitOptions.segmentDuration}s`
            : `${splitOptions.segmentCount} parts`
          } {splitOptions.deleteOriginal && ' • Auto-delete'}
        </>
      }
    >
      <div className="space-y-6">
        {/* Split Mode Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
            Split By
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleModeChange('duration')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                splitOptions.mode === 'duration'
                  ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <Clock className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Duration</span>
              <span className="text-[10px] opacity-70">Split by time</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('count')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                splitOptions.mode === 'count'
                  ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <Hash className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Count</span>
              <span className="text-[10px] opacity-70">Equal parts</span>
            </button>
          </div>
        </div>

        {/* Mode Specific Settings */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Settings2 className="h-4 w-4" />
            Split Parameters
          </div>

          {splitOptions.mode === 'duration' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
                Segment Duration (seconds)
              </label>
              <Input
                type="number"
                min="1"
                step="0.1"
                value={splitOptions.segmentDuration || 5}
                onChange={(e) => setSegmentDuration(parseFloat(e.target.value) || 5)}
                className="border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Each segment will be {splitOptions.segmentDuration || 5} seconds long
              </p>
            </div>
          )}

          {splitOptions.mode === 'count' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
                Number of Segments
              </label>
              <Input
                type="number"
                min="2"
                value={splitOptions.segmentCount || 2}
                onChange={(e) => setSegmentCount(parseInt(e.target.value) || 2)}
                className="border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Video will be split into {splitOptions.segmentCount || 2} equal parts
              </p>
            </div>
          )}

          {/* Delete Original Option */}
          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={splitOptions.deleteOriginal}
                  onChange={toggleDeleteOriginal}
                  className="w-4 h-4 rounded border-gray-300 bg-white text-red-600 focus:ring-red-500 focus:ring-offset-2 transition-all cursor-pointer"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Delete original video after splitting</span>
                <span className="text-xs text-gray-500">Segments will be saved in the same folder</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </ConfigurationCard>
  );
}
