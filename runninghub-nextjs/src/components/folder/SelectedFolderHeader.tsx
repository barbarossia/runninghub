'use client';

import { FolderOpen, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SelectedFolderHeaderProps {
  folderName: string;
  folderPath: string;
  itemCount: number;
  itemType: 'videos' | 'images';
  isVirtual?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  colorVariant?: 'purple' | 'blue' | 'green';
}

export function SelectedFolderHeader({
  folderName,
  folderPath,
  itemCount,
  itemType,
  isVirtual = false,
  isLoading = false,
  onRefresh,
  colorVariant = 'blue',
}: SelectedFolderHeaderProps) {
  const colorClasses = {
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
    },
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
    },
  };

  const colors = colorClasses[colorVariant];

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`p-2 ${colors.bg} rounded-lg`}>
          <FolderOpen className={`h-6 w-6 ${colors.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {folderName}
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className="truncate max-w-[300px] sm:max-w-[500px]"
              title={folderPath}
            >
              {folderPath}
            </span>
            <Badge variant="secondary" className="h-5 px-1.5 font-normal text-[10px]">
              {itemCount} {itemType}
            </Badge>
            {isVirtual && (
              <Badge variant="outline" className="h-5 px-1.5 font-normal text-[10px]">
                FS API
              </Badge>
            )}
          </div>
        </div>
      </div>

      {onRefresh && (
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-gray-100"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh folder"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}
    </div>
  );
}
