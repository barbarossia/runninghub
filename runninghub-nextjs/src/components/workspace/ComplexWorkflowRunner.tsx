"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
	Play,
	Loader2,
	FileText,
	CheckCircle2,
	AlertCircle,
	ChevronRight,
	ChevronLeft,
	Zap,
	Clock,
	Plus,
	History,
	RefreshCw,
	Copy,
	ArrowRightLeft,
	FolderOpen,
	Save,
} from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useWorkspaceFolder } from "@/store/folder-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { WorkflowInputBuilder } from "@/components/workspace/WorkflowInputBuilder";
import { DuckDecodeButton } from "@/components/workspace/DuckDecodeButton";
import { ConsoleViewer } from "@/components/ui/ConsoleViewer";
import { useOutputTranslation } from "@/hooks/useOutputTranslation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS } from "@/constants";
import type {
	ComplexWorkflow,
	FileInputAssignment,
	ComplexWorkflowExecution,
	JobResult,
} from "@/types/workspace";

// Poll interval for execution status
const POLL_INTERVAL = 2000;

export function ComplexWorkflowRunner() {
	const {
		workflows,
		activeComplexExecutionId,
		setActiveComplexExecutionId,
		setSelectedComplexWorkflowId,
		setWorkflows,
		setJobFiles,
		clearJobInputs,
		addJob,
		updateJob,
		getJobById,
	} = useWorkspaceStore();
	const { selectedFolder: workspaceFolder } = useWorkspaceFolder();

	const [complexWorkflow, setComplexWorkflow] =
		useState<ComplexWorkflow | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isExecuting, setIsExecuting] = useState(false);
	const [textInputs, setTextInputs] = useState<Record<string, string>>({});
	const [fileInputs, setFileInputs] = useState<FileInputAssignment[]>([]);
	const [deleteSourceFiles, setDeleteSourceFiles] = useState(false);
	const [workflowDetails, setWorkflowDetails] = useState<
		Record<string, { name: string; description?: string }>
	>({});
	const [activeConsoleTaskId, setActiveConsoleTaskId] = useState<string | null>(
		null,
	);

	// Execution history state
	const [executionHistory, setExecutionHistory] = useState<
		ComplexWorkflowExecution[]
	>([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(true);

	// Available templates state (for right panel when no execution active)
	const [availableTemplates, setAvailableTemplates] = useState<
		ComplexWorkflow[]
	>([]);
	const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

	// Execution state
	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [executionData, setExecutionData] =
		useState<ComplexWorkflowExecution | null>(null);
	const [stepOutputs, setStepOutputs] = useState<Record<number, JobResult>>({});
	const [isHistoryVisible, setIsHistoryVisible] = useState(true);
	const [prefillTextInputs, setPrefillTextInputs] = useState<
		Record<string, string>
	>({});
	const [prefillDeleteSourceFiles, setPrefillDeleteSourceFiles] =
		useState(false);
	const [leftLang, setLeftLang] = useState<"original" | "en" | "zh">("en");
	const [rightLang, setRightLang] = useState<"original" | "en" | "zh">("zh");

	const [editedText, setEditedText] = useState<
		Record<string, { original: string; en?: string; zh?: string }>
	>({});
	const [translating, setTranslating] = useState<
		Record<string, "left" | "right" | null>
	>({});
	const [debouncedTimers, setDebouncedTimers] = useState<
		Record<string, NodeJS.Timeout>
	>({});
	const [isSaving, setIsSaving] = useState(false);

	const [decodedFiles, setDecodedFiles] = useState<
		Record<
			string,
			{
				decodedPath: string;
				fileType: string;
				decodedFileType: "image" | "video";
			}
		>
	>({});
	const [imageVersion, setImageVersion] = useState<Record<string, number>>({});

	const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const prefillKeyRef = useRef<string | null>(null);

	const prefillKey = activeComplexExecutionId
		? `${activeComplexExecutionId}:${currentStepIndex}`
		: null;

	type OutputEntry = {
		type: "file" | "text";
		content?: string;
		path?: string;
		workspacePath?: string;
		fileName?: string;
		fileType?: "text" | "image" | "video";
		fileSize?: number;
		parameterId?: string;
	};

	const getBaseName = (value?: string) => {
		if (!value) return "";
		const parts = value.split("/");
		return parts[parts.length - 1] || "";
	};

	const inferMediaTypeFromName = (value?: string) => {
		if (!value) return null;
		const lower = value.toLowerCase();
		if (/\.(mp4|mov|avi|webm|mkv)$/i.test(lower)) return "video";
		if (/\.(png|jpg|jpeg|bmp|webp|gif|tif|tiff|svg)$/i.test(lower))
			return "image";
		return null;
	};

	const buildOutputMap = useCallback((jobResult?: JobResult) => {
		const outputMap = new Map<string, OutputEntry>();
		const outputs = jobResult?.outputs || [];
		const textOutputs = jobResult?.textOutputs || [];

		for (const [index, output] of outputs.entries()) {
			const matchingTextOutput =
				output.type === "text"
					? textOutputs.find(
							(textOutput) =>
								(textOutput.fileName &&
									textOutput.fileName === output.fileName) ||
								(textOutput.filePath && textOutput.filePath === output.path),
						)
					: null;
			const normalizedOutput: OutputEntry =
				output.type === "text"
					? {
							...output,
							content: output.content ?? matchingTextOutput?.content?.original,
						}
					: output;

			if (normalizedOutput.parameterId) {
				outputMap.set(normalizedOutput.parameterId, normalizedOutput);
			}
			outputMap.set(`output_${index}`, normalizedOutput);
			outputMap.set(`${index + 1}-output`, normalizedOutput);
			outputMap.set(`output-${index + 1}`, normalizedOutput);
			if (normalizedOutput.fileName) {
				outputMap.set(normalizedOutput.fileName, normalizedOutput);
			}
		}

		for (const [index, textOutput] of textOutputs.entries()) {
			const textEntry: OutputEntry = {
				type: "text",
				content: textOutput.content?.original,
				fileName: textOutput.fileName,
				path: textOutput.filePath,
			};
			if (!outputMap.has(`output_${index}`)) {
				outputMap.set(`output_${index}`, textEntry);
			}
			if (!outputMap.has(`${index + 1}-output`)) {
				outputMap.set(`${index + 1}-output`, textEntry);
			}
			if (textOutput.fileName && !outputMap.has(textOutput.fileName)) {
				outputMap.set(textOutput.fileName, textEntry);
			}
		}

		return outputMap;
	}, []);

	const normalizeStepInputs = useCallback(
		(
			inputs?: Record<string, any>,
			fallback?: {
				fileInputs: FileInputAssignment[];
				textInputs: Record<string, string>;
				deleteSourceFiles?: boolean;
			},
		) => {
			const fallbackFileInputs = fallback?.fileInputs || [];
			const fallbackTextInputs = fallback?.textInputs || {};
			const fallbackDeleteSourceFiles = fallback?.deleteSourceFiles ?? false;

			if (!inputs || typeof inputs !== "object") {
				return {
					fileInputs: fallbackFileInputs,
					textInputs: fallbackTextInputs,
					deleteSourceFiles: fallbackDeleteSourceFiles,
				};
			}
			const isStructured =
				"fileInputs" in inputs ||
				"textInputs" in inputs ||
				"deleteSourceFiles" in inputs;
			if (!isStructured) {
				return {
					fileInputs: fallbackFileInputs,
					textInputs: inputs as Record<string, string>,
					deleteSourceFiles: fallbackDeleteSourceFiles,
				};
			}
			return {
				fileInputs: Array.isArray((inputs as any).fileInputs)
					? (inputs as any).fileInputs
					: fallbackFileInputs,
				textInputs: (inputs as any).textInputs || fallbackTextInputs,
				deleteSourceFiles:
					typeof (inputs as any).deleteSourceFiles === "boolean"
						? (inputs as any).deleteSourceFiles
						: fallbackDeleteSourceFiles,
			};
		},
		[],
	);

	// Derived state for current step
	const currentStep = useMemo(() => {
		if (!complexWorkflow) return null;
		return complexWorkflow.steps.find(
			(s) => s.stepNumber === currentStepIndex + 1,
		);
	}, [complexWorkflow, currentStepIndex]);

	const currentWorkflowTemplate = useMemo(() => {
		if (!currentStep) return null;
		return workflows.find((w) => w.id === currentStep.workflowId);
	}, [currentStep, workflows]);

	const displayWorkflow = useMemo(() => {
		if (!currentWorkflowTemplate) return undefined;
		return {
			...currentWorkflowTemplate,
			inputs: currentWorkflowTemplate.inputs.map((input) => ({
				...input,
				// Swap name and description
				name: input.description || input.name,
				description: input.description ? input.name : undefined,
			})),
		};
	}, [currentWorkflowTemplate]);

	const getMappedInputsForCurrentStep = useCallback(() => {
		if (!currentStep || !displayWorkflow || !executionData) return null;

		const paramDefinitions = new Map(
			displayWorkflow.inputs.map((param) => [param.id, param]),
		);
		const outputMapCache = new Map<number, Map<string, OutputEntry>>();
		const inputCache = new Map<
			number,
			{ fileInputs: FileInputAssignment[]; textInputs: Record<string, string> }
		>();

		const getStepOutputMap = (stepNumber: number) => {
			if (outputMapCache.has(stepNumber))
				return outputMapCache.get(stepNumber)!;
			const step = executionData.steps.find(
				(candidate) => candidate.stepNumber === stepNumber,
			);
			const jobFromStore = step?.jobId ? getJobById(step.jobId) : undefined;
			const jobResult =
				jobFromStore?.results || stepOutputs[stepNumber] || step?.outputs;
			const mappedJobResult =
				jobResult?.outputs && jobResult.outputs.length > 0
					? {
							...jobResult,
							outputs: jobResult.outputs.map((output) => {
								if (!output.path) return output;
								const decoded = decodedFiles[output.path];
								if (!decoded) return output;
								const decodedFileName =
									getBaseName(decoded.decodedPath) || output.fileName;
								return {
									...output,
									path: decoded.decodedPath,
									workspacePath: decoded.decodedPath,
									fileName: decodedFileName,
									fileType: decoded.decodedFileType,
								};
							}),
						}
					: jobResult;
			const map = buildOutputMap(mappedJobResult);
			outputMapCache.set(stepNumber, map);
			return map;
		};

		const getStepAliasOutput = (stepNumber: number) => {
			const outputMap = getStepOutputMap(stepNumber);
			return (
				outputMap.get("1-output") ||
				outputMap.get("output_0") ||
				outputMap.get("output-1") ||
				null
			);
		};

		const getStepInputs = (stepNumber: number) => {
			if (inputCache.has(stepNumber)) return inputCache.get(stepNumber)!;
			const step = executionData.steps.find(
				(candidate) => candidate.stepNumber === stepNumber,
			);
			const fallbackJob = step?.jobId ? getJobById(step.jobId) : undefined;
			const normalized = normalizeStepInputs(
				step?.inputs,
				fallbackJob
					? {
							fileInputs: fallbackJob.fileInputs || [],
							textInputs: fallbackJob.textInputs || {},
							deleteSourceFiles: fallbackJob.deleteSourceFiles,
						}
					: undefined,
			);
			const inputs = {
				fileInputs: normalized.fileInputs,
				textInputs: normalized.textInputs,
			};
			inputCache.set(stepNumber, inputs);
			return inputs;
		};

		const mappedTextInputs: Record<string, string> = {};
		const mappedFileInputs: FileInputAssignment[] = [];

		for (const param of currentStep.parameters) {
			const definition = paramDefinitions.get(param.parameterId);
			const isFileParam = definition?.type === "file";

			if (param.valueType === "static") {
				if (!isFileParam && param.staticValue !== undefined) {
					mappedTextInputs[param.parameterId] = String(param.staticValue);
				}
				continue;
			}

			if (param.valueType === "dynamic" && param.dynamicMapping) {
				const outputMap = getStepOutputMap(
					param.dynamicMapping.sourceStepNumber,
				);
				const stepAliasKey = `${param.dynamicMapping.sourceStepNumber}-output`;
				const output =
					outputMap.get(param.dynamicMapping.sourceParameterId) ||
					outputMap.get(param.dynamicMapping.sourceOutputName) ||
					(param.dynamicMapping.sourceParameterId === stepAliasKey ||
					param.dynamicMapping.sourceOutputName === stepAliasKey
						? getStepAliasOutput(param.dynamicMapping.sourceStepNumber)
						: null);

				if (!output) continue;

				if (isFileParam) {
					const path = output.path || output.workspacePath;
					if (!path) continue;
					const resolvedFileName = output.fileName || getBaseName(path);
					const inferredType =
						output.fileType === "image" || output.fileType === "video"
							? output.fileType
							: definition?.validation?.mediaType ||
								inferMediaTypeFromName(resolvedFileName) ||
								"image";
					mappedFileInputs.push({
						parameterId: param.parameterId,
						filePath: path,
						fileName: resolvedFileName || "output",
						fileSize: output.fileSize || 0,
						fileType: inferredType,
						valid: true,
					});
				} else {
					const value =
						output.type === "text"
							? output.content
							: output.path || output.workspacePath || output.fileName;
					if (value !== undefined) {
						mappedTextInputs[param.parameterId] = String(value);
					}
				}
				continue;
			}

			if (param.valueType === "previous-input" && param.previousInputMapping) {
				const previousInputs = getStepInputs(
					param.previousInputMapping.sourceStepNumber,
				);
				if (isFileParam) {
					const matches = previousInputs.fileInputs.filter(
						(input: FileInputAssignment) =>
							input.parameterId ===
							param.previousInputMapping?.sourceParameterId,
					);
					matches.forEach((input: FileInputAssignment) => {
						mappedFileInputs.push({
							...input,
							parameterId: param.parameterId,
						});
					});
				} else {
					const value =
						previousInputs.textInputs[
							param.previousInputMapping.sourceParameterId
						];
					if (value !== undefined) {
						mappedTextInputs[param.parameterId] = String(value);
					}
				}
			}
		}

		return {
			fileInputs: mappedFileInputs,
			textInputs: mappedTextInputs,
		};
	}, [
		currentStep,
		displayWorkflow,
		executionData,
		buildOutputMap,
		getJobById,
		normalizeStepInputs,
		stepOutputs,
	]);

	const currentExecutionStep = useMemo(() => {
		if (!executionData) return null;
		return (
			executionData.steps.find((s) => s.stepNumber === currentStepIndex + 1) ||
			null
		);
	}, [executionData, currentStepIndex]);

	const currentJob = currentExecutionStep?.jobId
		? getJobById(currentExecutionStep.jobId)
		: undefined;

	const { isTranslating } = useOutputTranslation(
		currentExecutionStep?.jobId || "",
	);

	// Fetch execution history
	const fetchHistory = useCallback(async () => {
		setIsLoadingHistory(true);
		try {
			const res = await fetch("/api/workspace/complex-workflow/execution/list");
			const data = await res.json();
			if (data.success) {
				setExecutionHistory(data.executions || []);
			}
		} catch (error) {
			console.error("Failed to fetch execution history:", error);
		} finally {
			setIsLoadingHistory(false);
		}
	}, []);

	// Fetch available templates
	const fetchTemplates = useCallback(async () => {
		setIsLoadingTemplates(true);
		try {
			const res = await fetch("/api/workspace/complex-workflow/list");
			const data = await res.json();
			if (data.success) {
				setAvailableTemplates(data.workflows || []);
			}
		} catch (error) {
			console.error("Failed to fetch templates:", error);
		} finally {
			setIsLoadingTemplates(false);
		}
	}, []);

	useEffect(() => {
		fetchHistory();
		fetchTemplates();
	}, [fetchHistory, fetchTemplates]);

	// Load execution data when active ID changes
	useEffect(() => {
		const loadExecution = async () => {
			// If no active execution ID, just show the template list (right panel)
			// We do NOT auto-select the latest anymore, as per 2-panel design requirement
			if (!activeComplexExecutionId) {
				setComplexWorkflow(null);
				setExecutionData(null);
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			try {
				// 1. Get Execution
				const execRes = await fetch(
					`/api/workspace/complex-workflow/execution/${activeComplexExecutionId}`,
					{ cache: "no-store" },
				);
				const execData = await execRes.json();

				if (!execData.success || !execData.execution) {
					toast.error("Failed to load execution");
					setActiveComplexExecutionId(null);
					return;
				}

				const execution = execData.execution as ComplexWorkflowExecution;
				setExecutionData(execution);
				setSelectedComplexWorkflowId(execution.complexWorkflowId);

				// Restore outputs from completed steps
				const outputs: Record<number, JobResult> = {};
				execution.steps.forEach((step) => {
					if (step.status === "completed" && step.outputs) {
						outputs[step.stepNumber] = step.outputs;
					}
				});
				setStepOutputs(outputs);

				// Set current step index (0-based)
				const stepIndex =
					execution.status === "completed"
						? execution.steps.length - 1
						: execution.currentStep - 1;
				setCurrentStepIndex(stepIndex);

				// 2. Get Complex Workflow Definition
				const wfRes = await fetch(
					`/api/workspace/complex-workflow/${execution.complexWorkflowId}`,
				);
				const wfData = await wfRes.json();

				if (wfData.success && wfData.workflow) {
					setComplexWorkflow(wfData.workflow);
				} else {
					toast.error("Failed to load complex workflow definition");
				}

				// 3. Ensure simple workflows are loaded
				if (workflows.length === 0) {
					const wfsRes = await fetch("/api/workflow/list");
					const wfsData = await wfsRes.json();
					if (wfsData.success && wfsData.workflows) {
						setWorkflows(wfsData.workflows);
					}
				}

				// If running, start polling
				if (
					execution.status === "running" ||
					execution.steps[stepIndex]?.status === "running"
				) {
					setIsExecuting(true);
				}
			} catch (error) {
				console.error("Failed to restore execution:", error);
				toast.error("Failed to restore execution state");
			} finally {
				setIsLoading(false);
			}
		};

		loadExecution();
	}, [
		activeComplexExecutionId,
		setActiveComplexExecutionId,
		setWorkflows,
		workflows.length,
	]);

	useEffect(() => {
		return () => {
			Object.values(debouncedTimers).forEach((timer) => clearTimeout(timer));
		};
	}, [debouncedTimers]);

	useEffect(() => {
		if (!prefillKey) {
			clearJobInputs();
			setPrefillTextInputs({});
			setPrefillDeleteSourceFiles(false);
			prefillKeyRef.current = null;
			return;
		}

		if (!currentExecutionStep) return;

		const prefillToken = `${prefillKey}:${currentExecutionStep.jobId || "no-job"}:${currentJob ? "job" : "no-job"}:${displayWorkflow?.id || "no-workflow"}`;
		if (prefillKeyRef.current === prefillToken) return;

		const fallbackInputs = currentJob
			? {
					fileInputs: currentJob.fileInputs || [],
					textInputs: currentJob.textInputs || {},
					deleteSourceFiles: currentJob.deleteSourceFiles,
				}
			: undefined;

		const nextInputs = normalizeStepInputs(
			currentExecutionStep.inputs,
			fallbackInputs,
		);
		const mappedInputs = getMappedInputsForCurrentStep();
		const mergedTextInputs = mappedInputs
			? { ...mappedInputs.textInputs, ...nextInputs.textInputs }
			: nextInputs.textInputs;
		const existingFileParams = new Set(
			nextInputs.fileInputs.map(
				(input: FileInputAssignment) => input.parameterId,
			),
		);
		const mergedFileInputs = mappedInputs
			? [
					...nextInputs.fileInputs,
					...mappedInputs.fileInputs.filter(
						(input) => !existingFileParams.has(input.parameterId),
					),
				]
			: nextInputs.fileInputs;
		setJobFiles(mergedFileInputs);
		setPrefillTextInputs(mergedTextInputs);
		setPrefillDeleteSourceFiles(nextInputs.deleteSourceFiles);
		prefillKeyRef.current = prefillToken;
	}, [
		prefillKey,
		currentExecutionStep,
		currentJob,
		normalizeStepInputs,
		getMappedInputsForCurrentStep,
		setJobFiles,
		displayWorkflow?.id,
		clearJobInputs,
	]);

	useEffect(() => {
		const jobId = currentExecutionStep?.jobId;
		if (!jobId) return;

		const loadJob = async () => {
			try {
				const response = await fetch(`/api/workspace/jobs/${jobId}`);
				const data = await response.json();
				if (!data.success || !data.job) return;

				const existing = getJobById(jobId);
				if (existing) {
					updateJob(jobId, data.job);
				} else {
					addJob(data.job);
				}
			} catch (error) {
				console.error("Failed to load job details:", error);
			}
		};

		loadJob();
	}, [currentExecutionStep?.jobId, addJob, updateJob, getJobById]);

	// Load workflow details map
	useEffect(() => {
		if (!complexWorkflow || workflows.length === 0) return;

		const details: Record<string, { name: string; description?: string }> = {};

		for (const step of complexWorkflow.steps) {
			const workflow = workflows.find((w) => w.id === step.workflowId);
			if (workflow) {
				details[step.workflowId] = {
					name: workflow.name,
					description: workflow.description,
				};
			}
		}

		setWorkflowDetails(details);
	}, [complexWorkflow, workflows.length, workflows]);

	// Polling logic
	const pollStatus = useCallback(async () => {
		if (!activeComplexExecutionId) return;

		try {
			const response = await fetch(
				`/api/workspace/complex-workflow/execution/${activeComplexExecutionId}`,
				{ cache: "no-store" },
			);
			const data = await response.json();

			if (data.success && data.execution) {
				setExecutionData(data.execution);

				const executionStep = data.execution.steps.find(
					(s: any) => s.stepNumber === currentStepIndex + 1,
				);

				if (
					executionStep?.jobId &&
					executionStep.status === "running" &&
					!activeConsoleTaskId
				) {
					try {
						const jobRes = await fetch(
							`/api/workspace/jobs/${executionStep.jobId}`,
						);
						const jobData = await jobRes.json();
						if (jobData.success && jobData.job?.taskId) {
							setActiveConsoleTaskId(jobData.job.taskId);
						}
					} catch (err) {
						console.error("Failed to fetch job details", err);
					}
				}

				if (executionStep?.status === "completed" && executionStep.outputs) {
					setStepOutputs((prev) => ({
						...prev,
						[currentStepIndex + 1]: executionStep.outputs,
					}));
					setIsExecuting(false);
				} else if (executionStep?.status === "failed") {
					setIsExecuting(false);
					toast.error(`Step ${currentStepIndex + 1} failed`);
				}
			}
		} catch (error) {
			console.error("Failed to poll status:", error);
		}
	}, [activeComplexExecutionId, currentStepIndex, activeConsoleTaskId]);

	useEffect(() => {
		if (isExecuting && activeComplexExecutionId) {
			pollIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL);
		}
		return () => {
			if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
		};
	}, [isExecuting, activeComplexExecutionId, pollStatus]);

	// Execute Step Logic
	const handleStepRun = async (data?: {
		fileInputs: FileInputAssignment[];
		textInputs: Record<string, string>;
		deleteSourceFiles?: boolean;
	}) => {
		if (!complexWorkflow || !currentStep || !data) return;

		const { fileInputs, textInputs, deleteSourceFiles } = data;

		if (fileInputs.length === 0 && Object.keys(textInputs).length === 0) {
			toast.error("Please provide at least one file or text input");
			return;
		}

		setIsExecuting(true);

		try {
			let response;

			if (currentStepIndex === 0) {
				response = await fetch("/api/workspace/complex-workflow/execute", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						complexWorkflowId: complexWorkflow.id,
						initialParameters: {
							fileInputs,
							textInputs,
							deleteSourceFiles,
						},
					}),
				});
			} else {
				if (!activeComplexExecutionId) {
					throw new Error("No execution ID found for continuation");
				}

				response = await fetch("/api/workspace/complex-workflow/continue", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						executionId: activeComplexExecutionId,
						stepNumber: currentStepIndex,
						parameters: {
							fileInputs,
							textInputs,
							deleteSourceFiles,
						},
					}),
				});
			}

			const resData = await response.json();

			if (resData.success) {
				if (resData.executionId) {
					setActiveComplexExecutionId(resData.executionId);
					// Refresh history list
					fetchHistory();
				}
				toast.success(`Step ${currentStepIndex + 1} started`);
				pollStatus();
			} else {
				toast.error(resData.error || "Failed to execute step");
				setIsExecuting(false);
			}
		} catch (error) {
			console.error("Execution error:", error);
			toast.error("Failed to execute step");
			setIsExecuting(false);
		}
	};

	const handleNextStep = () => {
		if (currentStepIndex < (complexWorkflow?.steps.length || 0) - 1) {
			setCurrentStepIndex((prev) => prev + 1);
			setFileInputs([]);
			setTextInputs({});
			setActiveConsoleTaskId(null);
		} else {
			toast.success("Workflow completed!");
		}
	};

	const handleInputChange = (data?: {
		fileInputs: FileInputAssignment[];
		textInputs: Record<string, string>;
		deleteSourceFiles?: boolean;
	}) => {
		if (!data) return;
		setFileInputs(data.fileInputs);
		setTextInputs(data.textInputs);
		if (data.deleteSourceFiles !== undefined) {
			setDeleteSourceFiles(data.deleteSourceFiles);
		}
	};

	// Status helpers
	const getStepStatus = (stepNumber: number) => {
		if (!executionData) return stepNumber === 1 ? "pending" : "waiting";
		const step = executionData.steps.find((s) => s.stepNumber === stepNumber);
		if (step) return step.status;
		return stepNumber === currentStepIndex + 1 ? "pending" : "waiting";
	};

	const isStepCompleted = getStepStatus(currentStepIndex + 1) === "completed";
	const hasNextStep =
		currentStepIndex < (complexWorkflow?.steps.length || 0) - 1;
	const currentStepOutput =
		currentJob?.results || stepOutputs[currentStepIndex + 1];
	const fileOutputs =
		currentStepOutput?.outputs?.filter(
			(output) => output.fileType !== "text",
		) || [];
	const fallbackTextOutputs = (currentStepOutput?.outputs || [])
		.filter((output) => output.fileType === "text")
		.map((output) => ({
			fileName: output.fileName || "text-output.txt",
			filePath: output.path || output.workspacePath || "",
			content: {
				original: "",
			},
		}));
	const textOutputs =
		currentStepOutput?.textOutputs && currentStepOutput.textOutputs.length > 0
			? currentStepOutput.textOutputs
			: fallbackTextOutputs;
	const getTextContent = (
		output: { content: { original: string; en?: string; zh?: string } },
		lang: "original" | "en" | "zh",
	) => {
		if (lang === "original") return output.content.original || "";
		return output.content[lang] || "";
	};
	const getTranslationError = (output: unknown) => {
		return (output as { translationError?: string }).translationError;
	};

	useEffect(() => {
		if (currentStepOutput?.textOutputs) {
			const initial: Record<
				string,
				{ original: string; en?: string; zh?: string }
			> = {};
			currentStepOutput.textOutputs.forEach((output) => {
				if (!output.filePath) return;
				initial[output.filePath] = { ...output.content };
			});
			setEditedText(initial);
		}
	}, [currentStepOutput?.textOutputs]);

	const handleSaveToWorkspace = async (filePath: string, fileName: string) => {
		if (!workspaceFolder?.folder_path) {
			toast.error("Please select a workspace folder first");
			return;
		}

		try {
			const response = await fetch("/api/workspace/copy-to-folder", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sourcePath: filePath,
					targetFolder: workspaceFolder.folder_path,
					fileName,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to save to workspace");
			}

			toast.success(`Saved to workspace: ${fileName}`);
		} catch (error) {
			console.error("Save to workspace failed:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to save to workspace",
			);
		}
	};

	const handleFileDecoded = (
		sourcePath: string,
		decodedPath: string,
		fileType: string,
		decodedFileType: "image" | "video",
	) => {
		setDecodedFiles((prev) => ({
			...prev,
			[sourcePath]: { decodedPath, fileType, decodedFileType },
		}));
		setImageVersion((prev) => ({
			...prev,
			[sourcePath]: Date.now(),
		}));
	};

	const handleTextEdit = (
		filePath: string,
		lang: "original" | "en" | "zh",
		value: string,
		pane: "left" | "right",
	) => {
		setEditedText((prev) => ({
			...prev,
			[filePath]: {
				...prev[filePath],
				[lang]: value,
			},
		}));

		const timerKey = `${filePath}-${pane}`;
		if (debouncedTimers[timerKey]) {
			clearTimeout(debouncedTimers[timerKey]);
		}

		const timer = setTimeout(async () => {
			const otherPane = pane === "left" ? rightLang : leftLang;
			setTranslating((prev) => ({ ...prev, [filePath]: pane }));

			try {
				const detectResponse = await fetch(
					`/api/translate?text=${encodeURIComponent(value.slice(0, 500))}`,
				);
				if (!detectResponse.ok) {
					throw new Error("Language detection failed");
				}

				const detectData = await detectResponse.json();
				if (!detectData.success) {
					throw new Error("Language detection failed");
				}

				const detectedLang = detectData.detectedLang;

				if (otherPane === "original") {
					const targetLang = detectedLang === "zh" ? "en" : "zh";

					if (detectedLang === targetLang) {
						setEditedText((prev) => ({
							...prev,
							[filePath]: {
								...prev[filePath],
								original: value,
							},
						}));
						setTranslating((prev) => ({ ...prev, [filePath]: null }));
						return;
					}

					const translateResponse = await fetch("/api/translate", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							text: value,
							sourceLang: detectedLang,
							targetLang: targetLang,
						}),
					});

					if (!translateResponse.ok) {
						throw new Error("Translation failed");
					}

					const translateData = await translateResponse.json();
					if (!translateData.success) {
						throw new Error(translateData.error || "Translation failed");
					}

					setEditedText((prev) => ({
						...prev,
						[filePath]: {
							...prev[filePath],
							original: value,
							[targetLang]: translateData.translatedText,
						},
					}));
					setTranslating((prev) => ({ ...prev, [filePath]: null }));
					return;
				}

				if (detectedLang === otherPane) {
					setTranslating((prev) => ({ ...prev, [filePath]: null }));
					return;
				}

				const translateResponse = await fetch("/api/translate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						text: value,
						sourceLang:
							detectedLang === "en" || detectedLang === "zh"
								? detectedLang
								: "autodetect",
						targetLang: otherPane,
					}),
				});

				if (!translateResponse.ok) {
					throw new Error("Translation failed");
				}

				const translateData = await translateResponse.json();
				if (!translateData.success) {
					throw new Error(translateData.error || "Translation failed");
				}

				setEditedText((prev) => ({
					...prev,
					[filePath]: {
						...prev[filePath],
						[otherPane]: translateData.translatedText,
					},
				}));
			} catch (error) {
				console.error("Real-time translation error:", error);
			} finally {
				setTranslating((prev) => ({ ...prev, [filePath]: null }));
			}
		}, 500);

		setDebouncedTimers((prev) => ({ ...prev, [timerKey]: timer }));
	};

	const handleSaveText = async (
		filePath: string,
		lang: "original" | "en" | "zh",
	) => {
		const content = editedText[filePath]?.[lang];
		if (content === undefined) return;

		setIsSaving(true);
		try {
			const response = await fetch(API_ENDPOINTS.WORKSPACE_UPDATE_CONTENT, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ filePath, content }),
			});

			const data = await response.json();
			if (!data.success) throw new Error(data.error || "Save failed");

			toast.success("File updated successfully");

			if (currentJob?.results?.textOutputs) {
				const newTextOutputs = currentJob.results.textOutputs.map((output) => {
					if (output.filePath === filePath) {
						return {
							...output,
							content: {
								...output.content,
								[lang]: content,
							},
						};
					}
					return output;
				});

				updateJob(currentJob.id, {
					results: {
						...currentJob.results,
						textOutputs: newTextOutputs,
					},
				});
			}
		} catch (error) {
			console.error("Failed to save text:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to save text",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleStartNew = (workflowId: string) => {
		setSelectedComplexWorkflowId(workflowId);
		// Navigate to execute page to start fresh
		// Alternatively, we could reset state here and show Step 1 inputs
		// But sticking to the URL pattern might be cleaner for "starting fresh"
		// Actually, user wants it in this view.

		// Clear active execution to show the "Start" UI for this workflow?
		// Or create a pending execution?
		// Let's just navigate to the page which initializes everything
		window.location.href = `/workspace/complex-workflow/execute/${workflowId}`;
	};

	return (
		<div className="h-full flex gap-6">
			{/* LEFT PANEL: Execution History */}
			{isHistoryVisible && (
				<div className="w-80 flex flex-col shrink-0">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
							<History className="h-5 w-5" />
							History
						</h3>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								onClick={fetchHistory}
								disabled={isLoadingHistory}
							>
								<div className={cn(isLoadingHistory && "animate-spin")}>
									<RefreshCw className="h-4 w-4" />
								</div>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsHistoryVisible(false)}
								aria-label="Hide history panel"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<Card className="flex-1 overflow-hidden flex flex-col">
						<div className="flex-1 overflow-y-auto">
							<div className="p-3 space-y-2">
								{executionHistory.length === 0 ? (
									<div className="text-center py-8 text-muted-foreground text-sm">
										No executions yet
									</div>
								) : (
									executionHistory.map((exec) => (
										<div
											key={exec.id}
											onClick={() => setActiveComplexExecutionId(exec.id)}
											className={cn(
												"p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent",
												activeComplexExecutionId === exec.id
													? "bg-purple-50 border-purple-200 ring-1 ring-purple-300"
													: "bg-card border-border",
											)}
										>
											<div className="flex justify-between items-start mb-1">
												<span
													className="font-medium text-sm truncate"
													title={exec.name}
												>
													{exec.name}
												</span>
												<Badge
													variant="outline"
													className={cn(
														"text-[10px] h-5",
														exec.status === "completed" &&
															"bg-green-50 text-green-700 border-green-200",
														exec.status === "running" &&
															"bg-blue-50 text-blue-700 border-blue-200",
														exec.status === "failed" &&
															"bg-red-50 text-red-700 border-red-200",
													)}
												>
													{exec.status}
												</Badge>
											</div>
											<div className="text-xs text-muted-foreground flex justify-between">
												<span>
													Step {exec.currentStep}/{exec.steps.length}
												</span>
												<span>
													{new Date(exec.createdAt).toLocaleDateString()}
												</span>
											</div>
										</div>
									))
								)}
							</div>
						</div>
					</Card>
				</div>
			)}

			{/* RIGHT PANEL: Active Runner OR Available Workflows */}
			<div className="flex-1 min-w-0 flex flex-col">
				{!activeComplexExecutionId ? (
					/* Available Templates View */
					<div className="h-full flex flex-col">
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
								<Zap className="h-5 w-5" />
								Start New Workflow
							</h3>
							<div className="flex items-center gap-2">
								{!isHistoryVisible && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setIsHistoryVisible(true)}
									>
										<ChevronRight className="h-4 w-4 mr-1" />
										Show History
									</Button>
								)}
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										(window.location.href = "/workspace?tab=workflows")
									}
								>
									Manage Workflows
								</Button>
							</div>
						</div>

						<Card className="flex-1 p-6 overflow-hidden flex flex-col">
							<div className="flex-1 overflow-y-auto -mr-4 pr-4">
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{availableTemplates.map((wf) => (
										<Card
											key={wf.id}
											className="p-4 hover:border-purple-400 hover:shadow-md cursor-pointer transition-all group"
											onClick={() => handleStartNew(wf.id)}
										>
											<div className="flex justify-between items-start mb-2">
												<div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
													<Zap className="h-5 w-5 text-purple-600" />
												</div>
												<Badge variant="secondary">
													{wf.steps.length} steps
												</Badge>
											</div>
											<h4 className="font-semibold text-gray-900 mb-1">
												{wf.name}
											</h4>
											<p className="text-sm text-muted-foreground line-clamp-2 mb-4">
												{wf.description || "No description provided"}
											</p>
											<Button className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 group-hover:bg-purple-600 group-hover:text-white transition-colors">
												Start Execution
											</Button>
										</Card>
									))}

									{/* Create New Card */}
									<Card
										className="p-4 border-dashed hover:border-purple-400 hover:bg-purple-50/50 cursor-pointer transition-all flex flex-col items-center justify-center text-center min-h-[200px]"
										onClick={() =>
											(window.location.href = "/workspace?tab=workflows")
										}
									>
										<div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
											<Plus className="h-6 w-6 text-gray-400" />
										</div>
										<h4 className="font-medium text-gray-900">
											Create New Template
										</h4>
										<p className="text-sm text-muted-foreground mt-1">
											Design a new complex workflow
										</p>
									</Card>
								</div>
							</div>
						</Card>
					</div>
				) : (
					/* Active Runner View */
					<div className="h-full flex flex-col">
						{/* Header */}
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
									<Play className="h-5 w-5 text-purple-600" />
									Running: {complexWorkflow?.name || "Loading..."}
								</h3>
								{complexWorkflow && (
									<Badge variant="outline" className="text-xs">
										{complexWorkflow.steps.length} steps
									</Badge>
								)}
							</div>
							<div className="flex items-center gap-2">
								{!isHistoryVisible && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setIsHistoryVisible(true)}
									>
										<ChevronRight className="h-4 w-4 mr-1" />
										Show History
									</Button>
								)}
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setActiveComplexExecutionId(null)}
								>
									Close Execution
								</Button>
							</div>
						</div>

						{/* Split Runner Layout: Steps (Left) + Input/Output (Right) */}
						<div className="flex-1 flex gap-6 min-h-0">
							{/* Steps List */}
							<div className="w-64 shrink-0 flex flex-col">
								<Card className="flex-1 overflow-hidden flex flex-col">
									<div className="p-3 bg-muted/30 border-b">
										<h4 className="font-medium text-sm">Progress</h4>
									</div>
									<div className="flex-1 overflow-y-auto">
										<div className="p-3 space-y-2">
											{complexWorkflow?.steps.map((step, index) => {
												const isActive = index === currentStepIndex;
												const status = getStepStatus(step.stepNumber);
												const isCompleted = status === "completed";

												return (
													<div
														key={step.stepNumber}
														onClick={() => {
															if (
																index <=
																	(executionData?.currentStep || 0) - 1 ||
																status === "completed"
															) {
																setCurrentStepIndex(index);
															}
														}}
														className={cn(
															"flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
															isActive
																? "bg-purple-50 border-purple-200 shadow-sm"
																: "bg-white border-gray-200 hover:bg-gray-50",
														)}
													>
														<div
															className={cn(
																"h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5",
																isActive
																	? "bg-purple-600 text-white"
																	: isCompleted
																		? "bg-green-500 text-white"
																		: "bg-gray-200 text-gray-600",
															)}
														>
															{isCompleted ? (
																<CheckCircle2 className="h-3 w-3" />
															) : (
																step.stepNumber
															)}
														</div>
														<div className="flex-1 min-w-0">
															<div className="font-medium text-xs text-gray-900 truncate">
																{workflowDetails[step.workflowId]
																	?.description ||
																	workflowDetails[step.workflowId]?.name}
															</div>
															<div className="text-[10px] text-muted-foreground mt-1 flex justify-between items-center">
																<span className="truncate max-w-[80px]">
																	{workflowDetails[step.workflowId]?.name}
																</span>
																{status !== "waiting" &&
																	status !== "pending" && (
																		<Badge
																			variant="outline"
																			className={cn(
																				"text-[10px] px-1 h-3.5 leading-none",
																				status === "running" &&
																					"bg-blue-50 text-blue-700 border-blue-200",
																				status === "completed" &&
																					"bg-green-50 text-green-700 border-green-200",
																				status === "failed" &&
																					"bg-red-50 text-red-700 border-red-200",
																			)}
																		>
																			{status}
																		</Badge>
																	)}
															</div>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								</Card>
							</div>

							{/* Main Content */}
							<div className="flex-1 min-w-0 flex flex-col">
								{isLoading ? (
									<div className="flex-1 flex items-center justify-center">
										<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
									</div>
								) : !complexWorkflow || !displayWorkflow ? (
									<div className="flex-1 flex items-center justify-center text-muted-foreground">
										Failed to load workflow data
									</div>
								) : (
									<Card className="flex-1 overflow-hidden flex flex-col p-0">
										{/* Step Title */}
										<div className="p-4 border-b bg-muted/10 flex justify-between items-center">
											<div>
												<div className="flex items-center gap-2 mb-1">
													<Badge variant="outline">
														Step {currentStepIndex + 1}
													</Badge>
													<h3 className="font-semibold text-gray-900">
														{workflowDetails[currentStep?.workflowId || ""]
															?.description || currentStep?.workflowName}
													</h3>
												</div>
												<p className="text-xs text-muted-foreground">
													{isStepCompleted
														? "Completed successfully."
														: "Configure and run."}
												</p>
											</div>
										</div>

										{/* Content */}
										<div className="flex-1 overflow-y-auto">
											<div className="p-6 space-y-6">
												<WorkflowInputBuilder
													workflow={displayWorkflow}
													onRunJob={handleStepRun}
													runLabel={
														isStepCompleted ? "Re-run Step" : "Run Step"
													}
													isExecuting={isExecuting}
													initialTextInputs={prefillTextInputs}
													initialDeleteSourceFiles={prefillDeleteSourceFiles}
													prefillKey={prefillKey || undefined}
													extraActions={
														hasNextStep ? (
															<Button
																onClick={handleNextStep}
																disabled={!isStepCompleted}
																variant={
																	isStepCompleted ? "default" : "secondary"
																}
																className={cn(
																	isStepCompleted &&
																		"bg-green-600 hover:bg-green-700",
																)}
															>
																Next Step
																<ChevronRight className="ml-2 h-4 w-4" />
															</Button>
														) : null
													}
												/>

												{/* Output Display */}
												{isStepCompleted && currentStepOutput && (
													<div className="mt-6 pt-6 border-t">
														<h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
															<CheckCircle2 className="h-4 w-4 text-green-600" />
															Output
														</h4>
														<div className="bg-muted/30 rounded-lg p-4 space-y-4">
															{fileOutputs.length > 0 && (
																<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
																	{fileOutputs.map((output, idx) => (
																		<div
																			key={idx}
																			className="rounded-md border bg-white p-3 shadow-sm hover:shadow-md transition-all"
																		>
																			{(() => {
																				const decodedFile = output.path
																					? decodedFiles[output.path]
																					: null;
																				const previewPath =
																					decodedFile?.decodedPath ||
																					output.path;
																				const decodedMediaType =
																					decodedFile?.decodedPath
																						? inferMediaTypeFromName(
																								decodedFile.decodedPath,
																							)
																						: null;
																				const isVideo =
																					decodedFile?.decodedFileType ===
																						"video" ||
																					decodedMediaType === "video" ||
																					output.fileType === "video";
																				const fileName =
																					output.fileName ||
																					getBaseName(output.path) ||
																					"output";
																				const cacheKey = output.path
																					? imageVersion[output.path] || 0
																					: 0;

																				return (
																					<>
																						<div className="relative aspect-video bg-gray-100 rounded overflow-hidden">
																							{isVideo && previewPath ? (
																								<video
																									src={`/api/videos/serve?path=${encodeURIComponent(previewPath)}&v=${cacheKey}`}
																									className="w-full h-full object-contain"
																									controls
																									preload="metadata"
																								/>
																							) : previewPath ? (
																								<img
																									src={`/api/images/serve?path=${encodeURIComponent(previewPath)}&v=${cacheKey}`}
																									alt={
																										decodedFile
																											? `Decoded: ${fileName}`
																											: fileName
																									}
																									className="w-full h-full object-contain"
																								/>
																							) : (
																								<div className="w-full h-full flex items-center justify-center text-muted-foreground">
																									<FileText className="h-8 w-8" />
																								</div>
																							)}
																							{decodedFile && (
																								<div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
																									<CheckCircle2 className="h-3 w-3" />
																									Decoded
																								</div>
																							)}
																						</div>
																						<div className="mt-3 flex items-center justify-between gap-2">
																							<p
																								className="text-xs text-gray-700 truncate"
																								title={fileName}
																							>
																								{fileName}
																							</p>
																							<div className="flex items-center gap-2">
																								{previewPath && (
																									<Button
																										variant="outline"
																										size="sm"
																										onClick={() =>
																											window.open(
																												`/api/workspace/serve/${encodeURIComponent(previewPath)}`,
																												"_blank",
																											)
																										}
																									>
																										View
																									</Button>
																								)}
																								{output.path && (
																									<Button
																										variant="default"
																										size="sm"
																										onClick={() =>
																											handleSaveToWorkspace(
																												output.path!,
																												fileName,
																											)
																										}
																										title={
																											workspaceFolder
																												? `Save to ${workspaceFolder.folder_name}`
																												: "Save to workspace"
																										}
																									>
																										<FolderOpen className="h-4 w-4" />
																									</Button>
																								)}
																							</div>
																						</div>
																						{output.fileType === "image" &&
																							output.path &&
																							currentExecutionStep?.jobId && (
																								<div className="mt-2">
																									<DuckDecodeButton
																										imagePath={output.path}
																										jobId={
																											currentExecutionStep.jobId
																										}
																										onDecoded={(
																											decodedPath,
																											fileType,
																											decodedFileType,
																										) =>
																											handleFileDecoded(
																												output.path!,
																												decodedPath,
																												fileType,
																												decodedFileType,
																											)
																										}
																									/>
																								</div>
																							)}
																						{decodedFile && (
																							<div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center justify-between gap-2 text-xs">
																								<span className="text-green-800 truncate">
																									Decoded:{" "}
																									{getBaseName(
																										decodedFile.decodedPath,
																									)}
																								</span>
																								<Button
																									variant="outline"
																									size="sm"
																									className="h-7 text-xs"
																									onClick={() =>
																										handleSaveToWorkspace(
																											decodedFile.decodedPath,
																											getBaseName(
																												decodedFile.decodedPath,
																											) || fileName,
																										)
																									}
																									title={
																										workspaceFolder
																											? `Save to ${workspaceFolder.folder_name}`
																											: "Save to workspace"
																									}
																								>
																									<FolderOpen className="h-3 w-3 mr-1" />
																									Save
																								</Button>
																							</div>
																						)}
																					</>
																				);
																			})()}
																		</div>
																	))}
																</div>
															)}

															{isTranslating && (
																<div className="flex items-center gap-2 text-xs text-blue-600">
																	<Loader2 className="h-3 w-3 animate-spin" />
																	Translating...
																</div>
															)}

															{textOutputs.length > 0 && (
																<div className="space-y-3">
																	<div className="flex items-center justify-between">
																		<h5 className="text-sm font-medium text-gray-700">
																			Translation Result
																		</h5>
																		<Button
																			variant="ghost"
																			size="sm"
																			onClick={() => {
																				setLeftLang(rightLang);
																				setRightLang(leftLang);
																			}}
																			title="Swap languages"
																		>
																			<ArrowRightLeft className="h-4 w-4" />
																		</Button>
																	</div>

																	<div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[320px]">
																		{/* Left Pane */}
																		<Card className="flex flex-col overflow-hidden bg-white">
																			<div className="p-2 border-b bg-gray-50 flex justify-between items-center text-xs font-medium text-gray-500">
																				<Select
																					value={leftLang}
																					onValueChange={(value: any) =>
																						setLeftLang(value)
																					}
																				>
																					<SelectTrigger className="h-6 w-20 text-xs">
																						<SelectValue />
																					</SelectTrigger>
																					<SelectContent>
																						<SelectItem value="original">
																							Original
																						</SelectItem>
																						<SelectItem value="en">
																							English
																						</SelectItem>
																						<SelectItem value="zh">
																							中文
																						</SelectItem>
																					</SelectContent>
																				</Select>
																				<div className="flex gap-1">
																					<Button
																						variant="ghost"
																						size="icon"
																						className="h-6 w-6 text-blue-600 hover:text-blue-700"
																						title="Save changes to original file"
																						onClick={() => {
																							const output = textOutputs[0];
																							if (output?.filePath) {
																								handleSaveText(
																									output.filePath,
																									leftLang,
																								);
																							}
																						}}
																						disabled={isSaving}
																					>
																						<Save className="h-3 w-3" />
																					</Button>
																					<Button
																						variant="ghost"
																						size="icon"
																						className="h-6 w-6"
																						onClick={() => {
																							const content = textOutputs
																								.map((output) => {
																									const value =
																										editedText[
																											output.filePath
																										]?.[leftLang] ||
																										getTextContent(
																											output,
																											leftLang,
																										);
																									return value || "";
																								})
																								.join("\n\n");
																							navigator.clipboard.writeText(
																								content,
																							);
																							toast.success("Copied");
																						}}
																					>
																						<Copy className="h-3 w-3" />
																					</Button>
																				</div>
																			</div>
																			<div className="flex-1 overflow-y-auto flex flex-col">
																				{textOutputs.map((output, idx) => {
																					const originalContent =
																						getTextContent(output, leftLang);
																					const currentVal = output.filePath
																						? (editedText[output.filePath]?.[
																								leftLang
																							] ?? originalContent)
																						: originalContent;
																					const isPaneTranslating =
																						output.filePath
																							? translating[output.filePath] ===
																								"left"
																							: false;
																					return (
																						<div
																							key={`${output.fileName}-${idx}`}
																							className="border-b last:border-b-0 relative"
																						>
																							<div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b">
																								{output.fileName}
																							</div>
																							<Textarea
																								value={currentVal}
																								onChange={(e) => {
																									if (output.filePath) {
																										handleTextEdit(
																											output.filePath,
																											leftLang,
																											e.target.value,
																											"left",
																										);
																									}
																								}}
																								className="min-h-[180px] resize-none border-none focus-visible:ring-0 rounded-none p-4 font-mono text-sm"
																								placeholder="No content available..."
																							/>
																							{isPaneTranslating && (
																								<div className="absolute top-10 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
																									<Loader2 className="h-3 w-3 animate-spin" />
																									Translating...
																								</div>
																							)}
																							{getTranslationError(output) &&
																								leftLang !== "original" && (
																									<div className="p-2 text-xs text-red-500 italic bg-red-50">
																										Error:{" "}
																										{getTranslationError(
																											output,
																										)}
																									</div>
																								)}
																						</div>
																					);
																				})}
																			</div>
																		</Card>

																		{/* Right Pane */}
																		<Card className="flex flex-col overflow-hidden bg-gray-50">
																			<div className="p-2 border-b bg-gray-100 flex justify-between items-center text-xs font-medium text-gray-500">
																				<Select
																					value={rightLang}
																					onValueChange={(value: any) =>
																						setRightLang(value)
																					}
																				>
																					<SelectTrigger className="h-6 w-20 text-xs">
																						<SelectValue />
																					</SelectTrigger>
																					<SelectContent>
																						<SelectItem value="original">
																							Original
																						</SelectItem>
																						<SelectItem value="en">
																							English
																						</SelectItem>
																						<SelectItem value="zh">
																							中文
																						</SelectItem>
																					</SelectContent>
																				</Select>
																				<div className="flex gap-1">
																					<Button
																						variant="ghost"
																						size="icon"
																						className="h-6 w-6 text-blue-600 hover:text-blue-700"
																						title="Save changes to original file"
																						onClick={() => {
																							const output = textOutputs[0];
																							if (output?.filePath) {
																								handleSaveText(
																									output.filePath,
																									rightLang,
																								);
																							}
																						}}
																						disabled={isSaving}
																					>
																						<Save className="h-3 w-3" />
																					</Button>
																					<Button
																						variant="ghost"
																						size="icon"
																						className="h-6 w-6"
																						onClick={() => {
																							const content = textOutputs
																								.map((output) => {
																									const value =
																										editedText[
																											output.filePath
																										]?.[rightLang] ||
																										getTextContent(
																											output,
																											rightLang,
																										);
																									return value || "";
																								})
																								.join("\n\n");
																							navigator.clipboard.writeText(
																								content,
																							);
																							toast.success("Copied");
																						}}
																					>
																						<Copy className="h-3 w-3" />
																					</Button>
																				</div>
																			</div>
																			<div className="flex-1 overflow-y-auto flex flex-col">
																				{textOutputs.map((output, idx) => {
																					const originalContent =
																						getTextContent(output, rightLang);
																					const currentVal = output.filePath
																						? (editedText[output.filePath]?.[
																								rightLang
																							] ?? originalContent)
																						: originalContent;
																					const isPaneTranslating =
																						output.filePath
																							? translating[output.filePath] ===
																								"right"
																							: false;
																					return (
																						<div
																							key={`${output.fileName}-${idx}`}
																							className="border-b last:border-b-0 relative"
																						>
																							<div className="px-3 py-2 text-xs text-gray-500 bg-gray-100 border-b">
																								{output.fileName}
																							</div>
																							<Textarea
																								value={currentVal}
																								onChange={(e) => {
																									if (output.filePath) {
																										handleTextEdit(
																											output.filePath,
																											rightLang,
																											e.target.value,
																											"right",
																										);
																									}
																								}}
																								className="min-h-[180px] resize-none border-none focus-visible:ring-0 rounded-none p-4 font-mono text-sm bg-transparent"
																								placeholder="No content available..."
																							/>
																							{isPaneTranslating && (
																								<div className="absolute top-10 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
																									<Loader2 className="h-3 w-3 animate-spin" />
																									Translating...
																								</div>
																							)}
																							{getTranslationError(output) &&
																								rightLang !== "original" && (
																									<div className="p-2 text-xs text-red-500 italic bg-red-50">
																										Error:{" "}
																										{getTranslationError(
																											output,
																										)}
																									</div>
																								)}
																						</div>
																					);
																				})}
																			</div>
																		</Card>
																	</div>
																</div>
															)}
														</div>
													</div>
												)}
											</div>
										</div>
									</Card>
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Console Viewer */}
			<ConsoleViewer
				onRefresh={() => {}}
				taskId={activeConsoleTaskId}
				defaultVisible={false}
			/>
		</div>
	);
}
