/**
 * Import Workflow JSON API
 * Parses local workflow JSON files and converts them to Workflow format
 * Returns detected nodes for user selection before creating the workflow
 */

import { NextRequest, NextResponse } from "next/server";
import type { Workflow, WorkflowInputParameter } from "@/types/workspace";

/**
 * Detected node structure for user selection
 */
interface DetectedNode {
	id: string;
	name: string;
	inputCount: number;
	inputType: "image" | "video" | "text" | "number" | "mixed" | "unknown";
	description: string;
	inputs: Array<{
		name: string;
		type: string;
		value: any;
	}>;
}

export async function POST(request: NextRequest) {
	try {
		const { jsonContent, workflowName, workflowId, selectedNodes } =
			await request.json();

		if (!jsonContent) {
			return NextResponse.json(
				{
					success: false,
					error: "JSON content is required",
				},
				{ status: 400 },
			);
		}

		// Parse JSON content
		let jsonContentParsed: any;
		try {
			jsonContentParsed = JSON.parse(jsonContent);
		} catch (parseError) {
			return NextResponse.json(
				{
					success: false,
					error: `Invalid JSON: ${parseError instanceof Error ? parseError.message : "Parse error"}`,
				},
				{ status: 400 },
			);
		}

		// If selectedNodes is provided, convert only selected nodes
		// Otherwise, return detected nodes for selection
		const allNodes = detectNodes(jsonContentParsed);

		if (selectedNodes === undefined || selectedNodes === null) {
			// First pass: return detected nodes for user selection
			return NextResponse.json({
				success: true,
				nodes: allNodes,
				requiresSelection: true,
			});
		}

		// Second pass: user has selected nodes, create workflow with only selected ones
		const parameters = convertSelectedNodesToParameters(
			jsonContentParsed,
			selectedNodes,
			allNodes,
		);

		if (parameters.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error:
						'No valid parameters found in selected nodes. Ensure the JSON has the correct structure: { "nodeId": { "inputs": { ... } } }',
				},
				{ status: 400 },
			);
		}

		// Generate workflow object
		const workflow: Workflow = {
			id:
				workflowId ||
				`workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			name: workflowName || "Imported Workflow",
			description: `Workflow imported from local JSON file with ${parameters.length} parameters from ${selectedNodes.length} node${selectedNodes.length !== 1 ? "s" : ""}`,
			inputs: parameters,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			sourceType: "local",
			executionType: "workflow",
		};

		return NextResponse.json({
			success: true,
			workflow,
		});
	} catch (error) {
		console.error("Import workflow JSON error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Import failed",
			},
			{ status: 500 },
		);
	}
}

/**
 * Detect nodes from JSON that have user-configurable inputs
 * Returns array of nodes with metadata for user selection
 *
 * Supports multiple JSON structures:
 * 1. { "nodeId": { "inputs": { "fieldName": "value" } } }
 * 2. { "nodeId": { "class_type": "...", "inputs": { ... } } }
 * 3. { "key": value } - treat each key-value pair as a node
 */
function detectNodes(jsonContent: any): DetectedNode[] {
	const detectedNodes: DetectedNode[] = [];

	// Debug logging
	console.log("[import-json] Raw JSON content type:", typeof jsonContent);
	console.log("[import-json] Raw JSON keys:", Object.keys(jsonContent || {}));

	if (typeof jsonContent !== "object" || jsonContent === null) {
		return detectedNodes;
	}

	for (const [key, value] of Object.entries(jsonContent)) {
		// Skip if value is null or not an object
		if (!value || typeof value !== "object") {
			continue;
		}

		// Skip if value is an array (likely a list of something, not a node)
		if (Array.isArray(value)) {
			continue;
		}

		const valueObj = value as any;
		let inputs: Record<string, any> | null = null;
		const nodeId = key;

		// Case 1: value has "inputs" property (ComfyUI/RunningHub format)
		if (valueObj.inputs && typeof valueObj.inputs === "object") {
			inputs = valueObj.inputs;
		}
		// Case 2: value itself is the inputs object (simplified format)
		else if (Object.keys(valueObj).length > 0) {
			inputs = valueObj;
		}

		if (!inputs) {
			continue;
		}

		const inputEntries = Object.entries(inputs);

		// Count array vs non-array inputs
		const arrayCount = inputEntries.filter(([, v]) => Array.isArray(v)).length;
		const totalCount = inputEntries.length;

		console.log(
			`[import-json] Node "${key}": total=${totalCount}, arrays=${arrayCount}`,
		);

		// Skip if more than half of the inputs are arrays (node references) - these are processing nodes
		if (totalCount > 0 && arrayCount > totalCount / 2) {
			console.log(
				`[import-json] Skipping node "${key}" - too many array inputs (processing node)`,
			);
			continue;
		}

		// Get non-array inputs (actual user inputs)
		const userInputs = inputEntries.filter(
			([, v]) => !Array.isArray(v) && v !== null && v !== undefined && v !== "",
		);

		console.log(`[import-json] Node "${key}" userInputs:`, userInputs.length);

		if (userInputs.length === 0) {
			continue;
		}

		// Detect input type
		let inputType: DetectedNode["inputType"] = "unknown";
		const hasImage = userInputs.some(
			([name, v]) =>
				name.toLowerCase().includes("image") ||
				(typeof v === "string" &&
					/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(v)),
		);
		const hasVideo = userInputs.some(
			([name, v]) =>
				name.toLowerCase().includes("video") ||
				(typeof v === "string" && /\.(mp4|mov|avi|mkv|webm|flv)$/i.test(v)),
		);
		const hasNumber = userInputs.some(([, v]) => typeof v === "number");
		const hasText = userInputs.some(
			([, v]) => typeof v === "string" && !hasImage && !hasVideo,
		);

		if (hasImage && hasVideo) {
			inputType = "mixed";
		} else if (hasImage) {
			inputType = "image";
		} else if (hasVideo) {
			inputType = "video";
		} else if (hasNumber) {
			inputType = "number";
		} else if (hasText) {
			inputType = "text";
		}

		detectedNodes.push({
			id: nodeId,
			name: valueObj.class_type || nodeId,
			inputCount: userInputs.length,
			inputType,
			description: `${userInputs.length} input${userInputs.length !== 1 ? "s" : ""} (${inputType})`,
			inputs: userInputs.map(([name, v]) => ({
				name,
				type: typeof v,
				value: v,
			})),
		});
	}

	console.log(`[import-json] Total detected nodes:`, detectedNodes.length);
	return detectedNodes;
}

/**
 * Convert selected nodes to WorkflowInputParameter array
 */
function convertSelectedNodesToParameters(
	jsonContent: any,
	selectedNodeIds: string[],
	allNodes: DetectedNode[],
): WorkflowInputParameter[] {
	const parameters: WorkflowInputParameter[] = [];

	console.log("[import-json] Converting nodes:", selectedNodeIds);

	if (typeof jsonContent !== "object" || jsonContent === null) {
		return parameters;
	}

	for (const nodeId of selectedNodeIds) {
		const nodeData = jsonContent[nodeId];
		if (!nodeData || typeof nodeData !== "object" || Array.isArray(nodeData)) {
			console.log(`[import-json] Skipping node "${nodeId}" - invalid data`);
			continue;
		}

		const valueObj = nodeData as any;
		let inputs: Record<string, any> | null = null;

		// Case 1: node has "inputs" property
		if (valueObj.inputs && typeof valueObj.inputs === "object") {
			inputs = valueObj.inputs;
		}
		// Case 2: node itself is the inputs object
		else if (Object.keys(valueObj).length > 0) {
			inputs = valueObj;
		}

		if (!inputs) {
			continue;
		}

		// Get node info for description
		const nodeInfo = allNodes.find((n) => n.id === nodeId);

		for (const [fieldName, fieldValue] of Object.entries(inputs)) {
			// Skip array values - these are node references, not user inputs
			if (Array.isArray(fieldValue)) {
				continue;
			}

			// Skip null/undefined/empty values
			if (
				fieldValue === null ||
				fieldValue === undefined ||
				fieldValue === ""
			) {
				continue;
			}

			// Skip widget label/description fields (ComfyUI convention)
			// These are fields like "choose video file to upload": "Video" that describe the input type
			const lowerFieldName = fieldName.toLowerCase();
			if (
				lowerFieldName.includes("choose") ||
				lowerFieldName.includes("select") ||
				lowerFieldName.includes("upload")
			) {
				const upperFieldValue = String(fieldValue).toUpperCase();
				// If the value is a simple type indicator (VIDEO, IMAGE, STRING, INT, etc.), skip it
				if (
					[
						"VIDEO",
						"IMAGE",
						"AUDIO",
						"STRING",
						"INT",
						"FLOAT",
						"BOOL",
						"BOOLEAN",
					].includes(upperFieldValue)
				) {
					continue;
				}
			}

			const paramType = detectParameterType(fieldName, fieldValue);
			const mediaType =
				paramType === "file"
					? detectMediaType(fieldName, String(fieldValue))
					: undefined;

			// Create unique parameter ID
			const uniqueParamId = `${nodeId}_${fieldName}`;

			parameters.push({
				id: `param_${uniqueParamId}`,
				name: fieldName,
				type: paramType,
				required: false,
				description: nodeInfo
					? `Parameter from node ${nodeId}`
					: `Parameter from node ${nodeId}`,
				validation:
					paramType === "file"
						? {
								mediaType,
								fileType: mediaType ? [`${mediaType}/*`] : undefined,
							}
						: undefined,
			});
		}
	}

	console.log(`[import-json] Generated ${parameters.length} parameters`);
	return parameters;
}

/**
 * Detect parameter type from field name and value
 */
function detectParameterType(
	fieldName: string,
	fieldValue: any,
): "text" | "file" | "number" | "boolean" {
	// File detection by field name
	const lowerField = fieldName.toLowerCase();
	if (
		lowerField.includes("image") ||
		lowerField.includes("video") ||
		lowerField.includes("audio") ||
		lowerField.includes("file")
	) {
		return "file";
	}

	// Number detection
	if (typeof fieldValue === "number") {
		return "number";
	}

	// Boolean detection
	if (typeof fieldValue === "boolean") {
		return "boolean";
	}

	// Default to text
	return "text";
}

/**
 * Detect media type for file parameters
 */
function detectMediaType(
	fieldName: string,
	fieldValue: string,
): "image" | "video" | undefined {
	const lowerField = fieldName.toLowerCase();
	const lowerValue = fieldValue.toLowerCase();

	// Image detection
	if (
		lowerField.includes("image") ||
		lowerValue.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)
	) {
		return "image";
	}

	// Video detection
	if (
		lowerField.includes("video") ||
		lowerValue.match(/\.(mp4|mov|avi|mkv|webm|flv)$/i)
	) {
		return "video";
	}

	return undefined;
}
