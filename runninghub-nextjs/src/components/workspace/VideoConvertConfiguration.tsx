"use client";

import { useState, useEffect } from "react";
import {
	Video,
	Zap,
	Settings,
	Sliders,
	Maximize2,
	Timer,
	Scissors,
	ChevronDown,
	ChevronRight,
} from "lucide-react";
import {
	useVideoConvertStore,
	FpsOption,
	QualityPreset,
	EncodingPreset,
	ResizePreset,
	ResizeMode,
	QUALITY_CRF,
	SpeedPreset,
	TrimFramesPreset,
} from "@/store/video-convert-store";
import { ConfigurationCard } from "@/components/ui/ConfigurationCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface VideoConvertConfigurationProps {
	onConfigChange?: (
		config: ReturnType<typeof useVideoConvertStore.getState>,
	) => void;
	disabled?: boolean;
	className?: string;
}

const FPS_OPTIONS: { value: FpsOption; label: string }[] = [
	{ value: 16, label: "16 FPS" },
	{ value: 24, label: "24 FPS" },
	{ value: 25, label: "25 FPS" },
	{ value: 30, label: "30 FPS" },
	{ value: 60, label: "60 FPS" },
	{ value: "custom", label: "Custom" },
];

const QUALITY_OPTIONS: {
	value: QualityPreset;
	label: string;
	description: string;
}[] = [
	{ value: "high", label: "High", description: "CRF 18 - Best quality" },
	{ value: "medium", label: "Medium", description: "CRF 20 - Good quality" },
	{ value: "low", label: "Low", description: "CRF 23 - Smaller size" },
	{ value: "custom", label: "Custom", description: "Custom CRF" },
];

const ENCODING_PRESET_OPTIONS: {
	value: EncodingPreset;
	label: string;
	description: string;
}[] = [
	{ value: "faster", label: "Faster", description: "Fast encoding" },
	{ value: "fast", label: "Fast", description: "Quick encoding" },
	{ value: "medium", label: "Medium", description: "Balanced" },
	{ value: "slow", label: "Slow", description: "Better compression" },
	{ value: "slower", label: "Slower", description: "Best compression" },
];

const RESIZE_PRESETS: {
	value: ResizePreset;
	label: string;
	description: string;
}[] = [
	{ value: "720x1280", label: "720×1280", description: "Portrait HD" },
	{ value: "1080x1920", label: "1080×1920", description: "Portrait Full HD" },
	{ value: "1280x720", label: "1280×720", description: "Landscape HD" },
	{ value: "1920x1080", label: "1920×1080", description: "Landscape Full HD" },
	{ value: "1080x1080", label: "1080×1080", description: "Square" },
	{ value: "custom", label: "Custom", description: "Set width/height" },
];

const LONGEST_SIDE_PRESETS: { value: string; label: string }[] = [
	{ value: "720", label: "720px" },
	{ value: "832", label: "832px" },
	{ value: "1080", label: "1080px" },
	{ value: "1280", label: "1280px" },
	{ value: "1920", label: "1920px" },
];

const SPEED_OPTIONS: { value: SpeedPreset; label: string; description: string }[] = [
	{ value: "0.25", label: "0.25x", description: "Very Slow" },
	{ value: "0.5", label: "0.5x", description: "Slow" },
	{ value: "0.75", label: "0.75x", description: "Slightly Slow" },
	{ value: "1", label: "1x", description: "Normal" },
	{ value: "1.25", label: "1.25x", description: "Slightly Fast" },
	{ value: "1.5", label: "1.5x", description: "Fast" },
	{ value: "2", label: "2x", description: "Very Fast" },
	{ value: "custom", label: "Custom", description: "Custom speed" },
];

const TRIM_FRAMES_OPTIONS: { value: TrimFramesPreset; label: string }[] = [
	{ value: "0", label: "0" },
	{ value: "1", label: "1" },
	{ value: "5", label: "5" },
	{ value: "10", label: "10" },
	{ value: "15", label: "15" },
	{ value: "30", label: "30" },
	{ value: "custom", label: "Custom" },
];

