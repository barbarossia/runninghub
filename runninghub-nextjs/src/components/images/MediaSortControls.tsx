/**
 * Media Sort Controls Component
 * Provides sorting options for media gallery (images/videos)
 */

'use client';

import { useState } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  Check,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type SortField, type SortDirection } from '@/store/image-store';
import { cn } from '@/lib/utils';

export interface MediaSortControlsProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  className?: string;
}

interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
  icon: React.ReactNode;
}

const sortOptions: SortOption[] = [
  {
    field: 'name',
    direction: 'asc',
    label: 'Name (A-Z)',
    icon: <SortAsc className="h-4 w-4" />,
  },
  {
    field: 'name',
    direction: 'desc',
    label: 'Name (Z-A)',
    icon: <SortDesc className="h-4 w-4" />,
  },
  {
    field: 'date',
    direction: 'desc',
    label: 'Date (Newest)',
    icon: <SortDesc className="h-4 w-4" />,
  },
  {
    field: 'date',
    direction: 'asc',
    label: 'Date (Oldest)',
    icon: <SortAsc className="h-4 w-4" />,
  },
  {
    field: 'size',
    direction: 'desc',
    label: 'Size (Largest)',
    icon: <SortDesc className="h-4 w-4" />,
  },
  {
    field: 'size',
    direction: 'asc',
    label: 'Size (Smallest)',
    icon: <SortAsc className="h-4 w-4" />,
  },
  {
    field: 'type',
    direction: 'asc',
    label: 'Type (A-Z)',
    icon: <SortAsc className="h-4 w-4" />,
  },
];

export function MediaSortControls({
  sortField,
  sortDirection,
  onSortChange,
  className = '',
}: MediaSortControlsProps) {
  // Find current label
  const currentOption = sortOptions.find(
    (opt) => opt.field === sortField && opt.direction === sortDirection
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-2 bg-white/95 backdrop-blur-md border-blue-200 hover:bg-blue-50 hover:border-blue-300',
            className
          )}
        >
          <ArrowUpDown className="h-4 w-4 text-blue-600" />
          <span className="hidden sm:inline">
            {currentOption?.label || 'Sort'}
          </span>
          <ChevronDown className="h-4 w-4 text-blue-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-700">
          Sort by
        </div>
        <DropdownMenuSeparator />

        {sortOptions.map((option) => {
          const isActive = option.field === sortField && option.direction === sortDirection;

          return (
            <DropdownMenuItem
              key={`${option.field}-${option.direction}`}
              onClick={() => onSortChange(option.field, option.direction)}
              className={cn(
                'gap-2 cursor-pointer',
                isActive && 'bg-blue-50 text-blue-700'
              )}
            >
              <span className={cn('text-gray-500', isActive && 'text-blue-600')}>
                {option.icon}
              </span>
              <span className="flex-1">{option.label}</span>
              {isActive && <Check className="h-4 w-4 text-blue-600" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
