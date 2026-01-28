import { NextResponse } from "next/server";
import { listBatchProcessTemplates } from "@/lib/batch-process-utils";
import type { ListBatchProcessTemplateResponse } from "@/types/workspace";

export async function GET() {
	try {
		const templates = await listBatchProcessTemplates();
		return NextResponse.json({
			success: true,
			templates,
		} as ListBatchProcessTemplateResponse);
	} catch (error) {
		console.error("Failed to list batch process templates:", error);
		return NextResponse.json(
			{ success: false, templates: [], error: "Failed to load templates" },
			{ status: 500 },
		);
	}
}
