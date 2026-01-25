/**
 * Stop Complex Workflow Execution API
 * Stops a running complex workflow execution
 */

import { NextRequest, NextResponse } from "next/server";
import { loadComplexWorkflowExecution } from "@/lib/complex-workflow-utils";

export async function POST(
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
				},
				{ status: 404 },
			);
		}

		if (execution.status !== "running") {
			return NextResponse.json(
				{
					success: false,
					error: `Execution is not running (status: ${execution.status})`,
				},
				{ status: 400 },
			);
		}

		const fs = await import("fs/promises");
		const path = await import("path");

		const EXECUTION_DIR = process.env.HOME
			? `${process.env.HOME}/Downloads/workspace/complex-executions`
			: "~/Downloads/workspace/complex-executions";

		const executionDir = path.join(EXECUTION_DIR, executionId);
		const executionFile = path.join(executionDir, "execution.json");

		const updatedExecution = {
			...execution,
			status: "paused",
		};

		await fs.writeFile(
			executionFile,
			JSON.stringify(updatedExecution, null, 2),
		);

		return NextResponse.json({
			success: true,
			message: "Execution paused",
		});
	} catch (error) {
		console.error("Stop execution error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to stop execution",
			},
			{ status: 500 },
		);
	}
}
