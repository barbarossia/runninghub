/**
 * Continue Complex Workflow Execution API
 * Executes the next step in a complex workflow
 */

import { NextRequest, NextResponse } from "next/server";
import {
	loadComplexWorkflowExecution,
	loadComplexWorkflow,
	mapOutputsToInputs,
	validateStepParameter,
	ensureExecutionIdentity,
} from "@/lib/complex-workflow-utils";
import type {
	ContinueComplexWorkflowRequest,
	ContinueComplexWorkflowResponse,
	FileInputAssignment,
	JobResult,
	Workflow,
} from "@/types/workspace";

const EXECUTION_DIR = process.env.HOME
	? `${process.env.HOME}/Downloads/workspace/complex-executions`
	: "~/Downloads/workspace/complex-executions";

export async function POST(request: NextRequest) {
	try {
		const body: ContinueComplexWorkflowRequest = await request.json();

		// Validate request
		if (!body.executionId || !body.stepNumber) {
			return NextResponse.json(
				{
					success: false,
					error: "Execution ID and step number are required",
				} as ContinueComplexWorkflowResponse,
				{ status: 400 },
			);
		}

		// Load execution state
		const execution = await loadComplexWorkflowExecution(body.executionId);

		if (!execution) {
			return NextResponse.json(
				{
					success: false,
					error: `Execution ${body.executionId} not found`,
				} as ContinueComplexWorkflowResponse,
				{ status: 404 },
			);
		}

		const normalizedExecution = ensureExecutionIdentity(
			execution,
			body.executionId,
		);

		// Load workflow definition to get parameters
		const workflow = await loadComplexWorkflow(
			normalizedExecution.complexWorkflowId,
		);
		if (!workflow) {
			return NextResponse.json(
				{
					success: false,
					error: `Complex workflow ${normalizedExecution.complexWorkflowId} not found`,
				} as ContinueComplexWorkflowResponse,
				{ status: 404 },
			);
		}

		// Find current and next steps
		const currentStep = normalizedExecution.steps.find(
			(s) => s.stepNumber === body.stepNumber,
		);
		const nextStep = normalizedExecution.steps.find(
			(s) => s.stepNumber === body.stepNumber + 1,
		);
		const nextStepDef = workflow.steps.find(
			(s) => s.stepNumber === body.stepNumber + 1,
		);

		if (!nextStep || !nextStepDef) {
			return NextResponse.json(
				{
					success: false,
					error: `Step ${body.stepNumber + 1} not found in complex workflow`,
				} as ContinueComplexWorkflowResponse,
				{ status: 400 },
			);
		}

		if (!currentStep) {
			return NextResponse.json(
				{
					success: false,
					error: `Step ${body.stepNumber} not found in complex workflow`,
				} as ContinueComplexWorkflowResponse,
				{ status: 400 },
			);
		}

		// Validate current step is completed
		if (currentStep.status !== "completed") {
			return NextResponse.json(
				{
					success: false,
					error: `Step ${body.stepNumber} is not completed (status: ${currentStep.status})`,
				} as ContinueComplexWorkflowResponse,
				{ status: 400 },
			);
		}

		const fs = await import("fs/promises");
		const path = await import("path");

		// Load next step workflow definition to get RunningHub ID
		const nextWorkflowPath = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
			"workflows",
			`${nextStepDef.workflowId}.json`,
		);

		let sourceWorkflowId = "";
		let nextWorkflow: Workflow | null = null;
		try {
			const nextWorkflowContent = await fs.readFile(nextWorkflowPath, "utf-8");
			nextWorkflow = JSON.parse(nextWorkflowContent) as Workflow;
			sourceWorkflowId = nextWorkflow.sourceWorkflowId || "";
		} catch (e) {
			console.error(`Failed to load workflow ${nextStepDef.workflowId}:`, e);
			return NextResponse.json(
				{
					success: false,
					error: `Failed to load workflow definition for step ${nextStepDef.stepNumber}: ${nextStepDef.workflowId}`,
				} as ContinueComplexWorkflowResponse,
				{ status: 500 },
			);
		}

		const executionDir = path.join(EXECUTION_DIR, body.executionId);
		const stepOutputsCache = new Map<number, JobResult | null>();
		const loadStepOutputs = async (stepNumber: number) => {
			if (stepOutputsCache.has(stepNumber))
				return stepOutputsCache.get(stepNumber);
			const step = normalizedExecution.steps.find(
				(candidate) => candidate.stepNumber === stepNumber,
			);
			if (!step) {
				stepOutputsCache.set(stepNumber, null);
				return null;
			}
			if (!step.jobId) {
				stepOutputsCache.set(stepNumber, null);
				return null;
			}
			const jobFile = path.join(executionDir, step.jobId, "job.json");
			try {
				const jobContent = await fs.readFile(jobFile, "utf-8");
				const jobResult = JSON.parse(jobContent) as JobResult;
				stepOutputsCache.set(stepNumber, jobResult);
				return jobResult;
			} catch (e) {
				console.error(`Failed to read job result for step ${stepNumber}:`, e);
				if (step.outputs) {
					stepOutputsCache.set(stepNumber, step.outputs);
					return step.outputs;
				}
				stepOutputsCache.set(stepNumber, null);
				return null;
			}
		};

		const requiredSteps = new Set<number>();
		for (const param of nextStepDef.parameters) {
			if (param.valueType === "dynamic" && param.dynamicMapping) {
				requiredSteps.add(param.dynamicMapping.sourceStepNumber);
			}
		}

		const stepResults: Record<number, JobResult | undefined> = {};
		for (const stepNumber of requiredSteps) {
			const outputs = await loadStepOutputs(stepNumber);
			if (outputs) {
				stepResults[stepNumber] = outputs;
			}
		}

		// Prepare next step inputs
		const mappedInputs = mapOutputsToInputs(
			stepResults,
			nextStepDef.parameters,
			nextWorkflow?.inputs,
		);

		// Extract parameters from request
		const userParams = body.parameters || {};
		const fileInputs = Array.isArray(userParams.fileInputs)
			? userParams.fileInputs
			: [];
		const textInputs =
			userParams.textInputs && typeof userParams.textInputs === "object"
				? userParams.textInputs
				: {};
		const deleteSourceFiles = userParams.deleteSourceFiles || false;

		// Merge user-provided inputs with mapped inputs
		// User inputs take precedence over mapped inputs
		const mergedTextInputs = { ...mappedInputs.textInputs, ...textInputs };
		const existingFileParams = new Set(
			fileInputs.map((input: FileInputAssignment) => input.parameterId),
		);
		const mergedFileInputs = [
			...fileInputs,
			...mappedInputs.fileInputs.filter(
				(input) => !existingFileParams.has(input.parameterId),
			),
		];

		// Validate all parameters
		for (const param of nextStepDef.parameters) {
			const validation = validateStepParameter(nextStepDef.stepNumber, param);
			if (!validation.valid) {
				return NextResponse.json(
					{
						success: false,
						error: validation.error,
					} as ContinueComplexWorkflowResponse,
					{ status: 400 },
				);
			}
		}

		// Execute next step via existing execute API
		const executeResponse = await fetch(
			`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workspace/execute`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId: nextStepDef.workflowId,
					sourceWorkflowId: sourceWorkflowId, // Use correct RunningHub ID
					workflowName: nextStepDef.workflowName,
					fileInputs: mergedFileInputs,
					textInputs: mergedTextInputs,
					folderPath: "",
					deleteSourceFiles: deleteSourceFiles,
				}),
			},
		);

		const executeData = await executeResponse.json();

		if (!executeData.success) {
			return NextResponse.json(
				{
					success: false,
					error: executeData.error || "Failed to execute next step",
				} as ContinueComplexWorkflowResponse,
				{ status: 500 },
			);
		}

		// Update execution state
		const executionFile = path.join(executionDir, "execution.json");

		const stepInputs = {
			fileInputs: mergedFileInputs,
			textInputs: mergedTextInputs,
			deleteSourceFiles,
		};

		const updatedSteps = normalizedExecution.steps.map((step) => {
			if (step.stepNumber === body.stepNumber + 1) {
				return {
					...step,
					jobId: executeData.jobId,
					status: "running",
					inputs: stepInputs,
					startedAt: Date.now(),
				};
			}
			return step;
		});

		const updatedExecution = {
			...normalizedExecution,
			currentStep: body.stepNumber + 1,
			status: "running" as const,
			steps: updatedSteps,
		};

		await fs.writeFile(
			executionFile,
			JSON.stringify(updatedExecution, null, 2),
		);

		return NextResponse.json({
			success: true,
			jobId: executeData.jobId,
			message: `Step ${body.stepNumber + 1} started`,
		} as ContinueComplexWorkflowResponse);
	} catch (error) {
		console.error("Continue complex workflow error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to continue complex workflow",
			} as ContinueComplexWorkflowResponse,
			{ status: 500 },
		);
	}
}
