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

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      RUNNINGHUB_API_KEY: apiKey!,
      RUNNINGHUB_WORKFLOW_ID: body.workflowId, // Strictly use the workflow ID from the task
      RUNNINGHUB_API_HOST: apiHost,
    };

    if (downloadDir) {
      env.RUNNINGHUB_DOWNLOAD_DIR = downloadDir;
    }

    // Start background processing
    processWorkflowInBackground(
      taskId, 
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

async function processWorkflowInBackground(
  taskId: string,
  fileInputs: Array<{ parameterId: string; filePath: string }>,
  textInputs: Record<string, string>,
  deleteSourceFiles: boolean,
  env: NodeJS.ProcessEnv
) {
  try {
    await writeLog(`=== WORKFLOW JOB STARTED: ${taskId} ===`, 'info', taskId);
    await writeLog(`Files: ${fileInputs.length}, Text Inputs: ${Object.keys(textInputs).length}`, 'info', taskId);
    await updateTask(taskId, { status: 'processing', completedCount: 0 });

    let args: string[] = ["-m", "runninghub_cli.cli"];

    // Helper to extract node ID from parameter ID (e.g., "param_203" -> "203")
    const getNodeId = (paramId: string) => paramId.replace(/^param_/, '');

    // DECISION: Use 'process' for single file, 'process-multiple' for multiple files
    if (fileInputs.length === 1) {
        // Single file mode -> use 'process' command
        const input = fileInputs[0];
        args.push("process");
        args.push(input.filePath);
        args.push("--node", getNodeId(input.parameterId));

        // Add text inputs as params
        for (const [paramId, value] of Object.entries(textInputs)) {
            // Format: <node_id>:text:<value>
            args.push("-p", `${getNodeId(paramId)}:text:${value}`);
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
        for (const input of fileInputs) {
            // Format: <node_id>:<file_path>
            args.push("--image", `${getNodeId(input.parameterId)}:${input.filePath}`);
        }

        // Add text inputs
        for (const [paramId, value] of Object.entries(textInputs)) {
            // Format: <node_id>:text:<value>
            args.push("-p", `${getNodeId(paramId)}:text:${value}`);
        }
        
        // Note: process-multiple in CLI doesn't support --no-cleanup yet, manual cleanup required
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

    childProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      writeLog(text.trim(), 'info', taskId);
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
      }
    });

    childProcess.on("error", async (error) => {
      await writeLog(`Process error: ${error.message}`, 'error', taskId);
      await updateTask(taskId, { status: 'failed', error: error.message });
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await writeLog(`Job failed to start: ${errorMessage}`, 'error', taskId);
    await updateTask(taskId, { status: 'failed', error: errorMessage });
  }
}
