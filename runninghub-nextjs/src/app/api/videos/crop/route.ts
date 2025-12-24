import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";
import { CropRequest } from "@/types/crop";

export async function POST(request: NextRequest) {
  try {
    const data: CropRequest = await request.json();
    const {
      videos,
      crop_config,
      output_suffix = "_cropped",
      timeout = 3600,
    } = data;

    if (!videos || videos.length === 0) {
      return NextResponse.json(
        { error: "No videos selected for cropping" },
        { status: 400 }
      );
    }

    if (!crop_config || !crop_config.mode) {
      return NextResponse.json(
        { error: "Invalid crop configuration" },
        { status: 400 }
      );
    }

    // Validate required environment variables
    const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
    const workflowId = process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID;
    const apiHost =
      process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn";

    if (!apiKey || !workflowId) {
      return NextResponse.json(
        { error: "RunningHub API configuration missing" },
        { status: 500 }
      );
    }

    // Create a background task for video cropping
    const taskId = `crop_${videos.length}_videos_${Date.now()}`;

    // Initialize task in store
    await initTask(taskId, videos.length);

    // Start background cropping using Python CLI
    cropVideosInBackground(
      videos,
      crop_config,
      output_suffix,
      timeout,
      taskId
    );

    const response = {
      success: true,
      task_id: taskId,
      message: `Started cropping ${videos.length} videos`,
      video_count: videos.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error cropping videos:", error);
    return NextResponse.json(
      { error: "Failed to start video cropping" },
      { status: 500 }
    );
  }
}

/**
 * Crop a single video using RunningHub Python CLI
 */
function cropSingleVideo(
  videoPath: string,
  cropConfig: CropRequest["crop_config"],
  outputSuffix: string,
  timeout: number,
  env: NodeJS.ProcessEnv
): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const args = [
      "-m",
      "runninghub_cli.cli",
      "crop",
      videoPath,
      "--mode",
      cropConfig.mode,
      "--output-suffix",
      outputSuffix,
      "--timeout",
      String(timeout),
    ];

    // Add custom dimensions if provided
    if (cropConfig.mode === "custom") {
      if (cropConfig.width) args.push("--width", cropConfig.width);
      if (cropConfig.height) args.push("--height", cropConfig.height);
      if (cropConfig.x) args.push("--x", cropConfig.x);
      if (cropConfig.y) args.push("--y", cropConfig.y);
    }

    console.log(`Running command: python ${args.join(" ")}`);

    const childProcess = spawn("python", args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // Collect stdout
    childProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      console.log(`[${videoPath}] STDOUT: ${text.trim()}`);
    });

    // Collect stderr
    childProcess.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      console.log(`[${videoPath}] STDERR: ${text.trim()}`);
    });

    // Set timeout
    const timeoutHandle = setTimeout(
      () => {
        console.error(
          `[${videoPath}] Process timed out after ${timeout} seconds`
        );
        childProcess.kill("SIGKILL");
        resolve({
          success: false,
          stdout,
          stderr,
          error: `Cropping timed out after ${timeout} seconds`,
        });
      },
      timeout * 1000
    );

    // Handle process exit
    childProcess.on("close", (code) => {
      clearTimeout(timeoutHandle);
      const success = code === 0;
      console.log(`[${videoPath}] Process exited with code: ${code}`);
      resolve({ success, stdout, stderr });
    });

    // Handle process errors
    childProcess.on("error", (error) => {
      clearTimeout(timeoutHandle);
      console.error(`[${videoPath}] Process error:`, error);
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
 * Crop multiple videos in background
 */
async function cropVideosInBackground(
  videos: string[],
  cropConfig: CropRequest["crop_config"],
  outputSuffix: string,
  timeout: number,
  taskId: string
) {
  await writeLog(
    `=== BACKGROUND VIDEO CROPPING STARTED for task: ${taskId} ===`,
    "info",
    taskId
  );
  await writeLog(
    `Cropping ${videos.length} videos with mode: ${cropConfig.mode}`,
    "info",
    taskId
  );

  // Get environment variables for Python CLI
  const env = {
    ...process.env,
    RUNNINGHUB_API_KEY: process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY,
    RUNNINGHUB_WORKFLOW_ID: process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID,
    RUNNINGHUB_API_HOST: process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn",
  };

  let successCount = 0;
  let failureCount = 0;

  try {
    for (let i = 0; i < videos.length; i++) {
      const videoPath = videos[i];
      await writeLog(
        `Cropping video ${i + 1}/${videos.length}: ${videoPath}`,
        "info",
        taskId
      );
      await updateTask(taskId, { currentImage: videoPath });

      // Check if file exists
      try {
        const fs = await import("fs/promises");
        await fs.access(videoPath);
      } catch {
        await writeLog(
          `Video file does not exist: ${videoPath}`,
          "error",
          taskId
        );
        failureCount++;
        await updateTask(taskId, { failedCount: failureCount });
        continue;
      }

      // Crop the video
      const result = await cropSingleVideo(
        videoPath,
        cropConfig,
        outputSuffix,
        timeout,
        env
      );

      if (result.success) {
        successCount++;
        await writeLog(
          `✓ Cropped: ${videoPath}`,
          "success",
          taskId
        );
        await updateTask(taskId, { completedCount: successCount });
      } else {
        failureCount++;
        await writeLog(`✗ Failed to crop: ${videoPath}`, "error", taskId);
        await updateTask(taskId, { failedCount: failureCount });
        if (result.error) {
          await writeLog(`  Error: ${result.error}`, "error", taskId);
        }
      }
    }

    await writeLog(
      `=== BACKGROUND VIDEO CROPPING COMPLETED for task: ${taskId} ===`,
      "info",
      taskId
    );
    await writeLog(
      `Summary: ${successCount} succeeded, ${failureCount} failed out of ${videos.length} total`,
      "info",
      taskId
    );
    await updateTask(taskId, { status: "completed", endTime: Date.now() });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    await writeLog(`Task crashed: ${error}`, "error", taskId);
    await updateTask(taskId, { status: "failed", error });
  }
}
