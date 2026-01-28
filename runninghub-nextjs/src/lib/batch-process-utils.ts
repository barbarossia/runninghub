/**
 * Batch Process Template Utilities
 * Manages template storage and operations
 */

import { promises as fs } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import os from "os";

import type { BatchProcessTemplate } from "@/types/workspace";

const BATCH_PROCESS_DIR = join(
	os.homedir(),
	"Downloads",
	"workspace",
	"batch-process-templates",
);

export function generateBatchProcessTemplateId(): string {
	return `batch_${Date.now()}_${randomUUID().substring(0, 8)}`;
}

export async function saveBatchProcessTemplate(
	template: Omit<BatchProcessTemplate, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
	const id = generateBatchProcessTemplateId();
	const now = Date.now();

	const fullTemplate: BatchProcessTemplate = {
		...template,
		id,
		createdAt: now,
		updatedAt: now,
	};

	const filePath = join(BATCH_PROCESS_DIR, `${id}.json`);
	await fs.mkdir(BATCH_PROCESS_DIR, { recursive: true });
	await fs.writeFile(filePath, JSON.stringify(fullTemplate, null, 2));

	return id;
}

export async function updateBatchProcessTemplate(
	template: BatchProcessTemplate,
): Promise<string> {
	const now = Date.now();
	const filePath = join(BATCH_PROCESS_DIR, `${template.id}.json`);

	const fullTemplate: BatchProcessTemplate = {
		...template,
		createdAt: template.createdAt ?? now,
		updatedAt: now,
	};

	await fs.mkdir(BATCH_PROCESS_DIR, { recursive: true });
	await fs.writeFile(filePath, JSON.stringify(fullTemplate, null, 2));

	return template.id;
}

export async function loadBatchProcessTemplate(
	templateId: string,
): Promise<BatchProcessTemplate | null> {
	try {
		const filePath = join(BATCH_PROCESS_DIR, `${templateId}.json`);
		const content = await fs.readFile(filePath, "utf-8");
		return JSON.parse(content) as BatchProcessTemplate;
	} catch (error) {
		console.error(`Failed to load batch process template ${templateId}:`, error);
		return null;
	}
}

export async function listBatchProcessTemplates(): Promise<
	BatchProcessTemplate[]
> {
	try {
		await fs.mkdir(BATCH_PROCESS_DIR, { recursive: true });
		const files = await fs.readdir(BATCH_PROCESS_DIR);
		const templates: BatchProcessTemplate[] = [];

		for (const file of files) {
			if (!file.endsWith(".json")) continue;

			try {
				const filePath = join(BATCH_PROCESS_DIR, file);
				const content = await fs.readFile(filePath, "utf-8");
				templates.push(JSON.parse(content) as BatchProcessTemplate);
			} catch (error) {
				console.error(`Failed to read ${file}:`, error);
			}
		}

		return templates.sort((a, b) => b.updatedAt - a.updatedAt);
	} catch (error) {
		console.error("Failed to list batch process templates:", error);
		return [];
	}
}

export async function deleteBatchProcessTemplate(
	templateId: string,
): Promise<boolean> {
	try {
		const filePath = join(BATCH_PROCESS_DIR, `${templateId}.json`);
		await fs.unlink(filePath);
		return true;
	} catch (error) {
		console.error(
			`Failed to delete batch process template ${templateId}:`,
			error,
		);
		return false;
	}
}
