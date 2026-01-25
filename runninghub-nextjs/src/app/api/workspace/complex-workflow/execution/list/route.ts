/**
 * List Complex Workflow Executions API
 * Returns a list of all complex workflow executions
 */

import { NextResponse } from "next/server";
import { listComplexExecutions } from "@/lib/complex-workflow-utils";

export async function GET() {
	try {
		const executions = await listComplexExecutions();

		return NextResponse.json({
			success: true,
			executions,
		});
	} catch (error) {
		console.error("List executions error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to list executions",
			},
			{ status: 500 },
		);
	}
}
