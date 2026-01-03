'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Trash2, RefreshCw, Minus, Plus, ChevronDown, Loader2, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'success' | 'warning';
  source: 'ui' | 'api' | 'cli';
  message: string;
  taskId?: string;
}

interface TaskState {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalImages: number;
  completedCount: number;
  failedCount: number;
  currentImage?: string;
}

interface ConsoleViewerProps {
  onRefresh?: (silent?: boolean) => void;
  onTaskComplete?: (taskId: string, status: 'completed' | 'failed') => void;
  onStatusChange?: (taskId: string, status: TaskState['status']) => void;
  taskId?: string | null;
  defaultVisible?: boolean;
}

const CONSOLE_VISIBLE_KEY = 'runninghub-console-visible';

type PanelState = 'closed' | 'expanded';

export function ConsoleViewer({
  onRefresh,
  onTaskComplete,
  onStatusChange,
  taskId,
  defaultVisible = false
}: ConsoleViewerProps) {
  const [mounted, setMounted] = useState(false);
  const [panelState, setPanelState] = useState<PanelState>('closed');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [taskStatus, setTaskStatus] = useState<TaskState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [filterLevel, setFilterLevel] = useState<'all' | LogEntry['level']>('all');
  const [filterSource, setFilterSource] = useState<'all' | LogEntry['source']>('all');
  const [showSettings, setShowSettings] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastStatusRef = useRef<string | null>(null);

  // Handle wheel event to prevent page scroll when scrolling logs
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight;
    const isScrollingDown = e.deltaY > 0;
    const isScrollingUp = e.deltaY < 0;

    // Prevent page scroll if:
    // - Scrolling down and not at bottom
    // - Scrolling up and not at top
    if ((isScrollingDown && !isAtBottom) || (isScrollingUp && !isAtTop)) {
      e.preventDefault();
    }
  }, []);

  // Initialize from localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(CONSOLE_VISIBLE_KEY);
    if (saved === 'true' || defaultVisible) {
      setPanelState('expanded');
    }
  }, [defaultVisible]);

  // Save to localStorage
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      localStorage.setItem(CONSOLE_VISIBLE_KEY, String(panelState !== 'closed'));
    }
  }, [panelState, mounted]);

  // Keyboard shortcut to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setPanelState(prev => prev === 'closed' ? 'expanded' : 'closed');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset task status when taskId changes
  useEffect(() => {
    setTaskStatus(null);
    lastStatusRef.current = null;
  }, [taskId]);

  // Poll task status
  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (res.ok) {
          const text = await res.text();
          let data;
          try {
            data = text ? JSON.parse(text) : null;
          } catch (e) {
            return;
          }

          if (!data) return;

          setTaskStatus(data);

          // Check for status change
          if (data.status !== lastStatusRef.current) {
            onStatusChange?.(taskId, data.status);

            if (data.status === 'completed' || data.status === 'failed') {
              onTaskComplete?.(taskId, data.status);
            }
            lastStatusRef.current = data.status;
          }
        }
      } catch (error) {
        // Silent error
      }
    };

    fetchTask();

    if (!isPaused) {
      const interval = setInterval(fetchTask, 1000);
      return () => clearInterval(interval);
    }
  }, [taskId, onTaskComplete, onStatusChange, isPaused]);

  // Poll logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs?limit=100');
        if (res.ok) {
          const text = await res.text();
          let data;
          try {
            data = text ? JSON.parse(text) : null;
          } catch (e) {
            return;
          }

          if (data && data.logs) {
            setLogs(data.logs as LogEntry[]);
          }
        }
      } catch (error) {
        // Silent error
      }
    };

    fetchLogs();

    if (!isPaused) {
      const interval = setInterval(fetchLogs, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && panelState === 'expanded' && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, panelState, isPaused]);

  const clearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const togglePanel = useCallback(() => {
    setPanelState(prev => prev === 'closed' ? 'expanded' : 'closed');
  }, []);

  if (!mounted || panelState === 'closed') {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={togglePanel}
          size="sm"
          className="h-10 w-10 p-0 bg-white hover:bg-blue-50 text-blue-600 dark:text-blue-400 rounded-lg shadow-md border border-blue-200 hover:border-blue-300 transition-all font-mono text-sm dark:bg-gray-900 dark:border-blue-800 dark:hover:bg-blue-950"
          title="Open Console (⌘⇧C)"
        >
          &gt;_
        </Button>
      </div>
    );
  }

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />;
      case 'error':
        return <span className="text-red-500 flex-shrink-0 font-bold">✕</span>;
      case 'warning':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />;
      default:
        return <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex-shrink-0" />;
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  // Filter logs based on level and source
  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (filterSource !== 'all' && log.source !== filterSource) return false;
    return true;
  }).sort((a, b) => {
    // Sort by timestamp descending (newest first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <>
      {/* Settings Panel - Dropdown */}
      {showSettings && panelState === 'expanded' && (
        <div className="fixed bottom-16 left-4 z-[60]">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-blue-200 dark:border-blue-800 p-3 space-y-3 min-w-[200px]">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-blue-900 dark:text-blue-100">Log Level</label>
              <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v as typeof filterLevel)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-blue-900 dark:text-blue-100">Source</label>
              <Select value={filterSource} onValueChange={(v) => setFilterSource(v as typeof filterSource)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="ui">UI</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="cli">CLI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div
          className={cn(
            "border-t shadow-2xl transition-all duration-200 ease-in-out h-[calc(100vh/3)]",
            "bg-white dark:bg-gray-900",
            "border-blue-200 dark:border-blue-800"
          )}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-blue-600 dark:text-blue-400 font-mono text-sm">&gt;_</span>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Console</span>
            <Badge variant="secondary" className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs">
              {logs.length} logs
            </Badge>
            {taskStatus && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  taskStatus.status === 'processing' && "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
                  taskStatus.status === 'completed' && "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
                  taskStatus.status === 'failed' && "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                )}
              >
                {taskStatus.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {taskStatus.status}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              onClick={() => setPanelState('closed')}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {panelState === 'expanded' && (
          <div className="h-[calc(100vh/3-48px)]">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/30">
              <Button
                onClick={() => onRefresh?.()}
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>

              <Button
                onClick={() => setIsPaused(!isPaused)}
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 px-2 text-xs hover:bg-blue-100 dark:hover:bg-blue-900",
                  isPaused ? "text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300" : "text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200"
                )}
              >
                {isPaused ? (
                  <>
                    <Plus className="w-3 h-3 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <Minus className="w-3 h-3 mr-1" />
                    Pause
                  </>
                )}
              </Button>

              <Button
                onClick={clearLogs}
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-blue-700 dark:text-blue-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-blue-100 dark:hover:bg-blue-900"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>

              <Button
                onClick={() => setShowSettings(!showSettings)}
                size="sm"
                variant={showSettings ? "secondary" : "ghost"}
                className={cn(
                  "h-7 w-7 p-0",
                  showSettings ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" : "text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                )}
                title="Filter Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </Button>

              <div className="ml-auto flex items-center gap-2">
                {(filterLevel !== 'all' || filterSource !== 'all') && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {filteredLogs.length} / {logs.length}
                  </Badge>
                )}

                {taskStatus && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      taskStatus.status === 'processing' && "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
                      taskStatus.status === 'completed' && "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
                      taskStatus.status === 'failed' && "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                    )}
                  >
                    {taskStatus.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    {taskStatus.status}: {taskStatus.completedCount}/{taskStatus.totalImages}
                  </Badge>
                )}
              </div>
            </div>

            {/* Logs */}
            <div
              ref={scrollRef}
              onWheel={handleWheel}
              className="console-logs-scroll console-logs-container overflow-y-auto px-4 py-3 space-y-1 font-mono text-xs bg-white dark:bg-gray-950"
            >
              {filteredLogs.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {logs.length === 0 ? 'No logs yet' : 'No logs match current filters'}
                </div>
              ) : (
                filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-2 py-1 px-2 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors",
                      getLevelColor(log.level)
                    )}
                  >
                    <span className="flex-shrink-0 mt-0.5">{getLevelIcon(log.level)}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0 font-mono">{log.timestamp}</span>
                    <span className="flex-1 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
