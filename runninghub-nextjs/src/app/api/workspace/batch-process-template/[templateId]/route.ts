import { NextRequest, NextResponse } from "next/server";
import {
	deleteBatchProcessTemplate,
	loadBatchProcessTemplate,
} from "@/lib/batch-process-utils";
import type { GetBatchProcessTemplateResponse } from "@/types/workspace";

interface RouteParams {
	params: { templateId: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const template = await loadBatchProcessTemplate(params.templateId);

		if (!template) {
			return NextResponse.json(
				{ success: false, error: "Template not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			success: true,
			template,
		} as GetBatchProcessTemplateResponse);
	} catch (error) {
		console.error("Failed to load batch process template:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to load template" },
			{ status: 500 },
		);
	}
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	try {
		const deleted = await deleteBatchProcessTemplate(params.templateId);

		if (!deleted) {
			return NextResponse.json(
				{ success: false, error: "Failed to delete template" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to delete batch process template:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to delete template" },
			{ status: 500 },
		);
	}
}
