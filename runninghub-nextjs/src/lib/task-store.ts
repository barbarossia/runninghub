import fs from 'fs/promises';
import path from 'path';

const TASK_DIR = path.join(process.cwd(), '.next/cache/runninghub-tasks');

export interface TaskState {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalImages: number;
  completedCount: number;
  failedCount: number;
  startTime: number;
  endTime?: number;
  error?: string;
  currentImage?: string;
}

async function ensureDir() {
  try {
    await fs.mkdir(TASK_DIR, { recursive: true });
  } catch (error) {
    // Ignore
  }
}

function getTaskPath(taskId: string) {
  return path.join(TASK_DIR, `${taskId}.json`);
}

export async function initTask(taskId: string, totalImages: number) {
  await ensureDir();
  const task: TaskState = {
    taskId,
    status: 'processing',
    totalImages,
    completedCount: 0,
    failedCount: 0,
    startTime: Date.now(),
  };
  await fs.writeFile(getTaskPath(taskId), JSON.stringify(task, null, 2));
  return task;
}

export async function updateTask(taskId: string, updates: Partial<TaskState>) {
  try {
    const filePath = getTaskPath(taskId);
    const content = await fs.readFile(filePath, 'utf8');
    const task = JSON.parse(content) as TaskState;
    
    const updatedTask = { ...task, ...updates };
    await fs.writeFile(filePath, JSON.stringify(updatedTask, null, 2));
    return updatedTask;
  } catch (error) {
    console.error(`Failed to update task ${taskId}:`, error);
    return null;
  }
}

export async function getTask(taskId: string) {
  try {
    const filePath = getTaskPath(taskId);
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as TaskState;
  } catch (error) {
    return null;
  }
}
