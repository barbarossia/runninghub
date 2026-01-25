/**
 * Complex Workflow Continue Dialog
 * Dialog for continuing to next step with parameter mapping
 */

"use client";

import { useState, useMemo } from "react";
import {
	ArrowRight,
	AlertCircle,
	CheckCircle2,
	Copy,
	FileText,
	ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import type {
	WorkflowStep,
	JobResult,
	StepParameterConfig,
} from "@/types/workspace";

export interface ComplexWorkflowContinueDialogProps {
	open: boolean;
	onClose: () => void;
	onContinue: (parameters: Record<string, any>) => void;
	nextStep: WorkflowStep;
	previousOutputs?: JobResult;
	currentJobOutputs?: JobResult;
}

export function ComplexWorkflowContinueDialog({
	open,
	onClose,
	onContinue,
	nextStep,
	previousOutputs,
	currentJobOutputs,
}: ComplexWorkflowContinueDialogProps) {
	const [parameters, setParameters] = useState<Record<string, any>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Build available outputs map from previous steps
	const availableOutputsMap = useMemo(() => {
		const map = new Map<string, any>();

		const addOutputs = (outputs: JobResult | undefined) => {
			if (!outputs) return;

			if (outputs.outputs && outputs.outputs.length > 0) {
				outputs.outputs.forEach((output, index) => {
					// Map by parameterId
					if (output.parameterId) {
						map.set(output.parameterId, output);
					}
					// Also map by index
					map.set(`output_${index}`, output);
				});
			}
		};

		// Add outputs from all previous steps
		if (previousOutputs) {
			addOutputs(previousOutputs);
		}

		return map;
	}, [previousOutputs, currentJobOutputs]);

	const handleParameterChange = (paramId: string, value: any) => {
		setParameters((prev) => ({ ...prev, [paramId]: value }));
		// Clear error for this parameter
		if (errors[paramId]) {
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[paramId];
				return newErrors;
			});
		}
	};

	const toggleValueType = (paramId: string) => {
		const param = nextStep.parameters.find((p) => p.parameterId === paramId);
		if (!param) return;

		if (param.valueType === "static") {
			// Change to dynamic
			const newParameters = { ...parameters };
			delete newParameters[paramId];
			newParameters[paramId] = {
				valueType: "dynamic",
				dynamicMapping: {
					sourceStepNumber: 1,
					sourceParameterId: "",
					sourceOutputName: "",
				},
			};
			setParameters(newParameters);
		} else {
			// Change to static, clear dynamic mapping
			const newParameters = { ...parameters };
			newParameters[paramId] = {
				valueType: "static",
				staticValue: "",
			};
			delete newParameters[paramId].dynamicMapping;
			setParameters(newParameters);
		}
	};

	const setDynamicMapping = (paramId: string, sourceOutputKey: string) => {
		const output = availableOutputsMap.get(sourceOutputKey);

		if (!output) {
			toast.error("Selected output not available");
			return;
		}

		// Determine output value based on type

		setParameters((prev) => {
			const newParams = { ...prev };

			if (!newParams[paramId]) {
				newParams[paramId] = {};
			}

			newParams[paramId].valueType = "dynamic";
			newParams[paramId].dynamicMapping = {
				sourceStepNumber: 1,
				sourceParameterId: output.parameterId || "",
				sourceOutputName: sourceOutputKey,
			};

			// Clear error for this parameter
			const newErrors = { ...prev };
			delete newErrors[paramId];

			return newParams;
		});

		// Clear error for this parameter
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors[paramId];
			return newErrors;
		});
	};

	const validateParameters = (): boolean => {
		const newErrors: Record<string, string> = {};
		let isValid = true;

		for (const param of nextStep.parameters) {
			if (param.valueType === "dynamic") {
				// Dynamic mapping must have all required fields
				if (!param.dynamicMapping) {
					newErrors[param.parameterId] =
						"Please select a previous output to map";
					isValid = false;
				} else if (!param.dynamicMapping.sourceOutputName) {
					newErrors[param.parameterId] = "Please select which output to map";
					isValid = false;
				}
			} else if (
				param.valueType === "static" &&
				param.staticValue === undefined
			) {
				newErrors[param.parameterId] = "Please provide a value";
				isValid = false;
			}
		}

		setErrors(newErrors);
		return isValid;
	};

	const handleContinue = () => {
		if (!validateParameters()) {
			return;
		}

		onContinue(parameters);
		onClose();
	};

	const renderParameter = (param: StepParameterConfig) => {
		const valueType =
			parameters[param.parameterId]?.valueType || param.valueType;
		const isDynamic = valueType === "dynamic";
		const isUserInput = valueType === "user-input";
		const isPreviousInput = valueType === "previous-input";
		const isStatic = valueType === "static";
		const error = errors[param.parameterId];

		// For user-input or previous-input types, show special message
		if (isUserInput) {
			return (
				<div
					key={param.parameterId}
					className="space-y-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
				>
					<div className="flex items-center gap-2">
						<AlertCircle className="h-4 w-4 text-yellow-600" />
						<span className="text-sm font-medium text-yellow-900">
							{param.parameterName}
						</span>
					</div>
					<p className="text-xs text-yellow-800">
						This parameter requires user input during execution. It will be
						prompted when you click Continue.
					</p>
				</div>
			);
		}

		if (isPreviousInput) {
			// Show previous input selector
			const previousInputs = getPreviousStepInputs();
			return (
				<div key={param.parameterId} className="space-y-3">
					<div className="flex items-center justify-between">
						<label className="text-sm font-medium text-gray-700 block">
							{param.parameterName}
						</label>
						{param.required && <span className="text-red-500">*</span>}
					</div>

					<Select
						value={
							parameters[param.parameterId]?.previousInputMapping
								?.sourceParameterId || ""
						}
						onValueChange={(value) => {
							const [sourceStep, sourceId, sourceName] = value.split("|");
							setParameters((prev) => ({
								...prev,
								[param.parameterId]: {
									valueType: "previous-input",
									previousInputMapping: {
										sourceStepNumber: parseInt(sourceStep),
										sourceParameterId: sourceId,
										sourceParameterName: sourceName,
									},
								},
							}));
							// Clear error
							if (errors[param.parameterId]) {
								setErrors((prev) => {
									const newErrors = { ...prev };
									delete newErrors[param.parameterId];
									return newErrors;
								});
							}
						}}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select previous input" />
						</SelectTrigger>
						<SelectContent>
							{previousInputs.map((input) => (
								<SelectItem
									key={`${input.stepNumber}-${input.parameterId}-${input.parameterName}`}
									value={`${input.stepNumber}|${input.parameterId}|${input.parameterName}`}
								>
									<span className="text-xs">
										Step {input.stepNumber}:{" "}
										{input.parameterDescription || input.parameterName}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<div className="text-xs text-gray-500">{param.parameterId}</div>
				</div>
			);
		}

		// Static or Dynamic input
		return (
			<div key={param.parameterId} className="space-y-3">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex-1">
						<label className="text-sm font-medium text-gray-700 block">
							{param.parameterName}
						</label>
						{param.required && <span className="text-red-500">*</span>}
					</div>

					{/* Type Toggle - only for static/dynamic */}
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => toggleValueType(param.parameterId)}
							className="h-7 px-2 text-xs"
						>
							{isDynamic ? "Dynamic" : "Static"}
						</Button>
					</div>
				</div>

				{/* Error Message */}
				{error && (
					<div className="text-xs text-red-600 mt-1">
						<AlertCircle className="h-3 w-3 inline mr-1" />
						{error}
					</div>
				)}

				{/* Input Value */}
				{isDynamic ? (
					<div className="space-y-2">
						{/* Source Output Selection */}
						<div className="flex-1">
							<Select
								value={
									parameters[param.parameterId]?.dynamicMapping
										?.sourceOutputName || ""
								}
								onValueChange={(value) => {
									setParameters((prev) => {
										const newParams = { ...prev };
										if (!newParams[param.parameterId]) {
											newParams[param.parameterId] = {};
										}
										newParams[param.parameterId].valueType = "dynamic";
										newParams[param.parameterId].dynamicMapping = {
											sourceStepNumber: 1,
											sourceParameterId: "",
											sourceOutputName: value,
										};
										return newParams;
									});
									// Clear error
									if (errors[param.parameterId]) {
										setErrors((prev) => {
											const newErrors = { ...prev };
											delete newErrors[param.parameterId];
											return newErrors;
										});
									}
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select output from previous step" />
								</SelectTrigger>
								<SelectContent>
									{Array.from(availableOutputsMap.entries()).map(
										([key, output]) => (
											<SelectItem key={key} value={key}>
												{output.type === "text"
													? `Text: ${output.content?.substring(0, 30)}...`
													: `File: ${output.fileName || "output"}`}
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
						</div>

						{/* Preview of mapped value */}
						{parameters[param.parameterId]?.dynamicMapping?.sourceOutputName &&
							availableOutputsMap.get(
								parameters[param.parameterId].dynamicMapping.sourceOutputName,
							) && (
								<div className="mt-2 p-2 bg-gray-50 rounded text-xs">
									<div className="text-gray-600">
										<span className="font-medium">Preview:</span>{" "}
										{availableOutputsMap.get(
											parameters[param.parameterId].dynamicMapping
												.sourceOutputName,
										)?.type === "text"
											? "Text"
											: "File"}
									</div>
								</div>
							)}
					</div>
				) : (
					<Input
						type="text"
						value={(parameters[param.parameterId]?.staticValue as string) || ""}
						onChange={(e) => {
							setParameters((prev) => ({
								...prev,
								[param.parameterId]: {
									valueType: "static",
									staticValue: e.target.value,
								},
							}));
							// Clear error
							if (errors[param.parameterId]) {
								setErrors((prev) => {
									const newErrors = { ...prev };
									delete newErrors[param.parameterId];
									return newErrors;
								});
							}
						}}
						placeholder={param.placeholder || "Enter value"}
						className={cn("w-full", error && "border-red-500")}
					/>
				)}

				{/* Parameter ID */}
				<div className="text-xs text-gray-500 mt-1">{param.parameterId}</div>
			</div>
		);
	};

	// Helper to get previous step inputs for previous-input type
	const getPreviousStepInputs = (): Array<{
		stepNumber: number;
		parameterId: string;
		parameterName: string;
		parameterDescription?: string;
	}> => {
		// This would need to be passed in or fetched
		// For now, return empty array
		return [];
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Continue to Next Step</DialogTitle>
				</DialogHeader>

				<div className="space-y-6">
					{/* Next Step Info */}
					<div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-6">
						<div className="flex items-center gap-3 mb-2">
							<Badge className="bg-purple-100 text-purple-800 text-sm">
								Step {nextStep.stepNumber}
							</Badge>
							<h4 className="font-semibold text-gray-900">
								{nextStep.workflowName}
							</h4>
						</div>
						<p className="text-sm text-gray-700">
							Configure input parameters for this workflow step.
						</p>
					</div>

					{/* Previous Outputs Available */}
					{availableOutputsMap.size > 0 && (
						<div className="space-y-4">
							<h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4 text-green-600" />
								Available Previous Outputs
							</h4>
							<p className="text-xs text-gray-600 mb-3">
								Select which output from previous steps to use as input for each
								parameter below.
							</p>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
								{Array.from(availableOutputsMap.entries()).map(
									([key, output], index) => (
										<Card
											key={key}
											className="hover:shadow-lg hover:border-purple-400 transition-all duration-300 cursor-pointer group"
											onClick={() => {
												navigator.clipboard.writeText(
													(output.type === "text"
														? output.content
														: output.path || output.fileName) || "",
												);
												toast.success("Copied to clipboard");
											}}
										>
											<div className="flex items-start gap-3 p-3">
												<div
													className={cn(
														"h-10 w-10 rounded-full flex items-center justify-center shrink-0",
														output.type === "text"
															? "bg-green-100"
															: "bg-blue-100",
													)}
												>
													{output.type === "text" ? (
														<FileText className="h-5 w-5 text-green-600" />
													) : (
														<ImageIcon className="h-5 w-5 text-blue-600" />
													)}
												</div>
												<div className="flex-1 min-w-0">
													<Badge
														className={cn(
															"text-xs mb-2 font-medium",
															output.type === "text"
																? "bg-green-100 text-green-800 border-green-200"
																: "bg-blue-100 text-blue-800 border-blue-200",
														)}
													>
														{output.type === "text" ? "Text" : "File"}
													</Badge>
													<div className="text-xs text-gray-500 mb-1">
														{output.parameterId || `output_${index}`}
													</div>
													<div className="font-medium text-sm text-gray-900 group-hover:text-purple-700 transition-colors">
														{output.type === "text"
															? output.content?.substring(0, 50) +
																(output.content?.length > 50 ? "..." : "")
															: output.fileName || "output"}
													</div>
												</div>
												<Copy className="h-4 w-4 text-gray-400 group-hover:text-purple-600 shrink-0 transition-colors" />
											</div>
										</Card>
									),
								)}
							</div>
						</div>
					)}

					<Separator />

					{/* Parameters Configuration */}
					<div className="space-y-4">
						<h4 className="text-sm font-medium text-gray-900 mb-3">
							Parameters ({nextStep.parameters.length})
						</h4>

						{nextStep.parameters.map((param) => renderParameter(param))}
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={onClose}
						className="hover:bg-gray-50"
					>
						Cancel
					</Button>
					<Button
						onClick={handleContinue}
						className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
					>
						<ArrowRight className="h-4 w-4 mr-2" />
						Continue to Step {nextStep.stepNumber + 1}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
