import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { Workflow } from '@/types/workspace';

/**
 * Expand ~/ prefix in path to user home directory
 */
function expandHomePath(path: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

/**
 * GET /api/workflow/list
 * List all saved workflows from the workspace folder
 */
export async function GET(request: NextRequest) {
  try {
    // Get workspace path from env or use default
    const workspacePath = process.env.WORKSPACE_PATH || '~/Downloads/workspace';
    const expandedPath = expandHomePath(workspacePath);
    const workflowsDir = join(expandedPath, 'workflows');

    // Check if workflows directory exists
    try {
      await access(workflowsDir);
    } catch {
      // Directory doesn't exist, return empty list
      return NextResponse.json({
        workflows: [],
        count: 0,
      });
    }

    // Read all files in workflows directory
    const files = await readdir(workflowsDir);
    const workflows: Workflow[] = [];

    // Process each JSON file
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filepath = join(workflowsDir, file);
          const content = await readFile(filepath, 'utf-8');
          const workflow = JSON.parse(content) as Workflow;

          // Validate basic structure
          if (workflow.id && workflow.name) {
            workflows.push(workflow);
          }
        } catch (fileError) {
          // Skip invalid files but log error
          console.error(`Failed to read workflow file ${file}:`, fileError);
        }
      }
    }

    // Sort by updatedAt (most recent first)
    workflows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    return NextResponse.json({
      workflows,
      count: workflows.length,
    });
  } catch (error) {
    console.error('Failed to list workflows:', error);

    return NextResponse.json(
      {
        error: 'Failed to list workflows',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
