/**
 * Get Complex Workflow Execution Status API
 * Returns the current state of a complex workflow execution
 */

import { NextRequest, NextResponse } from "next/server";
import {
	loadComplexWorkflowExecution,
	ensureExecutionIdentity,
} from "@/lib/complex-workflow-utils";
import type { GetComplexWorkflowExecutionResponse } from "@/types/workspace";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ executionId: string }> },
) {
	try {
		const { executionId } = await params;

		const execution = await loadComplexWorkflowExecution(executionId);

		if (!execution) {
			return NextResponse.json(
				{
					success: false,
					error: `Execution ${executionId} not found`,
				} as GetComplexWorkflowExecutionResponse,
				{ status: 404 },
			);
		}

		let normalizedExecution = ensureExecutionIdentity(execution, executionId);
		let needsUpdate = normalizedExecution !== execution;

		const fs = await import("fs/promises");
		const path = await import("path");
		const os = await import("os");
		const homeDir = os.homedir();

		const hasStructuredInputs = (inputs?: Record<string, any>) => {
			if (!inputs || typeof inputs !== "object") return false;
			return (
				"fileInputs" in inputs ||
				"textInputs" in inputs ||
				"deleteSourceFiles" in inputs
			);
		};

		const normalizeStepInputs = (inputs?: Record<string, any>, job?: any) => {
			const structured = hasStructuredInputs(inputs);
			const textInputs = structured ? inputs?.textInputs || {} : inputs || {};
			const fileInputs = structured
				? Array.isArray(inputs?.fileInputs)
					? inputs?.fileInputs
					: []
				: job?.fileInputs || [];
			const deleteSourceFiles =
				structured && typeof inputs?.deleteSourceFiles === "boolean"
					? inputs.deleteSourceFiles
					: (job?.deleteSourceFiles ?? false);

			return {
				fileInputs,
				textInputs,
				deleteSourceFiles,
			};
		};

		const steps = [...normalizedExecution.steps];

		for (let i = 0; i < steps.length; i += 1) {
			const step = steps[i];
			if (!step.jobId) continue;

			const needsOutputs =
				step.status === "completed" &&
				(!step.outputs || !step.outputs.textOutputs);
			const needsInputs = !hasStructuredInputs(step.inputs);

			if (!needsOutputs && !needsInputs && step.workflowName) {
				continue;
			}

			try {
				const jobDir = path.join(homeDir, "Downloads", "workspace", step.jobId);
				const jobFile = path.join(jobDir, "job.json");
				const jobContent = await fs.readFile(jobFile, "utf-8");
				const job = JSON.parse(jobContent);

				const nextInputs = normalizeStepInputs(step.inputs, job);
				const nextStep = { ...step };
				let stepChanged = false;

				if (needsInputs) {
					nextStep.inputs = nextInputs;
					stepChanged = true;
				}

				if (job.results && needsOutputs) {
					nextStep.outputs = step.outputs
						? {
								...job.results,
								...step.outputs,
								outputs: step.outputs.outputs || job.results.outputs,
								textOutputs:
									step.outputs.textOutputs || job.results.textOutputs,
							}
						: job.results;
					stepChanged = true;
				}

				if (!step.workflowName && job.workflowName) {
					nextStep.workflowName = job.workflowName;
					stepChanged = true;
				}

				if (stepChanged) {
					steps[i] = nextStep;
					needsUpdate = true;
				}
			} catch (e) {
				console.error(`Failed to backfill job data for ${step.jobId}:`, e);
			}
		}

		normalizedExecution = {
			...normalizedExecution,
			steps,
		};

		// Check status of current running step
		const currentStepIndex = normalizedExecution.currentStep - 1;

		if (
			currentStepIndex >= 0 &&
			currentStepIndex < normalizedExecution.steps.length
		) {
			const step = normalizedExecution.steps[currentStepIndex];

			if (step.status === "running" && step.jobId) {
				// Check job status
				try {
					const jobDir = path.join(
						homeDir,
						"Downloads",
						"workspace",
						step.jobId,
					);
					const jobFile = path.join(jobDir, "job.json");

					const jobContent = await fs.readFile(jobFile, "utf-8");
					const job = JSON.parse(jobContent);

					// If job status changed, update execution
					if (job.status === "completed" || job.status === "failed") {
						needsUpdate = true;
						// Update step
						normalizedExecution.steps[currentStepIndex] = {
							...step,
							status: job.status,
							completedAt: job.completedAt || Date.now(),
							outputs: job.results, // Save job results to step outputs
						};

						// Update overall execution status
						if (job.status === "failed") {
							normalizedExecution.status = "failed";
						} else if (
							normalizedExecution.currentStep ===
							normalizedExecution.steps.length
						) {
							// If this was the last step and it completed successfully
							normalizedExecution.status = "completed";
							normalizedExecution.completedAt = Date.now();
						} else {
							// Step completed, but more steps remain.
							// We'll mark the overall status as 'paused' or similar to indicate it's waiting for user 'Next'
							normalizedExecution.status = "paused";
						}
					} else if (
						job.status === "running" &&
						normalizedExecution.status !== "running"
					) {
						// Ensure top level status matches if job is running
						normalizedExecution.status = "running";
						needsUpdate = true;
					}
				} catch (e) {
					console.error(`Failed to check job status for ${step.jobId}:`, e);
				}
			}
		}

		// Save updated execution if changes were made
		if (needsUpdate) {
			const executionDir = path.join(
				homeDir,
				"Downloads",
				"workspace",
				"complex-executions",
				executionId,
			);
			await fs.writeFile(
				path.join(executionDir, "execution.json"),
				JSON.stringify(normalizedExecution, null, 2),
			);
		}

		return NextResponse.json({
			success: true,
			execution: normalizedExecution,
		} as GetComplexWorkflowExecutionResponse);
	} catch (error) {
		console.error("Get execution status error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to get execution status",
			} as GetComplexWorkflowExecutionResponse,
			{ status: 500 },
		);
	}
}
