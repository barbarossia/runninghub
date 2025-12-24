'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ImageGallerySkeletonProps {
  viewMode?: 'grid' | 'list' | 'large';
  count?: number;
}

export function ImageGallerySkeleton({
  viewMode = 'grid',
  count = 12,
}: ImageGallerySkeletonProps) {
  // Get grid columns based on view mode
  const gridCols = (() => {
    switch (viewMode) {
      case 'grid':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
      case 'large':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 'list':
        return 'grid-cols-1';
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
    }
  })();

  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search skeleton */}
          <div className="relative flex-1 sm:max-w-xs">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Filter skeleton */}
          <div className="flex gap-1">
            <Skeleton className="h-9 w-12 rounded-md" />
            <Skeleton className="h-9 w-12 rounded-md" />
            <Skeleton className="h-9 w-12 rounded-md" />
            <Skeleton className="h-9 w-12 rounded-md" />
          </div>
        </div>

        {/* View mode skeleton */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Skeleton className="h-9 w-24 rounded-md" />
          <div className="flex gap-1">
            <Skeleton className="h-9 w-10 rounded-md" />
            <Skeleton className="h-9 w-10 rounded-md" />
            <Skeleton className="h-9 w-10 rounded-md" />
          </div>
        </div>
      </div>

      {/* Image grid skeleton */}
      <div className={`grid gap-3 ${gridCols}`}>
        {Array.from({ length: count }).map((_, index) => (
          <Card
            key={index}
            className="overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {viewMode === 'list' ? (
              // List view skeleton
              <div className="p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="w-12 h-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            ) : (
              // Grid and large view skeleton
              <>
                <Skeleton
                  className={`w-full ${
                    viewMode === 'large' ? 'aspect-square' : 'aspect-square'
                  }`}
                />
                {viewMode === 'large' && (
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                )}
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
