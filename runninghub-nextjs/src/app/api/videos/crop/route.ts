import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";

interface CropRequest {
  videos: string[];
  crop_config: {
    mode: 'left' | 'right' | 'center' | 'custom';
    width?: string;
    height?: string;
    x?: string;
    y?: string;
  };
  output_suffix?: string;
  preserve_audio?: boolean;
  timeout?: number;
}

export async function POST(request: NextRequest) {
  try {
    const data: CropRequest = await request.json();
    const {
      videos,
      crop_config,
      output_suffix = "_cropped",
      preserve_audio = false,
      timeout = 3600,
    } = data;

    if (!videos || videos.length === 0) {
      return NextResponse.json(
        { error: "No videos selected for cropping" },
        { status: 400 }
      );
    }

    // Create a background task
    const taskId = `crop_${videos.length}_videos_${Date.now()}`;
    await initTask(taskId, videos.length);

    // Start background processing
    cropVideosInBackground(videos, crop_config, output_suffix, preserve_audio, timeout, taskId);

    return NextResponse.json({
      success: true,
      task_id: taskId,
      message: `Started cropping ${videos.length} videos`,
    });
  } catch (error) {
    console.error("Error cropping videos:", error);
    return NextResponse.json(
      { error: "Failed to start video cropping" },
      { status: 500 }
    );
  }
}

async function cropVideosInBackground(
  videos: string[],
  config: CropRequest['crop_config'],
  suffix: string,
  preserveAudio: boolean,
  timeout: number,
  taskId: string
) {
  await writeLog(`=== VIDEO CROPPING STARTED for task: ${taskId} ===`, 'info', taskId);

  let successCount = 0;
  let failureCount = 0;

  for (const videoPath of videos) {
    try {
      await writeLog(`Cropping: ${videoPath}`, 'info', taskId);
      
      const args = [
        "-m", "runninghub_cli.cli", "crop",
        videoPath,
        "--mode", config.mode,
        "--suffix", suffix,
        "--timeout", String(timeout),
      ];

      if (config.width) args.push("--width", config.width);
      if (config.height) args.push("--height", config.height);
      if (config.x) args.push("--x", config.x);
      if (config.y) args.push("--y", config.y);
      if (preserveAudio) args.push("--preserve-audio");

      const success = await new Promise<boolean>((resolve) => {
        const proc = spawn("python", args, { env: process.env });
        proc.on("close", (code) => resolve(code === 0));
      });

      if (success) {
        successCount++;
        await writeLog(`✓ Success: ${videoPath}`, 'success', taskId);
      } else {
        failureCount++;
        await writeLog(`✗ Failed: ${videoPath}`, 'error', taskId);
      }
      
      await updateTask(taskId, { completedCount: successCount, failedCount: failureCount });
    } catch (err) {
      failureCount++;
      await writeLog(`✗ Error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error', taskId);
      await updateTask(taskId, { failedCount: failureCount });
    }
  }

  await writeLog(`=== VIDEO CROPPING COMPLETED: ${successCount} success, ${failureCount} failed ===`, 'info', taskId);
  await updateTask(taskId, { status: 'completed', endTime: Date.now() });
}
