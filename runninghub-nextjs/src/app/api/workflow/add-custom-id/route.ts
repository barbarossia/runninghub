import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * POST /api/workflow/add-custom-id
 * Saves a custom workflow ID to .env.local file and creates workflow JSON
 */
export async function POST(request: NextRequest) {
  try {
    const { workflowId, workflowName, envKey, workflow } = await request.json();

    if (!workflowId || !envKey) {
      return NextResponse.json(
        { error: 'Workflow ID and env key are required' },
        { status: 400 }
      );
    }

    // Path to .env.local
    const envPath = path.join(process.cwd(), '.env.local');

    // Read current .env.local
    let envContent = '';
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, start with empty content
      envContent = '';
    }

    // Check if env key already exists
    if (envContent.includes(`${envKey}=`)) {
      return NextResponse.json(
        { error: 'Environment variable key already exists in .env.local' },
        { status: 409 }
      );
    }

    // Check if workflow ID already exists
    if (envContent.includes(`=${workflowId}`) || envContent.includes(`"${workflowId}"`) || envContent.includes(`'${workflowId}'`)) {
      return NextResponse.json(
        { error: 'Workflow ID already exists in .env.local' },
        { status: 409 }
      );
    }

    // Append new entry
    const timestamp = new Date().toISOString();
    const newEntry = `\n# Custom workflow added on ${timestamp}\n${envKey}="${workflowId}"\n`;
    envContent += newEntry;

    // Write back to .env.local
    await fs.writeFile(envPath, envContent, 'utf-8');

    // Save workflow as JSON file (like other workflows)
    const workflowData = {
      id: workflowId,
      name: workflowName,
      description: `Custom workflow from RunningHub`,
      inputs: workflow.inputs || [],
      output: workflow.outputs || {},
      sourceWorkflowId: workflowId,
      sourceType: 'custom' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const workspacePath = process.env.WORKSPACE_PATH || path.join(os.homedir(), 'Downloads', 'workspace');
    const workflowsDir = path.join(workspacePath, 'workflows');

    await fs.mkdir(workflowsDir, { recursive: true });
    await fs.writeFile(
      path.join(workflowsDir, `${workflowId}.json`),
      JSON.stringify(workflowData, null, 2)
    );

    return NextResponse.json({
      success: true,
      message: 'Custom workflow ID saved successfully',
      workflow: workflowData,
    });
  } catch (error) {
    console.error('Failed to add custom workflow ID:', error);
    return NextResponse.json(
      { error: 'Failed to save custom workflow ID' },
      { status: 500 }
    );
  }
}
