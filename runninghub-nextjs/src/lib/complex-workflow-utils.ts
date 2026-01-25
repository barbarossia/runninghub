/**
 * Complex Workflow Utilities
 * Manages complex workflow storage and operations
 */

import { promises as fs } from "fs";
import { join, basename } from "path";
import { randomUUID } from "crypto";

import type {
	ComplexWorkflow,
	WorkflowStep,
	StepParameterConfig,
	ComplexWorkflowExecution,
	ExecutionStep,
	FileInputAssignment,
	JobResult,
	MediaType,
	WorkflowInputParameter,
} from "@/types/workspace";

const COMPLEX_WORKFLOW_DIR = join(
	process.env.HOME || "~",
	"Downloads",
	"workspace",
	"complex-workflows",
);

const COMPLEX_EXECUTION_DIR = join(
	process.env.HOME || "~",
	"Downloads",
	"workspace",
	"complex-executions",
);

/**
 * Generate unique ID for complex workflow
 */
export function generateComplexWorkflowId(): string {
	return `complex_${Date.now()}_${randomUUID().substring(0, 8)}`;
}

/**
 * Generate unique ID for complex workflow execution
 */
export function generateComplexExecutionId(): string {
	return `exec_${Date.now()}_${randomUUID().substring(0, 8)}`;
}

/**
 * Save complex workflow to file
 */
export async function saveComplexWorkflow(
	workflow: Omit<ComplexWorkflow, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
	const id = generateComplexWorkflowId();
	const now = Date.now();

	const fullWorkflow: ComplexWorkflow = {
		...workflow,
		id,
		createdAt: now,
		updatedAt: now,
	};

	const filePath = join(COMPLEX_WORKFLOW_DIR, `${id}.json`);

	await fs.mkdir(COMPLEX_WORKFLOW_DIR, { recursive: true });
	await fs.writeFile(filePath, JSON.stringify(fullWorkflow, null, 2));

	return id;
}

/**
 * Load complex workflow from file
 */
export async function loadComplexWorkflow(
	workflowId: string,
): Promise<ComplexWorkflow | null> {
	try {
		const filePath = join(COMPLEX_WORKFLOW_DIR, `${workflowId}.json`);
		const content = await fs.readFile(filePath, "utf-8");
		return JSON.parse(content) as ComplexWorkflow;
	} catch (error) {
		console.error(`Failed to load complex workflow ${workflowId}:`, error);
		return null;
	}
}

/**
 * List all complex workflows
 */
export async function listComplexWorkflows(): Promise<ComplexWorkflow[]> {
	try {
		await fs.mkdir(COMPLEX_WORKFLOW_DIR, { recursive: true });
		const files = await fs.readdir(COMPLEX_WORKFLOW_DIR);
		const workflows: ComplexWorkflow[] = [];

		for (const file of files) {
			if (!file.endsWith(".json")) continue;

			try {
				const filePath = join(COMPLEX_WORKFLOW_DIR, file);
				const content = await fs.readFile(filePath, "utf-8");
				workflows.push(JSON.parse(content) as ComplexWorkflow);
			} catch (error) {
				console.error(`Failed to read ${file}:`, error);
			}
		}

		return workflows.sort((a, b) => b.updatedAt - a.updatedAt);
	} catch (error) {
		console.error("Failed to list complex workflows:", error);
		return [];
	}
}

/**
 * Delete complex workflow
 */
export async function deleteComplexWorkflow(
	workflowId: string,
): Promise<boolean> {
	try {
		const filePath = join(COMPLEX_WORKFLOW_DIR, `${workflowId}.json`);
		await fs.unlink(filePath);
		return true;
	} catch (error) {
		console.error(`Failed to delete complex workflow ${workflowId}:`, error);
		return false;
	}
}

/**
 * Save complex workflow execution state
 */
export async function saveComplexWorkflowExecution(
	execution: Omit<ComplexWorkflowExecution, "id" | "createdAt">,
): Promise<string> {
	const id = generateComplexExecutionId();
	const now = Date.now();

	const fullExecution: ComplexWorkflowExecution = {
		...execution,
		id,
		createdAt: now,
	};

	const executionDir = join(COMPLEX_EXECUTION_DIR, id);
	await fs.mkdir(executionDir, { recursive: true });

	const executionFilePath = join(executionDir, "execution.json");
	await fs.writeFile(executionFilePath, JSON.stringify(fullExecution, null, 2));

	return id;
}

/**
 * Load complex workflow execution state
 */
