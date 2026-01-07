'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export type ToolbarMode = 'expanded' | 'floating';

const STORAGE_KEY_PREFIX = 'runninghub-toolbar-mode-';
const DEFAULT_MODE: ToolbarMode = 'expanded'; // Default to expanded mode

/**
 * Custom hook to manage toolbar mode with localStorage persistence.
 * Remembers the user's preference per page.
 *
 * @returns [mode, setMode] - Current toolbar mode and function to update it
 *
 * @example
 * ```tsx
 * const [mode, setMode] = useToolbarMode();
 * // mode is 'expanded' | 'floating'
 * // setMode('floating') changes mode and persists to localStorage
 * ```
 */
export function useToolbarMode(): [ToolbarMode, (mode: ToolbarMode) => void] {
  const pathname = usePathname();
  const storageKey = `${STORAGE_KEY_PREFIX}${pathname}`;
  const [mode, setModeState] = useState<ToolbarMode>(DEFAULT_MODE);
  const [isMounted, setIsMounted] = useState(false);

  // Load saved mode from localStorage on mount
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(storageKey);
      if (savedMode === 'expanded' || savedMode === 'floating') {
        setModeState(savedMode);
      }
    } catch (error) {
      console.error('Failed to load toolbar mode from localStorage:', error);
    } finally {
      setIsMounted(true);
    }
  }, [storageKey]);

  // Update mode and persist to localStorage
  const setMode = (newMode: ToolbarMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(storageKey, newMode);
    } catch (error) {
      console.error('Failed to save toolbar mode to localStorage:', error);
    }
  };

  return [mode, setMode];
}
