import { useCallback, useEffect, useRef } from 'react';
import { useProgressStore } from '@/store';
import type { ProcessingTask } from '@/types';

interface UseProgressTrackingOptions {
  onTaskComplete?: (taskId: string) => void;
  onTaskFail?: (taskId: string, error: string) => void;
  autoOpenModal?: boolean;
  pollInterval?: number;
}

interface UseProgressTrackingReturn {
  // Task state
  tasks: Map<string, ProcessingTask>;
  activeTask: ProcessingTask | null;
  hasActiveTask: boolean;
  taskCount: number;
  overallProgress: number;

  // Modal state
  isProgressModalOpen: boolean;

  // Actions
  startTask: (task: ProcessingTask) => void;
  updateTaskProgress: (taskId: string, progress: number, current_image?: string) => void;
  completeTask: (taskId: string) => void;
  failTask: (taskId: string, error: string) => void;
  removeTask: (taskId: string) => void;

  // Modal actions
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;

  // Batch actions
  clearAllTasks: () => void;
  clearCompletedTasks: () => void;

  // Polling
  startPolling: (taskId: string) => void;
  stopPolling: () => void;
}

export function useProgressTracking(options: UseProgressTrackingOptions = {}): UseProgressTrackingReturn {
  const {
    onTaskComplete,
    onTaskFail,
    autoOpenModal = true,
    pollInterval = 1000,
  } = options;

  const store = useProgressStore();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTaskIdRef = useRef<string | null>(null);

  // Get active task
  const activeTask = store.activeTaskId
    ? store.tasks.get(store.activeTaskId) || null
    : null;

  const hasActiveTask = activeTask?.status === 'processing' || false;
  const overallProgress = activeTask?.progress || 0;

  // Polling for task status
  const startPolling = useCallback((taskId: string) => {
    // Stop existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingTaskIdRef.current = taskId;

    // Start new polling
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // In a real implementation, you would poll an endpoint to check task status
        // For now, this is a placeholder for the polling logic
        const response = await fetch(`/api/tasks/${taskId}/status`);
        if (!response.ok) {
          throw new Error('Failed to fetch task status');
        }

        const data = await response.json();

        // Update task based on status
        if (data.status === 'completed') {
          completeTask(taskId);
          stopPolling();
        } else if (data.status === 'failed') {
          failTask(taskId, data.error || 'Task failed');
          stopPolling();
        } else if (data.status === 'processing') {
          updateTaskProgress(
            taskId,
            data.progress || 0,
            data.current_image
          );
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Don't stop polling on network errors, just log them
      }
    }, pollInterval);
  }, [pollInterval, completeTask, failTask, updateTaskProgress, stopPolling]);

  // Auto-start polling when activeTaskId changes in store
  useEffect(() => {
    if (store.activeTaskId && store.activeTaskId !== pollingTaskIdRef.current) {
      startPolling(store.activeTaskId);
    } else if (!store.activeTaskId && pollingTaskIdRef.current) {
      stopPolling();
    }
  }, [store.activeTaskId, startPolling, stopPolling]);

  // Auto-open modal when task starts
  useEffect(() => {
    if (autoOpenModal && hasActiveTask && !store.isProgressModalOpen) {
      store.openProgressModal();
    }
  }, [hasActiveTask, autoOpenModal, store.isProgressModalOpen, store]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollingTaskIdRef.current = null;
  }, []);

  const startTask = useCallback((task: ProcessingTask) => {
    store.addTask(task);
    store.setActiveTask(task.task_id);
    store.startTask(task.task_id);
  }, [store]);

  const updateTaskProgress = useCallback((
    taskId: string,
    progress: number,
    current_image?: string
  ) => {
    store.updateProgress(taskId, progress, current_image);
  }, [store]);

  const completeTask = useCallback((taskId: string) => {
    store.completeTask(taskId);

    // If this was the active task, clear it
    if (store.activeTaskId === taskId) {
      store.setActiveTask(null);
    }

    onTaskComplete?.(taskId);

    // Auto-close modal after a delay if no more active tasks
    setTimeout(() => {
      const state = store.tasks;
      const hasProcessing = Array.from(state.values()).some(
        (t) => t.status === 'processing'
      );
      if (!hasProcessing && store.isProgressModalOpen) {
        store.closeProgressModal();
      }
    }, 2000);
  }, [store, onTaskComplete]);

  const failTask = useCallback((taskId: string, error: string) => {
    store.failTask(taskId, error);

    // If this was the active task, clear it
    if (store.activeTaskId === taskId) {
      store.setActiveTask(null);
    }

    onTaskFail?.(taskId, error);
  }, [store, onTaskFail]);

  const removeTask = useCallback((taskId: string) => {
    store.removeTask(taskId);
  }, [store]);

  const openModal = useCallback(() => {
    store.openProgressModal();
  }, [store]);

  const closeModal = useCallback(() => {
    store.closeProgressModal();
  }, [store]);

  const toggleModal = useCallback(() => {
    store.toggleProgressModal();
  }, [store]);

  const clearAllTasks = useCallback(() => {
    store.clearTasks();
  }, [store]);

  const clearCompletedTasks = useCallback(() => {
    store.clearCompletedTasks();
  }, [store]);

  return {
    tasks: store.tasks,
    activeTask,
    hasActiveTask,
    taskCount: store.tasks.size,
    overallProgress,

    isProgressModalOpen: store.isProgressModalOpen,

    startTask,
    updateTaskProgress,
    completeTask,
    failTask,
    removeTask,

    openModal,
    closeModal,
    toggleModal,

    clearAllTasks,
    clearCompletedTasks,

    startPolling,
    stopPolling,
  };
}