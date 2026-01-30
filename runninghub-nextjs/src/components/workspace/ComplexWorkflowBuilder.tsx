/**
 * Complex Workflow Builder Component
 * Step-by-step wizard for creating complex workflows
 */

"use client";

import { useState, useEffect } from "react";
import { Reorder } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Plus,
	Trash2,
	Loader2,
	AlertCircle,
	Settings2,
	GripVertical,
	User,
	ArrowLeft,
	Monitor,
	Cloud,
	Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

import type { ComplexWorkflow, Workflow, WorkflowStep, LocalWorkflow } from "@/types/workspace";
import { mapLocalWorkflowToWorkflow } from "@/lib/local-workflow-mapper";
import { LOCAL_OPS_DEFINITIONS } from "@/constants/local-ops";

type BuilderStep = 1 | 2 | 3;

interface ComplexWorkflowBuilderProps {
	workflow?: ComplexWorkflow;
	onSave?: () => void;
	onCancel?: () => void;
}

export function ComplexWorkflowBuilder({
	workflow,
	onSave,
	onCancel,
}: ComplexWorkflowBuilderProps) {
	const [currentStep, setCurrentStep] = useState<BuilderStep>(1);
	const [isSaving, setIsSaving] = useState(false);
	const isEditing = Boolean(workflow);

	// Workflow data
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [steps, setSteps] = useState<WorkflowStep[]>([]);
	const [availableWorkflows, setAvailableWorkflows] = useState<Workflow[]>([]);
	const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
	const [workflowsError, setWorkflowsError] = useState<string | null>(null);
	const [filter, setFilter] = useState<'all' | 'local' | 'runninghub'>('all');

	// Load available workflows on mount
	useEffect(() => {
		loadWorkflows();
	}, []);

	useEffect(() => {
		if (!workflow) {
			setName("");
			setDescription("");
			setSteps([]);
			setCurrentStep(1);
			return;
		}

		const normalizedSteps = [...workflow.steps]
			.sort((a, b) => a.stepNumber - b.stepNumber)
			.map((step, index) => ({
				...step,
				stepNumber: index + 1,
			}));

		setName(workflow.name);
		setDescription(workflow.description || "");
		setSteps(normalizedSteps);
		setCurrentStep(1);
	}, [workflow]);

	// Handle reorder with step number update
	const handleReorder = (newSteps: WorkflowStep[]) => {
		const updatedSteps = newSteps.map((step, index) => ({
			...step,
			stepNumber: index + 1,
		}));
		setSteps(updatedSteps);
	};

	const loadWorkflows = async () => {
		setIsLoadingWorkflows(true);
		setWorkflowsError(null);

		try {
			console.log(
				"[ComplexWorkflowBuilder] Fetching workflows...",
			);
			
			const [standardRes, localRes] = await Promise.all([
				fetch("/api/workflow/list"),
				fetch("/api/workspace/local-workflow/list"),
			]);

			const standardData = await standardRes.json();
			const localData = await localRes.json();

			if (standardData.success) {
				const standardWorkflows: Workflow[] = standardData.workflows || [];
				let localWorkflows: Workflow[] = [];

				if (localRes.ok && localData.success) {
					localWorkflows = (localData.workflows || []).map((lw: LocalWorkflow) =>
						mapLocalWorkflowToWorkflow(lw),
					);
				}

				const allWorkflows = [...standardWorkflows, ...localWorkflows];
				console.log("[ComplexWorkflowBuilder] Loaded workflows:", allWorkflows);
				
				setAvailableWorkflows(allWorkflows);
				if (allWorkflows.length === 0) {
					setWorkflowsError("No workflows found. Create a workflow first.");
				} else {
					setWorkflowsError(null);
				}
			} else {
				console.error(
					"[ComplexWorkflowBuilder] API returned error:",
					standardData.error,
				);
				setWorkflowsError(standardData.error || "Failed to load workflows");
				toast.error(standardData.error || "Failed to load workflows");
			}
		} catch (error) {
			console.error(
				"[ComplexWorkflowBuilder] Failed to load workflows:",
				error,
			);
			setWorkflowsError(
				error instanceof Error ? error.message : "Failed to load workflows",
			);
			toast.error("Failed to load workflows");
		} finally {
			setIsLoadingWorkflows(false);
		}
	};

	const filteredWorkflows = availableWorkflows.filter((w) => {
		if (filter === 'all') return true;
		const isLocal = w.sourceType === 'local';
		return filter === 'local' ? isLocal : !isLocal;
	});

	const counts = {
		all: availableWorkflows.length,
		local: availableWorkflows.filter(w => w.sourceType === 'local').length,
		runninghub: availableWorkflows.filter(w => w.sourceType !== 'local').length,
	};

	const handleAddWorkflow = (workflow: Workflow) => {
		const newStep: WorkflowStep = {
			id: `step_${Date.now()}`,
			stepNumber: steps.length + 1,
			workflowId: workflow.id,
			workflowName: workflow.name,
			parameters: workflow.inputs.map((param) => ({
				parameterId: param.id,
				parameterName: param.name,
				valueType: param.type === 'file' ? "user-input" : "static",
				staticValue: param.defaultValue ?? "",
				required: param.required,
				placeholder: param.placeholder,
			})),
		};

		setSteps([...steps, newStep]);
	};

	const handleRemoveStep = (stepNumber: number) => {
		const newSteps = steps.filter((s) => s.stepNumber !== stepNumber);
		// Reorder remaining steps
		newSteps.forEach((step, idx) => {
			step.stepNumber = idx + 1;
		});
		setSteps(newSteps);
	};

	const updateParameterType = (
		stepId: string,
		paramId: string,
		valueType: "static" | "dynamic" | "user-input" | "previous-input",
	) => {
		setSteps(
			steps.map((step) => {
				if (step.id === stepId) {
					return {
						...step,
						parameters: step.parameters.map((param) => {
							if (param.parameterId === paramId) {
								return {
									...param,
									valueType,
									dynamicMapping:
										valueType === "dynamic" ? param.dynamicMapping : undefined,
									previousInputMapping:
										valueType === "previous-input"
											? param.previousInputMapping
											: undefined,
								};
							}
							return param;
						}),
					};
				}
				return step;
			}),
		);
	};

	const updateStaticValue = (
		stepId: string,
		paramId: string,
		value: string,
	) => {
		setSteps(
			steps.map((step) => {
				if (step.id === stepId) {
					return {
						...step,
						parameters: step.parameters.map((param) => {
							if (param.parameterId === paramId) {
								return {
									...param,
									staticValue: value,
								};
							}
							return param;
						}),
					};
				}
				return step;
			}),
		);
	};

	const updateDynamicMapping = (
		stepId: string,
		paramId: string,
		sourceParameterId: string,
	) => {
		const parseDynamicValue = (value: string) => {
			if (value.includes("::")) {
				const [stepValue, outputKey] = value.split("::");
				return {
					stepNumber: parseInt(stepValue, 10),
					outputKey,
				};
			}

			const legacyMatch = value.match(/^(\d+)-(.+)$/);
			if (legacyMatch) {
				return {
					stepNumber: parseInt(legacyMatch[1], 10),
					outputKey: value,
				};
			}

			return { stepNumber: 0, outputKey: value };
		};

		const parsed = parseDynamicValue(sourceParameterId);

		setSteps(
			steps.map((step) => {
				if (step.id === stepId) {
					return {
						...step,
						parameters: step.parameters.map((param) => {
							if (param.parameterId === paramId) {
								return {
									...param,
									valueType: "dynamic",
									dynamicMapping: {
										sourceStepNumber: parsed.stepNumber,
										sourceParameterId: parsed.outputKey,
										sourceOutputName: parsed.outputKey,
									},
								};
							}
							return param;
						}),
					};
				}
				return step;
			}),
		);
	};

	const updatePreviousInputMapping = (
		stepId: string,
		paramId: string,
		mappingKey: string,
	) => {
		// mappingKey format: "stepNumber-parameterId-parameterName"
		const match = mappingKey.match(/^(\d+)-(.+)-(.+)$/);
		if (!match) return;

		const sourceStepNumber = parseInt(match[1], 10);
		const sourceParameterId = match[2];
		const sourceParameterName = decodeURIComponent(match[3]);

		setSteps(
			steps.map((step) => {
				if (step.id === stepId) {
					return {
						...step,
						parameters: step.parameters.map((param) => {
							if (param.parameterId === paramId) {
								return {
									...param,
									valueType: "previous-input" as const,
									previousInputMapping: {
										sourceStepNumber,
										sourceParameterId,
										sourceParameterName,
									},
								};
							}
							return param;
						}),
					};
				}
				return step;
			}),
		);
	};

	const getPreviousStepInputs = (currentStepNumber: number) => {
		const inputs: {
			id: string;
			stepNumber: number;
			workflowName: string;
			parameterId: string;
			parameterName: string;
			parameterDescription?: string;
		}[] = [];

		steps
			.filter((s) => s.stepNumber < currentStepNumber)
			.forEach((step) => {
				const workflow = availableWorkflows.find(
					(w) => w.id === step.workflowId,
				);
				if (workflow) {
					workflow.inputs.forEach((input) => {
						inputs.push({
							id: `${step.stepNumber}-${input.id}-${encodeURIComponent(input.name)}`,
							stepNumber: step.stepNumber,
							workflowName: step.workflowName,
							parameterId: input.id,
							parameterName: input.name,
							parameterDescription: input.description,
						});
					});
				}
			});

		return inputs;
	};

	const handleSave = async () => {
		if (steps.length === 0) {
			toast.error("Add at least one workflow to the chain");
			return;
		}

	if (!name.trim()) {
		toast.error("Please enter a name for the complex workflow");
		return;
	}

	if (isEditing && !workflow?.id) {
		toast.error("Missing workflow ID for update");
		return;
	}

	setIsSaving(true);

		try {
			const endpoint = isEditing
				? `/api/workspace/complex-workflow/${workflow?.id ?? ""}`
				: "/api/workspace/complex-workflow/save";
			const method = isEditing ? "PUT" : "POST";

			const response = await fetch(endpoint, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflow: isEditing
						? {
								id: workflow?.id,
								name,
								description,
								steps,
								createdAt: workflow?.createdAt,
								updatedAt: workflow?.updatedAt,
							}
						: {
								name,
								description,
								steps,
							},
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast.success(
					isEditing
						? "Complex workflow updated successfully"
						: "Complex workflow saved successfully",
				);
				if (onSave) onSave();
			} else {
				toast.error(
					data.error ||
						(isEditing
							? "Failed to update complex workflow"
							: "Failed to save complex workflow"),
				);
			}
		} catch (error) {
			console.error("Failed to save complex workflow:", error);
			toast.error(
				isEditing
					? "Failed to update complex workflow"
					: "Failed to save complex workflow",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const getDynamicMappingValue = (param: WorkflowStep["parameters"][number]) => {
		if (!param.dynamicMapping) return "";
		const { sourceStepNumber, sourceParameterId } = param.dynamicMapping;
		const legacyPrefix = `${sourceStepNumber}-`;
		if (sourceParameterId.startsWith(legacyPrefix)) {
			return sourceParameterId;
		}
		return `${sourceStepNumber}::${sourceParameterId}`;
	};

	const getPreviousStepOutputs = (currentStepNumber: number) => {
		const outputs: {
			id: string;
			name: string;
			stepNumber: number;
			workflowName: string;
		}[] = [];

		steps
			.filter((s) => s.stepNumber < currentStepNumber)
			.forEach((step) => {
				const workflow = availableWorkflows.find(
					(w) => w.id === step.workflowId,
				);
				const localOperation = workflow?.localOperation;
				const opDefinition = localOperation
					? LOCAL_OPS_DEFINITIONS[localOperation]
					: undefined;

				outputs.push({
					id: `${step.stepNumber}-output`,
					name: `Output (default)`,
					stepNumber: step.stepNumber,
					workflowName: step.workflowName,
				});

				opDefinition?.outputs?.forEach((output) => {
					outputs.push({
						id: `${step.stepNumber}::${output.key}`,
						name: output.label,
						stepNumber: step.stepNumber,
						workflowName: step.workflowName,
					});
				});
			});

		return outputs;
	};

	return (
		<div className="space-y-6">
			{/* Stepper */}
			<div className="flex items-center justify-center mb-8">
				<div className="flex items-center space-x-4">
					<div
						className={cn(
							"flex items-center justify-center w-8 h-8 rounded-full border-2",
							currentStep === 1
								? "border-primary bg-primary text-primary-foreground"
								: "border-muted-foreground text-muted-foreground",
						)}
					>
						1
					</div>
					<div className="w-16 h-0.5 bg-border" />
					<div
						className={cn(
							"flex items-center justify-center w-8 h-8 rounded-full border-2",
							currentStep === 2
								? "border-primary bg-primary text-primary-foreground"
								: "border-muted-foreground text-muted-foreground",
						)}
					>
						2
					</div>
					<div className="w-16 h-0.5 bg-border" />
					<div
						className={cn(
							"flex items-center justify-center w-8 h-8 rounded-full border-2",
							currentStep === 3
								? "border-primary bg-primary text-primary-foreground"
								: "border-muted-foreground text-muted-foreground",
						)}
					>
						3
					</div>
				</div>
			</div>

			<Card className="min-h-[600px] flex flex-col">
				<CardHeader>
					<CardTitle>
						{currentStep === 1 && "Basic Information"}
						{currentStep === 2 && "Workflow Sequence"}
						{currentStep === 3 && "Parameter Configuration"}
					</CardTitle>
					<CardDescription>
						{currentStep === 1 &&
							"Give your complex workflow a name and description."}
						{currentStep === 2 &&
							"Add and arrange the workflows you want to chain together."}
						{currentStep === 3 && "Configure how data flows between steps."}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex-1">
					{/* Step 1: Basic Info */}
					{currentStep === 1 && (
						<div className="space-y-4 max-w-md mx-auto pt-8">
							<div className="space-y-2">
								<Label htmlFor="name">
									Workflow Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="name"
									placeholder="e.g., Image Processing Pipeline"
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									placeholder="Describe what this workflow does..."
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={4}
								/>
							</div>
						</div>
					)}

					{/* Step 2: Workflow Sequence */}
					{currentStep === 2 && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="flex flex-col h-[500px] border rounded-md overflow-hidden">
								<div className="bg-muted/50 p-3 border-b flex-shrink-0 flex flex-col gap-2">
									<h3 className="font-medium text-sm">Available Workflows</h3>
									<div className="flex gap-1">
										<Badge
											variant={filter === 'all' ? 'default' : 'outline'}
											className="cursor-pointer text-[10px] px-2 h-6 hover:bg-primary/90 flex items-center gap-1"
											onClick={() => setFilter('all')}
										>
											<Layers className="h-3 w-3" />
											All ({counts.all})
										</Badge>
										<Badge
											variant={filter === 'local' ? 'default' : 'outline'}
											className="cursor-pointer text-[10px] px-2 h-6 hover:bg-primary/90 flex items-center gap-1"
											onClick={() => setFilter('local')}
										>
											<Monitor className="h-3 w-3" />
											Local ({counts.local})
										</Badge>
										<Badge
											variant={filter === 'runninghub' ? 'default' : 'outline'}
											className="cursor-pointer text-[10px] px-2 h-6 hover:bg-primary/90 flex items-center gap-1"
											onClick={() => setFilter('runninghub')}
										>
											<Cloud className="h-3 w-3" />
											Cloud ({counts.runninghub})
										</Badge>
									</div>
								</div>
								<div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
									{isLoadingWorkflows ? (
										<div className="flex items-center justify-center h-full">
											<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
										</div>
									) : workflowsError ? (
										<div className="flex flex-col items-center justify-center h-full text-center p-4">
											<AlertCircle className="h-8 w-8 text-red-500 mb-2" />
											<p className="text-sm text-red-500">{workflowsError}</p>
										</div>
									) : filteredWorkflows.length === 0 ? (
										<p className="text-sm text-muted-foreground text-center pt-8">
											No {filter !== 'all' ? filter : ''} workflows available
										</p>
									) : (
										filteredWorkflows.map((workflow) => (
											<div
												key={workflow.id}
												className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer group"
												onClick={() => handleAddWorkflow(workflow)}
											>
												<div className="min-w-0 flex-1 mr-2">
													<div className="flex items-center gap-2 mb-1">
														{workflow.sourceType === 'local' ? (
															<Monitor className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
														) : (
															<Cloud className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
														)}
														<p className="font-medium text-sm truncate">{workflow.name}</p>
													</div>
													<p className="text-xs text-muted-foreground truncate">
														{workflow.description}
													</p>
												</div>
												<Button
													size="sm"
													variant="ghost"
													className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
												>
													<Plus className="h-4 w-4" />
												</Button>
											</div>
										))
									)}
								</div>
							</div>

							<div className="flex flex-col h-[500px] border rounded-md overflow-hidden">
								<div className="bg-muted/50 p-3 border-b flex justify-between items-center flex-shrink-0">
									<h3 className="font-medium text-sm">Selected Sequence</h3>
									<Badge variant="secondary">{steps.length} steps</Badge>
								</div>
								<div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/10 min-h-0">
									{steps.length === 0 ? (
										<div className="flex flex-col items-center justify-center h-full text-muted-foreground">
											<Settings2 className="h-8 w-8 mb-2 opacity-50" />
											<p className="text-sm">
												Add workflows from the left to build your chain
											</p>
										</div>
									) : (
										<Reorder.Group
											axis="y"
											values={steps}
											onReorder={handleReorder}
											className="space-y-2"
										>
											{steps.map((step, index) => (
												<Reorder.Item
													key={step.id}
													value={step}
													className="flex items-center gap-3 p-3 bg-card border rounded-md shadow-sm cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors"
												>
													<GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
													<Badge
														variant="outline"
														className="h-6 w-6 rounded-full p-0 flex items-center justify-center flex-shrink-0"
													>
														{index + 1}
													</Badge>
													<div className="flex-1 min-w-0">
														<p className="font-medium text-sm truncate">
															{step.workflowName}
														</p>
														<div className="flex items-center gap-2 mt-1">
															<Badge
																variant="secondary"
																className="text-[10px] px-1 h-5"
															>
																Step {step.stepNumber}
															</Badge>
															<span className="text-xs text-muted-foreground">
																{step.parameters.length} params
															</span>
														</div>
													</div>
													<Button
														variant="ghost"
														size="icon"
														className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
														onClick={() => handleRemoveStep(step.stepNumber)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</Reorder.Item>
											))}
										</Reorder.Group>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Step 3: Parameter Configuration */}
					{currentStep === 3 && (
						<div className="space-y-6 max-w-3xl mx-auto">
							{steps.map((step) => {
								const selectedWorkflow = availableWorkflows.find(
									(w) => w.id === step.workflowId,
								);
								return (
									<div
										key={step.id}
										className="border rounded-md p-4 bg-card shadow-sm"
									>
										<div className="flex items-start gap-3 mb-4 border-b pb-3">
											<Badge variant="outline" className="mt-0.5">
												{step.stepNumber}
											</Badge>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<h3 className="font-medium text-base">
														{step.workflowName}
													</h3>
													{selectedWorkflow?.executionType && (
														<Badge
															variant="secondary"
															className="text-[10px] px-1.5 h-5"
														>
															{selectedWorkflow.executionType}
														</Badge>
													)}
													{selectedWorkflow?.sourceType && (
														<Badge
															variant="outline"
															className="text-[10px] px-1.5 h-5"
														>
															{selectedWorkflow.sourceType}
														</Badge>
													)}
												</div>
												{selectedWorkflow?.description && (
													<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
														{selectedWorkflow.description}
													</p>
												)}
												{!selectedWorkflow && (
													<p className="text-xs text-red-500 mt-1">
														Workflow not found - may have been deleted
													</p>
												)}
											</div>
											<Badge variant="secondary" className="flex-shrink-0">
												{step.parameters.length} params
											</Badge>
										</div>

										<div className="grid gap-4">
											{step.parameters.map((param) => {
												// Find original parameter definition from workflow to get type and description
												const originalParam = selectedWorkflow?.inputs.find(
													(input) => input.id === param.parameterId,
												);

												return (
													<div
														key={param.parameterId}
														className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-muted/20 p-3 rounded-md"
													>
														<div className="md:col-span-3">
															{originalParam?.description && (
																<p className="text-xs font-medium text-foreground mb-0.5 line-clamp-1">
																	{originalParam.description}
																</p>
															)}
															<div className="flex items-center gap-1.5 flex-wrap">
																<span className="text-[10px] text-muted-foreground">
																	{param.parameterName}
																</span>
																{originalParam?.type && (
																	<Badge
																		variant="outline"
																		className="text-[10px] px-1 h-4.5"
																	>
																		{originalParam.type}
																	</Badge>
																)}
																{param.required && (
																	<span className="text-destructive">*</span>
																)}
															</div>
															<p
																className="text-[10px] text-muted-foreground/60 mt-0.5 truncate"
																title={param.parameterId}
															>
																ID: {param.parameterId}
															</p>
														</div>

														{param.valueType === "previous-input" ? (
															<>
																<div className="md:col-span-4">
																	<Select
																		value={param.valueType}
																		onValueChange={(
																			value:
																				| "static"
																				| "dynamic"
																				| "user-input"
																				| "previous-input",
																		) =>
																			updateParameterType(
																				step.id,
																				param.parameterId,
																				value,
																			)
																		}
																	>
																		<SelectTrigger className="h-8">
																			<SelectValue />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value="static">
																				Static Value
																			</SelectItem>
																			<SelectItem value="user-input">
																				User Input
																			</SelectItem>
																			{step.stepNumber > 1 && (
																				<SelectItem value="previous-input">
																					Previous Workflow Input
																				</SelectItem>
																			)}
																			{step.stepNumber > 1 && (
																				<SelectItem value="dynamic">
																					From Previous Step
																				</SelectItem>
																			)}
																		</SelectContent>
																	</Select>
																</div>
																<div className="md:col-span-5">
																	<Select
																		value={
																			param.previousInputMapping
																				? `${param.previousInputMapping.sourceStepNumber}-${param.previousInputMapping.sourceParameterId}-${encodeURIComponent(param.previousInputMapping.sourceParameterName)}`
																				: ""
																		}
																		onValueChange={(value) =>
																			updatePreviousInputMapping(
																				step.id,
																				param.parameterId,
																				value,
																			)
																		}
																	>
																		<SelectTrigger className="h-8">
																			<SelectValue placeholder="Select previous input" />
																		</SelectTrigger>
																		<SelectContent
																			align="end"
																			sideOffset={4}
																			className="min-w-[200px] max-w-[300px]"
																		>
																			{getPreviousStepInputs(
																				step.stepNumber,
																			).map((input) => (
																				<SelectItem
																					key={input.id}
																					value={input.id}
																					className="pr-8"
																				>
																					<div className="flex flex-col items-start gap-0.5">
																						<span className="text-xs font-medium">
																							Step {input.stepNumber}:{" "}
																							{input.parameterDescription ||
																								input.parameterName}
																						</span>
																						{input.workflowName &&
																							!input.parameterDescription && (
																								<span className="text-[10px] text-muted-foreground truncate max-w-full">
																									from {input.workflowName}
																								</span>
																							)}
																					</div>
																				</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																</div>
															</>
														) : (
															<>
																<div className="md:col-span-4">
																	<Select
																		value={param.valueType}
																		onValueChange={(
																			value:
																				| "static"
																				| "dynamic"
																				| "user-input"
																				| "previous-input",
																		) =>
																			updateParameterType(
																				step.id,
																				param.parameterId,
																				value,
																			)
																		}
																	>
																		<SelectTrigger className="h-8">
																			<SelectValue />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value="static">
																				Static Value
																			</SelectItem>
																			<SelectItem value="user-input">
																				User Input
																			</SelectItem>
																			{step.stepNumber > 1 && (
																				<SelectItem value="previous-input">
																					Previous Workflow Input
																				</SelectItem>
																			)}
																			{step.stepNumber > 1 && (
																				<SelectItem value="dynamic">
																					From Previous Step
																				</SelectItem>
																			)}
																		</SelectContent>
																	</Select>
																</div>

																<div className="md:col-span-5">
																	{param.valueType === "static" ? (
																		originalParam?.options &&
																		originalParam.options.length > 0 ? (
																			<Select
																				value={
																					param.staticValue?.toString() || ""
																				}
																				onValueChange={(value) =>
																					updateStaticValue(
																						step.id,
																						param.parameterId,
																						value,
																					)
																				}
																			>
																				<SelectTrigger className="h-8">
																					<SelectValue placeholder="Select option" />
																				</SelectTrigger>
																				<SelectContent>
																					{originalParam.options.map(
																						(option) => (
																							<SelectItem
																								key={option.value.toString()}
																								value={option.value.toString()}
																							>
																								{option.label}
																							</SelectItem>
																						),
																					)}
																				</SelectContent>
																			</Select>
																		) : (
																			<Input
																				value={
																					param.staticValue?.toString() || ""
																				}
																				onChange={(e) =>
																					updateStaticValue(
																						step.id,
																						param.parameterId,
																						e.target.value,
																					)
																				}
																				placeholder={
																					param.placeholder || "Enter value"
																				}
																				className="h-8"
																			/>
																		)
																	) : param.valueType === "user-input" ? (
																		<div className="flex items-center gap-2 h-8 px-3 bg-muted/50 rounded-md border border-dashed text-muted-foreground text-sm">
																			<User className="h-3.5 w-3.5" />
																			<span>Required at execution</span>
																		</div>
																	) : (
																			<Select
																			value={getDynamicMappingValue(param)}
																			onValueChange={(value) =>
																				updateDynamicMapping(
																					step.id,
																					param.parameterId,
																					value,
																				)
																			}
																		>
																			<SelectTrigger className="h-8">
																				<SelectValue placeholder="Select source output" />
																			</SelectTrigger>
																			<SelectContent>
																				{getPreviousStepOutputs(
																					step.stepNumber,
																				).map((output) => (
																					<SelectItem
																						key={output.id}
																						value={output.id}
																					>
																						Step {output.stepNumber}:{" "}
																						{output.workflowName} - {output.name}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	)}
																</div>
															</>
														)}
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
				<CardFooter className="flex justify-between border-t p-6 bg-muted/10">
					<Button
						variant="outline"
						onClick={() => {
							if (currentStep === 1) {
								if (onCancel) onCancel();
							} else {
								setCurrentStep((prev) => (prev - 1) as BuilderStep);
							}
						}}
					>
						{currentStep === 1 ? "Cancel" : "Back"}
					</Button>

					<Button
						onClick={() => {
							if (currentStep === 3) {
								handleSave();
							} else {
								if (currentStep === 1 && !name.trim()) {
									toast.error("Please enter a workflow name");
									return;
								}
								if (currentStep === 2 && steps.length === 0) {
									toast.error("Please add at least one workflow step");
									return;
								}
								setCurrentStep((prev) => (prev + 1) as BuilderStep);
							}
						}}
						disabled={isSaving}
					>
						{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{currentStep === 3 ? "Save Workflow" : "Next"}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
