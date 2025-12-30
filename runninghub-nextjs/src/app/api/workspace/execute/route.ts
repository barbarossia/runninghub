/**
 * Job Execution API
 * Executes a workflow with given inputs and creates a job
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { writeLog } from '@/lib/logger';
import { initTask, updateTask } from '@/lib/task-store';
import type {
  ExecuteJobRequest,
  ExecuteJobResponse,
  Job,
  Workflow,
} from '@/types/workspace';

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteJobRequest = await request.json();

    // Validate request
    if (!body.workflowId) {
      return NextResponse.json({
        success: false,
        error: 'Workflow ID is required',
      } as ExecuteJobResponse, { status: 400 });
    }

    if ((!body.fileInputs || body.fileInputs.length === 0) && (!body.textInputs || Object.keys(body.textInputs).length === 0)) {
      return NextResponse.json({
        success: false,
        error: 'No inputs provided',
      } as ExecuteJobResponse, { status: 400 });
    }

    // Generate IDs
    const taskId = `workspace_job_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const jobId = `job_${Date.now()}_${randomUUID().substring(0, 8)}`;

    // Initialize task in store
    await initTask(taskId, (body.fileInputs?.length || 0) + Object.keys(body.textInputs || {}).length);

    // Prepare environment
    const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
    const apiHost = process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || "www.runninghub.cn";
    const downloadDir = process.env.RUNNINGHUB_DOWNLOAD_DIR;

    // Use sourceWorkflowId for CLI (template ID), fallback to workflowId
    const cliWorkflowId = body.sourceWorkflowId || body.workflowId;

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      RUNNINGHUB_API_KEY: apiKey!,
      RUNNINGHUB_WORKFLOW_ID: cliWorkflowId, // CLI needs template ID
      RUNNINGHUB_API_HOST: apiHost,
    };

    if (downloadDir) {
      env.RUNNINGHUB_DOWNLOAD_DIR = downloadDir;
    }

    // Create job directory and save initial job.json
    const fs = await import('fs/promises');
    const path = await import('path');
    const workspaceJobDir = path.join(
      process.env.HOME || '~',
      'Downloads',
      'workspace',
      jobId
    );
    await fs.mkdir(workspaceJobDir, { recursive: true });

    const initialJob: Job = {
        id: jobId,
        workflowId: body.workflowId,
        workflowName: body.workflowName || 'Unknown Workflow',
        fileInputs: body.fileInputs || [],
        textInputs: body.textInputs || {},
        status: 'pending',
        taskId: taskId,
        createdAt: Date.now(),
        folderPath: body.folderPath,
        deleteSourceFiles: body.deleteSourceFiles,
    };

    await fs.writeFile(
        path.join(workspaceJobDir, 'job.json'),
        JSON.stringify(initialJob, null, 2)
    );

    // Start background processing
    processWorkflowInBackground(
      taskId,
      jobId,
      body.workflowId,        // Actual workflow ID for output config
      body.fileInputs || [],
      body.textInputs || {},
      body.deleteSourceFiles || false,
      env
    );

    return NextResponse.json({
      success: true,
      taskId,
      jobId,
      message: 'Job started successfully',
    } as ExecuteJobResponse);

  } catch (error) {
    console.error('Job execution error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute job',
    } as ExecuteJobResponse, { status: 500 });
  }
}

/**
 * Upload local file to RunningHub
 * Returns remote fileName (e.g., "api/xxx.jpg")
 */
