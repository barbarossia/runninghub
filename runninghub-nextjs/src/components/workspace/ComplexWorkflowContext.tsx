/**
 * Complex Workflow Context Component
 * Displays complex workflow progress and step status in JobDetail
 */

"use client";

import { useState } from "react";
import {
	ChevronDown,
	ChevronUp,
	Play,
	Pause,
	CheckCircle2,
	XCircle,
	Clock,
	FileText,
	Eye,
	MoreHorizontal,
	Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ComplexWorkflowExecution } from "@/types/workspace";

export interface ComplexWorkflowContextProps {
	execution: ComplexWorkflowExecution;
	onContinue?: () => void;
	onViewStep?: (stepNumber: number) => void;
	onStopExecution?: () => void;
}

export function ComplexWorkflowContext({
	execution,
	onContinue,
	onViewStep,
	onStopExecution,
}: ComplexWorkflowContextProps) {
	const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
	const [viewingStep, setViewingStep] = useState<number | null>(null);

	const currentStepIndex = execution.currentStep - 1; // Convert to 0-based

	const toggleStep = (stepNumber: number) => {
		setExpandedSteps((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(stepNumber)) {
				newSet.delete(stepNumber);
			} else {
				newSet.add(stepNumber);
			}
			return newSet;
		});

		if (viewingStep === stepNumber) {
			setViewingStep(null);
		}
	};

	const getStepStatusIcon = (status: string) => {
		switch (status) {
			case "pending":
				return <Clock className="h-4 w-4 text-gray-400" />;
			case "running":
				return <Play className="h-4 w-4 text-blue-600" />;
			case "completed":
				return <CheckCircle2 className="h-4 w-4 text-green-600" />;
			case "failed":
				return <XCircle className="h-4 w-4 text-red-600" />;
			default:
				return <Clock className="h-4 w-4 text-gray-400" />;
		}
	};

	const getStepStatusColor = (status: string) => {
		switch (status) {
			case "pending":
				return "bg-gray-100 text-gray-600";
			case "running":
				return "bg-blue-100 text-blue-800";
			case "completed":
				return "bg-green-100 text-green-800";
			case "failed":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-600";
		}
	};

	const hasPreviousOutputs = (stepNumber: number) => {
		if (stepNumber <= 1) return false;

		const prevStep = execution.steps[stepNumber - 2];
		return (
			prevStep?.status === "completed" &&
			(prevStep.outputs?.outputs?.length ?? 0) > 0
		);
	};

	const isLastStep = execution.steps.length === execution.currentStep;
	const isCompleted = execution.status === "completed";
	const isPaused = execution.status === "paused";
	const isRunning = execution.status === "running";

	return (
		<Card className="border-purple-200 bg-purple-50">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-3">
					<FileText className="h-5 w-5 text-purple-700" />
					<div>
						<h3 className="font-semibold text-purple-900">Complex Workflow</h3>
						<p className="text-sm text-purple-700">{execution.name}</p>
					</div>
				</div>

				{isRunning && (
					<Badge className="bg-blue-100 text-blue-800 animate-pulse">
						Running
					</Badge>
				)}

				{isPaused && (
					<Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>
				)}

				{isCompleted && (
					<Badge
						className={cn(
							"bg-green-100 text-green-800",
							execution.status === "completed" && "animate-in fade-in",
						)}
					>
						Completed
					</Badge>
				)}
			</div>

			<div className="mb-4">
				<div className="flex items-center gap-3 mb-3">
					<span className="text-sm font-medium text-gray-700">Progress</span>
					<span
						className={cn(
							"text-lg font-bold",
							getStepStatusColor(execution.status),
						)}
					>
						Step {execution.currentStep} of {execution.steps.length}
					</span>
					{execution.status === "running" && (
						<Loader2 className="h-4 w-4 animate-spin text-purple-600" />
					)}
				</div>
				<div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
					<div
						className={cn(
							"h-full rounded-full transition-all duration-700 ease-in-out",
							getStepStatusColor(execution.status),
						)}
						style={{
							width: `${(execution.currentStep / execution.steps.length) * 100}%`,
						}}
					/>
				</div>
			</div>

			<Separator className="my-4" />

			{/* Steps */}
			<div className="space-y-3">
				{execution.steps.map((step, index) => {
					const stepIndex = index; // 0-based
					const isCurrentStep = step.stepNumber === execution.currentStep;
					const isExpanded = expandedSteps.has(step.stepNumber);
					const showViewButton =
						step.status === "completed" &&
						(step.outputs?.outputs?.length ?? 0) > 0;

					return (
						<Card
							key={step.stepNumber}
							className={cn(
								"border transition-all duration-300 hover:shadow-md",
								isCurrentStep
									? "border-purple-500 bg-white ring-2 ring-purple-200 ring-offset-2"
									: "border-gray-200 bg-gray-50",
								isExpanded ? "shadow-lg" : "hover:border-purple-300",
							)}
						>
							{/* Header - Always visible */}
							<div
								onClick={() => toggleStep(step.stepNumber)}
								className="flex items-center justify-between cursor-pointer p-4 hover:bg-gray-50/50 transition-colors rounded-t-lg"
							>
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-2">
										<span
											className={cn(
												"text-sm font-semibold px-2 py-1 rounded-full",
												getStepStatusColor(step.status),
											)}
										>
											{step.stepNumber}
										</span>
										{getStepStatusIcon(step.status)}
									</div>
									<Badge
										className={cn(
											"text-xs font-medium",
											step.status === "completed"
												? "bg-green-100 text-green-800 border-green-200"
												: step.status === "running"
													? "bg-blue-100 text-blue-800 border-blue-200"
													: step.status === "failed"
														? "bg-red-100 text-red-800 border-red-200"
														: "bg-gray-100 text-gray-800 border-gray-200",
										)}
									>
										{step.workflowName}
									</Badge>
								</div>

								<div className="flex items-center gap-2">
									{hasPreviousOutputs(step.stepNumber) && (
										<Badge className="bg-green-100 text-green-800 text-xs">
											Uses Previous Output
										</Badge>
									)}
								</div>

								<div className="flex items-center">
									{isExpanded ? (
										<ChevronUp className="h-4 w-4 text-gray-600" />
									) : (
										<ChevronDown className="h-4 w-4 text-gray-600" />
									)}
								</div>
							</div>

							{/* Expanded Content */}
							{isExpanded && (
								<>
									<Separator className="my-3" />

									<div className="space-y-3">
										{/* Status */}
										<div className="flex items-center gap-2 mb-3">
											<span className="text-sm font-medium text-gray-700">
												Status
											</span>
											<Badge
												className={cn(
													"text-xs",
													getStepStatusColor(step.status),
												)}
											>
												{step.status.toUpperCase()}
											</Badge>
										</div>

										{/* Inputs summary */}
										{step.inputs && (
											<div className="text-sm text-gray-700">
												<span className="font-medium">Inputs:</span>{" "}
												{step.inputs.length} parameters
											</div>
										)}

										{/* Outputs summary */}
										{step.outputs?.outputs && (
											<div className="text-sm text-gray-700">
												<span className="font-medium">Outputs:</span>{" "}
												{step.outputs.outputs.length} file(s)
											</div>
										)}

										{/* Action buttons */}
										<div className="flex gap-2 mt-4">
											{showViewButton && (
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														onViewStep && onViewStep(step.stepNumber)
													}
												>
													<Eye className="h-4 w-4 mr-1" />
													View Outputs
												</Button>
											)}

											{step.status === "completed" &&
												onContinue &&
												!isLastStep && (
													<Button
														variant="default"
														size="sm"
														onClick={() => onContinue && onContinue()}
														className={cn(
															"animate-in fade-in",
															step.stepNumber === currentStepIndex + 1 &&
																"ring-2 ring-purple-400",
														)}
													>
														<Play className="h-4 w-4 mr-1" />
														{isCurrentStep ? "Start Next Step" : "Continue"}
													</Button>
												)}
										</div>
									</div>
								</>
							)}
						</Card>
					);
				})}
			</div>

			{/* Footer Actions */}
			<div className="flex gap-3 pt-4 border-t border-gray-200">
				{isPaused && onContinue && (
					<Button
						variant="default"
						onClick={() => onContinue && onContinue()}
						className="flex-1"
					>
						<Play className="h-4 w-4 mr-1" />
						Resume Execution
					</Button>
				)}

				{(isRunning || isPaused) && onStopExecution && (
					<Button
						variant="destructive"
						onClick={() => onStopExecution && onStopExecution()}
					>
						<Pause className="h-4 w-4 mr-1" />
						Stop Execution
					</Button>
				)}

				{isCompleted && (
					<Button
						variant="outline"
						onClick={() => {
							window.location.href = "/workspace/jobs";
						}}
					>
						<MoreHorizontal className="h-4 w-4 mr-1" />
						View All Jobs
					</Button>
				)}
			</div>
		</Card>
	);
}
