'use client';

import React from 'react';
import { useCropStore } from '@/store/crop-store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CropMode } from '@/types/crop';

interface CropConfigurationProps {
  disabled?: boolean;
  className?: string;
}

export function CropConfiguration({
  disabled = false,
  className = '',
}: CropConfigurationProps) {
  const { cropConfig, setCropMode, setCustomDimensions, setOutputSuffix, togglePreserveAudio } =
    useCropStore();

  const isCustomMode = cropConfig.mode === 'custom';
  
  // Handle mode change
  const handleModeChange = (mode: CropMode) => {
    setCropMode(mode);
  };

  return (
    <Card
      className={cn(
        'p-4 space-y-4',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      <div>
        <h3 className="text-lg font-semibold mb-1">Crop Configuration</h3>
        <p className="text-sm text-gray-500">Select how to crop your videos</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['left', 'right', 'center', 'custom'] as CropMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => handleModeChange(mode)}
            className={cn(
              'px-4 py-2 rounded-md border text-sm font-medium transition-all capitalize',
              cropConfig.mode === mode
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'hover:bg-gray-100 border-gray-200'
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      {isCustomMode && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width (%)</label>
            <Input
              type="number"
              value={cropConfig.customWidth || ''}
              onChange={(e) => setCustomDimensions({ customWidth: e.target.value })}
              placeholder="50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height (%)</label>
            <Input
              type="number"
              value={cropConfig.customHeight || ''}
              onChange={(e) => setCustomDimensions({ customHeight: e.target.value })}
              placeholder="100"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">X (%)</label>
            <Input
              type="number"
              value={cropConfig.customX || ''}
              onChange={(e) => setCustomDimensions({ customX: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y (%)</label>
            <Input
              type="number"
              value={cropConfig.customY || ''}
              onChange={(e) => setCustomDimensions({ customY: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
      )}

      <div className="space-y-3 pt-2 border-t">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Output Suffix</label>
          <Input
            type="text"
            value={cropConfig.outputSuffix || ''}
            onChange={(e) => setOutputSuffix(e.target.value)}
            placeholder="_cropped"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={cropConfig.preserveAudio || false}
            onChange={togglePreserveAudio}
            className="w-4 h-4 rounded text-blue-600"
          />
          <span className="text-sm">Preserve Audio</span>
        </label>
      </div>
    </Card>
  );
}
