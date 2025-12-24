'use client';

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useProgressStore } from '@/store';
import { useProgressTracking } from '@/hooks';
import { toast } from 'sonner';
import type { ProcessingTask } from '@/types';

interface ProgressModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onTaskComplete?: (taskId: string) => void;
  onTaskFail?: (taskId: string, error: string) => void;
}

export function ProgressModal({
  open: controlledOpen,
  onOpenChange,
  onTaskComplete,
  onTaskFail,
}: ProgressModalProps) {
  const store = useProgressStore();

  const {
    activeTask,
    hasActiveTask,
    taskCount,
    overallProgress,
    isProgressModalOpen: internalOpen,
    openModal,
    closeModal,
    clearCompletedTasks,
  } = useProgressTracking({
    onTaskComplete,
    onTaskFail,
    autoOpenModal: false,
  });

  // Use controlled or uncontrolled state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (controlledOpen === undefined) {
        if (newOpen) {
          openModal();
        } else {
          closeModal();
        }
      }
      onOpenChange?.(newOpen);
    },
    [controlledOpen, openModal, closeModal, onOpenChange]
  );

  const handleClearCompleted = useCallback(() => {
    clearCompletedTasks();
    toast.success('Cleared completed tasks');
  }, [clearCompletedTasks]);

  // Task status icon
  const getStatusIcon = useCallback((status: ProcessingTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  }, []);

  // Expandable task details
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleTaskExpanded = useCallback((taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // Get all tasks as array
  const tasksArray = useMemo(() => {
    return Array.from(store.tasks.values()).sort(
      (a, b) => a.task_id.localeCompare(b.task_id)
    );
  }, [store.tasks]);

  // Auto-close modal when all tasks are done
  useEffect(() => {
    if (
      tasksArray.length > 0 &&
      tasksArray.every((t) => t.status === 'completed' || t.status === 'failed') &&
      isOpen
    ) {
      const timer = setTimeout(() => {
        handleOpenChange(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [tasksArray, isOpen, handleOpenChange]);

  if (!activeTask && tasksArray.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Processing Progress</span>
            <Badge variant="secondary">{taskCount} task{taskCount !== 1 ? 's' : ''}</Badge>
          </DialogTitle>
          <DialogDescription>
            {hasActiveTask
              ? 'Processing images with RunningHub AI...'
              : 'All tasks completed'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Active task */}
          {activeTask && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Current Task</h4>
                <Badge
                  variant={
                    activeTask.status === 'processing'
                      ? 'default'
                      : activeTask.status === 'completed'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {activeTask.status}
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <Progress value={overallProgress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{activeTask.current_image || 'Initializing...'}</span>
                  <span>{overallProgress.toFixed(0)}%</span>
                </div>
              </div>

              {/* Task info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Images:</span>{' '}
                  <span className="font-medium">{activeTask.image_count}</span>
                </div>
                <div>
                  <span className="text-gray-600">Completed:</span>{' '}
                  <span className="font-medium">
                    {activeTask.completed_images?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTask && tasksArray.length > 1 && <Separator />}

          {/* All tasks list */}
          {tasksArray.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">All Tasks</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleClearCompleted}
                >
                  Clear Completed
                </Button>
              </div>

              <div className="space-y-2">
                {tasksArray.map((task) => {
                  const isExpanded = expandedTasks.has(task.task_id);
                  const hasDetails =
                    (task.completed_images && task.completed_images.length > 0) ||
                    (task.failed_images && task.failed_images.length > 0);

                  return (
                    <div
                      key={task.task_id}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      {/* Task header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStatusIcon(task.status)}
                          <span className="text-sm font-medium truncate">
                            Task {task.task_id.slice(0, 8)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {task.image_count} images
                          </Badge>
                        </div>

                        {/* Progress */}
                        {task.status === 'processing' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">
                              {task.progress?.toFixed(0) || 0}%
                            </span>
                            <Progress
                              value={task.progress || 0}
                              className="w-16 h-1"
                            />
                          </div>
                        )}

                        {/* Expand button */}
                        {hasDetails && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleTaskExpanded(task.task_id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Expanded details */}
                      {isExpanded && hasDetails && (
                        <div className="mt-2 space-y-2">
                          {/* Completed images */}
                          {task.completed_images &&
                            task.completed_images.length > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-xs text-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Completed ({task.completed_images.length})</span>
                                </div>
                                <div className="max-h-32 overflow-y-auto pl-4">
                                  {task.completed_images.map((img, idx) => (
                                    <div
                                      key={idx}
                                      className="text-xs text-gray-600 truncate"
                                    >
                                      {img}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Failed images */}
                          {task.failed_images && task.failed_images.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-red-600">
                                <XCircle className="h-3 w-3" />
                                <span>Failed ({task.failed_images.length})</span>
                              </div>
                              <div className="max-h-32 overflow-y-auto pl-4">
                                {task.failed_images.map((fail, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs text-red-600 truncate"
                                    title={fail.error}
                                  >
                                    {fail.path}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-gray-500">
            {hasActiveTask ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                All tasks complete
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
