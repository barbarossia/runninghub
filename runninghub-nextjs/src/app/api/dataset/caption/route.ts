import { NextRequest, NextResponse } from 'next/server';
import { writeLog } from '@/lib/logger';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

// CLI and workflow configuration
const RUNNINGHUB_CLI = '/opt/homebrew/Caskroom/miniconda/base/bin/runninghub';
const WORKSPACE_WORKFLOWS = '/Users/barbarossia/Downloads/workspace/workflows';
const CAPTION_WORKFLOW_JSON = 'workflow_1768572436369_rvc96w13l.json';

interface CaptionRequest {
  videoPath: string;
  videoName: string;
  datasetPath: string;
}

interface CaptionResponse {
  success: boolean;
  taskId?: string;
  message: string;
  captionPath?: string;
  captionText?: string;
}

/**
 * POST /api/dataset/caption
 *
 * Submits a video to the RunningHub workflow for AI captioning using the CLI.
 * The workflow processes the video and returns a text description.
 * The text file is downloaded and saved alongside the video with the same name.
 */
export async function POST(request: NextRequest) {
  const requestId = `caption-${Date.now()}`;
  let cliOutput = '';
  let taskId = '';

  try {
    const body: CaptionRequest = await request.json();
    const { videoPath, videoName, datasetPath } = body;

    if (!videoPath || !videoName || !datasetPath) {
      return NextResponse.json<CaptionResponse>({
        success: false,
        message: 'Missing required fields: videoPath, videoName, datasetPath',
      }, { status: 400 });
    }

    // Verify video file exists
    if (!existsSync(videoPath)) {
      return NextResponse.json<CaptionResponse>({
        success: false,
        message: `Video file not found: ${videoPath}`,
      }, { status: 404 });
    }

    // Verify CLI exists
    if (!existsSync(RUNNINGHUB_CLI)) {
      return NextResponse.json<CaptionResponse>({
        success: false,
        message: `RunningHub CLI not found at ${RUNNINGHUB_CLI}`,
      }, { status: 500 });
    }

    // Verify workflow JSON exists
    const workflowJsonPath = join(WORKSPACE_WORKFLOWS, CAPTION_WORKFLOW_JSON);
    if (!existsSync(workflowJsonPath)) {
      return NextResponse.json<CaptionResponse>({
        success: false,
        message: `Workflow JSON not found: ${workflowJsonPath}`,
      }, { status: 500 });
    }

    writeLog(`Starting caption for video: ${videoName}`, 'info', requestId);

    // Build CLI command to run workflow
    // Format: runninghub run-workflow --workflow workflow_xxx.json --image "node_id:file_path" --timeout 600 --json
    // Node ID 77 is the video input node (from param_77_video)
    const cliCommand = `${RUNNINGHUB_CLI} run-workflow --workflow ${workflowJsonPath} --image "77:${videoPath}" --timeout 600 --json`;

    writeLog(`Executing CLI command...`, 'info', requestId);
    writeLog(`Command: ${cliCommand}`, 'debug', requestId);

    // Execute CLI command
    try {
      const result = execSync(cliCommand, {
        encoding: 'utf-8',
        timeout: 600000, // 10 minutes
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      cliOutput = result;
    } catch (execError: any) {
      const errorMsg = execError.stderr || execError.message || 'Unknown CLI error';
      writeLog(`CLI execution failed: ${errorMsg}`, 'error', requestId);
      return NextResponse.json<CaptionResponse>({
        success: false,
        message: `CLI execution failed: ${errorMsg}`,
      }, { status: 500 });
    }

    writeLog(`CLI output received`, 'info', requestId);

    // Parse CLI output - extract JSON from output (may have prefix messages)
    let cliResult;
    try {
      // Try direct parse first
      cliResult = JSON.parse(cliOutput);
    } catch (parseError) {
      // Robust extraction: Find all potential JSON objects and pick the valid result
      const validObjects: any[] = [];
      let lastError = null;

      // Find all occurrences of '{'
      for (let i = 0; i < cliOutput.length; i++) {
        if (cliOutput[i] === '{') {
          // Attempt to parse starting from this brace
          try {
            // We don't know where it ends, so we rely on JSON.parse behavior or brace counting
            // A simple brace counter is safer to isolate the object string
            let braceCount = 0;
            let end = -1;
            for (let j = i; j < cliOutput.length; j++) {
              if (cliOutput[j] === '{') braceCount++;
              if (cliOutput[j] === '}') braceCount--;
              if (braceCount === 0) {
                end = j;
                break;
              }
            }

            if (end !== -1) {
              const potentialJson = cliOutput.substring(i, end + 1);
              const obj = JSON.parse(potentialJson);
              // Check if it looks like a RunningHub response
              if (obj.code !== undefined) {
                validObjects.push(obj);
              }
            }
          } catch (e) {
            // Not valid JSON, continue
            lastError = e;
          }
        }
      }

      if (validObjects.length > 0) {
        // Use the last valid response object found
        cliResult = validObjects[validObjects.length - 1];
        writeLog(`Extracted valid JSON result from mixed output`, 'info', requestId);
      } else {
        writeLog(`Failed to extract JSON from CLI output: ${cliOutput.slice(0, 500)}`, 'error', requestId);
        return NextResponse.json<CaptionResponse>({
          success: false,
          message: 'Failed to parse CLI output',
        }, { status: 500 });
      }
    }

    // Log the full structure for debugging
    writeLog(`CLI result structure: ${JSON.stringify(cliResult, null, 2).slice(0, 1000)}`, 'debug', requestId);

    // Check if workflow succeeded
    if (cliResult.code !== 0) {
      const errorMsg = cliResult.msg || cliResult.message || 'Workflow execution failed';
      writeLog(`Workflow failed: ${errorMsg}`, 'error', requestId);
      return NextResponse.json<CaptionResponse>({
        success: false,
        message: `Workflow failed: ${errorMsg}`,
      }, { status: 500 });
    }

    // Extract task ID if available
    if (cliResult.data && Array.isArray(cliResult.data) && cliResult.data.length > 0) {
      const firstOutput = cliResult.data[0];
      taskId = firstOutput.taskId || '';
      writeLog(`Task completed: ${taskId}`, 'info', requestId);
      writeLog(`Output data items: ${cliResult.data.length}`, 'info', requestId);
      // Log each item to see structure
      cliResult.data.forEach((item: any, idx: number) => {
        writeLog(`Item ${idx}: ${JSON.stringify(item).slice(0, 200)}`, 'debug', requestId);
      });
    }

    // Extract caption text from output
    let captionText = '';
    if (cliResult.data && Array.isArray(cliResult.data)) {
      // Try different possible field names for the text file
      const textOutput = cliResult.data.find((item: any) =>
        item.fileType === 'txt' ||
        item.type === 'txt' ||
        item.file_type === 'txt' ||
        item.fileType === 'text' ||
        item.file_name?.endsWith('.txt') ||
        item.name?.endsWith('.txt')
      );
      writeLog(`Text output found: ${textOutput ? 'YES' : 'NO'}`, 'info', requestId);

      if (textOutput) {
        // Try different possible field names for the URL
        const fileUrl = textOutput.fileUrl || textOutput.file_url || textOutput.url || textOutput.downloadUrl;
        writeLog(`File URL: ${fileUrl || 'NOT FOUND'}`, 'info', requestId);

        if (fileUrl) {
          // Download caption text
          writeLog(`Downloading caption from: ${fileUrl}`, 'info', requestId);
          const captionResponse = await fetch(fileUrl);
          if (!captionResponse.ok) {
            throw new Error(`Failed to download caption: ${captionResponse.statusText}`);
          }
          captionText = await captionResponse.text();
          writeLog(`Caption downloaded (${captionText.length} characters)`, 'info', requestId);
        }
      }
    }

    if (!captionText) {
      return NextResponse.json<CaptionResponse>({
        success: false,
        message: 'No caption text generated',
      }, { status: 500 });
    }

    // Save caption text file alongside the video
    const videoBaseName = videoName.replace(/\.[^/.]+$/, '');
    const captionFileName = `${videoBaseName}.txt`;
    const captionFilePath = join(datasetPath, captionFileName);

    await mkdir(dirname(captionFilePath), { recursive: true });
    await writeFile(captionFilePath, captionText, 'utf-8');

    writeLog(`Caption saved to: ${captionFilePath}`, 'success', requestId);

    return NextResponse.json<CaptionResponse>({
      success: true,
      taskId,
      message: 'Caption generated successfully',
      captionPath: captionFilePath,
      captionText,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    writeLog(`Caption failed: ${errorMessage}`, 'error', requestId);

    return NextResponse.json<CaptionResponse>({
      success: false,
      message: errorMessage,
    }, { status: 500 });
  }
}