export async function loadComplexWorkflowExecution(
	executionId: string,
): Promise<ComplexWorkflowExecution | null> {
	try {
		const executionFilePath = join(
			COMPLEX_EXECUTION_DIR,
			executionId,
			"execution.json",
		);
		const content = await fs.readFile(executionFilePath, "utf-8");
		return JSON.parse(content) as ComplexWorkflowExecution;
	} catch (error) {
		console.error(`Failed to load execution ${executionId}:`, error);
		return null;
	}
}

/**
 * List all complex workflow executions
 */
export async function listComplexExecutions(): Promise<
	ComplexWorkflowExecution[]
> {
	try {
		await fs.mkdir(COMPLEX_EXECUTION_DIR, { recursive: true });
		const dirs = await fs.readdir(COMPLEX_EXECUTION_DIR);
		const executions: ComplexWorkflowExecution[] = [];

		for (const dir of dirs) {
			if (dir.startsWith(".")) continue; // Skip hidden files/dirs

			try {
				const executionFilePath = join(
					COMPLEX_EXECUTION_DIR,
					dir,
					"execution.json",
				);
				const content = await fs.readFile(executionFilePath, "utf-8");
				const rawExecution = JSON.parse(content) as ComplexWorkflowExecution;
				const normalizedExecution = ensureExecutionIdentity(rawExecution, dir);
				executions.push(normalizedExecution);

				if (normalizedExecution !== rawExecution) {
					await fs.writeFile(
						executionFilePath,
						JSON.stringify(normalizedExecution, null, 2),
					);
				}
			} catch (error) {
				console.error(`Failed to read execution in ${dir}:`, error);
			}
		}

		return executions.sort((a, b) => b.createdAt - a.createdAt);
	} catch (error) {
		console.error("Failed to list complex executions:", error);
		return [];
	}
}

/**
 * Map step outputs to next step inputs
 */
type MappedStepInputs = {
	fileInputs: FileInputAssignment[];
	textInputs: Record<string, string>;
};

const getBaseName = (value?: string) => {
	if (!value) return "";
	return basename(value);
};

const inferMediaTypeFromName = (value?: string): MediaType | null => {
	if (!value) return null;
	const lower = value.toLowerCase();
	if (/\.(mp4|mov|avi|webm|mkv)$/i.test(lower)) return "video";
	if (/\.(png|jpg|jpeg|bmp|webp|gif|tif|tiff|svg)$/i.test(lower))
		return "image";
	return null;
};

const buildOutputMap = (jobResult?: JobResult) => {
	const outputMap = new Map<string, any>();
	const outputs = jobResult?.outputs || [];
	const textOutputs = jobResult?.textOutputs || [];

	// Build output map by parameter ID
	for (const [index, output] of outputs.entries()) {
		const matchingTextOutput =
			output.type === "text"
				? textOutputs.find(
						(textOutput: any) =>
							(textOutput.fileName &&
								textOutput.fileName === output.fileName) ||
							(textOutput.filePath && textOutput.filePath === output.path),
					)
				: null;
		const enrichedOutput =
			output.type === "text"
				? {
						...output,
						content: output.content ?? matchingTextOutput?.content?.original,
					}
				: output;

		if (output.parameterId) {
			outputMap.set(output.parameterId, enrichedOutput);
		}
		outputMap.set(`output_${index}`, enrichedOutput);
		outputMap.set(`${index + 1}-output`, enrichedOutput);
		outputMap.set(`output-${index + 1}`, enrichedOutput);
		if (output.fileName) {
			outputMap.set(output.fileName, enrichedOutput);
		}
	}

	for (const [index, textOutput] of textOutputs.entries()) {
		const textEntry = {
			type: "text",
			content: textOutput.content?.original,
			fileName: textOutput.fileName,
			path: textOutput.filePath,
		};
		if (!outputMap.has(`output_${index}`)) {
			outputMap.set(`output_${index}`, textEntry);
		}
		if (!outputMap.has(`${index + 1}-output`)) {
			outputMap.set(`${index + 1}-output`, textEntry);
		}
		if (textOutput.fileName && !outputMap.has(textOutput.fileName)) {
			outputMap.set(textOutput.fileName, textEntry);
		}
	}

	return outputMap;
};

