import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";
import { VideoSplitOptions } from "@/types/video-split";
import path from "path";
import fs from "fs/promises";

interface SplitRequest {
  videos: string[];
  options: VideoSplitOptions;
  timeout?: number;
}

/**
 * Resolve path, handling ~ and relative paths
 */
function resolvePath(filePath: string): string {
  if (filePath.startsWith("~")) {
    return path.join(require("os").homedir(), filePath.slice(1));
  }
  return path.resolve(filePath);
}

export async function POST(request: NextRequest) {
  try {
    const data: SplitRequest = await request.json();
    const { videos, options, timeout = 3600 } = data;

    if (!videos || videos.length === 0) {
      return NextResponse.json(
        { error: "No videos selected for splitting" },
        { status: 400 }
      );
    }

    if (!options || !options.mode) {
      return NextResponse.json(
        { error: "Invalid split options: mode is required" },
        { status: 400 }
      );
    }

    // Validate options based on mode
    if (options.mode === 'duration' && !options.segmentDuration) {
      return NextResponse.json(
        { error: "segmentDuration is required for duration mode" },
        { status: 400 }
      );
    }

    if (options.mode === 'count' && !options.segmentCount) {
      return NextResponse.json(
        { error: "segmentCount is required for count mode" },
        { status: 400 }
      );
    }

    // Check if FFmpeg is available
    const ffmpegAvailable = await checkFFmpegAvailable();
    if (!ffmpegAvailable) {
      return NextResponse.json(
        { error: "FFmpeg is not installed or not accessible. Please install FFmpeg to use video splitting features." },
        { status: 500 }
      );
    }

    // Create a background task for video splitting
    const taskId = `split_${videos.length}_videos_${Date.now()}`;

    // Initialize task in store
    await initTask(taskId, videos.length);

    // Start background splitting
    splitVideosInBackground(videos, options, timeout, taskId);

    const response = {
      success: true,
      task_id: taskId,
      message: `Started splitting ${videos.length} videos`,
      video_count: videos.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error splitting videos:", error);
    return NextResponse.json(
      { error: "Failed to start video splitting" },
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

    setTimeout(() => {
      childProcess.kill();
      resolve(false);
    }, 5000);
  });
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      videoPath
    ]);

    let output = "";
    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 0 : duration);
      } else {
        reject(new Error("Failed to get video duration"));
      }
    });

    ffprobe.on("error", reject);
  });
}

/**
 * Split a single video using FFmpeg
 */
async function splitSingleVideo(
  videoPath: string,
  options: VideoSplitOptions,
  timeout: number
): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  segments?: string[];
  error?: string;
}> {
  const videoName = path.basename(videoPath, path.extname(videoPath));
  const videoDir = path.dirname(videoPath);
  const outputDir = options.outputDir || videoDir;

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Get video duration
  const duration = await getVideoDuration(videoPath);

  // Calculate segment duration and count
  let segmentDuration: number;
  let segmentCount: number;

  if (options.mode === 'duration') {
    segmentDuration = options.segmentDuration!;
    segmentCount = Math.ceil(duration / segmentDuration);
  } else {
    segmentCount = options.segmentCount!;
    segmentDuration = duration / segmentCount;
  }

  console.log(`Splitting ${videoName}: duration=${duration}s, segmentDuration=${segmentDuration}s, segmentCount=${segmentCount}`);

  const segments: string[] = [];
  let stdout = "";
  let stderr = "";

  // Split video into segments
  for (let i = 0; i < segmentCount; i++) {
    const startTime = i * segmentDuration;
    // Always use .mp4 extension for split segments
    const segmentFileName = `${videoName}_part${i + 1}.mp4`;
    const segmentPath = path.join(outputDir, segmentFileName);

    // Build FFmpeg command for this segment
    // -ss: start time
    // -t: duration
    // -c copy: copy streams without re-encoding (fast)
    const args = [
      "-ss", startTime.toString(),
      "-i", videoPath,
      "-t", segmentDuration.toString(),
      "-c", "copy",
      "-y",
      segmentPath
    ];

    console.log(`Running: ffmpeg ${args.join(" ")}`);

    try {
      const result = await runFFmpeg(args, timeout);

      stdout += result.stdout;
      stderr += result.stderr;

      if (result.success) {
        segments.push(segmentPath);
        console.log(`Created segment: ${segmentFileName}`);
      } else {
        console.error(`Failed to create segment ${i + 1}: ${result.error}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      stderr += err;
      console.error(`Error creating segment ${i + 1}: ${err}`);
    }
  }

  // Delete original if requested
  if (options.deleteOriginal && segments.length > 0) {
    try {
      await fs.unlink(videoPath);
      console.log(`Deleted original: ${videoName}`);
    } catch (err) {
      console.error(`Failed to delete original: ${err}`);
    }
  }

  return {
    success: segments.length > 0,
    stdout,
    stderr,
    segments
  };
}

/**
 * Run FFmpeg command
 */
function runFFmpeg(
  args: string[],
  timeout: number
): Promise<{ success: boolean; stdout: string; stderr: string; error?: string }> {
  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    ffmpeg.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    ffmpeg.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    const timeoutHandle = setTimeout(() => {
      ffmpeg.kill("SIGKILL");
      resolve({
        success: false,
        stdout,
        stderr,
        error: `FFmpeg timed out after ${timeout} seconds`,
      });
    }, timeout * 1000);

    ffmpeg.on("close", (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        success: code === 0,
        stdout,
        stderr,
      });
    });

    ffmpeg.on("error", (error) => {
      clearTimeout(timeoutHandle);
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
 * Split multiple videos in background
 */
async function splitVideosInBackground(
  videos: string[],
  options: VideoSplitOptions,
  timeout: number,
  taskId: string
) {
  await writeLog(
    `=== BACKGROUND VIDEO SPLITTING STARTED for task: ${taskId} ===`,
    "info",
    taskId
  );

  const modeInfo = options.mode === 'duration'
    ? `${options.segmentDuration}s segments`
    : `${options.segmentCount} segments`;

  await writeLog(`Splitting ${videos.length} videos (${modeInfo})`, "info", taskId);

  let successCount = 0;
  let failureCount = 0;

  try {
    for (let i = 0; i < videos.length; i++) {
      const videoPath = videos[i];
      await writeLog(
        `Splitting video ${i + 1}/${videos.length}: ${videoPath}`,
        "info",
        taskId
      );
      await updateTask(taskId, { currentImage: videoPath });

      const result = await splitSingleVideo(videoPath, options, timeout);

      if (result.success) {
        successCount++;
        await writeLog(
          `✓ Split into ${result.segments?.length || 0} segments: ${videoPath}`,
          "success",
          taskId
        );
        await updateTask(taskId, { completedCount: successCount });
      } else {
        failureCount++;
        await writeLog(`✗ Failed to split: ${videoPath}`, "error", taskId);
        await updateTask(taskId, { failedCount: failureCount });
        if (result.error) {
          await writeLog(`  Error: ${result.error}`, "error", taskId);
        }
      }
    }

    await writeLog(
      `=== BACKGROUND VIDEO SPLITTING COMPLETED for task: ${taskId} ===`,
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