function AccordionSection({
	title,
	icon,
	isExpanded,
	onToggle,
	summary,
	children,
}: {
	title: string;
	icon: React.ReactNode;
	isExpanded: boolean;
	onToggle: () => void;
	summary: string;
	children: React.ReactNode;
}) {
	return (
		<div className="border border-gray-200 rounded-lg overflow-hidden">
			<button
				type="button"
				onClick={onToggle}
				className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
			>
				<div className="flex items-center gap-2">
					{icon}
					<span className="text-sm font-medium text-gray-700">{title}</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-gray-500">{summary}</span>
					{isExpanded ? (
						<ChevronDown className="h-4 w-4 text-gray-500" />
					) : (
						<ChevronRight className="h-4 w-4 text-gray-500" />
					)}
				</div>
			</button>
			{isExpanded && <div className="p-3 bg-white">{children}</div>}
		</div>
	);
}

export function VideoConvertConfiguration({
	onConfigChange,
	disabled = false,
	className = "",
}: VideoConvertConfigurationProps) {
	const {
		convertConfig,
		setTargetFps,
		setCustomFps,
		setOutputSuffix,
		setQuality,
		setCustomCrf,
		setEncodingPreset,
		toggleDeleteOriginal,
		setResizeEnabled,
		setResizeMode,
		setResizePreset,
		setResizeWidth,
		setResizeHeight,
		setResizeLongestSide,
		setSpeedEnabled,
		setSpeedValue,
		setCustomSpeed,
		setTrimEnabled,
		setTrimStartFrames,
		setTrimStartFramesCustom,
		setTrimEndFrames,
		setTrimEndFramesCustom,
	} = useVideoConvertStore();

	const [expandedSection, setExpandedSection] = useState<string | null>("fps");

	// Local state for output suffix
	const [localOutputSuffix, setLocalOutputSuffix] = useState<string>(
		convertConfig.outputSuffix || "_converted",
	);

	// Notify parent of config changes
	useEffect(() => {
		onConfigChange?.(useVideoConvertStore.getState());
	}, [convertConfig, onConfigChange]);

	// Sync local suffix with store
	useEffect(() => {
		setLocalOutputSuffix(convertConfig.outputSuffix || "_converted");
	}, [convertConfig.outputSuffix]);

	const displayFps =
		convertConfig.targetFps === "custom"
			? convertConfig.customFps
			: convertConfig.targetFps;
	const displayCrf =
		convertConfig.quality === "custom"
			? convertConfig.customCrf
			: QUALITY_CRF[convertConfig.quality];
	const resizeSummary = convertConfig.resizeEnabled
		? convertConfig.resizeMode === "longest-side"
			? `Longest ${convertConfig.resizeLongestSide || "auto"}px`
			: convertConfig.resizeMode === "shortest-side"
				? `Shortest ${convertConfig.resizeLongestSide || "auto"}px`
				: `${convertConfig.resizeWidth || "auto"}×${convertConfig.resizeHeight || "auto"}`
		: "Off";

	const displaySpeed =
		convertConfig.speedValue === "custom"
			? `${convertConfig.customSpeed}x`
			: convertConfig.speedValue === "1"
				? "Normal (1x)"
				: `${convertConfig.speedValue}x`;
	const speedSummary = convertConfig.speedEnabled ? displaySpeed : "Off";

	const trimStartFrames = convertConfig.trimStartFrames === "custom"
		? convertConfig.trimStartFramesCustom
		: parseInt(convertConfig.trimStartFrames);
	const trimEndFrames = convertConfig.trimEndFrames === "custom"
		? convertConfig.trimEndFramesCustom
		: parseInt(convertConfig.trimEndFrames);
	const trimSummary = convertConfig.trimEnabled
		? `${trimStartFrames || 0} start, ${trimEndFrames || 0} end`
		: "Off";

	// Handle output suffix change
	const handleOutputSuffixChange = (value: string) => {
		setLocalOutputSuffix(value);
		setOutputSuffix(value);
	};

	// Handle custom CRF change
	const handleCustomCrfChange = (value: string) => {
		const crf = parseInt(value) || 20;
		setCustomCrf(Math.max(0, Math.min(51, crf)));
	};

	const handleResizeToggle = (enabled: boolean) => {
		setResizeEnabled(enabled);
		if (enabled && !convertConfig.resizeWidth && !convertConfig.resizeHeight) {
			setResizePreset("720x1280");
		}
	};

	const handleResizeModeChange = (mode: ResizeMode) => {
		setResizeMode(mode);
		if (
			(mode === "longest-side" || mode === "shortest-side") &&
			!convertConfig.resizeLongestSide
		) {
			setResizeLongestSide("1280");
		}
		if (mode === "fit" && !convertConfig.resizeWidth && !convertConfig.resizeHeight) {
			setResizePreset("720x1280");
		}
	};

	const handleCustomSpeedChange = (value: string) => {
		const speed = parseFloat(value) || 1;
		setCustomSpeed(Math.max(0.1, Math.min(10, speed)));
	};

	const handleCustomTrimStartChange = (value: string) => {
		const frames = parseInt(value) || 0;
		setTrimStartFramesCustom(Math.max(0, frames));
	};

	const handleCustomTrimEndChange = (value: string) => {
		const frames = parseInt(value) || 0;
		setTrimEndFramesCustom(Math.max(0, frames));
	};

	const toggleSection = (section: string) => {
		setExpandedSection(expandedSection === section ? null : section);
	};

	return (
		<ConfigurationCard
			title="Convert Configuration"
			icon={Zap}
			variant="light"
			iconBgColor="bg-blue-100"
			iconColor="text-blue-600"
			disabled={disabled}
			className={className}
			subtitle={
				<>
					Target: {displayFps} FPS • Speed: {speedSummary} • Trim: {trimSummary} • Quality: CRF {displayCrf} • Resize: {resizeSummary}
				</>
			}
		>
			<div className="space-y-2">
				{/* FPS Section */}
				<AccordionSection
					title="Frame Rate"
					icon={<Video className="h-4 w-4" />}
					isExpanded={expandedSection === "fps"}
					onToggle={() => toggleSection("fps")}
					summary={`${displayFps} FPS`}
				>
					<div className="space-y-3 pt-2">
						<div className="grid grid-cols-3 md:grid-cols-6 gap-2">
							{FPS_OPTIONS.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => setTargetFps(option.value)}
									disabled={disabled}
									className={cn(
										"px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all",
										convertConfig.targetFps === option.value
											? "border-blue-500 bg-blue-500 text-white"
											: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300",
									)}
								>
									{option.label}
								</button>
							))}
						</div>
						{convertConfig.targetFps === "custom" && (
							<div>
								<Input
									type="number"
									min="1"
									max="120"
									value={convertConfig.customFps}
									onChange={(e) => setCustomFps(parseInt(e.target.value) || 24)}
									disabled={disabled}
									placeholder="Custom FPS"
									className="border-gray-300 bg-white"
								/>
							</div>
						)}
					</div>
				</AccordionSection>

				{/* Speed Section */}
				<AccordionSection
					title="Video Speed"
					icon={<Timer className="h-4 w-4" />}
					isExpanded={expandedSection === "speed"}
					onToggle={() => toggleSection("speed")}
					summary={speedSummary}
				>
					<div className="space-y-3 pt-2">
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={convertConfig.speedEnabled}
								onChange={(e) => setSpeedEnabled(e.target.checked)}
								disabled={disabled}
								className="w-4 h-4 rounded border-gray-300 text-blue-600"
							/>
							<span className="text-sm text-gray-700">Enable speed change</span>
						</label>
						{convertConfig.speedEnabled && (
							<>
								<div className="grid grid-cols-4 gap-2">
									{SPEED_OPTIONS.map((option) => (
										<button
											key={option.value}
											type="button"
											onClick={() => setSpeedValue(option.value)}
											disabled={disabled}
											className={cn(
												"px-2 py-2 text-xs font-medium rounded-lg border-2 transition-all",
												convertConfig.speedValue === option.value
													? "border-blue-500 bg-blue-500 text-white"
													: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
											)}
										>
											{option.label}
										</button>
									))}
								</div>
								{convertConfig.speedValue === "custom" && (
									<Input
										type="number"
										min="0.1"
										max="10"
										step="0.1"
										value={convertConfig.customSpeed}
										onChange={(e) => handleCustomSpeedChange(e.target.value)}
										disabled={disabled}
										placeholder="Speed (0.1-10x)"
										className="border-gray-300 bg-white"
									/>
								)}
							</>
						)}
					</div>
				</AccordionSection>

				{/* Trim Section */}
				<AccordionSection
					title="Trim"
					icon={<Scissors className="h-4 w-4" />}
					isExpanded={expandedSection === "trim"}
					onToggle={() => toggleSection("trim")}
					summary={trimSummary}
				>
					<div className="space-y-3 pt-2">
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={convertConfig.trimEnabled}
								onChange={(e) => setTrimEnabled(e.target.checked)}
								disabled={disabled}
								className="w-4 h-4 rounded border-gray-300 text-blue-600"
							/>
							<span className="text-sm text-gray-700">Enable trim</span>
						</label>
						{convertConfig.trimEnabled && (
							<div className="space-y-4">
								<div>
									<p className="text-xs font-medium text-gray-600 mb-2">Trim from beginning (frames)</p>
									<div className="flex flex-wrap gap-2">
										{TRIM_FRAMES_OPTIONS.map((option) => (
											<button
												key={`start-${option.value}`}
												type="button"
												onClick={() => setTrimStartFrames(option.value)}
												disabled={disabled}
												className={cn(
													"px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
													convertConfig.trimStartFrames === option.value
														? "border-blue-500 bg-blue-500 text-white"
														: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
												)}
											>
												{option.label}
											</button>
										))}
									</div>
									{convertConfig.trimStartFrames === "custom" && (
										<Input
											type="number"
											min="0"
											value={convertConfig.trimStartFramesCustom}
											onChange={(e) => handleCustomTrimStartChange(e.target.value)}
											disabled={disabled}
											placeholder="Custom frames"
											className="mt-2 border-gray-300 bg-white"
										/>
									)}
								</div>
								<div>
									<p className="text-xs font-medium text-gray-600 mb-2">Trim from end (frames)</p>
									<div className="flex flex-wrap gap-2">
										{TRIM_FRAMES_OPTIONS.map((option) => (
											<button
												key={`end-${option.value}`}
												type="button"
												onClick={() => setTrimEndFrames(option.value)}
												disabled={disabled}
												className={cn(
													"px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
													convertConfig.trimEndFrames === option.value
														? "border-blue-500 bg-blue-500 text-white"
														: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
												)}
											>
												{option.label}
											</button>
										))}
									</div>
									{convertConfig.trimEndFrames === "custom" && (
										<Input
											type="number"
											min="0"
											value={convertConfig.trimEndFramesCustom}
											onChange={(e) => handleCustomTrimEndChange(e.target.value)}
											disabled={disabled}
											placeholder="Custom frames"
											className="mt-2 border-gray-300 bg-white"
										/>
									)}
								</div>
							</div>
						)}
					</div>
				</AccordionSection>

				{/* Quality Section */}
				<AccordionSection
					title="Quality"
					icon={<Sliders className="h-4 w-4" />}
					isExpanded={expandedSection === "quality"}
					onToggle={() => toggleSection("quality")}
					summary={`CRF ${displayCrf}`}
				>
					<div className="space-y-3 pt-2">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
							{QUALITY_OPTIONS.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => setQuality(option.value)}
									disabled={disabled}
									className={cn(
										"flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all",
										convertConfig.quality === option.value
											? "border-blue-500 bg-blue-500 text-white"
											: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
									)}
								>
									<span className="text-sm font-medium">{option.label}</span>
									<span className={cn(
										"text-[10px]",
										convertConfig.quality === option.value ? "text-blue-100" : "text-gray-500"
									)}>{option.description}</span>
								</button>
							))}
						</div>
						{convertConfig.quality === "custom" && (
							<Input
								type="number"
								min="0"
								max="51"
								value={convertConfig.customCrf}
								onChange={(e) => {
									const crf = parseInt(e.target.value) || 20;
									setCustomCrf(Math.max(0, Math.min(51, crf)));
								}}
								disabled={disabled}
								placeholder="CRF (0-51)"
								className="border-gray-300 bg-white"
							/>
						)}
					</div>
				</AccordionSection>

				{/* Encoding Preset Section */}
				<AccordionSection
					title="Encoding Speed"
					icon={<Settings className="h-4 w-4" />}
					isExpanded={expandedSection === "encoding"}
					onToggle={() => toggleSection("encoding")}
					summary={convertConfig.encodingPreset}
				>
					<div className="space-y-3 pt-2">
						<div className="grid grid-cols-3 md:grid-cols-5 gap-2">
							{ENCODING_PRESET_OPTIONS.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => setEncodingPreset(option.value)}
									disabled={disabled}
									className={cn(
										"flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all",
										convertConfig.encodingPreset === option.value
											? "border-blue-500 bg-blue-500 text-white"
											: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
									)}
								>
									<span className="text-xs font-medium">{option.label}</span>
									<span className={cn(
										"text-[10px]",
										convertConfig.encodingPreset === option.value ? "text-blue-100" : "text-gray-500"
									)}>{option.description}</span>
								</button>
							))}
						</div>
					</div>
				</AccordionSection>

				{/* Resize Section */}
				<AccordionSection
					title="Resize"
					icon={<Maximize2 className="h-4 w-4" />}
					isExpanded={expandedSection === "resize"}
					onToggle={() => toggleSection("resize")}
					summary={resizeSummary}
				>
					<div className="space-y-3 pt-2">
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={convertConfig.resizeEnabled}
								onChange={(e) => {
									setResizeEnabled(e.target.checked);
									if (e.target.checked && !convertConfig.resizeWidth && !convertConfig.resizeHeight) {
										setResizePreset("720x1280");
									}
								}}
								disabled={disabled}
								className="w-4 h-4 rounded border-gray-300 text-blue-600"
							/>
							<span className="text-sm text-gray-700">Enable resize</span>
						</label>
						{convertConfig.resizeEnabled && (
							<div className="space-y-3">
								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => setResizeMode("fit")}
										className={cn(
											"px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
											convertConfig.resizeMode === "fit"
												? "border-blue-500 bg-blue-500 text-white"
												: "border-gray-200 bg-white text-gray-600",
										)}
									>
										Fit
									</button>
									<button
										type="button"
										onClick={() => setResizeMode("longest-side")}
										className={cn(
											"px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
											convertConfig.resizeMode === "longest-side"
												? "border-blue-500 bg-blue-500 text-white"
												: "border-gray-200 bg-white text-gray-600",
										)}
									>
										Longest Side
									</button>
									<button
										type="button"
										onClick={() => setResizeMode("shortest-side")}
										className={cn(
											"px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
											convertConfig.resizeMode === "shortest-side"
												? "border-blue-500 bg-blue-500 text-white"
												: "border-gray-200 bg-white text-gray-600",
										)}
									>
										Shortest Side
									</button>
								</div>
								{convertConfig.resizeMode === "longest-side" || convertConfig.resizeMode === "shortest-side" ? (
									<div>
										<div className="flex flex-wrap gap-2 mb-2">
											{LONGEST_SIDE_PRESETS.map((option) => (
												<button
													key={option.value}
													type="button"
													onClick={() => setResizeLongestSide(option.value)}
													className={cn(
														"px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
														convertConfig.resizeLongestSide === option.value
															? "border-blue-500 bg-blue-500 text-white"
															: "border-gray-200 bg-white text-gray-600",
													)}
												>
													{option.label}
												</button>
											))}
										</div>
										<Input
											type="number"
											min="1"
											value={convertConfig.resizeLongestSide}
											onChange={(e) => setResizeLongestSide(e.target.value)}
											disabled={disabled}
											placeholder="Pixels"
											className="border-gray-300 bg-white"
										/>
									</div>
								) : (
									<>
										<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
											{RESIZE_PRESETS.map((option) => (
												<button
													key={option.value}
													type="button"
													onClick={() => setResizePreset(option.value)}
													className={cn(
														"flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all",
														convertConfig.resizePreset === option.value
															? "border-blue-500 bg-blue-500 text-white"
															: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
													)}
												>
													<span className="text-xs font-medium">{option.label}</span>
													<span className={cn(
														"text-[10px]",
														convertConfig.resizePreset === option.value ? "text-blue-100" : "text-gray-500"
													)}>{option.description}</span>
												</button>
											))}
										</div>
										{convertConfig.resizePreset === "custom" && (
											<div className="grid grid-cols-2 gap-2">
												<Input
													type="number"
													min="1"
													value={convertConfig.resizeWidth}
													onChange={(e) => setResizeWidth(e.target.value)}
													disabled={disabled}
													placeholder="Width"
													className="border-gray-300 bg-white"
												/>
												<Input
													type="number"
													min="1"
													value={convertConfig.resizeHeight}
													onChange={(e) => setResizeHeight(e.target.value)}
													disabled={disabled}
													placeholder="Height"
													className="border-gray-300 bg-white"
												/>
											</div>
										)}
									</>
								)}
							</div>
						)}
					</div>
				</AccordionSection>

				{/* Output Options */}
				<div className="pt-4 border-t border-gray-200 space-y-3">
					<div>
						<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
							Output Suffix
						</label>
						<Input
							type="text"
							value={localOutputSuffix}
							onChange={(e) => {
								setLocalOutputSuffix(e.target.value);
								setOutputSuffix(e.target.value);
							}}
							placeholder="_converted"
							className="border-gray-300 bg-white"
						/>
					</div>
					<label className="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							checked={convertConfig.deleteOriginal}
							onChange={toggleDeleteOriginal}
							disabled={disabled}
							className="w-4 h-4 rounded border-gray-300 text-red-600"
						/>
						<span className="text-sm text-gray-700">Delete original after conversion</span>
					</label>
				</div>

				{/* Info */}
				<div className="pt-3 border-t border-gray-200">
					<div className="flex items-start gap-2 text-xs text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
						<Video className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
						<div className="space-y-1">
							<p className="font-medium text-blue-800">Conversion Details:</p>
							<ul className="list-disc list-inside space-y-0.5 text-blue-700">
								<li>Output: MP4 (H.264), CRF {displayCrf}, {convertConfig.encodingPreset}</li>
								{convertConfig.speedEnabled && <li>Speed: {displaySpeed}</li>}
								{convertConfig.trimEnabled && <li>Trim: -{trimStartFrames} frames start, -{trimEndFrames} frames end</li>}
								{convertConfig.resizeEnabled && <li>Resize: {resizeSummary}</li>}
								<li>Audio: AAC 128kbps, yuv420p</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</ConfigurationCard>
	);
}
