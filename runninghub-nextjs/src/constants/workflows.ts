/**
 * Available workflow configurations
 * Maps workflow IDs from .env.local to user-friendly names
 */

export interface AvailableWorkflow {
	id: string;
	name: string;
	envKey: string;
}

export const AVAILABLE_WORKFLOWS: AvailableWorkflow[] = [
	{
		id: "workflow_1766742244900_z78t5g9lk",
		name: "Image Training",
		envKey: "NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID",
	},
	{
		id: "2004098019010199554",
		name: "S Workflow",
		envKey: "NEXT_PUBLIC_RUNNINGHUB_S_ID",
	},
	{
		id: "2004104127166726146",
		name: "D Workflow",
		envKey: "NEXT_PUBLIC_RUNNINGHUB_D_ID",
	},
];

/**
 * Get workflow ID from environment variable
 */
export function getWorkflowIdFromEnv(envKey: string): string | undefined {
	return process.env[envKey];
}

/**
 * Get all available workflow IDs
 */
export function getAvailableWorkflowIds(): string[] {
	return AVAILABLE_WORKFLOWS.map((wf) => wf.id).filter((id) => {
		// Filter out workflows that don't have their env var set
		const workflow = AVAILABLE_WORKFLOWS.find((wf) => wf.id === id);
		return workflow ? !!process.env[workflow.envKey] : false;
	});
}

/**
 * Get workflow name by ID
 */
export function getWorkflowName(workflowId: string): string | undefined {
	const workflow = AVAILABLE_WORKFLOWS.find((wf) => wf.id === workflowId);
	return workflow?.name;
}
