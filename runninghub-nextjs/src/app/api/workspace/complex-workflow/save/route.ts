/**
 * Save Complex Workflow API
 * Creates or updates a complex workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { saveComplexWorkflow } from "@/lib/complex-workflow-utils";
import type {
	SaveComplexWorkflowRequest,
	SaveComplexWorkflowResponse,
} from "@/types/workspace";

export async function POST(request: NextRequest) {
	try {
		const body: SaveComplexWorkflowRequest = await request.json();

		// Validate request
		if (
			!body.workflow ||
			!body.workflow.name ||
			!body.workflow.steps ||
			body.workflow.steps.length === 0
		) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid complex workflow data",
				} as SaveComplexWorkflowResponse,
				{ status: 400 },
			);
		}

		// Validate steps
		const steps = body.workflow.steps;
		for (let i = 0; i < steps.length; i++) {
			const step = steps[i];
			if (!step.workflowId || !step.workflowName || !step.stepNumber) {
				return NextResponse.json(
					{
						success: false,
						error: `Step ${i + 1} is missing required fields (workflowId, workflowName, stepNumber)`,
					} as SaveComplexWorkflowResponse,
					{ status: 400 },
				);
			}

			if (step.stepNumber !== i + 1) {
				return NextResponse.json(
					{
						success: false,
						error: `Step ${i + 1} has invalid step number (should be ${i + 1})`,
					} as SaveComplexWorkflowResponse,
					{ status: 400 },
				);
			}
		}

		// Validate parameters
		for (const step of steps) {
			for (const param of step.parameters) {
				if (!param.parameterId || !param.parameterName || !param.valueType) {
					return NextResponse.json(
						{
							success: false,
							error: `Invalid parameter config in step ${step.stepNumber}`,
						} as SaveComplexWorkflowResponse,
						{ status: 400 },
					);
				}

				if (param.valueType === "dynamic" && !param.dynamicMapping) {
					return NextResponse.json(
						{
							success: false,
							error: `Dynamic parameter ${param.parameterId} missing mapping configuration`,
						} as SaveComplexWorkflowResponse,
						{ status: 400 },
					);
				}

				if (param.valueType === "static" && param.staticValue === undefined) {
					return NextResponse.json(
						{
							success: false,
							error: `Static parameter ${param.parameterId} is missing value`,
						} as SaveComplexWorkflowResponse,
						{ status: 400 },
					);
				}
			}
		}

		// Save complex workflow
		const workflowId = await saveComplexWorkflow(body.workflow);

		return NextResponse.json({
			success: true,
			workflowId,
		} as SaveComplexWorkflowResponse);
	} catch (error) {
		console.error("Save complex workflow error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to save complex workflow",
			} as SaveComplexWorkflowResponse,
			{ status: 500 },
		);
	}
}
