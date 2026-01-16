import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

interface RunningHubNode {
  nodeId: string;
  nodeName: string;
  fieldType: string;
  description?: string;
}

/**
 * Fetch nodes from RunningHub CLI using JSON output
 */
function fetchNodesFromCLI(
  workflowId: string,
  apiKey: string,
  apiHost: string
): Promise<RunningHubNode[]> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', ['-m', 'runninghub_cli.cli', 'nodes', '--json'], {
      cwd: process.cwd(), // Run from current directory to find .env.local
      env: {
        ...process.env,
        RUNNINGHUB_API_KEY: apiKey,
        RUNNINGHUB_WORKFLOW_ID: workflowId,
        RUNNINGHUB_API_HOST: apiHost,
      },
    });

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(errorOutput || 'CLI failed'));
        return;
      }

      try {
        const nodes: RunningHubNode[] = JSON.parse(output);
        resolve(nodes);
      } catch (error) {
        reject(new Error(`Failed to parse CLI output: ${output}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      python.kill();
      reject(new Error('CLI nodes command timed out'));
    }, 30000);
  });
}

/**
 * Convert CLI nodes to workflow input parameters
 */
function convertNodesToInputs(nodes: RunningHubNode[]) {
  return nodes.map((node, index) => {
    // Determine parameter type from fieldType
    let type: 'text' | 'file' | 'number' | 'boolean' = 'text';
    let mediaType: 'image' | 'video' | undefined;

    const fieldType = (node.fieldType || '').toLowerCase();

    // Map RunningHub field types to our types
    if (fieldType === 'image') {
      type = 'file';
      mediaType = 'image';
    } else if (fieldType === 'video') {
      type = 'file';
      mediaType = 'video';
    } else if (fieldType === 'int' || fieldType === 'number' || fieldType === 'float') {
      type = 'number';
    } else if (fieldType === 'bool' || fieldType === 'boolean') {
      type = 'boolean';
    }

    return {
      id: `param_${node.nodeId}`,
      name: node.nodeName,
      type,
      required: index === 0, // First parameter is required by default
      description: node.description || node.nodeName,
      validation: type === 'file' ? {
        mediaType,
        fileType: mediaType ? [`${mediaType}/*`] : undefined,
      } : undefined,
    };
  });
}

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

    const apiKey = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
    const apiHost = process.env.NEXT_PUBLIC_RUNNINGHUB_API_HOST || 'www.runninghub.cn';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_RUNNINGHUB_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch workflow nodes from RunningHub CLI
    const nodes = await fetchNodesFromCLI(workflowId, apiKey, apiHost);

    // Convert nodes to workflow inputs
    const inputs = convertNodesToInputs(nodes);

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflowId,
        inputs,
        outputs: {},
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
