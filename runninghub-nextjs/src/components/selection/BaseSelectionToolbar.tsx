'use client';

import React, { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface BaseToolbarProps {
  selectedCount: number;
  isProcessing?: boolean;
  disabled?: boolean;
  className?: string;
  badgeColor?: string;
  badgeText?: string;
  children: (mode: 'expanded' | 'floating') => ReactNode;
  onDeselectAll: () => void;
}

export function BaseSelectionToolbar({
  selectedCount,
  isProcessing = false,
  disabled = false,
  className = '',
  badgeColor = 'bg-blue-600',
  badgeText = undefined,
  children,
  onDeselectAll,
}: BaseToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSelection = selectedCount > 0;

  const toolbarDisabled = disabled || !hasSelection || isProcessing;

  return (
    <AnimatePresence mode="wait">
      {hasSelection && (
        isExpanded ? (
          /* Expanded Mode (Sticky at top of gallery area) */
          <motion.div
            key="expanded-toolbar"
            initial={{ opacity: 0, y: -20, x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
              "sticky top-4 z-30 bg-white/95 backdrop-blur-md border border-blue-100 rounded-xl shadow-lg p-3 mb-6 flex flex-col gap-3 w-full max-w-4xl mx-auto",
              className
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="default" className={cn("text-sm px-3 py-1", badgeColor)}>
                  {badgeText || `${selectedCount} selected`}
                </Badge>
                {children('expanded')}
              </div>

              <div className="flex items-center gap-2">
                {children('expanded-actions')}

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-gray-200 hover:bg-gray-100"
                  onClick={() => setIsExpanded(false)}
                  title="Minimize to floating bar"
                >
                  <Minimize2 className="h-4 w-4 text-gray-600" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-gray-400 hover:text-gray-900"
                  onClick={onDeselectAll}
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Floating Mode (Compact bar at bottom) */
          <motion.div
            key="floating-toolbar"
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
              "fixed bottom-8 left-1/2 z-40 flex items-center gap-2 p-1.5 px-3 bg-gray-900/95 border border-gray-700 rounded-full shadow-2xl backdrop-blur-md",
              className
            )}
          >
            <div className="flex items-center border-r border-gray-700 pr-3 mr-1">
              <span className="text-xs font-bold text-white whitespace-nowrap">
                {selectedCount} <span className="text-gray-400 font-normal">selected</span>
              </span>
            </div>

            {children('floating')}

            <div className="w-px h-4 bg-gray-700 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(true)}
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full"
              title="Expand to card"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onDeselectAll}
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        )
      )}
    </AnimatePresence>
  );
}
