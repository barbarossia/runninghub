import { NextRequest, NextResponse } from 'next/server';
import {
	deleteLocalWorkflow,
	loadLocalWorkflow,
} from '@/lib/local-workflow-utils';
import type { GetLocalWorkflowResponse } from '@/types/workspace';

interface RouteParams {
	params: Promise<{ workflowId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { workflowId } = await params;
		const workflow = await loadLocalWorkflow(workflowId);

		if (!workflow) {
			return NextResponse.json(
				{ success: false, error: 'Workflow not found' },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			success: true,
			workflow,
		} as GetLocalWorkflowResponse);
	} catch (error) {
		console.error('Failed to load local workflow:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to load workflow' },
			{ status: 500 },
		);
	}
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	try {
		const { workflowId } = await params;
		const deleted = await deleteLocalWorkflow(workflowId);

		if (!deleted) {
			return NextResponse.json(
				{ success: false, error: 'Failed to delete workflow' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Failed to delete local workflow:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to delete workflow' },
			{ status: 500 },
		);
	}
}
