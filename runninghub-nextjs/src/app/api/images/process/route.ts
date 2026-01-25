import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";
import type { Workflow } from "@/types/workspace";

interface ProcessRequest {
  images: string[];
  node_id?: string;
  timeout?: number;
  params?: Record<string, string>;
  deleteOriginal?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const data: ProcessRequest = await request.json();
    const { images, node_id = "203", timeout = 1800, params = {}, deleteOriginal = false } = data;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No images selected for processing" },
        { status: 400 },
      );
    }

    // Validate required environment variables
    const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
    const workflowId = process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID;

    if (!apiKey || !workflowId) {
      return NextResponse.json(
        { error: "RunningHub API configuration missing" },
        { status: 500 },
      );
    }

    // Create a background task to process images
    const taskId = `process_${images.length}_images_${Date.now()}`;

    // Initialize task in store
    await initTask(taskId, images.length);

    // Start background processing (in a real implementation, you might use a job queue)
    processImagesInBackground(images, node_id, timeout, taskId, params, deleteOriginal);

    const response = {
      success: true,
      task_id: taskId,
      message: `Started processing ${images.length} images`,
      image_count: images.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error processing images:", error);
    return NextResponse.json(
      { error: "Failed to start image processing" },
      { status: 500 },
    );
  }
}

/**
 * Process a single image with infinite retry on TASK_QUEUE_MAXED error
 * Will keep retrying until success for queue-related errors
 */
async function processSingleImageWithRetry(
  imagePath: string,
  nodeId: string,
  timeout: number,
  env: NodeJS.ProcessEnv,
  params: Record<string, string> = {},
  deleteOriginal: boolean = false,
): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}> {
  let attempt = 0;
  const baseDelay = 2000; // Start with 2 seconds
  const maxDelay = 30000; // Cap at 30 seconds between retries

  while (true) { // Infinite retry for TASK_QUEUE_MAXED
    const result = await processSingleImage(imagePath, nodeId, timeout, env, params, deleteOriginal);

    // If successful, return immediately
    if (result.success) {
      return result;
    }

    // Check if error is TASK_QUEUE_MAXED
    const isQueueMaxed = result.stdout?.includes('TASK_QUEUE_MAXED') ||
                         result.stderr?.includes('TASK_QUEUE_MAXED') ||
                         result.error?.includes('TASK_QUEUE_MAXED');

    if (isQueueMaxed) {
      attempt++;
      // Exponential backoff with cap: 2s, 4s, 8s, 16s, 30s, 30s, 30s...
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      console.log(`[${imagePath}] Task queue full, retry ${attempt} after ${delay}ms...`);
      await writeLog(`Queue full, retrying ${attempt} for ${imagePath}`, 'info', 'process_queue');
      await new Promise(resolve => setTimeout(resolve, delay));
      continue; // Retry the same image
    }

    // Not a queue error - return failure immediately
    return result;
  }
}

/**
 * Process a single image using spawn for better control
 */
function processSingleImage(
  imagePath: string,
  nodeId: string,
  timeout: number,
  env: NodeJS.ProcessEnv,
  params: Record<string, string> = {},
  deleteOriginal: boolean = false,
): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const cmd = "python";
    const args = [
      "-m",
      "runninghub_cli.cli",
      "process",
      imagePath,
      "--node",
      nodeId,
      "--timeout",
      String(timeout),
    ];

    // If deleteOriginal is FALSE, we need to pass --no-cleanup to PREVENT deletion
    // The CLI defaults to deleting unless --no-cleanup is present
    if (!deleteOriginal) {
      args.push("--no-cleanup");
    }

    // Add optional params
    Object.entries(params).forEach(([key, value]) => {
      args.push("-p", `${key}:${value}`);
    });

    console.log(`Running command: ${cmd} ${args.join(" ")}`);

    const childProcess = spawn(cmd, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // Collect stdout
    childProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      console.log(`[${imagePath}] STDOUT: ${text.trim()}`);
    });

    // Collect stderr
    childProcess.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      console.error(`[${imagePath}] STDERR: ${text.trim()}`);
    });

    // Set timeout
    const timeoutHandle = setTimeout(
      () => {
        console.error(
          `[${imagePath}] Process timed out after ${timeout + 60} seconds`,
        );
        childProcess.kill("SIGKILL");
        resolve({
          success: false,
          stdout,
          stderr,
          error: `Processing timed out after ${timeout + 60} seconds`,
        });
      },
      (timeout + 60) * 1000,
    );

    // Handle process exit
    childProcess.on("close", (code) => {
      clearTimeout(timeoutHandle);
      const success = code === 0;
      console.log(`[${imagePath}] Process exited with code: ${code}`);

      if (success) {
        console.log(`[${imagePath}] Successfully processed`);
        resolve({ success: true, stdout, stderr });
      } else {
        console.error(`[${imagePath}] Failed to process (exit code: ${code})`);
        // Include stderr in the error message for debugging
        const errorMsg = stderr?.trim() || `Process exited with code ${code}`;
        resolve({ success: false, stdout, stderr, error: errorMsg });
      }
    });

    // Handle process errors
    childProcess.on("error", (error) => {
      clearTimeout(timeoutHandle);
      console.error(`[${imagePath}] Process error:`, error);
      resolve({
        success: false,
        stdout,
        stderr,
        error: error.message,
      });
    });
  });
}

