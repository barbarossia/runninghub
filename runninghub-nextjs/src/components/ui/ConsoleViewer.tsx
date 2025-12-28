'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Terminal, Trash2, RefreshCw, Minimize2, Maximize2, Loader2, CheckCircle2, XCircle, X, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'success' | 'warning' | 'debug';
  source: 'ui' | 'api' | 'cli';
  message: string;
  taskId?: string;
  metadata?: Record<string, any>;
}

interface TaskState {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalImages: number;
  completedCount: number;
  failedCount: number;
  currentImage?: string;
}

type DisplaySize = 'close' | 'min' | 'max';

interface ConsoleViewerProps {
  onRefresh?: (silent?: boolean) => void;
  onTaskComplete?: (taskId: string, status: 'completed' | 'failed') => void;
  onStatusChange?: (taskId: string, status: TaskState['status']) => void;
  taskId?: string | null;
  defaultVisible?: boolean; // Force console to be visible by default
  autoRefreshInterval?: number; // Optional auto-refresh interval
}

// Local storage key for console display size
const CONSOLE_DISPLAY_SIZE_KEY = 'runninghub-console-display-size';

export function ConsoleViewer({ onRefresh, onTaskComplete, onStatusChange, taskId, defaultVisible = false }: ConsoleViewerProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [taskStatus, setTaskStatus] = useState<TaskState | null>(null);

  // Display size state - initialized from env var only (localStorage loaded after mount to prevent hydration errors)
  const [displaySize, setDisplaySize] = useState<DisplaySize>(() => {
    // Check environment variable for default (works on both server and client)
    const envDefault = process.env.NEXT_PUBLIC_CONSOLE_DISPLAY_SIZE;
    if (envDefault && (envDefault === 'close' || envDefault === 'min' || envDefault === 'max')) {
      return envDefault as DisplaySize;
    }

    // Final fallback
    return 'close';
  });

  // Derived states for backward compatibility
  const isVisible = displaySize !== 'close';
  const isMinimized = displaySize === 'min';

  const [isPaused, setIsPaused] = useState(false);
  const [filterLevel, setFilterLevel] = useState<'all' | LogEntry['level']>('all');
  const [filterSource, setFilterSource] = useState<'all' | LogEntry['source']>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastStatusRef = useRef<string | null>(null);

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);

    // Load display size from localStorage after mounting (prevents hydration mismatch)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CONSOLE_DISPLAY_SIZE_KEY);
      if (saved && (saved === 'close' || saved === 'min' || saved === 'max')) {
        setDisplaySize(saved as DisplaySize);
      }
    }
  }, []);

  // Save display size to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      localStorage.setItem(CONSOLE_DISPLAY_SIZE_KEY, displaySize);
    }
  }, [displaySize, mounted]);

  // Reset task status when taskId changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTaskStatus(null);
    lastStatusRef.current = null;
  }, [taskId]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
          } catch(e) {
            return;
          }
          
          if (!data) return;

          setTaskStatus(data);

          // Check for status change
          if (data.status !== lastStatusRef.current) {
             onStatusChange?.(taskId, data.status);

             if (data.status === 'completed' || data.status === 'failed') {
               onTaskComplete?.(taskId, data.status);

               // Auto-minimize on completion
               if (data.status === 'completed') {
                 setTimeout(() => setDisplaySize('min'), 3000);
               }
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
  }, [taskId, onTaskComplete, isPaused]); // Removed taskStatus dependency to avoid infinite loops if it was used

  // Polling logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs?limit=100');
        if (res.ok) {
          const text = await res.text();
          let data;
          try {
            data = text ? JSON.parse(text) : null;
          } catch(e) {
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

    fetchLogs(); // Initial fetch
    
    if (!isPaused) {
      const interval = setInterval(fetchLogs, 1000); // Poll every 1s for logs
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && !isMinimized && isVisible && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isMinimized, isVisible, isPaused]);

  const clearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs');
    }
  };

  const getLevelColor = (level: string) => {
    const isDark = mounted && theme === 'dark';
    switch (level) {
      case 'error': return 'text-red-500';
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      default: return isDark ? 'text-gray-300' : 'text-gray-600';
    }
  };

  const getSourceBadge = (source: LogEntry['source']) => {
    const badges = {
      ui: { label: 'UI', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
      api: { label: 'API', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
      cli: { label: 'CLI', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    };
    const badge = badges[source];

    // Handle backward compatibility for old logs without source field
    if (!badge) {
      return (
        <Badge variant="outline" className="text-[8px] h-3 px-1 border bg-gray-500/10 text-gray-400 border-gray-500/30">
          LEGACY
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className={`text-[8px] h-3 px-1 border ${badge.color}`}>
        {badge.label}
      </Badge>
    );
  };

  // Theme-aware color classes
  const isDark = mounted && theme === 'dark';
  const consoleBg = isDark ? 'bg-gray-950' : 'bg-white';
  const consoleBorder = isDark ? 'border-gray-700' : 'border-gray-200';
  const consoleHeaderBg = isDark ? 'bg-gray-900' : 'bg-gray-100';
  const consoleHeaderText = isDark ? 'text-white' : 'text-gray-900';
  const consoleTimestamp = isDark ? 'text-gray-600' : 'text-gray-400';
  const consoleHover = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100';
  const consoleHoverBorder = isDark ? 'hover:border-blue-500' : 'hover:border-blue-600';
  const buttonHover = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200';
  const buttonText = isDark ? 'text-gray-400' : 'text-gray-600';
  const buttonHoverText = isDark ? 'hover:text-white' : 'hover:text-gray-900';
  const badgeBorder = isDark ? 'border-gray-700' : 'border-gray-300';
  const badgeText = isDark ? 'text-gray-400' : 'text-gray-600';
  const progressBg = isDark ? 'bg-gray-800' : 'bg-gray-300';
  const footerBg = isDark ? 'bg-gray-900/50' : 'bg-gray-100/80';
  const footerText = isDark ? 'text-gray-500' : 'text-gray-600';
  const logAreaBg = isDark ? 'bg-black' : 'bg-gray-50';
  const emptyText = isDark ? 'text-gray-600' : 'text-gray-400';
  const opacity = isDark ? 'opacity-95' : 'opacity-100';

  const getProgress = () => {
    if (!taskStatus || taskStatus.totalImages === 0) return 0;
    return ((taskStatus.completedCount + taskStatus.failedCount) / taskStatus.totalImages) * 100;
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Level filter
      if (filterLevel !== 'all' && log.level !== filterLevel) return false;

      // Source filter
      if (filterSource !== 'all' && log.source !== filterSource) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.message.toLowerCase().includes(query) ||
          log.taskId?.toLowerCase().includes(query) ||
          JSON.stringify(log.metadata || {}).toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [logs, filterLevel, filterSource, searchQuery]);

  if (!isVisible) {
    return (
      <Button
        className="fixed bottom-4 right-4 z-50 shadow-lg rounded-full w-10 h-10 p-0"
        onClick={() => setDisplaySize('min')}
        variant="secondary"
      >
        <Terminal className="w-5 h-5" />
      </Button>
    );
  }

  if (isMinimized) {
    // Get the most recent 1-3 logs for display in minimized state
    const recentLogs = [...logs].slice(0, 3);

    // Softer contrast colors for minimized state
    const minHeaderBg = isDark ? 'bg-gray-900/80' : 'bg-gray-200/80';
    const minBodyBg = isDark ? 'bg-gray-950/60' : 'bg-gray-50/60';
    const minIconColor = 'text-blue-500';
    const minLogTimestamp = isDark ? 'text-gray-500' : 'text-gray-400';
    const minLogText = isDark ? 'text-gray-400' : 'text-gray-500';
    const minLogHover = isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-200/50';
    const minLogBorder = isDark ? 'border-gray-700/50' : 'border-gray-200/50';
    const minStatusText = isDark ? 'text-gray-400' : 'text-gray-500';
    const minProgressBg = isDark ? 'bg-gray-800/50' : 'bg-gray-300/50';
    const minBorder = isDark ? 'border-gray-800/60' : 'border-gray-300/60';

    return (
      <Card className={`fixed bottom-4 right-4 z-50 w-[450px] shadow-lg ${consoleBg} ${minBorder} ${opacity} hover:opacity-100 transition-all`}>
        <div className="overflow-hidden">
          {/* Header with icon and controls */}
          <div className={`flex items-center justify-between p-2 ${minHeaderBg} backdrop-blur-sm`}>
            <span className={`text-xs font-mono font-semibold ${minIconColor}`}>{'>_'}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-5 w-5 ${buttonHover} ${buttonText}`}
                onClick={() => setDisplaySize('max')}
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-5 w-5 ${buttonHover} ${buttonText} hover:text-red-400`}
                onClick={() => setDisplaySize('close')}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Body with softer contrast */}
          <div className={`p-2 ${minBodyBg} backdrop-blur-sm`}>
            {/* Progress bar if task is running */}
            {taskStatus && (
              <Progress value={getProgress()} className={`h-0.5 mb-2 ${minProgressBg}`} />
            )}

            {/* Recent logs preview */}
            {recentLogs.length > 0 && (
              <div className="space-y-0.5 mb-2">
                {recentLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${minLogHover} p-1 rounded transition-colors border-l-2 ${minLogBorder} text-[9px] font-mono`}
                  >
                    <span className={`${minLogTimestamp} shrink-0 tabular-nums`}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                    </span>
                    <span className={`${minLogText} break-all leading-tight line-clamp-1`}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Task status summary */}
            {taskStatus && (
              <div className={`flex items-center justify-between pt-1.5 border-t ${minLogBorder} text-[9px] ${minStatusText}`}>
                <span className="flex items-center gap-1">
                  {taskStatus.status === 'processing' && <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400" />}
                  {taskStatus.status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5 text-green-400" />}
                  {taskStatus.status === 'failed' && <XCircle className="w-2.5 h-2.5 text-red-400" />}
                  <span className="font-medium truncate max-w-[200px]">
                    {taskStatus.currentImage ? taskStatus.currentImage.split('/').pop() : 'Initializing...'}
                  </span>
                </span>
                <span className="font-mono">
                  {taskStatus.completedCount + taskStatus.failedCount}/{taskStatus.totalImages}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 z-50 w-[800px] h-[500px] shadow-2xl flex flex-col overflow-hidden ${consoleBorder} ${consoleBg} ${opacity} transition-all`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-2 ${consoleHeaderBg} ${consoleHeaderText} shrink-0 border-b ${consoleBorder}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-blue-400">{'>_'}</span>
          <span className="text-xs font-mono font-bold tracking-tight">LOGS CONSOLE</span>
          <Badge variant="outline" className={`text-[9px] h-4 px-1 ${badgeBorder} ${badgeText}`}>
            {logs.length}
          </Badge>
          {taskStatus?.status === 'processing' && (
             <Badge variant="default" className="text-[9px] h-4 px-1 bg-blue-600 text-white animate-pulse">
               RUNNING
             </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${buttonHover} ${buttonText} ${buttonHoverText}`}
            onClick={clearLogs}
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${buttonHover} ${buttonText} ${buttonHoverText}`}
            onClick={() => setDisplaySize('min')}
          >
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${buttonHover} ${buttonText} hover:text-red-400`}
            onClick={() => setDisplaySize('close')}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Filter Bar - Removed (moved to footer) */}

      {/* Task Progress Section */}
      {taskStatus && (
        <div className={`${consoleHeaderBg}/50 p-3 border-b ${consoleBorder} space-y-2`}>
          <div className={`flex justify-between items-center text-xs ${consoleHeaderText}`}>
             <div className="flex items-center gap-2">
               {taskStatus.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
               {taskStatus.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
               {taskStatus.status === 'failed' && <XCircle className="w-3 h-3 text-red-400" />}
               <span className="font-medium truncate max-w-[250px]">
                 {taskStatus.currentImage ? taskStatus.currentImage.split('/').pop() : 'Initializing...'}
               </span>
             </div>
             <span className="font-mono">
               {taskStatus.completedCount + taskStatus.failedCount} / {taskStatus.totalImages}
             </span>
          </div>
          <Progress value={getProgress()} className={`h-1.5 ${progressBg}`} />
        </div>
      )}

      {/* Logs Area */}
      <div
        ref={scrollRef}
        className={`flex-1 ${logAreaBg} p-2 font-mono text-[10px] overflow-y-auto`}
      >
        {filteredLogs.length === 0 ? (
          <div className={`${emptyText} italic text-center mt-10`}>
            {logs.length === 0 ? '' : 'No logs match your filters'}
          </div>
        ) : (
          <div className="space-y-0.5">
            {[...filteredLogs].reverse().map((log, i) => (
              <div key={i} className={`flex gap-2 items-start ${consoleHover} p-1 rounded transition-colors border-l-2 ${consoleHoverBorder}`}>
                <span className={`${consoleTimestamp} shrink-0 tabular-nums text-[9px]`}>
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                </span>
                {getSourceBadge(log.source)}
                <span className={`${getLevelColor(log.level)} break-all leading-tight flex-1 text-[10px]`}>
                  {log.message}
                </span>
                {log.taskId && (
                  <span className={`text-[8px] ${consoleTimestamp} shrink-0 tabular-nums`}>
                    #{log.taskId.slice(-8)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className={`${footerBg} p-1.5 px-2 text-[9px] ${footerText} flex justify-between items-center shrink-0 border-t ${consoleBorder}`}>
         <div className="flex items-center gap-2">
           {/* Monitoring Status */}
           <span className="flex items-center gap-1 italic shrink-0">
             <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
             {isPaused ? 'Paused' : 'Live'}
           </span>

           {/* Level Filter - Shrunk */}
           <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v as 'all' | LogEntry['level'])}>
             <SelectTrigger className="h-3.5 text-[8px] w-12 px-1 border border-gray-600/50">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All</SelectItem>
               <SelectItem value="info">Info</SelectItem>
               <SelectItem value="success">Success</SelectItem>
               <SelectItem value="warning">Warning</SelectItem>
               <SelectItem value="error">Error</SelectItem>
               <SelectItem value="debug">Debug</SelectItem>
             </SelectContent>
           </Select>

           {/* Source Filter - Shrunk */}
           <Select value={filterSource} onValueChange={(v) => setFilterSource(v as 'all' | LogEntry['source'])}>
             <SelectTrigger className="h-3.5 text-[8px] w-12 px-1 border border-gray-600/50">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All</SelectItem>
               <SelectItem value="ui">UI</SelectItem>
               <SelectItem value="api">API</SelectItem>
               <SelectItem value="cli">CLI</SelectItem>
             </SelectContent>
           </Select>

           {/* Search Input - Compact */}
           <div className="relative w-28">
             <Input
               type="text"
               placeholder="Search..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="h-3.5 text-[8px] pl-5 py-0"
             />
             <Search className="absolute left-1 top-0.5 w-2.5 h-2.5 text-gray-400" />
             {searchQuery && (
               <button
                 onClick={() => setSearchQuery('')}
                 className="absolute right-1 top-0.5 text-gray-400 hover:text-gray-600"
               >
                 ×
               </button>
             )}
           </div>

           {/* Auto-refresh Checkbox */}
           <div className="flex items-center gap-1 shrink-0">
              <Checkbox
                id="console-auto-refresh"
                checked={!isPaused}
                onCheckedChange={(checked) => setIsPaused(checked === false)}
                className="w-3 h-3"
              />
              <Label htmlFor="console-auto-refresh" className="text-[8px] font-normal cursor-pointer leading-none">Auto</Label>
           </div>
         </div>
         {onRefresh && (
           <div className="flex items-center gap-2 shrink-0">
             <Button
               variant="ghost"
               size="sm"
               className="h-3.5 p-0 text-[8px] hover:bg-transparent text-blue-400 hover:text-blue-300"
               onClick={() => onRefresh(false)}
             >
               <RefreshCw className="w-2 h-2 mr-0.5" /> REFRESH
             </Button>
           </div>
         )}
      </div>
    </Card>
  );
}