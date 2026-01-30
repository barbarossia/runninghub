import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { writeLog } from "@/lib/logger";
import { initTask, updateTask } from "@/lib/task-store";

interface DownloadRequest {
  url: string;
  folderPath: string;
  sessionId?: string; // Optional - not all folders have session_id
  cookieMode: "paste" | "file";
  cookieContent?: string;
  cookieFilePath?: string;
  persistCookies?: boolean;
}

export async function POST(request: NextRequest) {
  const taskId = `youtube_download_${Date.now()}`;

  try {
    const data: DownloadRequest = await request.json();
    const {
      url,
      folderPath,
      sessionId,
      cookieMode,
      cookieContent,
      cookieFilePath,
      persistCookies = true,
    } = data;

    // Log received data for debugging
    await writeLog(`Received YouTube download request: ${url}`, "info", taskId);
    console.log("YouTube download request:", {
      url,
      folderPath,
      sessionId,
      cookieMode,
      hasCookieContent: !!cookieContent,
      hasCookieFilePath: !!cookieFilePath,
    });

    // Validate required fields (sessionId is optional)
    if (!url || !folderPath) {
      await writeLog(
        `Missing required fields: url=${!!url}, folderPath=${!!folderPath}`,
        "error",
        taskId,
      );
      return NextResponse.json(
        { error: "Missing required fields: url, folderPath" },
        { status: 400 },
      );
    }

    // Check if folder exists
    try {
      await fs.access(folderPath);
      await writeLog(
        `Download folder exists: ${folderPath}`,
        "success",
        taskId,
      );
    } catch (err) {
      await writeLog(
        `Download folder does not exist or is not accessible: ${folderPath}`,
        "error",
        taskId,
      );
      return NextResponse.json(
        { error: "Invalid download folder. Please select a valid folder." },
        { status: 400 },
      );
    }

    // Validate cookie input based on mode (cookies are optional for paste mode)
    if (cookieMode === "file" && !cookieFilePath) {
      await writeLog(
        `Cookie file path required when mode is 'file'`,
        "error",
        taskId,
      );
      return NextResponse.json(
        { error: "Cookie file path is required when cookieMode is 'file'" },
        { status: 400 },
      );
    }

    // Check if yt-dlp is available
    await writeLog(`Checking yt-dlp availability...`, "info", taskId);
    const ytDlpAvailable = await checkYtDlpAvailable();
    if (!ytDlpAvailable) {
      await writeLog(
        `yt-dlp is not installed or not accessible`,
        "error",
        taskId,
      );
      return NextResponse.json(
        {
          error:
            "yt-dlp is not installed or not accessible. Please install yt-dlp to use YouTube download features.",
        },
        { status: 500 },
      );
    }

    await writeLog(`yt-dlp is available`, "success", taskId);

    // Initialize task in store
    await initTask(taskId, 1);

    // Start background download
    downloadVideoInBackground(
      url,
      folderPath,
      sessionId,
      cookieMode,
      cookieContent,
      cookieFilePath,
      taskId,
    );

    const response = {
      success: true,
      task_id: taskId,
      message: "Started YouTube video download",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error starting YouTube download:", error);
    await writeLog(
      `Error starting YouTube download: ${error}`,
      "error",
      taskId,
    );
    return NextResponse.json(
      { error: "Failed to start YouTube download" },
      { status: 500 },
    );
  }
}

/**
 * Check if yt-dlp is available
 */
async function checkYtDlpAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const childProcess = spawn("yt-dlp", ["--version"], {
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
 * Download YouTube video in background
 */
async function downloadVideoInBackground(
  url: string,
  folderPath: string,
  sessionId: string | undefined,
  cookieMode: "paste" | "file",
  cookieContent: string | undefined,
  cookieFilePath: string | undefined,
  taskId: string,
) {
  try {
    await writeLog(`Starting YouTube download: ${url}`, "info", taskId);

    // Handle cookies based on mode
    let actualCookieFile: string | undefined;

    if (cookieMode === "paste" && cookieContent) {
      // Save to persistent cache
      const cacheDir = path.join(process.cwd(), ".cache");
      const cachedCookieFile = path.join(cacheDir, "youtube_cookies.txt");

      // Create cache directory if it doesn't exist
      try {
        await fs.mkdir(cacheDir, { recursive: true });
      } catch (err) {
        console.error("Failed to create cache directory:", err);
      }

      // Check if cached cookies already exist
      let existingContent = "";
      let shouldUpdateCache = true;

      try {
        existingContent = await fs.readFile(cachedCookieFile, "utf-8");
        if (existingContent === cookieContent) {
          shouldUpdateCache = false;
          await writeLog("Using cached cookies", "info", taskId);
        }
      } catch (err) {
        // File doesn't exist yet, that's fine
        shouldUpdateCache = true;
      }

      // Only write if content has changed
      if (shouldUpdateCache) {
        await fs.writeFile(cachedCookieFile, cookieContent, "utf-8");
        await writeLog("Updated cached cookies", "info", taskId);
      }

      actualCookieFile = cachedCookieFile;
    } else if (cookieMode === "file" && cookieFilePath) {
      // Use file path directly
      actualCookieFile = cookieFilePath;
      await writeLog(`Using cookie file: ${cookieFilePath}`, "info", taskId);
    }

    // Build base yt-dlp command args
    const baseArgs: string[] = [];

    // Add cookies if provided
    if (actualCookieFile) {
      baseArgs.push("--cookies", actualCookieFile);
    }

    // Output format: save to folder with video title as filename
    baseArgs.push("-o", path.join(folderPath, "%(title)s.%(ext)s"));

    // Add URL
    baseArgs.push(url);

    // Attempt 1: Default download
    let result = await runYtDlpCommand("yt-dlp", baseArgs, taskId);

    // Attempt 2: Fallback to android client if failed and no cookies provided (or strictly if failed)
    if (!result.success) {
      const is403 = result.stderr.includes("HTTP Error 403") || result.stdout.includes("HTTP Error 403");
      
      if (is403 || !actualCookieFile) {
        await writeLog(
          "Default download failed (likely HTTP 403). Retrying with 'android' client fallback...",
          "warning",
          taskId
        );
        
        // Create new args with fallback
        const fallbackArgs = [...baseArgs];
        // Insert before URL (last argument)
        fallbackArgs.splice(fallbackArgs.length - 1, 0, "--extractor-args", "youtube:player_client=android");
        
        result = await runYtDlpCommand("yt-dlp", fallbackArgs, taskId);
      }
    }

    if (result.success) {
      try {
        let downloadedFile: string | null = null;
        const stdout = result.stdout;

        // Try to extract the downloaded filename from yt-dlp output
        // Look for lines like "[download] Destination: /path/to/file.mp4"
        const destinationMatch = stdout.match(
          /\[download\]\s+Destination:\s+(.+)/,
        );
        if (destinationMatch && destinationMatch[1]) {
          downloadedFile = destinationMatch[1];
        } else {
          // Fallback: try to parse from ffmpeg output if conversion happened
          const outputMatch = stdout.match(/Output:\s+(.+\.mp4)/);
          if (outputMatch && outputMatch[1]) {
            downloadedFile = outputMatch[1];
          }
          // Another fallback: check for "Already downloaded"
          const alreadyMatch = stdout.match(/\[download\]\s+(.+)\s+has already been downloaded/);
          if (alreadyMatch && alreadyMatch[1]) {
            downloadedFile = alreadyMatch[1];
          }
        }

        if (downloadedFile) {
          await writeLog(
            `Downloaded file: ${downloadedFile}`,
            "success",
            taskId,
          );

          // Check if file is MP4
          if (!downloadedFile.endsWith(".mp4")) {
            await writeLog(
              `File is not MP4, converting...`,
              "warning",
              taskId,
            );
            await convertToMp4(downloadedFile, taskId);
            // Delete original file after conversion
            try {
              await fs.unlink(downloadedFile);
              await writeLog(`Deleted original non-MP4 file`, "info", taskId);
            } catch (err) {
              console.error("Failed to delete original file:", err);
            }
          }

          await updateTask(taskId, {
            status: "completed",
            completedCount: 1,
            error: undefined,
          });
        } else {
          await writeLog(
            `Could not determine downloaded filename`,
            "warning",
            taskId,
          );
          await updateTask(taskId, {
            status: "completed",
            completedCount: 1,
            error: undefined,
          });
        }
      } catch (err) {
        console.error("Error processing download:", err);
        await writeLog(`Error processing download: ${err}`, "error", taskId);
        await updateTask(taskId, {
          status: "failed",
          completedCount: 1,
          error: `Download completed but failed to process: ${err}`,
        });
      }
    } else {
      await writeLog(`Download failed with code ${result.code}`, "error", taskId);
      await updateTask(taskId, {
        status: "failed",
        completedCount: 0,
        error: `Download failed with exit code ${result.code}`,
      });
    }
  } catch (error) {
    console.error(`[Task ${taskId}] Background download error:`, error);
    await writeLog(`Background download error: ${error}`, "error", taskId);
    await updateTask(taskId, {
      status: "failed",
      completedCount: 0,
      error: `Download failed: ${error}`,
    });
  }
}

/**
 * Execute yt-dlp command with logging and timeout
 */
async function runYtDlpCommand(
  cmd: string,
  args: string[],
  taskId: string
): Promise<{ success: boolean; code: number | null; stdout: string; stderr: string }> {
  await writeLog(`Running command: ${cmd} ${args.join(" ")}`, "info", taskId);

  return new Promise((resolve) => {
    const childProcess = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // Collect stdout and parse progress
    childProcess.stdout?.on("data", async (data: Buffer) => {
      const text = data.toString();
      stdout += text;

      // Log download progress
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          await writeLog(line.trim(), "info", taskId);
        }
      }
    });

    // Collect stderr
    childProcess.stderr?.on("data", async (data: Buffer) => {
      const text = data.toString();
      stderr += text;

      // yt-dlp outputs progress to stderr
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          await writeLog(line.trim(), "info", taskId);
        }
      }
    });

    // Set timeout (10 minutes)
    const timeoutHandle = setTimeout(
      async () => {
        console.error(`[Task ${taskId}] Download timed out`);
        childProcess.kill("SIGKILL");
        await writeLog("Download timed out after 10 minutes", "error", taskId);
        // We resolve with failure instead of rejecting to handle it gracefully in caller
        resolve({ success: false, code: -1, stdout, stderr });
      },
      10 * 60 * 1000,
    );

    childProcess.on("close", (code) => {
      clearTimeout(timeoutHandle);
      resolve({ success: code === 0, code, stdout, stderr });
    });

    childProcess.on("error", (err) => {
      clearTimeout(timeoutHandle);
      console.error(`[Task ${taskId}] Process error:`, err);
      resolve({ success: false, code: -1, stdout, stderr: err.message });
    });
  });
}