async function uploadFileToRunningHub(
  filePath: string,
  taskId: string
): Promise<string> {
  try {
    await writeLog(`Uploading file to RunningHub: ${filePath}`, 'info', taskId);

    const fs = await import('fs');
    const { default: FormData } = await import('form-data');
    const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;

    if (!apiKey) {
      throw new Error('RUNNINGHUB_API_KEY not configured');
    }

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('apiKey', apiKey);
    form.append('fileType', 'input');

    // Upload to RunningHub
    const response = await fetch('https://www.runninghub.cn/task/openapi/upload', {
      method: 'POST',
      body: form as any,
      headers: {
        'Host': 'www.runninghub.cn',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code === 0 && data.data?.fileName) {
      await writeLog(`Uploaded successfully: ${data.data.fileName}`, 'success', taskId);
      return data.data.fileName;
    } else {
      throw new Error(data.msg || 'Upload failed');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Upload failed';
    await writeLog(`File upload error: ${errorMsg}`, 'error', taskId);
    throw error;
  }
}

/**
 * Helper to update job.json
 */
async function updateJobFile(jobId: string, updates: Partial<Job>) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const jobFilePath = path.join(
      process.env.HOME || '~',
      'Downloads',
      'workspace',
      jobId,
      'job.json'
    );

    try {
        const content = await fs.readFile(jobFilePath, 'utf-8');
        const job = JSON.parse(content);
        const updatedJob = { ...job, ...updates };
        await fs.writeFile(jobFilePath, JSON.stringify(updatedJob, null, 2));
    } catch (e) {
        console.error(`Failed to update job file for ${jobId}:`, e);
    }
}

/**
 * Helper to parse RunningHub task ID from CLI output
 * Looks for patterns like "Task ID: 1234567890" or "Task submitted successfully! Task ID: 1234567890"
 */
function parseRunningHubTaskId(stdout: string): string | null {
  // Try multiple patterns to find the task ID
  const patterns = [
    /Task ID:\s*(\d+)/i,           // "Task ID: 1234567890"
    /task.*?id[:\s]+(\d+)/i,       // "task id: 1234567890" (case insensitive)
  ];

  for (const pattern of patterns) {
    const match = stdout.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Process job outputs after CLI completion
 */
async function processJobOutputs(
  taskId: string,
  workflowId: string,
  jobId: string,
  env: NodeJS.ProcessEnv,
  cliStdout: string
) {
  try {
    await writeLog('Processing job outputs...', 'info', taskId);

    const fs = await import('fs/promises');
    const path = await import('path');

    // Get workflow output configuration from store
    const workflow = await getWorkflowById(workflowId);
    const outputConfig = workflow?.output;

    if (!outputConfig || outputConfig.type === 'none') {
      await writeLog('No outputs configured for this workflow', 'info', taskId);
      return;
    }

    // Parse CLI JSON response to extract file URLs
    let cliResponse: any = null;
    try {
      // Extract JSON from stdout (might be mixed with log lines)
      // CLI outputs formatted JSON at the end, so find the last complete JSON object
      const lines = cliStdout.split('\n');
      let jsonStartIndex = -1;
      let braceCount = 0;
      let inJson = false;

      // Find the last well-formed JSON object
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        // Look for the start of a JSON object
        if (!inJson && trimmed.startsWith('{')) {
          inJson = true;
          jsonStartIndex = i;
          braceCount = 0;
        }

        // Count braces to find the end of the JSON object
        if (inJson) {
          for (const char of lines[i]) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }

          // When braces balance, we've found a complete JSON object
          if (braceCount === 0 && jsonStartIndex >= 0) {
            const jsonStr = lines.slice(jsonStartIndex, i + 1).join('\n');
            cliResponse = JSON.parse(jsonStr);
            await writeLog(`CLI Response code: ${cliResponse.code}`, 'info', taskId);
            break;
          }
        }
      }

      if (!cliResponse) {
        await writeLog('No valid JSON found in CLI output', 'warning', taskId);
        await writeLog(`CLI stdout preview: ${cliStdout.slice(0, 200)}...`, 'info', taskId);
      }
    } catch (parseError) {
      await writeLog(`Failed to parse CLI JSON response: ${parseError}`, 'warning', taskId);
      await writeLog(`CLI stdout: ${cliStdout.slice(0, 500)}`, 'info', taskId);
    }

    if (!cliResponse || cliResponse.code !== 0 || !cliResponse.data || cliResponse.data.length === 0) {
      await writeLog('No output files in CLI response', 'warning', taskId);
      return;
    }

    // Workspace job directory: ~/Downloads/workspace/{jobId}/result/
    const workspaceJobDir = path.join(
      process.env.HOME || '~',
      'Downloads',
      'workspace',
      jobId
    );

    const workspaceOutputsDir = path.join(workspaceJobDir, 'result');

    // Create workspace job directory and result subdirectory
    await fs.mkdir(workspaceOutputsDir, { recursive: true });

    // Download each output file from remote URL
    const outputFiles = cliResponse.data;
    await writeLog(`Found ${outputFiles.length} output file(s) in CLI response`, 'info', taskId);
    
    const processedOutputs: any[] = [];
    const textOutputs: any[] = [];

    for (const output of outputFiles) {
      const fileUrl = output.fileUrl;
      const fileType = output.fileType;

      if (!fileUrl) {
        await writeLog('Output missing fileUrl, skipping', 'warning', taskId);
        continue;
      }

      try {
        // Extract filename from URL
        const urlParts = fileUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const workspacePath = path.join(workspaceOutputsDir, fileName);

        // Download file from remote URL
        await writeLog(`Downloading ${fileName}...`, 'info', taskId);
        const response = await fetch(fileUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        // Write to workspace outputs directory
        await fs.writeFile(workspacePath, uint8Array);

        // Determine file type based on extension
        const ext = path.extname(fileName).toLowerCase();
        let determinedFileType: 'image' | 'text' | 'file' = 'file';
        
        if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'].includes(ext)) {
            determinedFileType = 'image';
        } else if (['.txt', '.md', '.json', '.log', '.xml', '.csv'].includes(ext)) {
            determinedFileType = 'text';
        }

        if (determinedFileType === 'text') {
            // Read text file content
            const content = await fs.readFile(workspacePath, 'utf-8');

            textOutputs.push({
                fileName,
                filePath: workspacePath,
                content: {
                    original: content,
                    en: undefined,
                    zh: undefined,
                },
                autoTranslated: false,
                translationError: undefined,
            });
        }

        processedOutputs.push({
            type: determinedFileType === 'text' ? 'text' : 'file',
            path: workspacePath,
            fileName: fileName,
            fileType: determinedFileType === 'image' ? 'image' : 'text', // Keeping limited types for now as per UI support
            workspacePath: path.join(jobId, 'result', fileName)
        });

        await writeLog(`Downloaded ${fileName} to workspace outputs`, 'success', taskId);
      } catch (downloadError) {
        const errorMsg = downloadError instanceof Error ? downloadError.message : 'Unknown error';
        await writeLog(`Failed to download ${fileUrl}: ${errorMsg}`, 'error', taskId);
      }
    }
    
    // Update job.json with results
    await updateJobFile(jobId, {
        results: {
            outputs: processedOutputs,
            textOutputs: textOutputs,
        }
    });

    // Note: Text translation will be done client-side
    // Server just prepares the files for download/viewing

    await writeLog('Output processing complete', 'success', taskId);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Output processing failed';
    await writeLog(`Output processing error: ${errorMessage}`, 'error', taskId);
  }
}

/**
 * Get workflow by ID from store or file
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
 * Copy input files to job directory
 * Returns array of new file paths in job directory
 */
async function copyInputFilesToJobDirectory(
  fileInputs: Array<{ parameterId: string; filePath: string }>,
  jobId: string,
  taskId: string
): Promise<Array<{ parameterId: string; filePath: string }>> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Create job directory
    const workspaceJobDir = path.join(
      process.env.HOME || '~',
      'Downloads',
      'workspace',
      jobId
    );
    await fs.mkdir(workspaceJobDir, { recursive: true });

    await writeLog(`Copying ${fileInputs.length} input file(s) to job directory`, 'info', taskId);

    const copiedFiles: Array<{ parameterId: string; filePath: string }> = [];

    for (const input of fileInputs) {
      try {
        // Extract filename from original path
        const fileName = path.basename(input.filePath);
        const jobFilePath = path.join(workspaceJobDir, fileName);

        // Copy file to job directory
        await fs.copyFile(input.filePath, jobFilePath);

        await writeLog(`Copied ${fileName} to job directory`, 'info', taskId);

        // Use the copied file path for CLI
        copiedFiles.push({
          parameterId: input.parameterId,
          filePath: jobFilePath,
        });
      } catch (copyError) {
        const errorMsg = copyError instanceof Error ? copyError.message : 'Unknown error';
        await writeLog(`Failed to copy ${input.filePath}: ${errorMsg}`, 'error', taskId);
        // If copy fails, use original path
        copiedFiles.push(input);
      }
    }

    return copiedFiles;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'File copy failed';
    await writeLog(`Error copying input files: ${errorMsg}`, 'error', taskId);
    // Return original paths if copy fails
    return fileInputs;
  }
}

