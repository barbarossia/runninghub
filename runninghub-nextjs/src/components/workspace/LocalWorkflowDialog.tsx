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
	LocalWorkflowInput,
	LocalWorkflowOperationType,
	WorkflowOutput,
} from '@/types/workspace';

const LOCAL_OPERATION_OPTIONS = Object.values(LOCAL_OPS_DEFINITIONS).map(def => ({
	value: def.type,
	label: def.label
}));

function createEmptyWorkflow(): LocalWorkflow {
	const now = Date.now();
	return {
		id: '',
		name: '',
		description: '',
		createdAt: now,
		updatedAt: now,
		inputs: [createInput()],
		output: { type: 'none', description: '' },
	};
}

function createInput(): LocalWorkflowInput {
	return {
		id: crypto.randomUUID(),
		name: 'Local Operation',
		type: 'local',
		operation: 'video-convert',
		config: {},
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

	const primaryInput = draftWorkflow.inputs[0];

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
		const inputs = selectedWorkflow.inputs?.length
			? selectedWorkflow.inputs
			: [createInput()];
		setDraftWorkflow({ ...selectedWorkflow, inputs });
		setIsEditing(true);
	};

	const updateDraft = (updates: Partial<LocalWorkflow>) => {
		setDraftWorkflow((prev) => ({ ...prev, ...updates }));
	};

	const updateInput = (inputId: string, updates: Partial<LocalWorkflowInput>) => {
		setDraftWorkflow((prev) => ({
			...prev,
			inputs: prev.inputs.map((input) =>
				input.id === inputId ? { ...input, ...updates } : input,
			),
		}));
	};

	const saveWorkflow = async () => {
		if (!draftWorkflow.name.trim()) {
			toast.error('Workflow name is required');
			return;
		}

		if (!primaryInput) {
			toast.error('Local workflow input is missing');
			return;
		}

		setIsSaving(true);
		try {
			const nextWorkflow: LocalWorkflow = {
				...draftWorkflow,
				inputs: [primaryInput],
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

			{isEditing && primaryInput && (
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
								value={primaryInput.operation || 'video-convert'}
								onValueChange={(value) => {
									const operationType = value as LocalWorkflowOperationType;
									updateInput(primaryInput.id, {
										operation: operationType,
										config: primaryInput.config || {},
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
								Target: Selected Files
							</div>
						</div>
						<div className="space-y-3">
							<Label className="text-sm">Configuration</Label>
							<div className="border rounded-lg p-4 bg-gray-50/50">
								<LocalNodeConfigurator
									operationType={primaryInput.operation || 'video-convert'}
									config={primaryInput.config || {}}
									onConfigChange={(newConfig) => {
										updateInput(primaryInput.id, {
											config: newConfig,
										});
									}}
								/>
							</div>
						</div>
					</div>

					<div className="space-y-3 pt-4 border-t">
						<Label className="text-base font-medium">Output Configuration</Label>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label className="text-sm">Output Type</Label>
								<Select
									value={draftWorkflow.output?.type || 'none'}
									onValueChange={(value) => {
										updateDraft({
											output: {
												...(draftWorkflow.output || { description: '' }),
												type: value as WorkflowOutput['type'],
											},
										});
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select output type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">None</SelectItem>
										<SelectItem value="image">Image</SelectItem>
										<SelectItem value="video">Video</SelectItem>
										<SelectItem value="text">Text</SelectItem>
										<SelectItem value="mixed">Mixed</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label className="text-sm">Output Description</Label>
								<Input
									value={draftWorkflow.output?.description || ''}
									onChange={(e) =>
										updateDraft({
											output: {
												...(draftWorkflow.output || { type: 'none' }),
												description: e.target.value,
											},
										})
									}
									placeholder="Describe the output..."
								/>
							</div>
						</div>
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
