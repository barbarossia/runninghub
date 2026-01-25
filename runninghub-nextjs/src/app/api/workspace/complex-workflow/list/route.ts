/**
 * List Complex Workflows API
 * Returns all saved complex workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { listComplexWorkflows } from '@/lib/complex-workflow-utils';

export async function GET(request: NextRequest) {
  try {
    const workflows = await listComplexWorkflows();

    return NextResponse.json({
      success: true,
      workflows,
    });
  } catch (error) {
    console.error('List complex workflows error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list complex workflows',
    }, { status: 500 });
  }
}