async function processWorkflowInBackground(
  taskId: string,
  jobId: string,
  workflowId: string,
  fileInputs: Array<{ parameterId: string; filePath: string }>,
  textInputs: Record<string, string>,
  deleteSourceFiles: boolean,
  env: NodeJS.ProcessEnv
) {
  try {
    await writeLog(`=== WORKFLOW JOB STARTED: ${taskId} ===`, 'info', taskId);
    await writeLog(`Files: ${fileInputs.length}, Text Inputs: ${Object.keys(textInputs).length}`, 'info', taskId);
    await updateTask(taskId, { status: 'processing', completedCount: 0 });
    
    // Update job status to running
    await updateJobFile(jobId, { status: 'running', startedAt: Date.now() });

    // Copy input files to job directory and get new paths
    const jobFileInputs = await copyInputFilesToJobDirectory(fileInputs, jobId, taskId);

    // Before executing CLI, get workflow info
    const workflow = await getWorkflowById(workflowId);
    const executionType = workflow?.executionType || 'ai-app';  // Default to ai-app for backward compatibility
    await writeLog(`Execution type: ${executionType}`, 'info', taskId);

    // Upload files to RunningHub if workflow execution type is 'workflow'
    // (workflow API requires remote file IDs, not local paths)
    if (executionType === 'workflow') {
      await writeLog('Workflow execution detected: uploading files to RunningHub...', 'info', taskId);

      // Upload each file and update jobFileInputs with remote fileName
      for (let i = 0; i < jobFileInputs.length; i++) {
        try {
          const remoteFileName = await uploadFileToRunningHub(jobFileInputs[i].filePath, taskId);

          // Replace local path with remote fileName
          jobFileInputs[i] = {
            ...jobFileInputs[i],
            filePath: remoteFileName,  // Use remote fileName for CLI
          };
        } catch (uploadError) {
          await writeLog(`Failed to upload ${jobFileInputs[i].filePath}, using local path`, 'warning', taskId);
          // Fall back to local path if upload fails
        }
      }
    }

    let args: string[] = ["-m", "runninghub_cli.cli"];

    // Helper to extract node ID from parameter ID (e.g., "param_203" -> "203", "param_69_image" -> "69")
    const getNodeId = (paramId: string) => {
      // Remove param_ prefix
      const noPrefix = paramId.replace(/^param_/, '');
      // If it contains underscore, take the first part (assuming format ID_type)
      if (noPrefix.includes('_')) {
        return noPrefix.split('_')[0];
      }
      return noPrefix;
    };

    // Helper to determine field type from parameter ID (e.g., "param_203_value" -> "value", "param_204_text" -> "text")
    const getFieldType = (paramId: string) => {
      // Remove param_ prefix
      const noPrefix = paramId.replace(/^param_/, '');
      // If it contains underscore, take the last part (assuming format ID_type)
      if (noPrefix.includes('_')) {
        const type = noPrefix.split('_').pop();
        // Map parameter suffix to field type
        if (type === 'value') return 'value';
        if (type === 'text') return 'text';
        if (type === 'image') return 'image';
      }
      // Default to 'text' for backward compatibility
      return 'text';
    };

    // DECISION: Use execution type to determine CLI command
    if (executionType === 'workflow') {
        // Workflow execution -> use 'run-workflow' command
        args.push("run-workflow");

        // Add file inputs
        for (const input of jobFileInputs) {
            // Format: <node_id>:<file_path>
            args.push("--image", `${getNodeId(input.parameterId)}:${input.filePath}`);
        }

        // Add text inputs
        for (const [paramId, value] of Object.entries(textInputs)) {
            // Format: <node_id>:<field_type>:<value> where field_type is 'value' or 'text'
            const fieldType = getFieldType(paramId);
            args.push("-p", `${getNodeId(paramId)}:${fieldType}:${value}`);
        }

        // Note: run-workflow doesn't support --no-cleanup flag
    } else {
        // AI app execution -> use 'process' or 'process-multiple' command
        if (jobFileInputs.length === 1) {
            // Single file mode -> use 'process' command
            const input = jobFileInputs[0];
            args.push("process");
            args.push(input.filePath);
            args.push("--node", getNodeId(input.parameterId));

            // Add text inputs as params
            for (const [paramId, value] of Object.entries(textInputs)) {
                // Format: <node_id>:<field_type>:<value> where field_type is 'value' or 'text'
                const fieldType = getFieldType(paramId);
                args.push("-p", `${getNodeId(paramId)}:${fieldType}:${value}`);
            }

            // Handle cleanup flag
            // CLI behavior: Default is to delete. --no-cleanup prevents deletion.
            // We want to delete if deleteSourceFiles is TRUE.
            // So if deleteSourceFiles is FALSE, we pass --no-cleanup.
            if (!deleteSourceFiles) {
                args.push("--no-cleanup");
            }

        } else {
            // Multiple files (or 0 files with just params) -> use 'process-multiple' command
            args.push("process-multiple");

            // Add file inputs
            for (const input of jobFileInputs) {
                // Format: <node_id>:<file_path>
                args.push("--image", `${getNodeId(input.parameterId)}:${input.filePath}`);
            }

            // Add text inputs
            for (const [paramId, value] of Object.entries(textInputs)) {
                // Format: <node_id>:<field_type>:<value> where field_type is 'value' or 'text'
                const fieldType = getFieldType(paramId);
                args.push("-p", `${getNodeId(paramId)}:${fieldType}:${value}`);
            }

            // Note: process-multiple in CLI doesn't support --no-cleanup yet, manual cleanup required
        }
    }

    // Add workflow ID explicitly if provided
    if (env.RUNNINGHUB_WORKFLOW_ID) {
        args.push("--workflow-id", env.RUNNINGHUB_WORKFLOW_ID);
    }

    // Add common flags
    args.push("--json"); // Output JSON for better parsing (though we rely on logs mostly)

    await writeLog(`Executing command: python ${args.join(' ')}`, 'info', taskId);

    const childProcess = spawn("python", args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let foundRunningHubTaskId = false; // Track if we've already saved the task ID

    childProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      writeLog(text.trim(), 'info', taskId);

      // Try to parse RunningHub task ID from stdout (only once)
      if (!foundRunningHubTaskId) {
        const runningHubTaskId = parseRunningHubTaskId(stdout);
        if (runningHubTaskId) {
          foundRunningHubTaskId = true;
          writeLog(`Found RunningHub task ID: ${runningHubTaskId}`, 'info', taskId);
          // Save to job.json
          updateJobFile(jobId, { runninghubTaskId: runningHubTaskId });
        }
      }
    });

    childProcess.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      writeLog(text.trim(), 'warning', taskId);
    });

    childProcess.on("close", async (code) => {
      if (code === 0) {
        await writeLog("Workflow execution completed successfully", 'success', taskId);
        await updateTask(taskId, { status: 'completed', completedCount: fileInputs.length + Object.keys(textInputs).length });

        // Update job status
        await updateJobFile(jobId, { status: 'completed', completedAt: Date.now() });

        // NEW: Process outputs - pass stdout for JSON parsing
        await processJobOutputs(taskId, workflowId, jobId, env, stdout);

        // Handle post-processing (cleanup) if needed AND if we used process-multiple (since process handles it internally)
        // If fileInputs.length !== 1, we used process-multiple which doesn't auto-cleanup
        if (deleteSourceFiles && fileInputs.length !== 1) {
          await writeLog("Cleaning up source files...", 'info', taskId);
          try {
             const fs = await import("fs/promises");
             for (const input of fileInputs) {
               try {
                 await fs.unlink(input.filePath);
                 await writeLog(`Deleted: ${input.filePath}`, 'info', taskId);
               } catch (e) {
                 await writeLog(`Failed to delete ${input.filePath}: ${e}`, 'warning', taskId);
               }
             }
          } catch (e) {
            await writeLog(`Cleanup failed: ${e}`, 'error', taskId);
          }
        }

      } else {
        await writeLog(`Workflow execution failed with code ${code}`, 'error', taskId);
        await updateTask(taskId, { status: 'failed', error: `Exit code ${code}` });
        
        // Update job status
        await updateJobFile(jobId, { status: 'failed', error: `Exit code ${code}`, completedAt: Date.now() });
      }
    });

    childProcess.on("error", async (error) => {
      await writeLog(`Process error: ${error.message}`, 'error', taskId);
      await updateTask(taskId, { status: 'failed', error: error.message });

      // Update job status
      await updateJobFile(jobId, { status: 'failed', error: error.message, completedAt: Date.now() });
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await writeLog(`Job failed to start: ${errorMessage}`, 'error', taskId);
    await updateTask(taskId, { status: 'failed', error: errorMessage });
    
    // Update job status
    await updateJobFile(jobId, { status: 'failed', error: errorMessage, completedAt: Date.now() });
  }
}
