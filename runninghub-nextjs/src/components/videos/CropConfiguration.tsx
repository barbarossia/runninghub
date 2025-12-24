'use client';

import React, { useState, useEffect } from 'react';
import { CropMode } from '@/types/crop';
import { useCropStore } from '@/store/crop-store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CROP_PRESETS } from '@/constants';

interface CropConfigurationProps {
  onConfigChange?: (config: ReturnType<typeof useCropStore.getState>['cropConfig']) => void;
  disabled?: boolean;
  className?: string;
}

export function CropConfiguration({
  onConfigChange,
  disabled = false,
  className = '',
}: CropConfigurationProps) {
  const { cropConfig, setCropMode, setCustomDimensions, setOutputSuffix, togglePreserveAudio } =
    useCropStore();

  // Derive values from state, reset when mode is not custom
  const isCustomMode = cropConfig.mode === CROP_PRESETS.CUSTOM;
  const customWidth = isCustomMode ? (cropConfig.customWidth || '') : '';
  const customHeight = isCustomMode ? (cropConfig.customHeight || '') : '';
  const customX = isCustomMode ? (cropConfig.customX || '0') : '0';
  const customY = isCustomMode ? (cropConfig.customY || '0') : '0';
  const [outputSuffix, setLocalOutputSuffix] = useState<string>(cropConfig.outputSuffix || '_cropped');

  // Notify parent of config changes
  useEffect(() => {
    onConfigChange?.(cropConfig);
  }, [cropConfig, onConfigChange]);

  // Handle mode change
  const handleModeChange = (mode: CropMode) => {
    setCropMode(mode);
  };

  // Handle custom dimension change
  const handleCustomDimensionChange = (field: 'width' | 'height' | 'x' | 'y', value: string) => {
    // Update custom dimensions directly without client-side validation
    // Python CLI will handle validation
    const params: {
      width?: string;
      height?: string;
      x?: string;
      y?: string;
    } = {};

    if (field === 'width') params.width = value || undefined;
    if (field === 'height') params.height = value || undefined;
    if (field === 'x') params.x = value || undefined;
    if (field === 'y') params.y = value || undefined;

    setCustomDimensions(params);
  };

  // Handle output suffix change
  const handleOutputSuffixChange = (value: string) => {
    setLocalOutputSuffix(value);
    setOutputSuffix(value);
  };

  return (
    <Card
      className={cn(
        'p-4 bg-gray-900/50 border-gray-700',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Crop Configuration</h3>
          <p className="text-sm text-gray-400">Select how to crop your videos</p>
        </div>

        {/* Crop Mode Presets */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleModeChange(CROP_PRESETS.LEFT_HALF)}
            className={cn(
              'px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all',
              cropConfig.mode === CROP_PRESETS.LEFT_HALF
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
            )}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 border-2 border-current rounded-sm flex items-center justify-center">
                <div className="w-3 h-8 bg-current opacity-70 rounded-sm" />
              </div>
              <span>Left Half</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange(CROP_PRESETS.RIGHT_HALF)}
            className={cn(
              'px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all',
              cropConfig.mode === CROP_PRESETS.RIGHT_HALF
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
            )}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 border-2 border-current rounded-sm flex items-center justify-center">
                <div className="w-3 h-8 bg-current opacity-70 rounded-sm ml-auto" />
              </div>
              <span>Right Half</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange(CROP_PRESETS.CENTER)}
            className={cn(
              'px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all',
              cropConfig.mode === CROP_PRESETS.CENTER
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
            )}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 border-2 border-current rounded-sm flex items-center justify-center">
                <div className="w-6 h-6 bg-current opacity-70 rounded-sm" />
              </div>
              <span>Center Square</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange(CROP_PRESETS.CUSTOM)}
            className={cn(
              'px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all',
              cropConfig.mode === CROP_PRESETS.CUSTOM
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
            )}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="text-2xl">✂️</div>
              <span>Custom</span>
            </div>
          </button>
        </div>

        {/* Custom Crop Options */}
        {cropConfig.mode === CROP_PRESETS.CUSTOM && (
          <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Width (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={customWidth}
                  onChange={(e) => handleCustomDimensionChange('width', e.target.value)}
                  placeholder="50"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Height (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={customHeight}
                  onChange={(e) => handleCustomDimensionChange('height', e.target.value)}
                  placeholder="100"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">X Position (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={customX}
                  onChange={(e) => handleCustomDimensionChange('x', e.target.value)}
                  placeholder="0"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Y Position (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={customY}
                  onChange={(e) => handleCustomDimensionChange('y', e.target.value)}
                  placeholder="0"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Enter values as percentages (0-100). X + Width must be ≤ 100%, Y + Height must be ≤
              100%.
            </p>
          </div>
        )}

        {/* Additional Options */}
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Output Suffix</label>
            <Input
              type="text"
              value={outputSuffix}
              onChange={(e) => handleOutputSuffixChange(e.target.value)}
              placeholder="_cropped"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Added to filename: video.mp4 → video{outputSuffix}.mp4
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cropConfig.preserveAudio || false}
              onChange={togglePreserveAudio}
              className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300">Preserve Audio</span>
          </label>
        </div>
      </div>
    </Card>
  );
}
