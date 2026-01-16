'use client';

import { useEffect } from 'react';
import { Maximize2, AlertTriangle, Info } from 'lucide-react';
import { useResizeConfigStore } from '@/store/resize-config-store';
import { ConfigurationCard } from '@/components/ui/ConfigurationCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResizeConfigurationProps {
  onConfigChange?: (config: ReturnType<typeof useResizeConfigStore.getState>) => void;
  disabled?: boolean;
  className?: string;
}

export function ResizeConfiguration({
  onConfigChange,
  disabled = false,
  className = '',
}: ResizeConfigurationProps) {
  const { longestEdge, outputSuffix, deleteOriginal, setLongestEdge, setOutputSuffix, toggleDeleteOriginal } =
    useResizeConfigStore();

  // Notify parent of config changes
  useEffect(() => {
    onConfigChange?.(useResizeConfigStore.getState());
  }, [longestEdge, outputSuffix, deleteOriginal, onConfigChange]);

  return (
    <ConfigurationCard
      title="Resize Configuration"
      icon={Maximize2}
      variant="light"
      iconBgColor="bg-indigo-100"
      iconColor="text-indigo-600"
      disabled={disabled}
      className={className}
      subtitle={
        deleteOriginal
          ? 'Original files will be deleted after resize'
          : 'Original files will be preserved'
      }
    >
      <div className="space-y-4">
        {/* Warning about deletion */}
        {deleteOriginal && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium">Warning: This action cannot be undone</p>
              <p className="text-xs mt-1">Original files will be permanently deleted from your file system after successful resize.</p>
            </div>
          </div>
        )}

        {/* Resize Options */}
        <div className="space-y-3 pt-2">
          {/* Longest Edge */}
          <div className="space-y-2">
            <Label htmlFor="longest-edge-config" className="text-sm text-gray-700 font-medium">
              Longest Edge (pixels)
            </Label>
            <Input
              id="longest-edge-config"
              type="number"
              min="1"
              value={longestEdge}
              onChange={(e) => setLongestEdge(e.target.value)}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Videos/images will be scaled so their longest edge matches this value
            </p>
          </div>

          {/* Output Suffix */}
          <div className="space-y-2">
            <Label htmlFor="output-suffix-config" className="text-sm text-gray-700 font-medium">
              Output Suffix
            </Label>
            <Input
              id="output-suffix-config"
              type="text"
              value={outputSuffix}
              onChange={(e) => setOutputSuffix(e.target.value)}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Added to filename before extension (e.g., <code>image_resized.jpg</code>)
            </p>
          </div>

          {/* Delete Original */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={deleteOriginal}
              onChange={toggleDeleteOriginal}
              disabled={disabled}
              className="w-4 h-4 rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 transition-all cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors font-medium">
                Delete original files after resize
              </span>
              <span className="text-xs text-gray-500">
                {deleteOriginal
                  ? 'Resized files will keep original names (to match .txt caption files)'
                  : 'Original files will be preserved with _resized suffix added'}
              </span>
            </div>
          </label>
        </div>

        {/* Info */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <Info className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                Resize preserves aspect ratio. Example: A 720×1280 video with longest edge 768 will be resized to 432×768.
              </p>
              <p className="text-yellow-700">
                💡 When "Delete original" is checked, the resized file keeps the original name to maintain association with caption (.txt) files.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ConfigurationCard>
  );
}
