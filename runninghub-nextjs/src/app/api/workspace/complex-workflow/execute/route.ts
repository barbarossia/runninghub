/**
 * Execute Complex Workflow API
 * Starts a new complex workflow execution
 */

import { NextRequest, NextResponse } from "next/server";
import {
	saveComplexWorkflowExecution,
	ensureExecutionIdentity,
	getExecutionCreatedAtFromId,
} from "@/lib/complex-workflow-utils";
import { mapLocalWorkflowToWorkflow } from "@/lib/local-workflow-mapper";
import type {
	ExecuteComplexWorkflowRequest,
	ExecuteComplexWorkflowResponse,
	ComplexWorkflow,
	WorkflowStep,
	ComplexWorkflowExecution,
	Workflow,
	LocalWorkflow,
} from "@/types/workspace";

const EXECUTION_DIR = process.env.HOME
	? `${process.env.HOME}/Downloads/workspace/complex-executions`
	: "~/Downloads/workspace/complex-executions";

type LoadedWorkflowDefinition = {
	workflow: Workflow;
	sourceWorkflowId: string;
	isLocal: boolean;
};

async function loadWorkflowDefinition(
	workflowId: string,
): Promise<LoadedWorkflowDefinition> {
	const fs = await import("fs/promises");
	const path = await import("path");

	if (workflowId.startsWith("local_")) {
		const localWorkflowPath = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
			"local-workflows",
			`${workflowId}.json`,
		);
		const localWorkflowContent = await fs.readFile(
			localWorkflowPath,
			"utf-8",
		);
		const localWorkflow = JSON.parse(localWorkflowContent) as LocalWorkflow;
		return {
			workflow: mapLocalWorkflowToWorkflow(localWorkflow),
			sourceWorkflowId: "",
			isLocal: true,
		};
	}

	const workflowPath = path.join(
		process.env.HOME || "~",
		"Downloads",
		"workspace",
		"workflows",
		`${workflowId}.json`,
	);
	const workflowContent = await fs.readFile(workflowPath, "utf-8");
	const workflow = JSON.parse(workflowContent) as Workflow;
	return {
		workflow,
		sourceWorkflowId: workflow.sourceWorkflowId || "",
		isLocal: false,
	};
}

export async function POST(request: NextRequest) {
	try {
		const body: ExecuteComplexWorkflowRequest = await request.json();

		// Validate request
		if (!body.complexWorkflowId) {
			return NextResponse.json(
				{
					success: false,
					error: "Complex workflow ID is required",
				} as ExecuteComplexWorkflowResponse,
				{ status: 400 },
			);
		}

		const fs = await import("fs/promises");
		const path = await import("path");

		// Load complex workflow
		const workflowPath = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
			"complex-workflows",
			`${body.complexWorkflowId}.json`,
		);

		const workflowContent = await fs.readFile(workflowPath, "utf-8");
		const complexWorkflow = JSON.parse(workflowContent) as ComplexWorkflow;

		// Validate initial parameters against first step
		const firstStep = complexWorkflow.steps.find(
			(s: WorkflowStep) => s.stepNumber === 1,
		);
		if (!firstStep) {
			return NextResponse.json(
				{
					success: false,
					error: "Complex workflow has no first step",
				} as ExecuteComplexWorkflowResponse,
				{ status: 400 },
			);
		}

		let sourceWorkflowId = "";
		let firstWorkflow: LoadedWorkflowDefinition | null = null;
		try {
			firstWorkflow = await loadWorkflowDefinition(firstStep.workflowId);
			sourceWorkflowId = firstWorkflow.sourceWorkflowId;
		} catch (e) {
			console.error(`Failed to load workflow ${firstStep.workflowId}:`, e);
			return NextResponse.json(
				{
					success: false,
					error: `Failed to load workflow definition for step 1: ${firstStep.workflowId}`,
				} as ExecuteComplexWorkflowResponse,
				{ status: 500 },
			);
		}

		// Prepare inputs for first step
		const initialParams = body.initialParameters || {};
		const fileInputs = initialParams.fileInputs || [];
		const textInputs = initialParams.textInputs || {};
		const deleteSourceFiles = initialParams.deleteSourceFiles || false;
		const getLocalParamValue = (key: string) =>
			textInputs[`${firstStep.workflowId}_${key}`] ??
			firstWorkflow?.workflow?.localConfig?.[key];
		const isLocalVideoConvert =
			firstWorkflow?.isLocal &&
			firstWorkflow.workflow?.localOperation === "video-convert";
		const deleteOriginal = getLocalParamValue("deleteOriginal");
		const resolvedDeleteSourceFiles =
			deleteSourceFiles || (isLocalVideoConvert && String(deleteOriginal) === "true");

		// Create execution state
		const execution: Omit<ComplexWorkflowExecution, "id" | "createdAt"> = {
			complexWorkflowId: body.complexWorkflowId,
			name: complexWorkflow.name,
			status: "pending",
			currentStep: 1,
			autoContinue: body.autoContinue ?? false,
			steps: complexWorkflow.steps.map((step, idx) => ({
				stepNumber: step.stepNumber,
				workflowId: step.workflowId,
				jobId: "",
				status: "pending",
				inputs:
					idx === 0
						? { fileInputs, textInputs, deleteSourceFiles: resolvedDeleteSourceFiles }
						: { fileInputs: [], textInputs: {}, deleteSourceFiles: false },
				startedAt: undefined,
				completedAt: undefined,
			})),
		};

		// Save execution state
		const executionId = await saveComplexWorkflowExecution(execution);

		// Execute first step via existing execute API
		const executeResponse = await fetch(
			`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workspace/execute`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId: firstStep.workflowId,
					sourceWorkflowId: sourceWorkflowId, // Use correct RunningHub ID
					workflowName: firstStep.workflowName,
					fileInputs: fileInputs,
					textInputs: textInputs,
					folderPath: "",
					deleteSourceFiles: resolvedDeleteSourceFiles,
					seriesId: executionId, // Identify as part of complex workflow
				}),
			},
		);

		const executeData = await executeResponse.json();

		if (!executeData.success) {
			return NextResponse.json(
				{
					success: false,
					error: executeData.error || "Failed to execute first step",
				} as ExecuteComplexWorkflowResponse,
				{ status: 500 },
			);
		}

		// Update execution state with first step job ID
		const executionDir = path.join(EXECUTION_DIR, executionId);
		const executionFile = path.join(executionDir, "execution.json");

		const baseExecution: ComplexWorkflowExecution = ensureExecutionIdentity(
			{
				...execution,
				id: executionId,
				createdAt: getExecutionCreatedAtFromId(executionId) ?? Date.now(),
			},
			executionId,
		);

		const updatedExecution = {
			...baseExecution,
			steps: baseExecution.steps,
			status: "running" as const,
		};
		updatedExecution.steps[0] = {
			...updatedExecution.steps[0],
			jobId: executeData.jobId,
			status: "running",
			startedAt: Date.now(),
		};

		await fs.writeFile(
			executionFile,
			JSON.stringify(updatedExecution, null, 2),
		);

		return NextResponse.json({
			success: true,
			executionId,
			jobId: executeData.jobId, // Return the first step's job ID
			message: "Complex workflow execution started",
		} as ExecuteComplexWorkflowResponse);
	} catch (error) {
		console.error("Execute complex workflow error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to execute complex workflow",
			} as ExecuteComplexWorkflowResponse,
			{ status: 500 },
		);
	}
}
