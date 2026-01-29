import { NextRequest, NextResponse } from 'next/server';
import {
	saveLocalWorkflow,
	updateLocalWorkflow,
} from '@/lib/local-workflow-utils';
import type {
	SaveLocalWorkflowRequest,
	SaveLocalWorkflowResponse,
} from '@/types/workspace';

export async function POST(request: NextRequest) {
	try {
		const body: SaveLocalWorkflowRequest = await request.json();

		if (!body.workflow?.name) {
			return NextResponse.json(
				{ success: false, error: 'Workflow name is required' },
				{ status: 400 },
			);
		}

		if (!body.workflow.steps || body.workflow.steps.length === 0) {
			return NextResponse.json(
				{ success: false, error: 'At least one step is required' },
				{ status: 400 },
			);
		}

		let workflowId: string;
		if (body.workflow.id) {
			workflowId = await updateLocalWorkflow(body.workflow);
		} else {
			const { id, createdAt, updatedAt, ...workflow } = body.workflow;
			workflowId = await saveLocalWorkflow(workflow);
		}

		return NextResponse.json({
			success: true,
			workflowId,
		} as SaveLocalWorkflowResponse);
	} catch (error) {
		console.error('Failed to save local workflow:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to save workflow' },
			{ status: 500 },
		);
	}
}
