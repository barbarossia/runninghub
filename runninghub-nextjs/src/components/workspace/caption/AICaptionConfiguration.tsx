"use client";

import { useEffect, useState } from "react";
import { Sparkles, Languages, AlertCircle } from "lucide-react";
import { useCaptionStore } from "@/store/caption-store";
import { ConfigurationCard } from "@/components/ui/ConfigurationCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AICaptionConfigurationProps {
	onConfigChange?: (config: {
		workflowId: string;
		mode: string;
		language: string;
	}) => void;
	disabled?: boolean;
	className?: string;
}

const CAPTION_MODES = [
	{ value: "generate", label: "Generate", description: "Create new caption" },
	{ value: "replace", label: "Replace", description: "Replace existing" },
	{ value: "append", label: "Append", description: "Add to end" },
	{ value: "prepend", label: "Prepend", description: "Add to start" },
];

const LANGUAGE_OPTIONS = [
	{ value: "en", label: "English" },
	{ value: "zh", label: "Chinese" },
	{ value: "both", label: "Both" },
];

export function AICaptionConfiguration({
	onConfigChange,
	disabled = false,
	className = "",
}: AICaptionConfigurationProps) {
	const {
		aiCaptionWorkflowId,
		aiCaptionMode,
		aiCaptionLanguage,
		setAICaptionWorkflowId,
		setAICaptionMode,
		setAICaptionLanguage,
	} = useCaptionStore();

	const [localWorkflowId, setLocalWorkflowId] = useState(aiCaptionWorkflowId);

	useEffect(() => {
		onConfigChange?.({
			workflowId: aiCaptionWorkflowId,
			mode: aiCaptionMode,
			language: aiCaptionLanguage,
		});
	}, [aiCaptionWorkflowId, aiCaptionMode, aiCaptionLanguage, onConfigChange]);

	const handleWorkflowIdChange = (value: string) => {
		setLocalWorkflowId(value);
		setAICaptionWorkflowId(value);
	};

	const selectedMode = CAPTION_MODES.find((m) => m.value === aiCaptionMode);
	const selectedLanguage = LANGUAGE_OPTIONS.find(
		(l) => l.value === aiCaptionLanguage,
	);

	return (
		<ConfigurationCard
			title="AI Caption"
			icon={Sparkles}
			variant="light"
			iconBgColor="bg-purple-100"
			iconColor="text-purple-600"
			disabled={disabled}
			className={className}
			subtitle={
				<>
					{aiCaptionWorkflowId ? "Workflow configured" : "No workflow set"}
					{" • "}
					{selectedMode?.label} • {selectedLanguage?.label}
				</>
			}
			defaultExpanded={true}
		>
			<div className="space-y-5">
				{/* Workflow ID Configuration */}
				<div className="space-y-3">
					<div className="flex items-center gap-2 text-sm font-medium text-gray-700">
						<Sparkles className="h-4 w-4" />
						RunningHub Workflow ID
					</div>
					<Input
						type="text"
						value={localWorkflowId}
						onChange={(e) => handleWorkflowIdChange(e.target.value)}
						placeholder="Enter workflow ID..."
						disabled={disabled}
						className="border-gray-300 bg-white"
					/>
					{!aiCaptionWorkflowId && (
						<div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
							<AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
							<p>
								Caption workflow not configured. Please enter a RunningHub
								workflow ID to enable AI captioning.
							</p>
						</div>
					)}
				</div>

				{/* Caption Mode */}
				<div className="space-y-3 pt-3 border-t border-gray-200">
					<div className="text-sm font-medium text-gray-700">Caption Mode</div>
					<div className="grid grid-cols-2 gap-2">
						{CAPTION_MODES.map((mode) => (
							<button
								key={mode.value}
								type="button"
								onClick={() => setAICaptionMode(mode.value as any)}
								disabled={disabled}
								className={cn(
									"flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
									aiCaptionMode === mode.value
										? "border-purple-500 bg-purple-500 text-white"
										: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
								)}
							>
								<span className="text-sm font-medium">{mode.label}</span>
								<span
									className={cn(
										"text-xs",
										aiCaptionMode === mode.value
											? "text-purple-100"
											: "text-gray-500",
									)}
								>
									{mode.description}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* Language Selection */}
				<div className="space-y-3 pt-3 border-t border-gray-200">
					<div className="flex items-center gap-2 text-sm font-medium text-gray-700">
						<Languages className="h-4 w-4" />
						Output Language
					</div>
					<div className="grid grid-cols-3 gap-2">
						{LANGUAGE_OPTIONS.map((lang) => (
							<button
								key={lang.value}
								type="button"
								onClick={() => setAICaptionLanguage(lang.value as any)}
								disabled={disabled}
								className={cn(
									"px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all",
									aiCaptionLanguage === lang.value
										? "border-purple-500 bg-purple-500 text-white"
										: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
								)}
							>
								{lang.label}
							</button>
						))}
					</div>
				</div>

				{/* Info */}
				<div className="pt-3 border-t border-gray-200">
					<div className="text-xs text-gray-600 bg-purple-50 p-3 rounded-lg border border-purple-200">
						<p className="font-medium text-purple-800">Caption Storage:</p>
						<p className="text-purple-700 mt-1">
							Captions will be saved as <code>.txt</code> files alongside your
							images/videos.
						</p>
					</div>
				</div>
			</div>
		</ConfigurationCard>
	);
}
