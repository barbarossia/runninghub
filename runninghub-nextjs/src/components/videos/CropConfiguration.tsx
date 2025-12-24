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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={() => handleModeChange(CROP_PRESETS.LEFT_HALF)}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              cropConfig.mode === CROP_PRESETS.LEFT_HALF
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
            }`}
          >
            <div className="w-12 h-8 border border-current rounded mb-2 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1/2 bg-current opacity-40"></div>
            </div>
            <span className="text-sm font-medium">Left Half</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange(CROP_PRESETS.RIGHT_HALF)}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              cropConfig.mode === CROP_PRESETS.RIGHT_HALF
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
            }`}
          >
            <div className="w-12 h-8 border border-current rounded mb-2 relative overflow-hidden">
              <div className="absolute inset-y-0 right-0 w-1/2 bg-current opacity-40"></div>
            </div>
            <span className="text-sm font-medium">Right Half</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange(CROP_PRESETS.TOP_HALF)}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              cropConfig.mode === CROP_PRESETS.TOP_HALF
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
            }`}
          >
            <div className="w-12 h-8 border border-current rounded mb-2 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-current opacity-40"></div>
            </div>
            <span className="text-sm font-medium">Top Half</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange(CROP_PRESETS.BOTTOM_HALF)}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              cropConfig.mode === CROP_PRESETS.BOTTOM_HALF
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
            }`}
          >
            <div className="w-12 h-8 border border-current rounded mb-2 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-current opacity-40"></div>
            </div>
            <span className="text-sm font-medium">Bottom Half</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange(CROP_PRESETS.CENTER)}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              cropConfig.mode === CROP_PRESETS.CENTER
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
            }`}
          >
            <div className="w-12 h-8 border border-current rounded mb-2 relative overflow-hidden">
              <div className="absolute inset-y-0 inset-x-1/4 bg-current opacity-40"></div>
            </div>
            <span className="text-sm font-medium">Center</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange(CROP_PRESETS.CUSTOM)}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              cropConfig.mode === CROP_PRESETS.CUSTOM
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
            }`}
          >
            <div className="w-12 h-8 border border-current rounded mb-2 relative flex items-center justify-center">
              <div className="w-6 h-4 border border-dashed border-current opacity-60"></div>
            </div>
            <span className="text-sm font-medium">Custom</span>
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
