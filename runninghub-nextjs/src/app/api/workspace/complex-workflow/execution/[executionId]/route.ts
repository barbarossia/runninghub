/**
 * Get Complex Workflow Execution Status API
 * Returns the current state of a complex workflow execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadComplexWorkflowExecution } from '@/lib/complex-workflow-utils';
import type {
  GetComplexWorkflowExecutionResponse,
} from '@/types/workspace';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;

    const execution = await loadComplexWorkflowExecution(executionId);

    if (!execution) {
      return NextResponse.json({
        success: false,
        error: `Execution ${executionId} not found`,
      } as GetComplexWorkflowExecutionResponse, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      execution,
    } as GetComplexWorkflowExecutionResponse);
  } catch (error) {
    console.error('Get execution status error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get execution status',
    } as GetComplexWorkflowExecutionResponse, { status: 500 });
  }
}
