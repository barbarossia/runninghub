'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { ConfigurationCard } from '@/components/ui/ConfigurationCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
  deleteOriginal: boolean;
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
    <ConfigurationCard
      title="Processing Configuration"
      description="Configure parameters for the image processing workflow."
      icon={Settings}
      className={className}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Trigger Word */}
        <div className="space-y-2">
          <Label htmlFor="trigger-word">Trigger Word</Label>
          <input
            id="trigger-word"
            className="flex h-10 w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g. naran"
            value={config.triggerWord}
            onChange={(e) =>
              onConfigChange({ ...config, triggerWord: e.target.value })
            }
          />
        </div>

        {/* Resolution Selection */}
        <div className="space-y-2">
          <Label>Resolution</Label>
          <select
            className="flex h-10 w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Delete Original Checkbox */}
        <div className="flex items-center space-x-2 pt-8 sm:pt-0">
          <Checkbox 
            id="delete-original" 
            checked={config.deleteOriginal ?? false}
            onCheckedChange={(checked) => 
              onConfigChange({ ...config, deleteOriginal: checked === true })
            }
          />
          <Label htmlFor="delete-original" className="font-normal cursor-pointer">
            Delete original images after processing
          </Label>
        </div>
      </div>
    </ConfigurationCard>
  );
}