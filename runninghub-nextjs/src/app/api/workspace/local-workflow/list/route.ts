import { NextResponse } from 'next/server';
import { listLocalWorkflows } from '@/lib/local-workflow-utils';
import type { ListLocalWorkflowResponse } from '@/types/workspace';

export async function GET() {
	try {
		const workflows = await listLocalWorkflows();
		return NextResponse.json({
			success: true,
			workflows,
		} as ListLocalWorkflowResponse);
	} catch (error) {
		console.error('Failed to list local workflows:', error);
		return NextResponse.json(
			{ success: false, workflows: [], error: 'Failed to load workflows' },
			{ status: 500 },
		);
	}
}
