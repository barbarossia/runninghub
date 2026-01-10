/**
 * Job Management API
 * GET - Fetch job details by ID from local job.json file
 * PUT - Update job (add results, update status)
 * DELETE - Delete job folder and job.json file
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { Job } from '@/types/workspace';

interface JobUpdateRequest {
  status?: Job['status'];
  results?: Job['results'];
  error?: string;
  startedAt?: number;
  completedAt?: number;
  taskId?: string;
  runninghubTaskId?: string;
}

// Get the job directory path
function getJobDir(jobId: string): string {
  const workspaceDir = path.join(
    process.env.HOME || '~',
    'Downloads',
    'workspace'
  );
  return path.join(workspaceDir, jobId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const jobDir = getJobDir(jobId);
    const jobJsonPath = path.join(jobDir, 'job.json');

    // Check if job.json exists
    try {
      await fs.access(jobJsonPath);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Job not found',
      }, { status: 404 });
    }

    // Read job.json file
    const content = await fs.readFile(jobJsonPath, 'utf-8');
    const job: Job = JSON.parse(content);

    return NextResponse.json({
      success: true,
      job,
    });

  } catch (error) {
    console.error('Job fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch job',
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const body: JobUpdateRequest = await request.json();

    // Validate request
    if (!body.status && !body.results && !body.error && !body.startedAt && !body.completedAt && !body.taskId && !body.runninghubTaskId) {
      return NextResponse.json({
        success: false,
        error: 'No update data provided',
      }, { status: 400 });
    }

    const jobDir = getJobDir(jobId);
    const jobJsonPath = path.join(jobDir, 'job.json');

    // Read existing job.json
    let existingJob: Job | null = null;
    try {
      const content = await fs.readFile(jobJsonPath, 'utf-8');
      existingJob = JSON.parse(content);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Job not found',
      }, { status: 404 });
    }

    // Update job with new data
    const updatedJob: Job = {
      ...existingJob!,
      ...body,
    };

    // Write updated job.json
    await fs.writeFile(jobJsonPath, JSON.stringify(updatedJob, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      job: updatedJob,
    });

  } catch (error) {
    console.error('Job update error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update job',
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const jobDir = getJobDir(jobId);

    // Delete the job directory and all its contents
    await fs.rm(jobDir, { recursive: true, force: true });

    return NextResponse.json({
      success: true,
      message: 'Job deleted',
    });

  } catch (error) {
    console.error('Job delete error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete job',
    }, { status: 500 });
  }
}