export function mapOutputsToInputs(
	stepResults: Record<number, JobResult | undefined>,
	nextStepParameters: StepParameterConfig[],
	workflowInputs?: WorkflowInputParameter[],
): MappedStepInputs {
	const inputs: MappedStepInputs = {
		fileInputs: [],
		textInputs: {},
	};
	const workflowInputMap = new Map(
		(workflowInputs || []).map((input) => [input.id, input]),
	);
	const outputMapCache = new Map<number, Map<string, any>>();

	const getStepOutputMap = (stepNumber: number) => {
		if (outputMapCache.has(stepNumber)) return outputMapCache.get(stepNumber)!;
		const map = buildOutputMap(stepResults[stepNumber]);
		outputMapCache.set(stepNumber, map);
		return map;
	};

	const getStepAliasOutput = (stepNumber: number) => {
		const outputMap = getStepOutputMap(stepNumber);
		return (
			outputMap.get("1-output") ||
			outputMap.get("output_0") ||
			outputMap.get("output-1") ||
			null
		);
	};

	// Map dynamic parameters to outputs
	for (const param of nextStepParameters) {
		const inputDefinition = workflowInputMap.get(param.parameterId);
		const isFileParam = inputDefinition?.type === "file";

		if (param.valueType === "dynamic" && param.dynamicMapping) {
			const { sourceStepNumber, sourceParameterId, sourceOutputName } =
				param.dynamicMapping;
			const outputMap = getStepOutputMap(sourceStepNumber);
			const stepAliasKey = `${sourceStepNumber}-output`;
			const output =
				outputMap.get(sourceParameterId) ||
				outputMap.get(sourceOutputName) ||
				(sourceParameterId === stepAliasKey || sourceOutputName === stepAliasKey
					? getStepAliasOutput(sourceStepNumber)
					: null);

			if (!output) continue;

			if (isFileParam || (!inputDefinition && output.type !== "text")) {
				const path = output.path || output.workspacePath;
				if (!path) continue;
				const resolvedFileName = output.fileName || getBaseName(path);
				const inferredType =
					output.fileType === "image" || output.fileType === "video"
						? output.fileType
						: inputDefinition?.validation?.mediaType ||
							inferMediaTypeFromName(resolvedFileName) ||
							"image";
				inputs.fileInputs.push({
					parameterId: param.parameterId,
					filePath: path,
					fileName: resolvedFileName || "output",
					fileSize: output.fileSize || 0,
					fileType: inferredType,
					valid: true,
				});
				continue;
			}

			const value =
				output.type === "text"
					? output.content
					: output.path || output.workspacePath || output.fileName;
			if (value !== undefined) {
				inputs.textInputs[param.parameterId] = String(value);
			}
			continue;
		}

		if (param.valueType === "static" && param.staticValue !== undefined) {
			if (!isFileParam) {
				inputs.textInputs[param.parameterId] = String(param.staticValue);
			}
		}
	}

	return inputs;
}

/**
 * Validate step parameter config
 */
export function validateStepParameter(
	stepNumber: number,
	parameter: StepParameterConfig,
): { valid: boolean; error?: string } {
	// First step cannot use dynamic mapping
	if (stepNumber === 1 && parameter.valueType === "dynamic") {
		return {
			valid: false,
			error: `Step ${stepNumber} cannot use dynamic mapping (no previous output available)`,
		};
	}

	// Dynamic mapping must have all required fields
	if (parameter.valueType === "dynamic") {
		if (!parameter.dynamicMapping) {
			return {
				valid: false,
				error: `Dynamic mapping missing for parameter ${parameter.parameterId}`,
			};
		}

		const { sourceStepNumber, sourceParameterId, sourceOutputName } =
			parameter.dynamicMapping;

		// Validate source step number
		if (sourceStepNumber >= stepNumber) {
			return {
				valid: false,
				error: `Step ${stepNumber} parameter cannot map to current or future step (step ${sourceStepNumber})`,
			};
		}

		if (!sourceParameterId) {
			return {
				valid: false,
				error: `Dynamic mapping missing sourceParameterId for ${parameter.parameterId}`,
			};
		}

		if (!sourceOutputName) {
			return {
				valid: false,
				error: `Dynamic mapping missing sourceOutputName for ${parameter.parameterId}`,
			};
		}
	}

	return { valid: true };
}

export function getExecutionCreatedAtFromId(
	executionId?: string,
): number | null {
	if (!executionId) return null;
	const parts = executionId.split("_");
	if (parts.length < 2) return null;
	const timestamp = Number(parts[1]);
	return Number.isFinite(timestamp) ? timestamp : null;
}

export function ensureExecutionIdentity(
	execution: ComplexWorkflowExecution,
	executionId?: string,
): ComplexWorkflowExecution {
	const normalizedId = execution.id || executionId;
	const normalizedCreatedAt =
		execution.createdAt ??
		getExecutionCreatedAtFromId(normalizedId) ??
		Date.now();

	if (
		execution.id === normalizedId &&
		execution.createdAt === normalizedCreatedAt
	) {
		return execution;
	}

	return {
		...execution,
		id: normalizedId || execution.id,
		createdAt: normalizedCreatedAt,
	};
}
