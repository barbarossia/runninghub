"use client";

import { useState, useEffect } from "react";
import { Video, Zap, Settings, Sliders, Maximize2 } from "lucide-react";
import {
	useVideoConvertStore,
	FpsOption,
	QualityPreset,
	EncodingPreset,
	ResizePreset,
	ResizeMode,
	QUALITY_CRF,
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
	} = useVideoConvertStore();

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

	return (
		<ConfigurationCard
			title="FPS Convert Configuration"
			icon={Zap}
			variant="light"
			iconBgColor="bg-blue-100"
			iconColor="text-blue-600"
			disabled={disabled}
			className={className}
			subtitle={
				<>
					Target: {displayFps} FPS • Quality: CRF {displayCrf} • Preset:{" "}
					{convertConfig.encodingPreset} • Resize: {resizeSummary}
				</>
			}
		>
			<div className="space-y-5">
				{/* FPS Presets */}
				<div className="space-y-3">
					<div className="flex items-center gap-2 text-sm font-medium text-gray-700">
						<Video className="h-4 w-4" />
						Target Frame Rate
					</div>

					<div className="grid grid-cols-3 md:grid-cols-6 gap-2">
						{FPS_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => setTargetFps(option.value)}
								disabled={disabled}
								className={cn(
									"px-3 py-3 text-sm font-medium rounded-xl border-2 transition-all",
									convertConfig.targetFps === option.value
										? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20"
										: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300",
								)}
							>
								{option.label}
							</button>
						))}
					</div>

					{/* Custom FPS Input */}
					{convertConfig.targetFps === "custom" && (
						<div className="mt-3">
							<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
								Custom FPS Value (1-120)
							</label>
							<Input
								type="number"
								min="1"
								max="120"
								value={convertConfig.customFps}
								onChange={(e) => setCustomFps(parseInt(e.target.value) || 24)}
								disabled={disabled}
								className="border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500"
							/>
						</div>
					)}
				</div>

				{/* Quality Presets */}
				<div className="space-y-3 pt-3 border-t border-gray-200">
					<div className="flex items-center gap-2 text-sm font-medium text-gray-700">
						<Sliders className="h-4 w-4" />
						Quality (CRF)
					</div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
						{QUALITY_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => setQuality(option.value)}
								disabled={disabled}
								className={cn(
									"flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
									convertConfig.quality === option.value
										? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20"
										: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300",
								)}
							>
								<span className="text-sm font-medium">{option.label}</span>
								<span
									className={cn(
										"text-xs",
										convertConfig.quality === option.value
											? "text-blue-100"
											: "text-gray-500",
									)}
								>
									{option.description}
								</span>
							</button>
						))}
					</div>

					{/* Custom CRF Input */}
					{convertConfig.quality === "custom" && (
						<div className="mt-3">
							<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
								Custom CRF Value (0-51, lower = better quality)
							</label>
							<Input
								type="number"
								min="0"
								max="51"
								value={convertConfig.customCrf}
								onChange={(e) => handleCustomCrfChange(e.target.value)}
								disabled={disabled}
								className="border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500"
							/>
						</div>
					)}
				</div>

				{/* Encoding Preset */}
				<div className="space-y-3 pt-3 border-t border-gray-200">
					<div className="flex items-center gap-2 text-sm font-medium text-gray-700">
						<Settings className="h-4 w-4" />
						Encoding Speed
					</div>

					<div className="grid grid-cols-3 md:grid-cols-5 gap-2">
						{ENCODING_PRESET_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => setEncodingPreset(option.value)}
								disabled={disabled}
								className={cn(
									"flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
									convertConfig.encodingPreset === option.value
										? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20"
										: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300",
								)}
							>
								<span className="text-sm font-medium">{option.label}</span>
								<span
									className={cn(
										"text-xs mt-0.5",
										convertConfig.encodingPreset === option.value
											? "text-blue-100"
											: "text-gray-500",
									)}
								>
									{option.description}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* Resize */}
				<div className="space-y-3 pt-3 border-t border-gray-200">
					<div className="flex items-center gap-2 text-sm font-medium text-gray-700">
						<Maximize2 className="h-4 w-4" />
						Resize
					</div>

					<label className="flex items-center gap-3 cursor-pointer group">
						<input
							type="checkbox"
							checked={convertConfig.resizeEnabled}
							onChange={(e) => handleResizeToggle(e.target.checked)}
							disabled={disabled}
							className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-2 transition-all cursor-pointer"
						/>
						<div className="flex flex-col">
							<span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors font-medium">
								Resize video (preserve aspect ratio)
							</span>
							<span className="text-xs text-gray-500">
								Scale to fit within the target size; no crop
							</span>
						</div>
					</label>

					{convertConfig.resizeEnabled && (
						<div className="space-y-3">
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => handleResizeModeChange("fit")}
									disabled={disabled}
									className={cn(
										"px-3 py-2 text-xs font-medium rounded-full border transition-all",
										convertConfig.resizeMode === "fit"
											? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20"
											: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300",
									)}
								>
									Fit Within Target
								</button>
								<button
									type="button"
									onClick={() => handleResizeModeChange("longest-side")}
									disabled={disabled}
									className={cn(
										"px-3 py-2 text-xs font-medium rounded-full border transition-all",
										convertConfig.resizeMode === "longest-side"
											? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20"
											: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300",
									)}
								>
									Longest Side
								</button>
								<button
									type="button"
									onClick={() => handleResizeModeChange("shortest-side")}
									disabled={disabled}
									className={cn(
										"px-3 py-2 text-xs font-medium rounded-full border transition-all",
										convertConfig.resizeMode === "shortest-side"
											? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20"
											: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300",
									)}
								>
									Shortest Side
								</button>
							</div>

							{convertConfig.resizeMode === "longest-side" ||
							convertConfig.resizeMode === "shortest-side" ? (
								<div className="space-y-3">
									<div className="flex flex-wrap gap-2">
										{LONGEST_SIDE_PRESETS.map((option) => (
											<button
												key={option.value}
												type="button"
												onClick={() =>
													setResizeLongestSide(option.value)
												}
												disabled={disabled}
												className={cn(
													"px-3 py-2 text-xs font-medium rounded-full border transition-all",
													convertConfig.resizeLongestSide === option.value
														? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20"
														: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300",
												)}
											>
												{option.label}
											</button>
										))}
									</div>
									<div className="max-w-[220px]">
										<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
											{convertConfig.resizeMode === "shortest-side"
												? "Shortest Side (px)"
												: "Longest Side (px)"}
										</label>
										<Input
											type="number"
											min="1"
											value={convertConfig.resizeLongestSide}
											onChange={(e) =>
												setResizeLongestSide(e.target.value)
											}
											disabled={disabled}
											placeholder="1280"
											className="border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>
								</div>
							) : (
								<>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
								{RESIZE_PRESETS.map((option) => (
									<button
										key={option.value}
										type="button"
										onClick={() => setResizePreset(option.value)}
										disabled={disabled}
										className={cn(
											"flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
											convertConfig.resizePreset === option.value
												? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20"
												: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300",
										)}
									>
										<span className="text-sm font-medium">{option.label}</span>
										<span
											className={cn(
												"text-xs mt-0.5",
												convertConfig.resizePreset === option.value
													? "text-blue-100"
													: "text-gray-500",
											)}
										>
											{option.description}
										</span>
									</button>
								))}
								</div>

							{convertConfig.resizePreset === "custom" && (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div>
										<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
											Width (px)
										</label>
										<Input
											type="number"
											min="1"
											value={convertConfig.resizeWidth}
											onChange={(e) => setResizeWidth(e.target.value)}
											disabled={disabled}
											placeholder="Auto"
											className="border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
											Height (px)
										</label>
										<Input
											type="number"
											min="1"
											value={convertConfig.resizeHeight}
											onChange={(e) => setResizeHeight(e.target.value)}
											disabled={disabled}
											placeholder="Auto"
											className="border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>
								</div>
							)}
								</>
							)}
						</div>
					)}
				</div>

				{/* Additional Options */}
				<div className="space-y-4 pt-3 border-t border-gray-200">
					{/* Output Suffix */}
					<div>
						<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
							Output Suffix
						</label>
						<Input
							type="text"
							value={localOutputSuffix}
							onChange={(e) => handleOutputSuffixChange(e.target.value)}
							placeholder="_converted"
							className="border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500"
						/>
						<p className="text-[11px] text-gray-600 mt-1.5">
							Resulting filename:{" "}
							<span className="text-gray-900 font-medium">
								video{localOutputSuffix || "_converted"}.mp4
							</span>
						</p>
					</div>

					{/* Delete Original */}
					<label className="flex items-center gap-3 cursor-pointer group">
						<input
							type="checkbox"
							checked={convertConfig.deleteOriginal}
							onChange={toggleDeleteOriginal}
							disabled={disabled}
							className="w-4 h-4 rounded border-gray-300 bg-white text-red-600 focus:ring-red-500 focus:ring-offset-2 transition-all cursor-pointer"
						/>
						<div className="flex flex-col">
							<span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors font-medium">
								Delete original after conversion
							</span>
							<span className="text-xs text-gray-500">
								The original video file will be permanently deleted after
								successful conversion
							</span>
						</div>
					</label>
				</div>

				{/* Info about conversion */}
				<div className="pt-3 border-t border-gray-200">
					<div className="flex items-start gap-2 text-xs text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
						<Video className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
						<div className="space-y-1">
							<p className="font-medium text-blue-800">Conversion Details:</p>
							<ul className="list-disc list-inside space-y-0.5 text-blue-700">
								<li>Output format: MP4 (H.264)</li>
								<li>
									Video codec: libx264, CRF {displayCrf}, preset{" "}
									{convertConfig.encodingPreset}
								</li>
								{convertConfig.resizeEnabled && (
									<li>
										Resize:{" "}
								{convertConfig.resizeMode === "longest-side"
											? `longest side ${convertConfig.resizeLongestSide || "auto"}px`
											: convertConfig.resizeMode === "shortest-side"
												? `shortest side ${convertConfig.resizeLongestSide || "auto"}px`
											: `fit within ${resizeSummary}`}{" "}
										(no crop)
									</li>
								)}
								<li>Audio codec: AAC, 128kbps</li>
								<li>Pixel format: yuv420p</li>
								<li>Faststart: Enabled for web streaming</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</ConfigurationCard>
	);
}
