'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Trash2, RefreshCw, Minimize2, Maximize2, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'success' | 'warning';
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
  defaultVisible?: boolean; // Force console to be visible by default
  autoRefreshInterval?: number; // Optional auto-refresh interval
}

export function ConsoleViewer({ onRefresh, onTaskComplete, onStatusChange, taskId, defaultVisible = false }: ConsoleViewerProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [taskStatus, setTaskStatus] = useState<TaskState | null>(null);
  const [isMinimized, setIsMinimized] = useState(!taskId); // Default to minimized, auto-expand if taskId exists
  const [isVisible, setIsVisible] = useState(() => !!taskId || defaultVisible);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastStatusRef = useRef<string | null>(null);

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

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
          const data = await res.json();
          setTaskStatus(data);

          // Check for status change
          if (data.status !== lastStatusRef.current) {
             onStatusChange?.(taskId, data.status);

             if (data.status === 'completed' || data.status === 'failed') {
               onTaskComplete?.(taskId, data.status);
               
               // Auto-minimize on completion
               if (data.status === 'completed') {
                 setTimeout(() => setIsMinimized(true), 3000);
               }
             }
             lastStatusRef.current = data.status;
          }
        }
      } catch (error) {
        console.error('Failed to fetch task status');
      }
    };

    fetchTask();
    const interval = setInterval(fetchTask, 1000);
    return () => clearInterval(interval);
  }, [taskId, onTaskComplete]); // Removed taskStatus dependency to avoid infinite loops if it was used

  // Polling logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs?limit=100');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs as LogEntry[]);
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      }
    };

    fetchLogs(); // Initial fetch
    const interval = setInterval(fetchLogs, 1000); // Poll every 1s for logs

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && !isMinimized && isVisible) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isMinimized, isVisible]);

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

  if (!isVisible) {
    return (
      <Button
        className="fixed bottom-4 right-4 z-50 shadow-lg rounded-full w-10 h-10 p-0"
        onClick={() => setIsVisible(true)}
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
      <Card className={`fixed bottom-4 right-4 z-50 w-[320px] shadow-lg ${consoleBg} ${minBorder} ${opacity} hover:opacity-100 transition-all`}>
        <div className="overflow-hidden">
          {/* Header with icon and controls */}
          <div className={`flex items-center justify-between p-2 ${minHeaderBg} backdrop-blur-sm`}>
            <span className={`text-xs font-mono font-semibold ${minIconColor}`}>{'>_'}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-5 w-5 ${buttonHover} ${buttonText}`}
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-5 w-5 ${buttonHover} ${buttonText} hover:text-red-400`}
                onClick={() => setIsVisible(false)}
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
    <Card className={`fixed bottom-4 right-4 z-50 w-[500px] h-[350px] shadow-2xl flex flex-col overflow-hidden ${consoleBorder} ${consoleBg} ${opacity} transition-all`}>
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
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${buttonHover} ${buttonText} hover:text-red-400`}
            onClick={() => setIsVisible(false)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

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
        {logs.length === 0 ? (
          <div className={`${emptyText} italic text-center mt-10`}></div>
        ) : (
          <div className="space-y-0.5">
            {[...logs].reverse().map((log, i) => (
              <div key={i} className={`flex gap-2 ${consoleHover} p-0.5 rounded transition-colors border-l-2 border-transparent ${consoleHoverBorder}`}>
                <span className={`${consoleTimestamp} shrink-0 tabular-nums`}>
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                </span>
                <span className={`${getLevelColor(log.level)} break-all leading-tight`}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className={`${footerBg} p-1 px-2 text-[9px] ${footerText} flex justify-between items-center shrink-0 border-t ${consoleBorder}`}>
         <span className="flex items-center gap-1 italic">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
           Monitoring active (1s)
         </span>
         {onRefresh && (
           <div className="flex items-center gap-2">
             <Button
               variant="ghost"
               size="sm"
               className="h-4 p-0 text-[9px] hover:bg-transparent text-blue-400 hover:text-blue-300"
               onClick={() => onRefresh(false)}
             >
               <RefreshCw className="w-2.5 h-2.5 mr-1" /> REFRESH
             </Button>
           </div>
         )}
      </div>
    </Card>
  );
}