/**
 * Job Execution API
 * Executes a workflow with given inputs and creates a job
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
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

    if (!body.fileInputs && !body.textInputs) {
      return NextResponse.json({
        success: false,
        error: 'No inputs provided',
      } as ExecuteJobResponse, { status: 400 });
    }

    // Generate IDs
    const taskId = `workspace_job_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const jobId = `job_${Date.now()}_${randomUUID().substring(0, 8)}`;

    // Create job object
    const job: Job = {
      id: jobId,
      workflowId: body.workflowId,
      workflowName: body.workflowId, // Will be updated from workflow store
      fileInputs: (body.fileInputs || []).map((input) => ({
        ...input,
        fileName: '', // Will be populated from file path
        fileSize: 0, // Will be populated from file stats
        fileType: 'image', // Default, will be validated
        valid: true, // Will be validated
      })),
      textInputs: body.textInputs || {},
      status: 'pending',
      taskId,
      createdAt: Date.now(),
      folderPath: body.folderPath,
      deleteSourceFiles: body.deleteSourceFiles || false,
    };

    // TODO: Get workflow name from store (would need store access here)
    // For now, use the workflow ID as the name

    // TODO: Execute Python CLI with workflow ID and inputs
    // This would involve:
    // 1. Spawning a Python process
    // 2. Passing workflow ID, input files, and text parameters
    // 3. Monitoring the task completion
    // 4. Handling post-processing cleanup (delete source files if requested)

    // For now, return the job details (execution will be handled separately)
    return NextResponse.json({
      success: true,
      taskId,
      jobId,
      message: 'Job created successfully',
    } as ExecuteJobResponse);

  } catch (error) {
    console.error('Job execution error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute job',
    } as ExecuteJobResponse, { status: 500 });
  }
}
