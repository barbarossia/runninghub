'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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
  const handleResolutionChange = (value: string) => {
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
    )?.label || 'Custom';

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
          <Label htmlFor="trigger-word">Trigger Word</Label>
          <Input
            id="trigger-word"
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
          <Select
            value={currentResolutionLabel}
            onValueChange={handleResolutionChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTION_OPTIONS.map((option) => (
                <SelectItem key={option.label} value={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Manual Width/Height (Hidden if matched, or shown as readonly/editable if we want advanced mode) */}
        {/* For now, just keeping them as part of the state but controlled via the dropdown */}
      </div>
    </Card>
  );
}
