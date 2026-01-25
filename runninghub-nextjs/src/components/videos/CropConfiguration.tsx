"use client";

import React, { useState, useEffect } from "react";
import { Crop } from "lucide-react";
import { CropMode, CropConfig } from "@/types/crop";
import { useCropStore } from "@/store/crop-store";
import { Input } from "@/components/ui/input";
import { ConfigurationCard } from "@/components/ui/ConfigurationCard";
import { cn } from "@/lib/utils";
import { CROP_PRESETS } from "@/constants";

interface CropConfigurationProps {
	onConfigChange?: (
		config: ReturnType<typeof useCropStore.getState>["cropConfig"],
	) => void;
	disabled?: boolean;
	className?: string;
}

export function CropConfiguration({
	onConfigChange,
	disabled = false,
	className = "",
}: CropConfigurationProps) {
	const {
		cropConfig,
		setCropMode,
		setCustomDimensions,
		setOutputSuffix,
		togglePreserveAudio,
	} = useCropStore();

	// Derive values from state, reset when mode is not custom
	const isCustomMode = cropConfig.mode === CROP_PRESETS.CUSTOM;
	const customWidth = isCustomMode ? cropConfig.customWidth || "" : "";
	const customHeight = isCustomMode ? cropConfig.customHeight || "" : "";
	const customX = isCustomMode ? cropConfig.customX || "0" : "0";
	const customY = isCustomMode ? cropConfig.customY || "0" : "0";
	const [outputSuffix, setLocalOutputSuffix] = useState<string>(
		cropConfig.outputSuffix || "_cropped",
	);

	// Notify parent of config changes
	useEffect(() => {
		onConfigChange?.(cropConfig);
	}, [cropConfig, onConfigChange]);

	// Handle mode change
	const handleModeChange = (mode: CropMode) => {
		setCropMode(mode);
	};

	// Handle custom dimension change
	const handleCustomDimensionChange = (
		field: "width" | "height" | "x" | "y",
		value: string,
	) => {
		// Update custom dimensions directly without client-side validation
		// Python CLI will handle validation
		const params: Partial<
			Pick<CropConfig, "customWidth" | "customHeight" | "customX" | "customY">
		> = {};

		if (field === "width") params.customWidth = value || undefined;
		if (field === "height") params.customHeight = value || undefined;
		if (field === "x") params.customX = value || undefined;
		if (field === "y") params.customY = value || undefined;

		setCustomDimensions(params);
	};

	// Handle output suffix change
	const handleOutputSuffixChange = (value: string) => {
		setLocalOutputSuffix(value);
		setOutputSuffix(value);
	};

	return (
		<ConfigurationCard
			title="Crop Configuration"
			icon={Crop}
			variant="light"
			iconBgColor="bg-green-100"
			iconColor="text-green-600"
			disabled={disabled}
			className={className}
			subtitle={
				<>
					Mode:{" "}
					{cropConfig.mode.charAt(0).toUpperCase() + cropConfig.mode.slice(1)}
					{cropConfig.preserveAudio && " • Audio Preserved"}
				</>
			}
		>
			<div className="space-y-4">
				{/* Crop Mode Presets */}
				<div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
					<button
						type="button"
						onClick={() => handleModeChange(CROP_PRESETS.LEFT_HALF)}
						className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
							cropConfig.mode === CROP_PRESETS.LEFT_HALF
								? "border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/20"
								: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
						}`}
					>
						<div className="w-12 h-8 border border-current rounded mb-2 relative overflow-hidden">
							<div
								className={`absolute inset-y-0 left-0 w-1/2 bg-current ${cropConfig.mode === CROP_PRESETS.LEFT_HALF ? "opacity-60" : "opacity-20"}`}
							></div>
						</div>
						<span className="text-sm font-medium">Left Half</span>
					</button>

					<button
						type="button"
						onClick={() => handleModeChange(CROP_PRESETS.RIGHT_HALF)}
						className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
							cropConfig.mode === CROP_PRESETS.RIGHT_HALF
								? "border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/20"
								: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
						}`}
					>
						<div className="w-12 h-8 border border-current rounded mb-2 relative overflow-hidden">
							<div
								className={`absolute inset-y-0 right-0 w-1/2 bg-current ${cropConfig.mode === CROP_PRESETS.RIGHT_HALF ? "opacity-60" : "opacity-20"}`}
							></div>
						</div>
						<span className="text-sm font-medium">Right Half</span>
					</button>

					<button
						type="button"
						onClick={() => handleModeChange(CROP_PRESETS.TOP_HALF)}
						className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
							cropConfig.mode === CROP_PRESETS.TOP_HALF
								? "border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/20"
								: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
						}`}
					>
						<div className="w-12 h-8 border border-current rounded mb-2 relative overflow-hidden">
							<div
								className={`absolute inset-x-0 top-0 h-1/2 bg-current ${cropConfig.mode === CROP_PRESETS.TOP_HALF ? "opacity-60" : "opacity-20"}`}
							></div>
						</div>
						<span className="text-sm font-medium">Top Half</span>
					</button>

					<button
						type="button"
						onClick={() => handleModeChange(CROP_PRESETS.BOTTOM_HALF)}
						className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
							cropConfig.mode === CROP_PRESETS.BOTTOM_HALF
								? "border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/20"
								: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
						}`}
					>
						<div className="w-12 h-8 border border-current rounded mb-2 relative overflow-hidden">
							<div
								className={`absolute inset-x-0 bottom-0 h-1/2 bg-current ${cropConfig.mode === CROP_PRESETS.BOTTOM_HALF ? "opacity-60" : "opacity-20"}`}
							></div>
						</div>
						<span className="text-sm font-medium">Bottom Half</span>
					</button>

					<button
						type="button"
						onClick={() => handleModeChange(CROP_PRESETS.CENTER)}
						className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
							cropConfig.mode === CROP_PRESETS.CENTER
								? "border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/20"
								: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
						}`}
					>
						<div className="w-12 h-8 border border-current rounded mb-2 relative overflow-hidden">
							<div
								className={`absolute inset-y-0 inset-x-1/4 bg-current ${cropConfig.mode === CROP_PRESETS.CENTER ? "opacity-60" : "opacity-20"}`}
							></div>
						</div>
						<span className="text-sm font-medium">Center</span>
					</button>

					<button
						type="button"
						onClick={() => handleModeChange(CROP_PRESETS.CUSTOM)}
						className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
							cropConfig.mode === CROP_PRESETS.CUSTOM
								? "border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/20"
								: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
						}`}
					>
						<div className="w-12 h-8 border border-current rounded mb-2 flex items-center justify-center">
							<div
								className={`w-6 h-4 border border-dashed border-current ${cropConfig.mode === CROP_PRESETS.CUSTOM ? "opacity-80" : "opacity-30"}`}
							></div>
						</div>
						<span className="text-sm font-medium">Custom</span>
					</button>
				</div>

				{/* Custom Crop Options */}
				{cropConfig.mode === CROP_PRESETS.CUSTOM && (
					<div className="space-y-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
									Width (%)
								</label>
								<Input
									type="number"
									min="0"
									max="100"
									value={customWidth}
									onChange={(e) =>
										handleCustomDimensionChange("width", e.target.value)
									}
									placeholder="50"
									className="border-gray-300 bg-white text-gray-900 focus:border-green-500 focus:ring-green-500"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
									Height (%)
								</label>
								<Input
									type="number"
									min="0"
									max="100"
									value={customHeight}
									onChange={(e) =>
										handleCustomDimensionChange("height", e.target.value)
									}
									placeholder="100"
									className="border-gray-300 bg-white text-gray-900 focus:border-green-500 focus:ring-green-500"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
									X Position (%)
								</label>
								<Input
									type="number"
									min="0"
									max="100"
									value={customX}
									onChange={(e) =>
										handleCustomDimensionChange("x", e.target.value)
									}
									placeholder="0"
									className="border-gray-300 bg-white text-gray-900 focus:border-green-500 focus:ring-green-500"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
									Y Position (%)
								</label>
								<Input
									type="number"
									min="0"
									max="100"
									value={customY}
									onChange={(e) =>
										handleCustomDimensionChange("y", e.target.value)
									}
									placeholder="0"
									className="border-gray-300 bg-white text-gray-900 focus:border-green-500 focus:ring-green-500"
								/>
							</div>
						</div>

						<p className="text-[11px] text-gray-600 leading-relaxed">
							Enter values as percentages (0-100). Final crop region must stay
							within video boundaries.
						</p>
					</div>
				)}

				{/* Additional Options */}
				<div className="space-y-4 pt-4 border-t border-gray-200">
					<div>
						<label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
							Output Suffix
						</label>
						<Input
							type="text"
							value={outputSuffix}
							onChange={(e) => handleOutputSuffixChange(e.target.value)}
							placeholder="_cropped"
							className="border-gray-300 bg-white text-gray-900 focus:border-green-500 focus:ring-green-500"
						/>
						<p className="text-[11px] text-gray-600 mt-1.5">
							Resulting filename:{" "}
							<span className="text-gray-900 font-medium">
								video{outputSuffix || "_cropped"}.mp4
							</span>
						</p>
					</div>

					<label className="flex items-center gap-3 cursor-pointer group">
						<div className="relative flex items-center">
							<input
								type="checkbox"
								checked={cropConfig.preserveAudio || false}
								onChange={togglePreserveAudio}
								className="w-4 h-4 rounded border-gray-300 bg-white text-green-600 focus:ring-green-500 focus:ring-offset-2 transition-all cursor-pointer"
							/>
						</div>
						<span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
							Preserve Audio Track
						</span>
					</label>
				</div>
			</div>
		</ConfigurationCard>
	);
}
