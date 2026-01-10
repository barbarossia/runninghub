/**
 * Import Workflow JSON API
 * Parses local workflow JSON files and converts them to Workflow format
 * Returns detected nodes for user selection before creating the workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Workflow, WorkflowInputParameter } from '@/types/workspace';

/**
 * Detected node structure for user selection
 */
interface DetectedNode {
  id: string;
  name: string;
  inputCount: number;
  inputType: 'image' | 'video' | 'text' | 'number' | 'mixed' | 'unknown';
  description: string;
  inputs: Array<{
    name: string;
    type: string;
    value: any;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { jsonContent, workflowName, workflowId, selectedNodes } = await request.json();

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
    const parameters = convertSelectedNodesToParameters(jsonContentParsed, selectedNodes, allNodes);

    if (parameters.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid parameters found in selected nodes. Ensure the JSON has the correct structure: { "nodeId": { "inputs": { ... } } }',
      }, { status: 400 });
    }

    // Generate workflow object
    const workflow: Workflow = {
      id: workflowId || `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: workflowName || 'Imported Workflow',
      description: `Workflow imported from local JSON file with ${parameters.length} parameters from ${selectedNodes.length} node${selectedNodes.length !== 1 ? 's' : ''}`,
      inputs: parameters,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceType: 'local',
      executionType: 'workflow',
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
 * Detect nodes from JSON that have user-configurable inputs
 * Returns array of nodes with metadata for user selection
 */
function detectNodes(jsonContent: any): DetectedNode[] {
  const detectedNodes: DetectedNode[] = [];

  if (typeof jsonContent !== 'object' || jsonContent === null) {
    return detectedNodes;
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

    const inputEntries = Object.entries(inputs);

    // Count array vs non-array inputs
    const arrayCount = inputEntries.filter(([, value]) => Array.isArray(value)).length;
    const totalCount = inputEntries.length;

    // Skip if more than half of the inputs are arrays (node references) - these are processing nodes
    if (totalCount > 0 && arrayCount > totalCount / 2) {
      continue;
    }

    // Get non-array inputs (actual user inputs)
    const userInputs = inputEntries.filter(([, value]) => !Array.isArray(value) && value !== null && value !== undefined && value !== '');

    if (userInputs.length === 0) {
      continue;
    }

    // Detect input type
    let inputType: DetectedNode['inputType'] = 'unknown';
    const hasImage = userInputs.some(([name, value]) =>
      name.toLowerCase().includes('image') ||
      (typeof value === 'string' && /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(value))
    );
    const hasVideo = userInputs.some(([name, value]) =>
      name.toLowerCase().includes('video') ||
      (typeof value === 'string' && /\.(mp4|mov|avi|mkv|webm|flv)$/i.test(value))
    );
    const hasNumber = userInputs.some(([, value]) => typeof value === 'number');
    const hasText = userInputs.some(([, value]) => typeof value === 'string' && !hasImage && !hasVideo);

    if (hasImage && hasVideo) {
      inputType = 'mixed';
    } else if (hasImage) {
      inputType = 'image';
    } else if (hasVideo) {
      inputType = 'video';
    } else if (hasNumber) {
      inputType = 'number';
    } else if (hasText) {
      inputType = 'text';
    }

    detectedNodes.push({
      id: nodeId,
      name: nodeId,
      inputCount: userInputs.length,
      inputType,
      description: `${userInputs.length} input${userInputs.length !== 1 ? 's' : ''} (${inputType})`,
      inputs: userInputs.map(([name, value]) => ({ name, type: typeof value, value })),
    });
  }

  return detectedNodes;
}

/**
 * Convert selected nodes to WorkflowInputParameter array
 */
function convertSelectedNodesToParameters(
  jsonContent: any,
  selectedNodeIds: string[],
  allNodes: DetectedNode[]
): WorkflowInputParameter[] {
  const parameters: WorkflowInputParameter[] = [];

  if (typeof jsonContent !== 'object' || jsonContent === null) {
    return parameters;
  }

  for (const nodeId of selectedNodeIds) {
    const nodeData = jsonContent[nodeId];
    if (!nodeData || typeof nodeData !== 'object') {
      continue;
    }

    const inputs = (nodeData as any).inputs;
    if (!inputs || typeof inputs !== 'object') {
      continue;
    }

    // Get node info for description
    const nodeInfo = allNodes.find(n => n.id === nodeId);

    for (const [fieldName, fieldValue] of Object.entries(inputs)) {
      // Skip array values - these are node references, not user inputs
      if (Array.isArray(fieldValue)) {
        continue;
      }

      // Skip null/undefined/empty values
      if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
        continue;
      }

      const paramType = detectParameterType(fieldName, fieldValue);
      const mediaType = paramType === 'file' ? detectMediaType(fieldName, String(fieldValue)) : undefined;

      // Create unique parameter ID
      const uniqueParamId = `${nodeId}_${fieldName}`;

      parameters.push({
        id: `param_${uniqueParamId}`,
        name: fieldName,
        type: paramType,
        required: false,
        description: nodeInfo ? `Parameter from node ${nodeId}` : `Parameter from node ${nodeId}`,
        validation: paramType === 'file' ? {
          mediaType,
          fileType: mediaType ? [`${mediaType}/*`] : undefined,
        } : undefined,
      });
    }
  }

  return parameters;
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