/**
 * Process items with concurrency limit
 * @param items - Array of items to process
 * @param limit - Maximum concurrent operations
 * @param processor - Async function to process each item
 * @returns Array of results in the same order as input
 */
async function processWithConcurrency<T, R>(
  items: T[],
  limit: number,
  processor: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Promise<void>[] = [];
  let index = 0;

  for (const item of items) {
    const currentIndex = index++;

    const promise = processor(item, currentIndex).then((result) => {
      results[currentIndex] = result;
      // Remove from executing array when done
      const idx = executing.indexOf(promise as any);
      if (idx > -1) executing.splice(idx, 1);
    });

    executing.push(promise);

    // When limit is reached, wait for one to finish
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  // Wait for all remaining to complete
  await Promise.all(executing);

  return results;
}

/**
 * Get workflow by ID from file
 */
async function getWorkflowById(workflowId: string): Promise<Workflow | undefined> {
  const path = await import('path');
  const fs = await import('fs/promises');

  try {
    const workflowDir = path.join(process.env.HOME || '~', 'Downloads', 'workspace', 'workflows');
    const workflowPath = path.join(workflowDir, `${workflowId}.json`);

    const content = await fs.readFile(workflowPath, 'utf-8');
    return JSON.parse(content) as Workflow;
  } catch (error) {
    console.error('Failed to load workflow:', error);
    return undefined;
  }
}

/**
 * Process multiple images in background
 */
async function processImagesInBackground(
  images: string[],
  nodeId: string,
  timeout: number,
  taskId: string,
  params: Record<string, string> = {},
  deleteOriginal: boolean = false,
) {
  await writeLog(`=== BACKGROUND PROCESSING STARTED for task: ${taskId} ===`, 'info', taskId);
  await writeLog(`Processing ${images.length} images with node ${nodeId}`, 'info', taskId);
  await writeLog(`Delete original images: ${deleteOriginal}`, 'info', taskId);
  
  if (Object.keys(params).length > 0) {
    await writeLog(`With params: ${JSON.stringify(params)}`, 'info', taskId);
  }

  const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
  const workflowId = process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID;
  const apiHost =
    process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn";
  const downloadDir = process.env.RUNNINGHUB_DOWNLOAD_DIR;

  // Load workflow to get sourceWorkflowId for CLI
  const workflow = await getWorkflowById(workflowId!);
  const cliWorkflowId = workflow?.sourceWorkflowId || workflowId;

  await writeLog(`Using workflow: ${workflowId} (CLI will use: ${cliWorkflowId})`, 'info', taskId);

  // Set environment for subprocess
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    RUNNINGHUB_API_KEY: apiKey!,
    RUNNINGHUB_WORKFLOW_ID: cliWorkflowId!,  // Use sourceWorkflowId for CLI
    RUNNINGHUB_API_HOST: apiHost,
  };

  if (downloadDir) {
    env.RUNNINGHUB_DOWNLOAD_DIR = downloadDir;
  }

  // Get concurrency limit from environment variable (default: 5)
  const maxConcurrent = parseInt(process.env.RUNNINGHUB_MAX_CONCURRENT_PROCESSES || '5');
  await writeLog(`Concurrency limit: ${maxConcurrent} simultaneous processes`, 'info', taskId);

  let successCount = 0;
  let failureCount = 0;

  try {
    // Process images with concurrency control
    const results = await processWithConcurrency(
      images,
      maxConcurrent,
      async (imagePath: string, index: number) => {
        await updateTask(taskId, {
          currentImage: `${imagePath} (${index + 1}/${images.length})`
        });

        // Check if file exists
        try {
          const fs = await import("fs/promises");
          await fs.access(imagePath);
        } catch {
          await writeLog(`Image file does not exist: ${imagePath}`, 'error', taskId);
          return { success: false, imagePath, error: 'File not found' };
        }

        const result = await processSingleImageWithRetry(imagePath, nodeId, timeout, env, params, deleteOriginal);

        if (result.success) {
          await writeLog(`✓ Successfully processed: ${imagePath}`, 'success', taskId);
          return { success: true, imagePath };
        } else {
          await writeLog(`✗ Failed to process: ${imagePath}`, 'error', taskId);
          if (result.error) {
            await writeLog(`  Error: ${result.error}`, 'error', taskId);
          }
          return { success: false, imagePath, error: result.error };
        }
      }
    );

    // Count successes and failures (sequential to avoid race conditions)
    for (const result of results) {
      if (result.success) {
        successCount++;
        await updateTask(taskId, { completedCount: successCount });
      } else {
        failureCount++;
        await updateTask(taskId, { failedCount: failureCount });
      }
    }

    await writeLog(`=== BACKGROUND PROCESSING COMPLETED for task: ${taskId} ===`, 'info', taskId);
    await writeLog(`Summary: ${successCount} succeeded, ${failureCount} failed out of ${images.length} total`, 'info', taskId);
    await updateTask(taskId, { status: 'completed', endTime: Date.now() });

  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    await writeLog(`Task crashed: ${error}`, 'error', taskId);
    await updateTask(taskId, { status: 'failed', error });
  }
}
