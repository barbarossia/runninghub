import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import type { CliNode } from '@/types/workspace';

/**
 * Parse CLI nodes output into structured data
 * Expected format:
 * ✓ Found 4 nodes:
 * 1. LoadImage (203)
 *    Type: Unknown
 *    Description: image
 */
function parseNodesOutput(output: string): CliNode[] {
  const lines = output.split('\n');
  const nodes: CliNode[] = [];
  let currentNode: Partial<CliNode> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Match node header: "1. LoadImage (203)" or "1. Text Multiline (10)"
    // Updated regex to handle multi-word node names
    const nodeHeaderMatch = trimmed.match(/^(\d+)\.\s+(.+?)\s+\((\d+)\)\s*$/);
    if (nodeHeaderMatch) {
      // Save previous node if exists
      if (currentNode && currentNode.id && currentNode.name) {
        nodes.push(currentNode as CliNode);
      }

      // Start new node
      currentNode = {
        id: parseInt(nodeHeaderMatch[3], 10),
        name: nodeHeaderMatch[2],
        type: 'Unknown',
        description: '',
      };
      continue;
    }

    // Match field: "Type: Unknown" or "Description: image"
    const fieldMatch = trimmed.match(/^(\w+):\s*(.+)$/);
    if (fieldMatch && currentNode) {
      const [, fieldName, fieldValue] = fieldMatch;

      switch (fieldName.toLowerCase()) {
        case 'type':
          currentNode.type = fieldValue;
          break;
        case 'description':
          currentNode.description = fieldValue;

          // Try to infer input type from description
          const descLower = fieldValue.toLowerCase();
          if (descLower.includes('image')) {
            currentNode.inputType = 'image';
          } else if (descLower.includes('video')) {
            currentNode.inputType = 'video';
          } else if (descLower.includes('text')) {
            currentNode.inputType = 'text';
          } else if (descLower.includes('int') || descLower.includes('number')) {
            currentNode.inputType = 'number';
          } else if (descLower.includes('bool')) {
            currentNode.inputType = 'boolean';
          }
          break;
      }
    }
  }

  // Save last node
  if (currentNode && currentNode.id && currentNode.name) {
    nodes.push(currentNode as CliNode);
  }

  return nodes;
}

/**
 * Convert CLI nodes to workflow input parameters
 */
function convertNodesToInputs(nodes: CliNode[]) {
  return nodes.map((node, index) => {
    // Determine parameter type from inputType or description
    let type: 'text' | 'file' | 'number' | 'boolean' = 'text';
    let mediaType: 'image' | 'video' | undefined;

    if (node.inputType === 'image') {
      type = 'file';
      mediaType = 'image';
    } else if (node.inputType === 'video') {
      type = 'file';
      mediaType = 'video';
    } else if (node.inputType === 'number') {
      type = 'number';
    } else if (node.inputType === 'boolean') {
      type = 'boolean';
    }

    return {
      id: `param_${node.id}`,
      name: node.name,
      type,
      required: index === 0, // First parameter is required by default
      description: node.description,
      validation: type === 'file' ? {
        mediaType,
        fileType: mediaType ? [`${mediaType}/*`] : undefined,
      } : undefined,
    };
  });
}

/**
 * Fetch nodes from RunningHub CLI
 */
function fetchNodesFromCLI(
  workflowId: string,
  apiKey: string,
  apiHost: string
): Promise<CliNode[]> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', ['-m', 'runninghub_cli.cli', 'nodes'], {
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
        const nodes = parseNodesOutput(output);
        resolve(nodes);
      } catch (error) {
        reject(error);
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
