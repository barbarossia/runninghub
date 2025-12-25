'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Trash2, RefreshCw, Minimize2, Maximize2, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
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
  taskId?: string | null;
  defaultVisible?: boolean; // Force console to be visible by default
  autoRefreshInterval?: number; // Optional auto-refresh interval
}

export function ConsoleViewer({ onRefresh, taskId, defaultVisible = true }: ConsoleViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [taskStatus, setTaskStatus] = useState<TaskState | null>(null);
  const [isMinimized, setIsMinimized] = useState(() => !taskId && !defaultVisible); // Auto-expand if taskId exists or defaultVisible
  const [isVisible, setIsVisible] = useState(() => !!taskId || defaultVisible);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset task status when taskId changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTaskStatus(null);
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

          // Auto-minimize on completion
          if (data.status === 'completed' && taskStatus?.status !== 'completed') {
            setTimeout(() => setIsMinimized(true), 3000);
          }
        }
      } catch (error) {
        console.error('Failed to fetch task status');
      }
    };

    fetchTask();
    const interval = setInterval(fetchTask, 1000);
    return () => clearInterval(interval);
  }, [taskId, taskStatus?.status]);

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
    switch (level) {
      case 'error': return 'text-red-500';
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-gray-300';
    }
  };

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
    return (
      <Card className="fixed bottom-4 right-4 z-50 w-[320px] shadow-2xl bg-black border border-gray-700 opacity-90 hover:opacity-100 transition-all">
        <div className="p-3 flex items-center gap-3">
          <div className="flex-1">
             <div className="flex items-center justify-between mb-1">
               <span className="text-[10px] font-mono font-bold text-blue-400">
                 {taskStatus?.status === 'processing' ? 'PROCESSING' : 'CONSOLE'}
               </span>
               <div className="flex items-center gap-1">
                 {taskStatus && (
                   <span className="text-[10px] text-gray-400 mr-2">
                     {taskStatus.completedCount}/{taskStatus.totalImages}
                   </span>
                 )}
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-5 w-5 hover:bg-gray-800 text-gray-400"
                   onClick={() => setIsMinimized(false)}
                 >
                   <Maximize2 className="w-3 h-3" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-5 w-5 hover:bg-gray-800 text-gray-400 hover:text-red-400"
                   onClick={() => setIsVisible(false)}
                 >
                   <X className="w-3 h-3" />
                 </Button>
               </div>
             </div>
             {taskStatus && (
               <Progress value={getProgress()} className="h-1 bg-gray-800" />
             )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-[500px] h-[350px] shadow-2xl flex flex-col overflow-hidden border border-gray-700 bg-black opacity-95 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-gray-900 text-white shrink-0 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-mono font-bold tracking-tight">LOGS CONSOLE</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1 border-gray-700 text-gray-400">
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
            className="h-6 w-6 hover:bg-gray-800 text-gray-500 hover:text-white" 
            onClick={clearLogs}
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-gray-800 text-gray-500 hover:text-white" 
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-gray-800 text-gray-500 hover:text-red-400" 
            onClick={() => setIsVisible(false)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Task Progress Section */}
      {taskStatus && (
        <div className="bg-gray-900/50 p-3 border-b border-gray-800 space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-300">
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
          <Progress value={getProgress()} className="h-1.5 bg-gray-800" />
        </div>
      )}

      {/* Logs Area */}
      <div 
        ref={scrollRef}
        className="flex-1 bg-black p-2 font-mono text-[10px] overflow-y-auto"
      >
        {logs.length === 0 ? (
          <div className="text-gray-600 italic text-center mt-10"></div>
        ) : (
          <div className="space-y-0.5">
            {[...logs].reverse().map((log, i) => (
              <div key={i} className="flex gap-2 hover:bg-white/5 p-0.5 rounded transition-colors border-l-2 border-transparent hover:border-blue-500">
                <span className="text-gray-600 shrink-0 tabular-nums">
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
      <div className="bg-gray-900/50 p-1 px-2 text-[9px] text-gray-500 flex justify-between items-center shrink-0 border-t border-gray-800">
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