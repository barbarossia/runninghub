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
 * GET /api/workflow/nodes?workflowId=<id>
 * Fetch available nodes for a workflow from the CLI
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const workflowId = searchParams.get('workflowId');

  if (!workflowId) {
    return NextResponse.json(
      { error: 'workflowId is required' },
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

  try {
    const nodes = await fetchNodesFromCLI(workflowId, apiKey, apiHost);

    return NextResponse.json({
      workflowId,
      nodes,
      count: nodes.length,
    });
  } catch (error) {
    console.error('Failed to fetch nodes:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch nodes from CLI',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