/**
 * Convert video to MP4 using FFmpeg
 */
async function convertToMp4(inputFile: string, taskId: string): Promise<void> {
  const outputFile = inputFile.replace(/\.[^.]+$/, ".mp4");
  const tempOutputFile = inputFile.replace(/\.[^.]+$/, ".temp.mp4");

  const cmd = "ffmpeg";
  const args = [
    "-i",
    inputFile,
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-y",
    tempOutputFile,
  ];

  await writeLog(`Converting to MP4: ffmpeg ${args.join(" ")}`, "info", taskId);

  return new Promise((resolve, reject) => {
    const childProcess = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    childProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
    });

    childProcess.stderr?.on("data", async (data: Buffer) => {
      const text = data.toString();
      stderr += text;

      // Parse progress from FFmpeg output
      // Look for lines like "frame= 123 fps=25 q=28.0 size= 1234kB time=00:00:05.00 bitrate= 1234.5kbits/s speed=1.23x"
      const progressMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2})/);
      if (progressMatch) {
        const hours = parseInt(progressMatch[1]);
        const minutes = parseInt(progressMatch[2]);
        const seconds = parseInt(progressMatch[3]);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        await writeLog(
          `Conversion progress: ${totalSeconds}s processed`,
          "info",
          taskId,
        );
      }
    });

    // Set timeout (5 minutes)
    const timeoutHandle = setTimeout(
      () => {
        console.error(`[Task ${taskId}] Conversion timed out`);
        childProcess.kill("SIGKILL");
        reject(new Error("Conversion timed out after 5 minutes"));
      },
      5 * 60 * 1000,
    );

    childProcess.on("close", async (code) => {
      clearTimeout(timeoutHandle);

      if (code === 0) {
        try {
          // Rename temp file to final output
          await fs.rename(tempOutputFile, outputFile);
          await writeLog(
            `Successfully converted to MP4: ${outputFile}`,
            "success",
            taskId,
          );
          resolve();
        } catch (err) {
          console.error("Failed to rename converted file:", err);
          reject(new Error(`Failed to rename converted file: ${err}`));
        }
      } else {
        const error = `FFmpeg conversion failed with code ${code}`;
        await writeLog(error, "error", taskId);
        reject(new Error(error));
      }
    });

    childProcess.on("error", async (err) => {
      clearTimeout(timeoutHandle);
      await writeLog(
        `Conversion process error: ${err.message}`,
        "error",
        taskId,
      );
      reject(err);
    });
  });
}
