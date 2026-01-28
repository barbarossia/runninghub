/**
 * Batch Process Dialog
 * Create and run batch process templates
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Layers, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type {
	BatchProcessLocalOperationType,
	BatchProcessStep,
	BatchProcessTemplate,
	BatchProcessInputMapping,
	BatchProcessOutputMapping,
	Workflow,
	MediaFile,
} from '@/types/workspace';

const LOCAL_OPERATION_OPTIONS: { value: BatchProcessLocalOperationType; label: string }[] = [
	{ value: 'video-convert', label: 'Convert Video (MP4)' },
	{ value: 'video-fps-convert', label: 'Convert FPS' },
	{ value: 'video-clip', label: 'Clip Frames' },
	{ value: 'video-crop', label: 'Crop Video' },
	{ value: 'image-resize', label: 'Resize Image' },
	{ value: 'duck-decode', label: 'Duck Decode' },
	{ value: 'caption', label: 'Caption (AI)' },
];

const DEFAULT_MAPPING: BatchProcessInputMapping = {
	targetKey: 'inputPath',
	targetType: 'file',
	sourceType: 'selected',
};

function createEmptyTemplate(): BatchProcessTemplate {
	const now = Date.now();
	return {
		id: '',
		name: '',
		description: '',
		createdAt: now,
		updatedAt: now,
		steps: [],
	};
}

function createStep(order: number): BatchProcessStep {
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

export interface BatchProcessDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedFiles: MediaFile[];
	workflows: Workflow[];
	onTaskStart?: (taskId: string) => void;
	onDeselectAll?: () => void;
}

export function BatchProcessDialog({
	open,
	onOpenChange,
	selectedFiles,
	workflows,
	onTaskStart,
	onDeselectAll,
}: BatchProcessDialogProps) {
	const [templates, setTemplates] = useState<BatchProcessTemplate[]>([]);
	const [selectedTemplateId, setSelectedTemplateId] = useState('');
	const [isEditing, setIsEditing] = useState(false);
	const [draftTemplate, setDraftTemplate] = useState<BatchProcessTemplate>(createEmptyTemplate);
	const [isSaving, setIsSaving] = useState(false);
	const [isRunning, setIsRunning] = useState(false);

	const selectionMode = selectedFiles.length === 1 ? 'single' : 'batch';

	const selectedTemplate = useMemo(() => {
		return templates.find((template) => template.id === selectedTemplateId) || null;
	}, [templates, selectedTemplateId]);

	const loadTemplates = useCallback(async () => {
		try {
			const response = await fetch('/api/workspace/batch-process-template/list');
			const data = await response.json();
			if (data.success) {
				setTemplates(data.templates || []);
			} else {
				toast.error(data.error || 'Failed to load templates');
			}
		} catch (error) {
			console.error('Failed to load batch process templates:', error);
			toast.error('Failed to load templates');
		}
	}, []);

	useEffect(() => {
		if (!open) return;
		loadTemplates();
	}, [open, loadTemplates]);

	useEffect(() => {
		if (!open) {
			setIsEditing(false);
			setSelectedTemplateId('');
			setDraftTemplate(createEmptyTemplate());
		}
	}, [open]);

	const startNewTemplate = () => {
		setDraftTemplate(createEmptyTemplate());
		setIsEditing(true);
	};

	const editSelectedTemplate = () => {
		if (!selectedTemplate) return;
		setDraftTemplate({ ...selectedTemplate });
		setIsEditing(true);
	};

	const updateDraft = (updates: Partial<BatchProcessTemplate>) => {
		setDraftTemplate((prev) => ({ ...prev, ...updates }));
	};

	const updateStep = (stepId: string, updates: Partial<BatchProcessStep>) => {
		setDraftTemplate((prev) => ({
			...prev,
			steps: prev.steps.map((step) =>
				step.id === stepId ? { ...step, ...updates } : step,
			),
		}));
	};

	const addStep = () => {
		setDraftTemplate((prev) => {
			const nextOrder = prev.steps.length + 1;
			return { ...prev, steps: [...prev.steps, createStep(nextOrder)] };
		});
	};

	const removeStep = (stepId: string) => {
		setDraftTemplate((prev) => {
			const nextSteps = prev.steps
				.filter((step) => step.id !== stepId)
				.map((step, index) => ({ ...step, order: index + 1 }));
			return { ...prev, steps: nextSteps };
		});
	};

	const saveTemplate = async () => {
		if (!draftTemplate.name.trim()) {
			toast.error('Template name is required');
			return;
		}

		if (draftTemplate.steps.length === 0) {
			toast.error('Add at least one step');
			return;
		}

		setIsSaving(true);
		try {
			const response = await fetch('/api/workspace/batch-process-template/save', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ template: draftTemplate }),
			});
			const data = await response.json();
			if (data.success) {
				toast.success('Template saved');
				setIsEditing(false);
				setSelectedTemplateId(data.templateId);
				await loadTemplates();
			} else {
				toast.error(data.error || 'Failed to save template');
			}
		} catch (error) {
			console.error('Failed to save template:', error);
			toast.error('Failed to save template');
		} finally {
			setIsSaving(false);
		}
	};

	const runTemplate = async () => {
		if (!selectedTemplateId) {
			toast.error('Select a template to run');
			return;
		}

		if (selectedFiles.length === 0) {
			toast.error('Select files to process');
			return;
		}

		setIsRunning(true);
		try {
			const response = await fetch('/api/workspace/batch-process-template/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					templateId: selectedTemplateId,
					filePaths: selectedFiles.map((file) => file.path),
				}),
			});
			const data = await response.json();
			if (data.success && data.taskId) {
				onTaskStart?.(data.taskId);
				toast.success('Batch process started');
				onDeselectAll?.();
				onOpenChange(false);
			} else {
				toast.error(data.error || 'Failed to start batch process');
			}
		} catch (error) {
			console.error('Failed to run batch process:', error);
			toast.error('Failed to start batch process');
		} finally {
			setIsRunning(false);
		}
	};

	const renderInputMapping = (step: BatchProcessStep, mapping: BatchProcessInputMapping) => {
		const mappingIndex = step.inputMapping.findIndex(
			(entry) => entry.targetKey === mapping.targetKey && entry.targetType === mapping.targetType,
		);

		const updateMapping = (updates: Partial<BatchProcessInputMapping>) => {
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
						onValueChange={(value) => updateMapping({ sourceType: value as BatchProcessInputMapping['sourceType'] })}
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

	const renderWorkflowMappings = (step: BatchProcessStep) => {
		const workflow = workflows.find((entry) => entry.id === step.workflowId);
		if (!workflow) {
			return (
				<Alert className="mt-3">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>Select a workflow to configure inputs.</AlertDescription>
				</Alert>
			);
		}

		return (
			<div className="space-y-3">
				{workflow.inputs.map((input) => {
					const targetType = input.type === 'file' ? 'file' : 'text';
					const mapping =
						step.inputMapping.find(
							(entry) => entry.targetKey === input.id && entry.targetType === targetType,
						) ||
						({
							targetKey: input.id,
							targetType,
							sourceType: targetType === 'text' ? 'static' : 'selected',
							staticValue: targetType === 'text' ? '' : undefined,
						} as BatchProcessInputMapping);
					return (
						<div key={input.id} className="rounded border border-gray-200 p-3">
							<div className="text-xs font-semibold text-gray-600 mb-2">
								{input.name} ({input.type})
							</div>
							{renderInputMapping(step, mapping)}
						</div>
					);
				})}
			</div>
		);
	};

	const updateOutputMapping = (step: BatchProcessStep, index: number, updates: Partial<BatchProcessOutputMapping>) => {
		const next = [...(step.outputMapping || [])];
		next[index] = { ...next[index], ...updates };
		updateStep(step.id, { outputMapping: next });
	};

	const addOutputMapping = (step: BatchProcessStep) => {
		const next = [...(step.outputMapping || [])];
		next.push({ outputKey: `output_${next.length + 1}`, outputType: 'file', outputIndex: 0 });
		updateStep(step.id, { outputMapping: next });
	};

	const removeOutputMapping = (step: BatchProcessStep, index: number) => {
		const next = (step.outputMapping || []).filter((_, idx) => idx !== index);
		updateStep(step.id, { outputMapping: next });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl">
				<DialogTitle className="flex items-center gap-2">
					<Layers className="h-5 w-5" />
					Batch Process
				</DialogTitle>

				<div className="space-y-4">
					<div className="flex flex-wrap gap-3 items-center">
						<div className="flex-1 min-w-[220px]">
							<Label className="text-sm">Template</Label>
							<Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
								<SelectTrigger>
									<SelectValue placeholder="Select a template" />
								</SelectTrigger>
								<SelectContent>
									{templates.map((template) => (
										<SelectItem key={template.id} value={template.id}>
											{template.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Button variant="outline" size="sm" onClick={startNewTemplate}>
							<Plus className="h-4 w-4 mr-2" />
							New Template
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={!selectedTemplate}
							onClick={editSelectedTemplate}
						>
							Edit
						</Button>
						<Button
							disabled={!selectedTemplateId || isRunning}
							onClick={runTemplate}
						>
							{isRunning ? 'Starting...' : 'Run'}
						</Button>
					</div>

					<div className="text-sm text-gray-600">
						{selectedFiles.length} file(s) selected. Mode: {selectionMode}.
					</div>

					{isEditing && (
						<div className="border rounded-lg p-4 space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label>Template Name</Label>
									<Input
										value={draftTemplate.name}
										onChange={(event) => updateDraft({ name: event.target.value })}
									/>
								</div>
								<div>
									<Label>Description</Label>
									<Input
										value={draftTemplate.description || ''}
										onChange={(event) => updateDraft({ description: event.target.value })}
									/>
								</div>
							</div>

							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<Label className="text-sm">Steps</Label>
									<Button variant="outline" size="sm" onClick={addStep}>
										<Plus className="h-4 w-4 mr-2" />
										Add Step
									</Button>
								</div>

								{draftTemplate.steps.map((step) => (
									<div key={step.id} className="border rounded-lg p-4 space-y-3">
										<div className="flex items-center justify-between gap-2">
											<Input
												value={step.name}
												onChange={(event) => updateStep(step.id, { name: event.target.value })}
												className="max-w-xs"
											/>
											<div className="flex items-center gap-2">
												<Select
													value={step.type}
													onValueChange={(value) =>
														updateStep(step.id, {
															type: value as BatchProcessStep['type'],
															inputMapping: [DEFAULT_MAPPING],
														})
													}
												>
													<SelectTrigger className="h-8">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="local">Local Operation</SelectItem>
														<SelectItem value="workflow">Workflow</SelectItem>
													</SelectContent>
												</Select>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => removeStep(step.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>

										{step.type === 'local' && (
											<div className="space-y-3">
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													<div>
														<Label className="text-xs">Operation</Label>
														<Select
															value={step.localOperation?.type || 'video-convert'}
															onValueChange={(value) =>
																updateStep(step.id, {
																	localOperation: {
																		type: value as BatchProcessLocalOperationType,
																		config: step.localOperation?.config || {},
																	},
																})
															}
														>
															<SelectTrigger className="h-8">
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
													</div>
													<div>
														<Label className="text-xs">Config (JSON)</Label>
														<Textarea
															value={JSON.stringify(step.localOperation?.config || {}, null, 2)}
															onChange={(event) => {
																try {
																	const parsed = JSON.parse(event.target.value || '{}');
																	updateStep(step.id, {
																		localOperation: {
																			type: step.localOperation?.type || 'video-convert',
																			config: parsed,
																		},
																	});
																} catch (error) {
																	// ignore parse errors
																}
															}}
															className="min-h-[80px] text-xs"
														/>
													</div>
												</div>
												<div className="space-y-2">
													<Label className="text-xs">Input Mapping</Label>
													{renderInputMapping(step, step.inputMapping[0] || DEFAULT_MAPPING)}
												</div>
											</div>
										)}

										{step.type === 'workflow' && (
											<div className="space-y-3">
												<div>
													<Label className="text-xs">Workflow</Label>
													<Select
														value={step.workflowId || ''}
														onValueChange={(value) => {
															const workflow = workflows.find((entry) => entry.id === value);
															const mappings = workflow?.inputs.map((input) => ({
																targetKey: input.id,
																targetType: input.type === 'file' ? 'file' : 'text',
																sourceType: input.type === 'file' ? 'selected' : 'static',
																staticValue: input.type === 'file' ? undefined : '',
															})) || [];
															updateStep(step.id, {
																workflowId: value,
																workflowName: workflow?.name || value,
																sourceWorkflowId: workflow?.sourceWorkflowId,
																inputMapping: mappings,
															});
														}}
													>
														<SelectTrigger className="h-8">
															<SelectValue placeholder="Select workflow" />
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
												<div>
													<Label className="text-xs">Input Mapping</Label>
													{renderWorkflowMappings(step)}
												</div>
												<div>
													<div className="flex items-center justify-between">
														<Label className="text-xs">Output Mapping</Label>
														<Button variant="outline" size="sm" onClick={() => addOutputMapping(step)}>
															<Plus className="h-3 w-3 mr-2" />
															Add Output
														</Button>
													</div>
													<div className="space-y-2">
														{(step.outputMapping || []).map((mapping, index) => (
															<div key={`${mapping.outputKey}-${index}`} className="grid grid-cols-1 md:grid-cols-4 gap-2">
																<Input
																	value={mapping.outputKey}
																	onChange={(event) =>
																		updateOutputMapping(step, index, { outputKey: event.target.value })
																	}
																	placeholder="Output key"
																	className="h-8"
																/>
																<Select
																	value={mapping.outputType}
																	onValueChange={(value) =>
																		updateOutputMapping(step, index, { outputType: value as BatchProcessOutputMapping['outputType'] })
																	}
																>
																	<SelectTrigger className="h-8">
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="file">File</SelectItem>
																		<SelectItem value="text">Text</SelectItem>
																	</SelectContent>
																</Select>
																<Input
																	type="number"
																	min={0}
																	value={mapping.outputIndex ?? 0}
																	onChange={(event) =>
																		updateOutputMapping(step, index, { outputIndex: Number(event.target.value) })
																	}
																	className="h-8"
																/>
																<Button
																	variant="ghost"
																	size="icon"
																	onClick={() => removeOutputMapping(step, index)}
																>
																	<Trash2 className="h-3 w-3" />
																</Button>
															</div>
														))}
													</div>
												</div>
											</div>
										)}
									</div>
								))}
							</div>

							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={() => setIsEditing(false)}>
									Cancel
								</Button>
								<Button onClick={saveTemplate} disabled={isSaving}>
									{isSaving ? 'Saving...' : 'Save Template'}
								</Button>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
