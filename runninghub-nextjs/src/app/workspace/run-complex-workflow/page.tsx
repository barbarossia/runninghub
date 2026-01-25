/**
 * Run Complex Workflow Page
 * Allows users to select a complex workflow, configure parameters, and execute it step-by-step
 */

"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	ArrowLeft,
	Play,
	Loader2,
	AlertCircle,
	Zap,
	CheckCircle2,
	FileText,
	Clock,
	XCircle,
	ChevronRight,
	ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaGallery } from "@/components/workspace/MediaGallery";
import { ComplexWorkflowContinueDialog } from "@/components/workspace/ComplexWorkflowContinueDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";
import type {
	ComplexWorkflow,
	StepParameterConfig,
	ComplexWorkflowExecution,
	ExecutionStep,
	WorkflowStep,
	JobResult,
} from "@/types/workspace";

const POLL_INTERVAL = 2000; // Poll every 2 seconds

function getStepStatusColor(status: string) {
	switch (status) {
		case "completed":
			return "bg-green-100 text-green-800 border-green-200";
		case "running":
			return "bg-blue-100 text-blue-800 border-blue-200";
		case "failed":
			return "bg-red-100 text-red-800 border-red-200";
		default:
			return "bg-gray-100 text-gray-800 border-gray-200";
	}
}

function getStepStatusIcon(status: string) {
	switch (status) {
		case "completed":
			return <CheckCircle2 className="h-4 w-4 text-green-600" />;
		case "running":
			return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
		case "failed":
			return <XCircle className="h-4 w-4 text-red-600" />;
		default:
			return <Clock className="h-4 w-4 text-gray-400" />;
	}
}

function RunComplexWorkflowContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const selectedWorkflowId = searchParams.get("workflow");
	const executionIdParam = searchParams.get("execution");

	// Use selector pattern to ensure reactivity
	const mediaFiles = useWorkspaceStore((state) => state.mediaFiles);

	const [complexWorkflows, setComplexWorkflows] = useState<ComplexWorkflow[]>(
		[],
	);
	const [isLoading, setIsLoading] = useState(true);
	const [isExecuting, setIsExecuting] = useState(false);
	const [selectedWorkflow, setSelectedWorkflow] =
		useState<ComplexWorkflow | null>(null);
	const [parameters, setParameters] = useState<Record<string, any>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [executionId, setExecutionId] = useState<string | null>(
		executionIdParam,
	);
	const [execution, setExecution] = useState<ComplexWorkflowExecution | null>(
		null,
	);
	const [currentJobId, setCurrentJobId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState("workflow");
	const [showContinueDialog, setShowContinueDialog] = useState(false);
	const [nextStep, setNextStep] = useState<WorkflowStep | null>(null);

	// Polling refs
	const pollingRef = useRef(false);
	const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// Load complex workflows on mount
	useEffect(() => {
		loadWorkflows();
	}, []);

	// Auto-select workflow if provided in URL
	useEffect(() => {
		if (selectedWorkflowId && complexWorkflows.length > 0) {
			const workflow = complexWorkflows.find(
				(w) => w.id === selectedWorkflowId,
			);
			if (workflow) {
				setSelectedWorkflow(workflow);
				// Auto-navigate to Execute tab since workflow is pre-selected
				setActiveTab("execute");
				toast.success(
					`Workflow "${workflow.name}" selected. You can now execute it.`,
				);
			}
		}
	}, [selectedWorkflowId, complexWorkflows]);

	// Start polling if execution exists
	useEffect(() => {
		if (executionId && !pollingRef.current) {
			pollingRef.current = true;
			pollExecutionStatus();
		}

		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
		};
	}, [executionId]);

	// Update current job ID when execution changes
	useEffect(() => {
		if (execution) {
			const currentStep = execution.steps.find(
				(s) => s.stepNumber === execution.currentStep,
			);
			if (currentStep?.jobId) {
				setCurrentJobId(currentStep.jobId);
			}
			// Check if current step just completed
			if (currentStep?.status === "completed") {
				const stepIdx = execution.steps.findIndex(
					(s) => s.stepNumber === execution.currentStep,
				);
				if (stepIdx < execution.steps.length - 1) {
					// There's a next step
					setIsExecuting(false);
				} else {
					// All steps completed
					pollingRef.current = false;
					if (pollIntervalRef.current) {
						clearInterval(pollIntervalRef.current);
					}
					setIsExecuting(false);
					toast.success("Complex workflow completed!");
				}
			} else if (currentStep?.status === "failed") {
				setIsExecuting(false);
				pollingRef.current = false;
				if (pollIntervalRef.current) {
					clearInterval(pollIntervalRef.current);
				}
			}
		}
	}, [execution]);

	const loadWorkflows = async () => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/workspace/complex-workflow/list");
			const data = await response.json();

			if (data.success) {
				setComplexWorkflows(data.workflows || []);
			} else {
				toast.error(data.error || "Failed to load complex workflows");
			}
		} catch (error) {
			console.error("Failed to load complex workflows:", error);
			toast.error("Failed to load complex workflows");
		} finally {
			setIsLoading(false);
		}
	};

	const pollExecutionStatus = useCallback(async () => {
		if (!executionId) return;

		try {
			const response = await fetch(
				`/api/workspace/complex-workflow/execution/${executionId}`,
			);
			const data = await response.json();

			if (data.success && data.execution) {
				setExecution(data.execution);

				// Stop polling if completed or failed
				if (
					data.execution.status === "completed" ||
					data.execution.status === "failed"
				) {
					pollingRef.current = false;
					if (pollIntervalRef.current) {
						clearInterval(pollIntervalRef.current);
					}
				}
			}
		} catch (error) {
			console.error("Failed to poll execution status:", error);
		}
	}, [executionId]);

	// Set up polling interval
	useEffect(() => {
		if (pollingRef.current && execution?.status === "running") {
			pollIntervalRef.current = setInterval(() => {
				pollExecutionStatus();
			}, POLL_INTERVAL);
		}

		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
		};
	}, [execution?.status, pollExecutionStatus]);

	const handleWorkflowSelect = (workflow: ComplexWorkflow) => {
		console.log("Selected workflow:", workflow);
		setSelectedWorkflow(workflow);
		setParameters({});
		setErrors({});
		setExecutionId(null);
		setExecution(null);
		setCurrentJobId(null);
		setShowContinueDialog(false);

		// Show toast to confirm selection
		toast.success(`Selected: ${workflow.name}`);

		// Update URL without reloading
		const url = new URL(window.location.href);
		url.searchParams.set("workflow", workflow.id);
		url.searchParams.delete("execution");
		window.history.replaceState({}, "", url.toString());
	};

	const handleParameterChange = (paramId: string, value: any) => {
		setParameters((prev) => ({ ...prev, [paramId]: value }));
		if (errors[paramId]) {
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[paramId];
				return newErrors;
			});
		}
	};

	const validateParameters = (): boolean => {
		if (!selectedWorkflow) return false;

		const newErrors: Record<string, string> = {};
		let isValid = true;

		const firstStep = selectedWorkflow.steps.find((s) => s.stepNumber === 1);
		if (!firstStep) return false;

		for (const param of firstStep.parameters) {
			if (
				param.valueType === "static" &&
				param.required &&
				!parameters[param.parameterId]
			) {
				newErrors[param.parameterId] = "This field is required";
				isValid = false;
			}
		}

		setErrors(newErrors);
		return isValid;
	};

	const handleExecute = async () => {
		if (!selectedWorkflow) {
			toast.error("Please select a complex workflow");
			return;
		}

		if (!validateParameters()) {
			toast.error("Please fill in all required parameters");
			return;
		}

		const selectedFiles = mediaFiles.filter((f) => f.selected);
		if (selectedFiles.length === 0) {
			toast.error("Please select at least one file from the media gallery");
			return;
		}

		setIsExecuting(true);
		pollingRef.current = true;

		try {
			const firstStep = selectedWorkflow.steps[0];

			const fileInputs = selectedFiles.map((file) => ({
				parameterId: firstStep.parameters[0]?.parameterId || "",
				filePath: file.path,
				fileName: file.name,
				fileSize: file.size || 0,
				fileType: file.type,
				valid: true,
				width: file.width,
				height: file.height,
				thumbnail: file.thumbnail,
			}));

			const response = await fetch("/api/workspace/complex-workflow/execute", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					complexWorkflowId: selectedWorkflow.id,
					initialParameters: {
						fileInputs: fileInputs,
						...parameters,
					},
				}),
			});

			const data = await response.json();

			if (data.success) {
				setExecutionId(data.executionId);
				toast.success(`Complex workflow "${selectedWorkflow.name}" started!`);
				setActiveTab("progress");
			} else {
				toast.error(data.error || "Failed to start complex workflow");
				setIsExecuting(false);
				pollingRef.current = false;
			}
		} catch (error) {
			console.error("Failed to execute complex workflow:", error);
			toast.error("Failed to start complex workflow");
			setIsExecuting(false);
			pollingRef.current = false;
		}
	};

	const handleContinue = async (params: Record<string, any>) => {
		if (!execution || !selectedWorkflow) return;

		setIsExecuting(true);
		setShowContinueDialog(false);

		try {
			const response = await fetch("/api/workspace/complex-workflow/continue", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					executionId: execution.id,
					stepNumber: execution.currentStep,
					parameters: params,
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast.success(`Step ${execution.currentStep + 1} started!`);
				// Reload execution status
				pollExecutionStatus();
			} else {
				toast.error(data.error || "Failed to continue workflow");
				setIsExecuting(false);
			}
		} catch (error) {
			console.error("Failed to continue workflow:", error);
			toast.error("Failed to continue workflow");
			setIsExecuting(false);
		}
	};

	const openContinueDialog = () => {
		if (!execution || !selectedWorkflow) return;

		const currentStep = execution.steps.find(
			(s) => s.stepNumber === execution.currentStep,
		);
		if (!currentStep || currentStep.status !== "completed") return;

		const nextStepDef = selectedWorkflow.steps.find(
			(s) => s.stepNumber === execution.currentStep + 1,
		);
		if (!nextStepDef) return;

		// Gather previous outputs for the dialog
		const previousOutputs: JobResult[] = [];
		execution.steps.forEach((step) => {
			if (step.status === "completed" && step.outputs) {
				if (Array.isArray(step.outputs)) {
					previousOutputs.push(...step.outputs);
				} else {
					previousOutputs.push(step.outputs as JobResult);
				}
			}
		});

		setNextStep(nextStepDef);
		setShowContinueDialog(true);
	};

	const renderParameterInput = (param: StepParameterConfig) => {
		const error = errors[param.parameterId];
		const value = parameters[param.parameterId];
		const isRequired = param.required;

		if (param.valueType === "user-input") {
			return (
				<div
					key={param.parameterId}
					className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
				>
					<div className="flex items-center gap-2 mb-2">
						<AlertCircle className="h-4 w-4 text-yellow-600" />
						<span className="text-sm font-medium text-yellow-900">
							{param.parameterName}
						</span>
						{isRequired && <span className="text-red-500">*</span>}
					</div>
					<p className="text-xs text-yellow-800">
						This parameter will be prompted during execution.
					</p>
				</div>
			);
		}

		if (param.valueType === "dynamic") {
			return (
				<div
					key={param.parameterId}
					className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
				>
					<div className="flex items-center gap-2 mb-2">
						<FileText className="h-4 w-4 text-blue-600" />
						<span className="text-sm font-medium text-blue-900">
							{param.parameterName}
						</span>
					</div>
					<p className="text-xs text-blue-800">
						This will use output from a previous step (automatically mapped).
					</p>
				</div>
			);
		}

		if (param.valueType === "previous-input") {
			return (
				<div
					key={param.parameterId}
					className="p-4 bg-purple-50 border border-purple-200 rounded-lg"
				>
					<div className="flex items-center gap-2 mb-2">
						<FileText className="h-4 w-4 text-purple-600" />
						<span className="text-sm font-medium text-purple-900">
							{param.parameterName}
						</span>
					</div>
					<p className="text-xs text-purple-800">
						This will use input from a previous step (prompted during
						execution).
					</p>
				</div>
			);
		}

		return (
			<div key={param.parameterId} className="space-y-2">
				<div className="flex items-center justify-between">
					<Label htmlFor={param.parameterId} className="text-sm font-medium">
						{param.parameterName}
						{isRequired && <span className="text-red-500">*</span>}
					</Label>
					<Badge variant="outline" className="text-xs">
						{param.parameterId}
					</Badge>
				</div>

				<Input
					id={param.parameterId}
					type="text"
					value={value || ""}
					onChange={(e) =>
						handleParameterChange(param.parameterId, e.target.value)
					}
					placeholder={param.placeholder || "Enter value"}
					className={cn(error && "border-red-500")}
					disabled={isExecuting}
				/>

				{error && <p className="text-xs text-red-600">{error}</p>}
			</div>
		);
	};

	const renderExecutionProgress = () => {
		if (!execution || !selectedWorkflow) {
			return (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							No Execution Active
						</h3>
						<p className="text-sm text-gray-500 mb-4">
							Start a workflow execution to see progress here
						</p>
					</CardContent>
				</Card>
			);
		}

		const currentStepData = execution.steps.find(
			(s) => s.stepNumber === execution.currentStep,
		);
		const canContinue =
			currentStepData?.status === "completed" &&
			execution.currentStep < selectedWorkflow.steps.length;
		const isCompleted = execution.status === "completed";
		const isFailed = execution.status === "failed";

		return (
			<div className="space-y-6">
				{/* Progress Overview */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<Zap className="h-5 w-5 text-purple-600" />
								{selectedWorkflow.name}
							</CardTitle>
							<Badge
								className={cn(
									execution.status === "completed" &&
										"bg-green-100 text-green-800",
									execution.status === "failed" && "bg-red-100 text-red-800",
									execution.status === "running" && "bg-blue-100 text-blue-800",
								)}
							>
								{execution.status}
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-4 mb-4">
							<div className="flex-1">
								<div className="flex justify-between text-sm mb-2">
									<span className="text-gray-600">Progress</span>
									<span className="font-medium">
										Step {execution.currentStep} of{" "}
										{selectedWorkflow.steps.length}
									</span>
								</div>
								<div className="w-full bg-gray-200 rounded-full h-2">
									<div
										className="bg-purple-600 h-2 rounded-full transition-all"
										style={{
											width: `${(execution.currentStep / selectedWorkflow.steps.length) * 100}%`,
										}}
									/>
								</div>
							</div>
						</div>

						{currentJobId && (
							<div className="text-sm text-gray-600">
								<span className="font-medium">Current Job ID: </span>
								<code className="bg-gray-100 px-2 py-1 rounded text-xs">
									{currentJobId}
								</code>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Steps List */}
				<Card>
					<CardHeader>
						<CardTitle>Workflow Steps</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{selectedWorkflow.steps.map((step, idx) => {
								const executionStep = execution.steps.find(
									(s) => s.stepNumber === step.stepNumber,
								);
								const status = executionStep?.status || "pending";
								const isCurrentStep = step.stepNumber === execution.currentStep;

								return (
									<div
										key={step.id}
										className={cn(
											"border rounded-lg p-4 transition-all",
											isCurrentStep && "border-purple-500 bg-purple-50",
										)}
									>
										<div className="flex items-center gap-3">
											<div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-300">
												{getStepStatusIcon(status)}
											</div>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="font-medium">
														Step {step.stepNumber}
													</span>
													<Badge
														variant="outline"
														className={getStepStatusColor(status)}
													>
														{status}
													</Badge>
												</div>
												<p className="text-sm text-gray-600">
													{step.workflowName}
												</p>
												{executionStep?.jobId && (
													<p className="text-xs text-gray-500 mt-1">
														Job:{" "}
														<code className="bg-gray-100 px-1 rounded">
															{executionStep.jobId}
														</code>
													</p>
												)}
											</div>
											{isCurrentStep && status === "running" && (
												<Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
											)}
										</div>

										{/* Show outputs if step completed */}
										{status === "completed" && executionStep?.outputs && (
											<div className="mt-3 pt-3 border-t">
												<p className="text-xs text-gray-500 mb-2">Outputs:</p>
												<div className="flex flex-wrap gap-2">
													{executionStep.outputs.summary && (
														<Badge variant="outline" className="text-xs">
															{executionStep.outputs.summary}
														</Badge>
													)}
													{!executionStep.outputs.summary && (
														<span className="text-xs text-gray-500">
															View job details for outputs
														</span>
													)}
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>

				{/* Action Buttons */}
				<Card>
					<CardContent className="pt-6">
						<div className="flex gap-3">
							{isCompleted && (
								<div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
									<div className="flex items-center gap-2">
										<CheckCircle2 className="h-5 w-5 text-green-600" />
										<div>
											<p className="text-sm font-medium text-green-900">
												Workflow Completed!
											</p>
											<p className="text-xs text-green-700">
												All {selectedWorkflow.steps.length} steps finished
												successfully.
											</p>
										</div>
									</div>
								</div>
							)}

							{isFailed && (
								<div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-4">
									<div className="flex items-center gap-2">
										<XCircle className="h-5 w-5 text-red-600" />
										<div>
											<p className="text-sm font-medium text-red-900">
												Workflow Failed
											</p>
											<p className="text-xs text-red-700">
												One or more steps failed. Check the job details for more
												information.
											</p>
										</div>
									</div>
								</div>
							)}

							{canContinue && !isExecuting && (
								<Button
									onClick={openContinueDialog}
									className="bg-purple-600 hover:bg-purple-700"
									size="lg"
								>
									<ChevronRight className="h-4 w-4 mr-2" />
									Continue to Step {execution.currentStep + 1}
								</Button>
							)}

							{isExecuting && (
								<Button disabled size="lg">
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Running Step {execution.currentStep}...
								</Button>
							)}

							{(isCompleted || isFailed) && (
								<Button
									variant="outline"
									onClick={() => router.push("/workspace?tab=jobs")}
								>
									View in Jobs
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	};

	const selectedFilesCount = mediaFiles.filter((f) => f.selected).length;
	const hasExecution = !!executionId;

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:bg-[#0d1117] dark:from-[#0d1117] dark:to-[#161b22]">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="flex items-center gap-4 mb-6">
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/workspace")}
						className="shrink-0"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Workspace
					</Button>
					<div className="flex items-center gap-3 flex-1">
						<div className="p-2 bg-purple-100 rounded-lg">
							<Zap className="h-6 w-6 text-purple-700" />
						</div>
						<div className="flex-1">
							<h1 className="text-2xl font-bold text-gray-900">
								Run Complex Workflow
							</h1>
							<p className="text-sm text-gray-600">
								Select a workflow, configure parameters, and execute
								step-by-step
							</p>
						</div>
						{/* Selected files indicator */}
						<div className="shrink-0 text-right">
							<div className="text-sm text-gray-500">Selected Files</div>
							<div className="text-lg font-bold text-purple-600">
								{selectedFilesCount}{" "}
								{selectedFilesCount === 1 ? "file" : "files"}
							</div>
						</div>
					</div>
				</div>

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="space-y-6"
				>
					<TabsList className="bg-white/50">
						<TabsTrigger
							value="workflow"
							className="data-[state=active]:bg-purple-100"
						>
							1. Select Workflow
						</TabsTrigger>
						<TabsTrigger
							value="configure"
							className="data-[state=active]:bg-purple-100"
							disabled={!selectedWorkflow}
						>
							2. Configure Parameters
						</TabsTrigger>
						<TabsTrigger
							value="execute"
							className="data-[state=active]:bg-purple-100"
							disabled={!selectedWorkflow}
						>
							3. Execute
						</TabsTrigger>
						<TabsTrigger
							value="progress"
							className="data-[state=active]:bg-purple-100"
							disabled={!hasExecution}
						>
							4. Progress
							{execution?.status === "running" && (
								<span className="ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
							)}
						</TabsTrigger>
					</TabsList>

					{/* Tab 1: Select Workflow */}
					<TabsContent value="workflow" className="space-y-6">
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="h-8 w-8 animate-spin text-purple-600" />
							</div>
						) : complexWorkflows.length === 0 ? (
							<Card>
								<CardContent className="flex flex-col items-center justify-center py-12">
									<AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
									<h3 className="text-lg font-medium text-gray-900 mb-2">
										No Complex Workflows
									</h3>
									<p className="text-sm text-gray-500 mb-4">
										Create a complex workflow first in the Workflows tab
									</p>
									<Button
										onClick={() => router.push("/workspace?tab=workflows")}
									>
										Go to Workflows
									</Button>
								</CardContent>
							</Card>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{complexWorkflows.map((workflow) => (
									<Card
										key={workflow.id}
										className={cn(
											"transition-all hover:shadow-md",
											selectedWorkflow?.id === workflow.id
												? "ring-2 ring-purple-500 bg-purple-50 shadow-lg"
												: "bg-white",
										)}
									>
										<CardHeader>
											<div className="flex items-start justify-between">
												<CardTitle className="text-lg">
													{workflow.name}
												</CardTitle>
												<Badge className="bg-purple-100 text-purple-800">
													{workflow.steps.length} steps
												</Badge>
											</div>
											{workflow.description && (
												<p className="text-sm text-gray-600 mt-2">
													{workflow.description}
												</p>
											)}
										</CardHeader>
										<CardContent>
											<div className="space-y-3">
												<div>
													<p className="text-xs text-gray-500 mb-2">Steps:</p>
													<div className="space-y-1">
														{workflow.steps.map((step: any) => (
															<div
																key={step.id}
																className="flex items-center gap-2 text-sm"
															>
																<Badge variant="outline" className="text-xs">
																	{step.stepNumber}
																</Badge>
																<span className="text-gray-700">
																	{step.workflowName}
																</span>
															</div>
														))}
													</div>
												</div>
												<Button
													onClick={(e) => {
														e.stopPropagation();
														handleWorkflowSelect(workflow);
													}}
													className={cn(
														"w-full",
														selectedWorkflow?.id === workflow.id
															? "bg-purple-600 hover:bg-purple-700"
															: "bg-gray-100 text-gray-700 hover:bg-gray-200",
													)}
												>
													{selectedWorkflow?.id === workflow.id
														? "Selected"
														: "Select"}
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</TabsContent>

					{/* Tab 2: Configure Parameters */}
					<TabsContent value="configure" className="space-y-6">
						{!selectedWorkflow ? (
							<Card>
								<CardContent className="flex flex-col items-center justify-center py-12">
									<AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
									<h3 className="text-lg font-medium text-gray-900 mb-2">
										No Workflow Selected
									</h3>
									<p className="text-sm text-gray-500 mb-4">
										Go to the first tab and select a complex workflow
									</p>
								</CardContent>
							</Card>
						) : (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Zap className="h-5 w-5 text-purple-600" />
											{selectedWorkflow.name}
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{selectedWorkflow.description && (
											<p className="text-sm text-gray-600">
												{selectedWorkflow.description}
											</p>
										)}

										<div>
											<h4 className="text-sm font-medium mb-2">
												Workflow Steps:
											</h4>
											<div className="space-y-2">
												{selectedWorkflow.steps.map((step: any) => (
													<div
														key={step.id}
														className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
													>
														<Badge className="bg-purple-100 text-purple-800">
															{step.stepNumber}
														</Badge>
														<div className="flex-1">
															<p className="text-sm font-medium">
																{step.workflowName}
															</p>
															<p className="text-xs text-gray-500">
																{step.parameters.length} parameter
																{step.parameters.length !== 1 ? "s" : ""}
															</p>
														</div>
													</div>
												))}
											</div>
										</div>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Step 1 Parameters</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{selectedWorkflow.steps[0]?.parameters.length === 0 ? (
											<p className="text-sm text-gray-500">
												This step has no parameters to configure.
											</p>
										) : (
											selectedWorkflow.steps[0].parameters.map((param) =>
												renderParameterInput(param),
											)
										)}
									</CardContent>
								</Card>
							</div>
						)}
					</TabsContent>

					{/* Tab 3: Execute */}
					<TabsContent value="execute" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Ready to Execute</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								{!selectedWorkflow ? (
									<p className="text-sm text-gray-500">
										Please select a workflow first.
									</p>
								) : execution ? (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
										<p className="text-sm text-blue-900">
											An execution is already in progress. Go to the{" "}
											<strong>Progress</strong> tab to view status.
										</p>
									</div>
								) : (
									<>
										<div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
											<h4 className="font-medium text-purple-900 mb-2">
												{selectedWorkflow.name}
											</h4>
											<p className="text-sm text-purple-700">
												{selectedWorkflow.steps.length} steps •{" "}
												{selectedWorkflow.steps[0]?.parameters.length || 0}{" "}
												parameters
											</p>
										</div>

										<div>
											<h4 className="text-sm font-medium mb-2">
												Selected Files
											</h4>
											{selectedFilesCount === 0 ? (
												<p className="text-sm text-gray-600">
													No files selected. Please select files from the media
													gallery below.
												</p>
											) : (
												<div className="space-y-2">
													<p className="text-sm text-gray-600">
														{selectedFilesCount} file
														{selectedFilesCount !== 1 ? "s" : ""} selected
													</p>
													<div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
														{mediaFiles
															.filter((f) => f.selected)
															.map((file) => (
																<div
																	key={file.id}
																	className="text-xs text-gray-700 py-1 px-2 hover:bg-gray-100 rounded"
																>
																	{file.name}
																</div>
															))}
													</div>
												</div>
											)}
										</div>

										<div className="flex gap-3">
											<Button
												onClick={handleExecute}
												disabled={isExecuting || selectedFilesCount === 0}
												className="bg-purple-600 hover:bg-purple-700"
												size="lg"
											>
												{isExecuting ? (
													<>
														<Loader2 className="h-4 w-4 mr-2 animate-spin" />
														Starting...
													</>
												) : (
													<>
														<Play className="h-4 w-4 mr-2 fill-current" />
														Start Workflow
													</>
												)}
											</Button>
										</div>
									</>
								)}
							</CardContent>
						</Card>

						{!execution && (
							<Card>
								<CardHeader>
									<CardTitle>Select Files</CardTitle>
								</CardHeader>
								<CardContent>
									<MediaGallery />
								</CardContent>
							</Card>
						)}
					</TabsContent>

					{/* Tab 4: Progress */}
					<TabsContent value="progress" className="space-y-6">
						{renderExecutionProgress()}
					</TabsContent>
				</Tabs>

				{/* Continue Dialog */}
				{showContinueDialog && nextStep && execution && (
					<ComplexWorkflowContinueDialog
						open={showContinueDialog}
						onClose={() => setShowContinueDialog(false)}
						onContinue={handleContinue}
						nextStep={nextStep}
						previousOutputs={
							execution.steps.find(
								(s) => s.stepNumber === execution.currentStep,
							)?.outputs
						}
						currentJobOutputs={
							execution.steps.find(
								(s) => s.stepNumber === execution.currentStep,
							)?.outputs
						}
					/>
				)}
			</div>
		</div>
	);
}

// Wrapper component with Suspense boundary for useSearchParams
export default function RunComplexWorkflowPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:bg-[#0d1117] dark:from-[#0d1117] dark:to-[#161b22] flex items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-purple-600" />
				</div>
			}
		>
			<RunComplexWorkflowContent />
		</Suspense>
	);
}
