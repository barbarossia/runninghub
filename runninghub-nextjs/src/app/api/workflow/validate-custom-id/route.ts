import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import os from 'os';

/**
 * POST /api/workflow/validate-custom-id
 * Validates a custom workflow ID by fetching its nodes from RunningHub API
 */
export async function POST(request: NextRequest) {
  try {
    const { workflowId } = await request.json();

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    // Fetch workflow nodes from RunningHub CLI
    const envVars = {
      ...process.env,
      RUNNINGHUB_API_KEY: process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY || '',
      RUNNINGHUB_WORKFLOW_ID: workflowId,
    };

    const command = 'runninghub nodes';
    const options = {
      encoding: 'utf-8' as BufferEncoding,
      timeout: 30000,
      cwd: process.env.WORKSPACE_PATH || os.homedir(),
      env: envVars,
    };

    const result = execSync(command, options);
    const workflow = JSON.parse(result as string);

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflowId,
        inputs: workflow.inputs || [],
        outputs: workflow.outputs || [],
      },
    });
  } catch (error) {
    console.error('Failed to validate custom workflow ID:', error);

    // Provide more specific error messages
    let errorMessage = 'Invalid workflow ID or failed to fetch workflow details';

    if (error instanceof Error) {
      if (error.message.includes('timed out')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Unable to connect to RunningHub API. Please check your network connection.';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = 'Invalid API key. Please check your RunningHub API credentials.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Workflow ID not found. Please verify the workflow ID.';
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
