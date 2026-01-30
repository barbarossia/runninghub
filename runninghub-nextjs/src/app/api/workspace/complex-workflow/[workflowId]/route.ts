/**
 * Get Complex Workflow API
 * Returns a single complex workflow by ID
 */

import { NextRequest, NextResponse } from "next/server";
import {
	loadComplexWorkflow,
	updateComplexWorkflow,
} from "@/lib/complex-workflow-utils";
import type { ComplexWorkflow } from "@/types/workspace";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ workflowId: string }> },
) {
	try {
		const { workflowId } = await params;

		const workflow = await loadComplexWorkflow(workflowId);

		if (!workflow) {
			return NextResponse.json(
				{
					success: false,
					error: `Complex workflow ${workflowId} not found`,
				},
				{ status: 404 },
			);
		}

		return NextResponse.json({
			success: true,
			workflow,
		});
	} catch (error) {
		console.error("Get complex workflow error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to get complex workflow",
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ workflowId: string }> },
) {
	try {
		const { workflowId } = await params;
		const fs = await import("fs/promises");
		const path = await import("path");

		const workflowDir = path.join(
			process.env.HOME || "~",
			"Downloads",
			"workspace",
			"complex-workflows",
		);

		const filePath = path.join(workflowDir, `${workflowId}.json`);

		await fs.unlink(filePath);

		return NextResponse.json({
			success: true,
			message: "Complex workflow deleted",
		});
	} catch (error) {
		console.error("Delete complex workflow error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to delete complex workflow",
			},
			{ status: 500 },
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ workflowId: string }> },
) {
	try {
		const { workflowId } = await params;
		const body = await request.json();
		const workflow = body?.workflow as ComplexWorkflow | undefined;

		if (!workflow) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing workflow payload",
				},
				{ status: 400 },
			);
		}

		if (workflow.id && workflow.id !== workflowId) {
			return NextResponse.json(
				{
					success: false,
					error: "Workflow ID mismatch",
				},
				{ status: 400 },
			);
		}

		const updatedId = await updateComplexWorkflow({
			...workflow,
			id: workflowId,
		});

		return NextResponse.json({
			success: true,
			workflowId: updatedId,
		});
	} catch (error) {
		console.error("Update complex workflow error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to update complex workflow",
			},
			{ status: 500 },
		);
	}
}
