import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";
import { buildCropFilter, buildFFmpegArgs } from "@/lib/ffmpeg-crop";
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

    // Check if FFmpeg is available
    const ffmpegAvailable = await checkFFmpegAvailable();
    if (!ffmpegAvailable) {
      return NextResponse.json(
        {
          error:
            "FFmpeg is not installed or not accessible. Please install FFmpeg to use video cropping features.",
        },
        { status: 500 }
      );
    }

    // Create a background task for video cropping
    const taskId = `crop_${videos.length}_videos_${Date.now()}`;

    // Initialize task in store
    await initTask(taskId, videos.length);

    // Start background cropping
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
 * Check if FFmpeg is available
 */
async function checkFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const childProcess = spawn("ffmpeg", ["-version"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    childProcess.on("close", (code) => {
      resolve(code === 0);
    });

    childProcess.on("error", () => {
      resolve(false);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      childProcess.kill();
      resolve(false);
    }, 5000);
  });
}

/**
 * Crop a single video using FFmpeg
 */
function cropSingleVideo(
  videoPath: string,
  cropConfig: CropRequest["crop_config"],
  outputSuffix: string,
  timeout: number
): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
  outputPath?: string;
}> {
  return new Promise((resolve) => {
    (async () => {
      const inputPath = videoPath;
      const parsedPath = path.parse(videoPath);
      const outputPath = path.join(
        parsedPath.dir,
        `${parsedPath.name}${outputSuffix}${parsedPath.ext}`
      );
      const tempOutputPath = path.join(
        parsedPath.dir,
        `${parsedPath.name}${outputSuffix}.temp${parsedPath.ext}`
      );

      // Build crop filter
      const cropFilter = buildCropFilter({
        mode: cropConfig.mode,
        width: cropConfig.width,
        height: cropConfig.height,
        x: cropConfig.x,
        y: cropConfig.y,
      });

      // Build FFmpeg command
      const preserveAudio = false; // Default: no audio
      const args = buildFFmpegArgs(
        inputPath,
        cropFilter,
        tempOutputPath,
        preserveAudio
      );

      const cmd = "ffmpeg";
      console.log(`Running command: ${cmd} ${args.join(" ")}`);

      const childProcess = spawn(cmd, args, {
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
      childProcess.on("close", async (code) => {
        clearTimeout(timeoutHandle);
        const success = code === 0;
        console.log(`[${videoPath}] Process exited with code: ${code}`);

        const fs = await import("fs/promises");

        // Clean up temp file and handle result
        if (success) {
          try {
            // Delete existing output file if it exists
            if (await fileExists(outputPath)) {
              await fs.unlink(outputPath);
              console.log(`[${videoPath}] Deleted existing output file`);
            }

            // Rename temp file to final output
            if (await fileExists(tempOutputPath)) {
              await fs.rename(tempOutputPath, outputPath);
              console.log(`[${videoPath}] Renamed temp file to final output`);
            }

            resolve({ success, stdout, stderr, outputPath });
          } catch (err) {
            console.error(`[${videoPath}] Error finalizing output:`, err);
            resolve({
              success: false,
              stdout,
              stderr,
              error: `Failed to finalize output: ${err}`,
            });
            return;
          }
        } else {
          // Clean up temp file on failure
          try {
            if (await fileExists(tempOutputPath)) {
              await fs.unlink(tempOutputPath);
              console.log(`[${videoPath}] Cleaned up temp file`);
            }
          } catch (err) {
            console.error(`[${videoPath}] Failed to clean up temp file:`, err);
          }

          resolve({ success, stdout, stderr });
        }
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
    })();
  });
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fs = await import("fs/promises");
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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
      await updateTask(taskId, { currentImage: videoPath }); // Reuse currentImage field

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
        timeout
      );

      if (result.success) {
        successCount++;
        const outputMsg = result.outputPath
          ? `✓ Cropped: ${videoPath} → ${result.outputPath}`
          : `✓ Cropped: ${videoPath}`;
        await writeLog(outputMsg, "success", taskId);
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
