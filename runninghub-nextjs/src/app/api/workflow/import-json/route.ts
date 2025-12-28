/**
 * Import Workflow JSON API
 * Parses local workflow JSON files and converts them to Workflow format
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Workflow, WorkflowInputParameter } from '@/types/workspace';

export async function POST(request: NextRequest) {
  try {
    const { jsonContent, workflowName, workflowId } = await request.json();

    if (!jsonContent) {
      return NextResponse.json({
        success: false,
        error: 'JSON content is required',
      }, { status: 400 });
    }

    // Parse JSON content
    let jsonContentParsed: any;
    try {
      jsonContentParsed = JSON.parse(jsonContent);
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: `Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
      }, { status: 400 });
    }

    // Convert JSON nodes to WorkflowInputParameter[]
    const parameters = convertJsonToParameters(jsonContentParsed);

    if (parameters.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid parameters found in JSON. Ensure the JSON has the correct structure: { "nodeId": { "inputs": { ... } } }',
      }, { status: 400 });
    }

    // Generate workflow object
    const workflow: Workflow = {
      id: workflowId || `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: workflowName || 'Imported Workflow',
      description: `Workflow imported from local JSON file with ${parameters.length} parameters`,
      inputs: parameters,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceType: 'local',
      executionType: 'workflow', // Imported workflows use workflow API endpoint
    };

    return NextResponse.json({
      success: true,
      workflow,
    });

  } catch (error) {
    console.error('Import workflow JSON error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Import failed',
    }, { status: 500 });
  }
}

/**
 * Detect parameter type from field name and value
 */
function detectParameterType(fieldName: string, fieldValue: any): 'text' | 'file' | 'number' | 'boolean' {
  // File detection by field name
  const lowerField = fieldName.toLowerCase();
  if (lowerField.includes('image') ||
      lowerField.includes('video') ||
      lowerField.includes('audio') ||
      lowerField.includes('file')) {
    return 'file';
  }

  // Number detection
  if (typeof fieldValue === 'number') {
    return 'number';
  }

  // Boolean detection
  if (typeof fieldValue === 'boolean') {
    return 'boolean';
  }

  // Default to text
  return 'text';
}

/**
 * Detect media type for file parameters
 */
function detectMediaType(fieldName: string, fieldValue: string): 'image' | 'video' | undefined {
  const lowerField = fieldName.toLowerCase();
  const lowerValue = fieldValue.toLowerCase();

  // Image detection
  if (lowerField.includes('image') ||
      lowerValue.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)) {
    return 'image';
  }

  // Video detection
  if (lowerField.includes('video') ||
      lowerValue.match(/\.(mp4|mov|avi|mkv|webm|flv)$/i)) {
    return 'video';
  }

  return undefined;
}

/**
 * Convert JSON structure to WorkflowInputParameter array
 */
function convertJsonToParameters(jsonContent: any): WorkflowInputParameter[] {
  const parameters: WorkflowInputParameter[] = [];

  // Expected structure: { "nodeId": { "inputs": { "fieldName": "value" } } }
  if (typeof jsonContent !== 'object' || jsonContent === null) {
    return parameters;
  }

  for (const [nodeId, nodeData] of Object.entries(jsonContent)) {
    // Validate node structure
    if (!nodeData || typeof nodeData !== 'object') {
      continue;
    }

    const inputs = (nodeData as any).inputs;
    if (!inputs || typeof inputs !== 'object') {
      continue;
    }

    // Skip nodes that are primarily middle/processing nodes
    // If most inputs are arrays (node references), skip this node
    const inputEntries = Object.entries(inputs);
    const arrayCount = inputEntries.filter(([, value]) => Array.isArray(value)).length;
    const totalCount = inputEntries.length;

    // Skip if more than half of the inputs are arrays (node references)
    if (totalCount > 0 && arrayCount > totalCount / 2) {
      continue;
    }

    // Process each input field
    for (const [fieldName, fieldValue] of Object.entries(inputs)) {
      // Skip array values - these are node references, not user inputs
      // Example: ["63", 0] means reference to node 63, output index 0
      if (Array.isArray(fieldValue)) {
        continue;
      }

      // Skip null values
      if (fieldValue === null || fieldValue === undefined) {
        continue;
      }

      // Skip empty strings - these are placeholder values, not actual user inputs
      if (fieldValue === '') {
        continue;
      }

      const paramType = detectParameterType(fieldName, fieldValue);
      const mediaType = paramType === 'file' ? detectMediaType(fieldName, String(fieldValue)) : undefined;

      // Create unique parameter ID by combining nodeId and fieldName
      // This ensures uniqueness when a node has multiple inputs
      const uniqueParamId = `${nodeId}_${fieldName}`;

      parameters.push({
        id: `param_${uniqueParamId}`,
        name: fieldName,
        type: paramType,
        required: false,  // Default to optional for imported workflows
        description: `Parameter from node ${nodeId}`,
        validation: paramType === 'file' ? {
          mediaType,
          fileType: mediaType ? [`${mediaType}/*`] : undefined,
        } : undefined,
      });
    }
  }

  return parameters;
}
