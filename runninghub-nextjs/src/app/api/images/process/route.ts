import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";

interface ProcessRequest {
  images: string[];
  node_id?: string;
  timeout?: number;
}

export async function POST(request: NextRequest) {
  try {
    const data: ProcessRequest = await request.json();
    const { images, node_id = "203", timeout = 1800 } = data;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No images selected for processing" },
        { status: 400 },
      );
    }

    // Validate required environment variables
    const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
    const workflowId = process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID;
    const apiHost =
      process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn";
    const downloadDir = process.env.RUNNINGHUB_DOWNLOAD_DIR;

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
    processImagesInBackground(images, node_id, timeout, taskId);

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
 * Process a single image using spawn for better control
 */
function processSingleImage(
  imagePath: string,
  nodeId: string,
  timeout: number,
  env: NodeJS.ProcessEnv,
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
      } else {
        console.error(`[${imagePath}] Failed to process (exit code: ${code})`);
      }

      resolve({ success, stdout, stderr });
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
 * Process multiple images in background
 */
async function processImagesInBackground(
  images: string[],
  nodeId: string,
  timeout: number,
  taskId: string,
) {
  await writeLog(`=== BACKGROUND PROCESSING STARTED for task: ${taskId} ===`, 'info', taskId);
  await writeLog(`Processing ${images.length} images with node ${nodeId}`, 'info', taskId);

  const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
  const workflowId = process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID;
  const apiHost =
    process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn";
  const downloadDir = process.env.RUNNINGHUB_DOWNLOAD_DIR;

  // Set environment for subprocess
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    RUNNINGHUB_API_KEY: apiKey!,
    RUNNINGHUB_WORKFLOW_ID: workflowId!,
    RUNNINGHUB_API_HOST: apiHost,
  };

  if (downloadDir) {
    env.RUNNINGHUB_DOWNLOAD_DIR = downloadDir;
  }

  let successCount = 0;
  let failureCount = 0;

  try {
    for (let i = 0; i < images.length; i++) {
      const imagePath = images[i];
      await writeLog(`Processing image ${i + 1}/${images.length}: ${imagePath}`, 'info', taskId);
      await updateTask(taskId, { currentImage: imagePath });

      // Check if file exists
      try {
        const fs = await import("fs/promises");
        await fs.access(imagePath);
      } catch {
        await writeLog(`Image file does not exist: ${imagePath}`, 'error', taskId);
        failureCount++;
        await updateTask(taskId, { failedCount: failureCount });
        continue;
      }

      // Process the image
      const result = await processSingleImage(imagePath, nodeId, timeout, env);

      if (result.success) {
        successCount++;
        await writeLog(`✓ Successfully processed: ${imagePath}`, 'success', taskId);
        await updateTask(taskId, { completedCount: successCount });
      } else {
        failureCount++;
        await writeLog(`✗ Failed to process: ${imagePath}`, 'error', taskId);
        await updateTask(taskId, { failedCount: failureCount });
        if (result.error) {
           await writeLog(`  Error: ${result.error}`, 'error', taskId);
        }
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
