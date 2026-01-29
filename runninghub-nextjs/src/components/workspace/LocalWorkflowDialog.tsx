/**
 * Local Workflow Dialog
 * Create and edit local workflows
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LocalNodeConfigurator } from '@/components/workspace/LocalNodeConfigurator';
import { LOCAL_OPS_DEFINITIONS } from '@/constants/local-ops';
import { useVideoConvertStore } from '@/store/video-convert-store';
import type {
	LocalWorkflow,
	LocalWorkflowInputMapping,
	LocalWorkflowOperationType,
	LocalWorkflowStep,
} from '@/types/workspace';

const LOCAL_OPERATION_OPTIONS = Object.values(LOCAL_OPS_DEFINITIONS).map(def => ({
	value: def.type,
	label: def.label
}));

const DEFAULT_MAPPING: LocalWorkflowInputMapping = {
	targetKey: 'video',
	targetType: 'file',
	sourceType: 'selected',
};

function createEmptyWorkflow(): LocalWorkflow {
	const now = Date.now();
	return {
		id: '',
		name: '',
		description: '',
		createdAt: now,
		updatedAt: now,
		steps: [createStep(1)],
	};
}

function createStep(order: number): LocalWorkflowStep {
	return {
		id: crypto.randomUUID(),
		order,
		name: `Step ${order}`,
		type: 'local',
		localOperation: { type: 'video-convert', config: {} },
		inputMapping: [DEFAULT_MAPPING],
		outputMapping: [],
		staticValues: {},
	};
}

export interface LocalWorkflowDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialWorkflowId?: string | null;
	startInCreateMode?: boolean;
	onSaved?: () => void;
	variant?: 'dialog' | 'inline';
}

export function LocalWorkflowDialog({
	open,
	onOpenChange,
	initialWorkflowId = null,
	startInCreateMode = false,
	onSaved,
	variant = 'dialog',
}: LocalWorkflowDialogProps) {
	const [workflows, setWorkflows] = useState<LocalWorkflow[]>([]);
	const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
	const [isEditing, setIsEditing] = useState(false);
	const [draftWorkflow, setDraftWorkflow] = useState<LocalWorkflow>(createEmptyWorkflow);
	const [isSaving, setIsSaving] = useState(false);

	const selectedWorkflow = useMemo(() => {
		return workflows.find((workflow) => workflow.id === selectedWorkflowId) || null;
	}, [workflows, selectedWorkflowId]);

	const primaryStep = draftWorkflow.steps[0];

	const getDefaultInputMapping = useCallback(
		(operationType: LocalWorkflowOperationType): LocalWorkflowInputMapping => {
			const isVideo =
				operationType === 'video-convert' ||
				operationType === 'video-fps-convert' ||
				operationType === 'video-clip' ||
				operationType === 'video-crop';
			const targetKey = isVideo ? 'video' : 'image';
			return {
				targetKey,
				targetType: 'file',
				sourceType: 'selected',
			};
		},
		[],
	);

	const loadWorkflows = useCallback(async () => {
		try {
			const response = await fetch('/api/workspace/local-workflow/list');
			const data = await response.json();
			if (data.success) {
				setWorkflows(data.workflows || []);
			} else {
				toast.error(data.error || 'Failed to load local workflows');
			}
		} catch (error) {
			console.error('Failed to load local workflows:', error);
			toast.error('Failed to load local workflows');
		}
	}, []);

	useEffect(() => {
		if (!open) return;
		loadWorkflows();
	}, [open, loadWorkflows]);

	useEffect(() => {
		if (!open) {
			setIsEditing(false);
			setSelectedWorkflowId('');
			setDraftWorkflow(createEmptyWorkflow());
		}
	}, [open]);

	useEffect(() => {
		if (!open) return;

		if (initialWorkflowId) {
			setSelectedWorkflowId(initialWorkflowId);
			const workflow = workflows.find((item) => item.id === initialWorkflowId);
			if (workflow) {
				setDraftWorkflow({ ...workflow });
				setIsEditing(true);
			}
			return;
		}

		if (startInCreateMode) {
			setDraftWorkflow(createEmptyWorkflow());
			setIsEditing(true);
		}
	}, [open, initialWorkflowId, startInCreateMode, workflows]);

	const startNewWorkflow = () => {
		setDraftWorkflow(createEmptyWorkflow());
		setIsEditing(true);
	};

	const editSelectedWorkflow = () => {
		if (!selectedWorkflow) return;
		const steps = selectedWorkflow.steps?.length
			? selectedWorkflow.steps
			: [createStep(1)];
		setDraftWorkflow({ ...selectedWorkflow, steps });
		setIsEditing(true);
	};

	const updateDraft = (updates: Partial<LocalWorkflow>) => {
		setDraftWorkflow((prev) => ({ ...prev, ...updates }));
	};

	const updateStep = (stepId: string, updates: Partial<LocalWorkflowStep>) => {
		setDraftWorkflow((prev) => ({
			...prev,
			steps: prev.steps.map((step) =>
				step.id === stepId ? { ...step, ...updates } : step,
			),
		}));
	};

	const saveWorkflow = async () => {
		if (!draftWorkflow.name.trim()) {
			toast.error('Workflow name is required');
			return;
		}

		if (!primaryStep) {
			toast.error('Local workflow step is missing');
			return;
		}

		setIsSaving(true);
		try {
			const nextWorkflow: LocalWorkflow = {
				...draftWorkflow,
				steps: [primaryStep],
			};

			const response = await fetch('/api/workspace/local-workflow/save', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ workflow: nextWorkflow }),
			});
			const data = await response.json();
			if (data.success) {
				toast.success('Local workflow saved');
				setIsEditing(false);
				setSelectedWorkflowId(data.workflowId);
				await loadWorkflows();
				onSaved?.();
			} else {
				toast.error(data.error || 'Failed to save local workflow');
			}
		} catch (error) {
			console.error('Failed to save local workflow:', error);
			toast.error('Failed to save local workflow');
		} finally {
			setIsSaving(false);
		}
	};

	const renderInputMapping = (step: LocalWorkflowStep, mapping: LocalWorkflowInputMapping) => {
		const mappingIndex = step.inputMapping.findIndex(
			(entry) => entry.targetKey === mapping.targetKey && entry.targetType === mapping.targetType,
		);

		const updateMapping = (updates: Partial<LocalWorkflowInputMapping>) => {
			const nextMappings = [...step.inputMapping];
			const nextEntry = { ...mapping, ...updates };
			if (mappingIndex === -1) {
				nextMappings.push(nextEntry);
			} else {
				nextMappings[mappingIndex] = nextEntry;
			}
			updateStep(step.id, { inputMapping: nextMappings });
		};

		return (
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3" key={`${mapping.targetKey}-${mapping.targetType}`}>
				<div>
					<Label className="text-xs">Target</Label>
					<div className="text-xs text-gray-600 mt-1">{mapping.targetKey}</div>
				</div>
				<div>
					<Label className="text-xs">Source</Label>
					<Select
						value={mapping.sourceType}
						onValueChange={(value) => updateMapping({ sourceType: value as LocalWorkflowInputMapping['sourceType'] })}
					>
						<SelectTrigger className="h-8">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="selected">Selected File</SelectItem>
							<SelectItem value="previous-output">Previous Output</SelectItem>
							<SelectItem value="static">Static Value</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div>
					<Label className="text-xs">Value / Key</Label>
					<Input
						value={
							mapping.sourceType === 'static'
								? String(mapping.staticValue ?? '')
								: mapping.sourceKey || ''
						}
						onChange={(event) =>
							mapping.sourceType === 'static'
								? updateMapping({ staticValue: event.target.value })
								: updateMapping({ sourceKey: event.target.value })
						}
						placeholder={mapping.sourceType === 'static' ? 'Static value' : 'Output key'}
						className="h-8"
					/>
				</div>
			</div>
		);
	};

	const content = (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-3 items-center">
				<div className="flex-1 min-w-[220px]">
					<Label className="text-sm">Workflow</Label>
					<Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
						<SelectTrigger>
							<SelectValue placeholder="Select a local workflow" />
						</SelectTrigger>
						<SelectContent>
							{workflows.map((workflow) => (
								<SelectItem key={workflow.id} value={workflow.id}>
									{workflow.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Button variant="outline" size="sm" onClick={startNewWorkflow}>
					<Plus className="h-4 w-4 mr-2" />
					New Workflow
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={!selectedWorkflow}
					onClick={editSelectedWorkflow}
				>
					Edit
				</Button>
			</div>

			{isEditing && primaryStep && (
				<div className="border rounded-lg p-4 space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label>Workflow Name</Label>
							<Input
								value={draftWorkflow.name}
								onChange={(event) => updateDraft({ name: event.target.value })}
							/>
						</div>
						<div>
							<Label>Description</Label>
							<Input
								value={draftWorkflow.description || ''}
								onChange={(event) => updateDraft({ description: event.target.value })}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
						<div>
							<Label className="text-sm">Operation</Label>
							<Select
								value={primaryStep.localOperation?.type || 'video-convert'}
								onValueChange={(value) => {
									const operationType = value as LocalWorkflowOperationType;
									updateStep(primaryStep.id, {
										localOperation: {
											type: operationType,
											config: primaryStep.localOperation?.config || {},
										},
										inputMapping: [getDefaultInputMapping(operationType)],
									});
								}}
							>
								<SelectTrigger className="h-9">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{LOCAL_OPERATION_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<div className="mt-3 text-xs text-gray-500">
								Default input: {primaryStep.inputMapping[0]?.targetKey || 'video'}
							</div>
						</div>
						<div className="space-y-3">
							<Label className="text-sm">Configuration</Label>
							<div className="border rounded-lg p-4 bg-gray-50/50">
								<LocalNodeConfigurator
									operationType={primaryStep.localOperation?.type || 'video-convert'}
									config={primaryStep.localOperation?.config || {}}
									onConfigChange={(newConfig) => {
										updateStep(primaryStep.id, {
											localOperation: {
												type: primaryStep.localOperation?.type || 'video-convert',
												config: newConfig,
											},
										});
									}}
								/>
							</div>
						</div>
					</div>

					<div>
						<Label className="text-xs">Input Mapping</Label>
						{renderInputMapping(primaryStep, primaryStep.inputMapping[0] || DEFAULT_MAPPING)}
					</div>

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setIsEditing(false)}>
							Cancel
						</Button>
						<Button onClick={saveWorkflow} disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save Workflow'}
						</Button>
					</div>
				</div>
			)}
		</div>
	);

	if (!open && variant === 'inline') {
		return null;
	}

	if (variant === 'inline') {
		return (
			<div className="bg-white rounded-lg p-6 border shadow-sm space-y-6 w-full min-h-[70vh]">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Layers className="h-5 w-5 text-blue-600" />
						<h3 className="text-xl font-semibold">Local Workflow</h3>
					</div>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
				</div>
				{content}
			</div>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
				<DialogTitle className="flex items-center gap-2">
					<Layers className="h-5 w-5" />
					Local Workflow
				</DialogTitle>
				{content}
			</DialogContent>
		</Dialog>
	);
}
