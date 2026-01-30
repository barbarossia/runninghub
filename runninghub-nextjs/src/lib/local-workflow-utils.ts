/**
 * Local Workflow Utilities
 * Manages local workflow storage and operations
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import os from 'os';

import type { LocalWorkflow } from '@/types/workspace';

const LOCAL_WORKFLOW_DIR = join(
	os.homedir(),
	'Downloads',
	'workspace',
	'local-workflows',
);

export function generateLocalWorkflowId(): string {
	return `local_${Date.now()}_${randomUUID().substring(0, 8)}`;
}

export async function saveLocalWorkflow(
	workflow: Omit<LocalWorkflow, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
	const id = generateLocalWorkflowId();
	const now = Date.now();

	const fullWorkflow: LocalWorkflow = {
		...workflow,
		id,
		createdAt: now,
		updatedAt: now,
	};

	const filePath = join(LOCAL_WORKFLOW_DIR, `${id}.json`);
	await fs.mkdir(LOCAL_WORKFLOW_DIR, { recursive: true });
	await fs.writeFile(filePath, JSON.stringify(fullWorkflow, null, 2));

	return id;
}

export async function updateLocalWorkflow(
	workflow: LocalWorkflow,
): Promise<string> {
	const now = Date.now();
	const filePath = join(LOCAL_WORKFLOW_DIR, `${workflow.id}.json`);

	const fullWorkflow: LocalWorkflow = {
		...workflow,
		createdAt: workflow.createdAt ?? now,
		updatedAt: now,
	};

	await fs.mkdir(LOCAL_WORKFLOW_DIR, { recursive: true });
	await fs.writeFile(filePath, JSON.stringify(fullWorkflow, null, 2));

	return workflow.id;
}

function migrateLegacyWorkflow(data: any): LocalWorkflow {
	if (data.inputs) return data as LocalWorkflow;

	// Migration for legacy "steps" format
	if (data.steps && Array.isArray(data.steps) && data.steps.length > 0) {
		const step = data.steps[0];
		// Map old step structure to new input structure
		const input = {
			id: step.id || crypto.randomUUID(),
			name: step.name || 'Local Operation',
			type: 'local' as const,
			operation: step.localOperation?.type || 'video-convert',
			config: step.localOperation?.config || {},
		};

		return {
			...data,
			inputs: [input],
			steps: undefined, // Remove legacy field
		} as LocalWorkflow;
	}

	return data as LocalWorkflow;
}

export async function loadLocalWorkflow(
	workflowId: string,
): Promise<LocalWorkflow | null> {
	try {
		const filePath = join(LOCAL_WORKFLOW_DIR, `${workflowId}.json`);
		const content = await fs.readFile(filePath, 'utf-8');
		const data = JSON.parse(content);
		return migrateLegacyWorkflow(data);
	} catch (error) {
		console.error(`Failed to load local workflow ${workflowId}:`, error);
		return null;
	}
}

export async function listLocalWorkflows(): Promise<LocalWorkflow[]> {
	try {
		await fs.mkdir(LOCAL_WORKFLOW_DIR, { recursive: true });
		const files = await fs.readdir(LOCAL_WORKFLOW_DIR);
		const workflows: LocalWorkflow[] = [];

		for (const file of files) {
			if (!file.endsWith('.json')) continue;

			try {
				const filePath = join(LOCAL_WORKFLOW_DIR, file);
				const content = await fs.readFile(filePath, 'utf-8');
				const data = JSON.parse(content);
				workflows.push(migrateLegacyWorkflow(data));
			} catch (error) {
				console.error(`Failed to read ${file}:`, error);
			}
		}

		return workflows.sort((a, b) => b.updatedAt - a.updatedAt);
	} catch (error) {
		console.error('Failed to list local workflows:', error);
		return [];
	}
}

export async function deleteLocalWorkflow(workflowId: string): Promise<boolean> {
	try {
		const filePath = join(LOCAL_WORKFLOW_DIR, `${workflowId}.json`);
		await fs.unlink(filePath);
		return true;
	} catch (error) {
		console.error(`Failed to delete local workflow ${workflowId}:`, error);
		return false;
	}
}
