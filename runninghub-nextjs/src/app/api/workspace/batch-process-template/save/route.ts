import { NextRequest, NextResponse } from "next/server";
import {
	saveBatchProcessTemplate,
	updateBatchProcessTemplate,
} from "@/lib/batch-process-utils";
import type {
	SaveBatchProcessTemplateRequest,
	SaveBatchProcessTemplateResponse,
} from "@/types/workspace";

export async function POST(request: NextRequest) {
	try {
		const body: SaveBatchProcessTemplateRequest = await request.json();

		if (!body.template?.name) {
			return NextResponse.json(
				{ success: false, error: "Template name is required" },
				{ status: 400 },
			);
		}

		if (!body.template.steps || body.template.steps.length === 0) {
			return NextResponse.json(
				{ success: false, error: "At least one step is required" },
				{ status: 400 },
			);
		}

		let templateId: string;
		if (body.template.id) {
			templateId = await updateBatchProcessTemplate(body.template);
		} else {
			const { id, createdAt, updatedAt, ...template } = body.template;
			templateId = await saveBatchProcessTemplate(template);
		}

		return NextResponse.json({
			success: true,
			templateId,
		} as SaveBatchProcessTemplateResponse);
	} catch (error) {
		console.error("Failed to save batch process template:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to save template" },
			{ status: 500 },
		);
	}
}
