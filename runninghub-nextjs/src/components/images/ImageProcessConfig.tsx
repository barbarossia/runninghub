'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

const RESOLUTION_OPTIONS = [
  { label: '512 x 512', width: 512, height: 512 },
  { label: '512 x 768', width: 512, height: 768 },
  { label: '768 x 512', width: 768, height: 512 },
  { label: '768 x 768', width: 768, height: 768 },
  { label: '1024 x 1024', width: 1024, height: 1024 },
] as const;

export interface ProcessConfig {
  triggerWord: string;
  width: number;
  height: number;
}

interface ImageProcessConfigProps {
  config: ProcessConfig;
  onConfigChange: (config: ProcessConfig) => void;
  className?: string;
}

export function ImageProcessConfig({
  config,
  onConfigChange,
  className = '',
}: ImageProcessConfigProps) {
  const handleResolutionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const option = RESOLUTION_OPTIONS.find((opt) => opt.label === value);
    if (option) {
      onConfigChange({
        ...config,
        width: option.width,
        height: option.height,
      });
    }
  };

  const currentResolutionLabel = 
    RESOLUTION_OPTIONS.find(
      (opt) => opt.width === config.width && opt.height === config.height
    )?.label || '';

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      <div className="space-y-2">
        <h3 className="font-medium">Processing Configuration</h3>
        <p className="text-sm text-gray-500">
          Configure parameters for the image processing workflow.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Trigger Word */}
        <div className="space-y-2">
          <label htmlFor="trigger-word" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Trigger Word
          </label>
          <input
            id="trigger-word"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g. naran"
            value={config.triggerWord}
            onChange={(e) =>
              onConfigChange({ ...config, triggerWord: e.target.value })
            }
          />
        </div>

        {/* Resolution Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Resolution
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={currentResolutionLabel}
            onChange={handleResolutionChange}
          >
            <option value="" disabled>Select resolution</option>
            {RESOLUTION_OPTIONS.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}