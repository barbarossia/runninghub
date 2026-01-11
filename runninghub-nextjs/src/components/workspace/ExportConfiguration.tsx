'use client';

import { useEffect } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { useExportConfigStore } from '@/store/export-config-store';
import { ConfigurationCard } from '@/components/ui/ConfigurationCard';

interface ExportConfigurationProps {
  onConfigChange?: (config: ReturnType<typeof useExportConfigStore.getState>) => void;
  disabled?: boolean;
  className?: string;
}

export function ExportConfiguration({
  onConfigChange,
  disabled = false,
  className = '',
}: ExportConfigurationProps) {
  const { deleteAfterExport, toggleDeleteAfterExport } = useExportConfigStore();

  // Notify parent of config changes
  useEffect(() => {
    onConfigChange?.(useExportConfigStore.getState());
  }, [deleteAfterExport, onConfigChange]);

  return (
    <ConfigurationCard
      title="Export Configuration"
      icon={Download}
      variant="light"
      iconBgColor="bg-orange-100"
      iconColor="text-orange-600"
      disabled={disabled}
      className={className}
      subtitle={
        deleteAfterExport
          ? 'Files will be deleted after export'
          : 'Original files will be preserved'
      }
    >
      <div className="space-y-4">
        {/* Warning about deletion */}
        {deleteAfterExport && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium">Warning: This action cannot be undone</p>
              <p className="text-xs mt-1">Selected files will be permanently deleted from your file system after successful export.</p>
            </div>
          </div>
        )}

        {/* Export Options */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={deleteAfterExport}
              onChange={toggleDeleteAfterExport}
              disabled={disabled}
              className="w-4 h-4 rounded border-gray-300 bg-white text-orange-600 focus:ring-orange-500 focus:ring-offset-2 transition-all cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors font-medium">
                Delete original files after export
              </span>
              <span className="text-xs text-gray-500">
                Permanently remove files from workspace after they are successfully exported
              </span>
            </div>
          </label>
        </div>

        {/* Info about export */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <Download className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <p>
              When you export files, they will be copied to a folder you choose.
              {deleteAfterExport
                ? ' After successful export, the original files will be deleted from the workspace.'
                : ' The original files will remain in the workspace.'}
            </p>
          </div>
        </div>
      </div>
    </ConfigurationCard>
  );
}
