import { LOCAL_OPS_DEFINITIONS } from '@/constants/local-ops';
import type {
	LocalWorkflow,
	LocalWorkflowOperationType,
	Workflow,
	WorkflowInputParameter,
} from '@/types/workspace';

const getLocalWorkflowMediaType = (
	operation?: LocalWorkflowOperationType,
): 'image' | 'video' => {
	return operation?.startsWith('video-') ? 'video' : 'image';
};

const mapLocalInputType = (
	type: string,
): WorkflowInputParameter['type'] => {
	switch (type) {
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'select':
			return 'select';
		case 'file':
			return 'file';
		default:
			return 'text';
	}
};

export const mapLocalWorkflowToWorkflow = (
	workflow: LocalWorkflow,
): Workflow => {
	const operation = workflow.inputs?.[0]?.operation || 'video-convert';
	const config = workflow.inputs?.[0]?.config || {};
	const mediaType = getLocalWorkflowMediaType(operation);
	const opDefinition = LOCAL_OPS_DEFINITIONS[operation];

	const fileInput: WorkflowInputParameter = {
		id: `${workflow.id}_file`,
		name: 'Input File',
		type: 'file',
		required: true,
		validation: {
			mediaType,
		},
	};

	const configInputs: WorkflowInputParameter[] =
		opDefinition?.inputs?.map((input) => {
			const hasConfigValue = Object.prototype.hasOwnProperty.call(
				config,
				input.name,
			);
			const defaultValue = hasConfigValue ? config[input.name] : input.defaultValue;
			const validation =
				input.min !== undefined || input.max !== undefined
					? { min: input.min, max: input.max }
					: undefined;

			return {
				id: `${workflow.id}_${input.name}`,
				name: input.label,
				type: mapLocalInputType(input.type),
				required: input.required ?? false,
				defaultValue,
				description: input.description,
				placeholder: input.placeholder,
				validation,
				options: input.options,
				configKey: input.name,
			};
		}) ?? [];

	return {
		id: workflow.id,
		name: workflow.name,
		description: workflow.description || `Local ${operation} workflow`,
		inputs: [fileInput, ...configInputs],
		createdAt: workflow.createdAt,
		updatedAt: workflow.updatedAt,
		sourceType: 'local',
		localOperation: operation,
		localConfig: config,
	};
};
