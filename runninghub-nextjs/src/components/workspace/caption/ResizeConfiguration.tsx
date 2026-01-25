"use client";

import { useEffect, useState } from "react";
import { Maximize, Ratio } from "lucide-react";
import { useCaptionStore } from "@/store/caption-store";
import { ConfigurationCard } from "@/components/ui/ConfigurationCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ResizeConfigurationProps {
	onConfigChange?: (
		config: ReturnType<typeof useCaptionStore.getState>,
	) => void;
	disabled?: boolean;
	className?: string;
}

const RESIZE_MODES = [
	{ value: "percentage", label: "Percentage", description: "Scale by %" },
	{ value: "dimensions", label: "Dimensions", description: "Exact size" },
	{ value: "longest", label: "Longest Edge", description: "Fit longest side" },
	{
		value: "shortest",
		label: "Shortest Edge",
		description: "Fit shortest side",
	},
];

const ASPECT_RATIO_STRATEGIES = [
	{ value: "fit", label: "Fit", description: "Keep aspect ratio" },
	{ value: "fill", label: "Fill", description: "Crop to fill" },
	{ value: "stretch", label: "Stretch", description: "Distort to fit" },
];

const PRESET_PERCENTAGES = [25, 50, 75, 100, 150, 200];

export function ResizeConfiguration({
	onConfigChange,
	disabled = false,
	className = "",
}: ResizeConfigurationProps) {
	const {
		resizeMode,
		resizeWidth,
		resizeHeight,
		resizePercentage,
		resizeAspectRatioStrategy,
		resizeOutputSuffix,
		resizeDeleteOriginal,
		setResizeMode,
		setResizeDimensions,
		setResizePercentage,
		setResizeAspectRatioStrategy,
		setResizeOutputSuffix,
		toggleResizeDeleteOriginal,
	} = useCaptionStore();

	const [localWidth, setLocalWidth] = useState(resizeWidth?.toString() || "");
	const [localHeight, setLocalHeight] = useState(
		resizeHeight?.toString() || "",
	);
	const [localSuffix, setLocalSuffix] = useState(
		resizeOutputSuffix || "_resized",
	);

	useEffect(() => {
		onConfigChange?.(useCaptionStore.getState());
	}, [
		resizeMode,
		resizeWidth,
		resizeHeight,
		resizePercentage,
		resizeAspectRatioStrategy,
		resizeOutputSuffix,
		resizeDeleteOriginal,
		onConfigChange,
	]);

	const handleWidthChange = (value: string) => {
		setLocalWidth(value);
		setResizeDimensions({
			width: parseInt(value) || undefined,
			height: resizeHeight,
		});
	};

	const handleHeightChange = (value: string) => {
		setLocalHeight(value);
		setResizeDimensions({
			width: resizeWidth,
			height: parseInt(value) || undefined,
		});
	};

	const handleSuffixChange = (value: string) => {
		setLocalSuffix(value);
		setResizeOutputSuffix(value);
	};

	const getSubtitle = () => {
		if (resizeMode === "percentage") return `Scale: ${resizePercentage}%`;
		if (resizeMode === "dimensions")
			return `${localWidth || "?"} x ${localHeight || "?"}px`;
		return `${resizeMode === "longest" ? "Longest" : "Shortest"}: ${resizeWidth || 1920}px`;
	};

	return (
		<ConfigurationCard
			title="Batch Resize"
			icon={Maximize}
			variant="light"
			iconBgColor="bg-blue-100"
			iconColor="text-blue-600"
			disabled={disabled}
			className={className}
			subtitle={getSubtitle()}
		>
			<div className="space-y-5">
				{/* Resize Mode */}
				<div className="space-y-3">
					<div className="text-sm font-medium text-gray-700">Resize Mode</div>
					<div className="grid grid-cols-2 gap-2">
						{RESIZE_MODES.map((mode) => (
							<button
								key={mode.value}
								type="button"
								onClick={() => setResizeMode(mode.value as any)}
								disabled={disabled}
								className={cn(
									"flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
									resizeMode === mode.value
										? "border-blue-500 bg-blue-500 text-white"
										: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
								)}
							>
								<span className="text-sm font-medium">{mode.label}</span>
								<span
									className={cn(
										"text-xs",
										resizeMode === mode.value
											? "text-blue-100"
											: "text-gray-500",
									)}
								>
									{mode.description}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* Percentage Mode */}
				{resizeMode === "percentage" && (
					<div className="space-y-3 pt-3 border-t border-gray-200">
						<div className="text-sm font-medium text-gray-700">Percentage</div>
						<div className="grid grid-cols-3 md:grid-cols-6 gap-2">
							{PRESET_PERCENTAGES.map((pct) => (
								<button
									key={pct}
									type="button"
									onClick={() => setResizePercentage(pct)}
									disabled={disabled}
									className={cn(
										"px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all",
										resizePercentage === pct
											? "border-blue-500 bg-blue-500 text-white"
											: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
									)}
								>
									{pct}%
								</button>
							))}
						</div>
					</div>
				)}

				{/* Dimensions Mode */}
				{resizeMode === "dimensions" && (
					<div className="space-y-3 pt-3 border-t border-gray-200">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Width (px)
								</label>
								<Input
									type="number"
									min="1"
									value={localWidth}
									onChange={(e) => handleWidthChange(e.target.value)}
									disabled={disabled}
									placeholder="1920"
									className="mt-1"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Height (px)
								</label>
								<Input
									type="number"
									min="1"
									value={localHeight}
									onChange={(e) => handleHeightChange(e.target.value)}
									disabled={disabled}
									placeholder="1080"
									className="mt-1"
								/>
							</div>
						</div>
					</div>
				)}

				{/* Longest/Shortest Mode */}
				{(resizeMode === "longest" || resizeMode === "shortest") && (
					<div className="space-y-3 pt-3 border-t border-gray-200">
						<label className="block text-xs font-medium text-gray-700 mb-1">
							{resizeMode === "longest" ? "Longest" : "Shortest"} Edge Size (px)
						</label>
						<Input
							type="number"
							min="1"
							value={resizeWidth || 1920}
							onChange={(e) =>
								setResizeDimensions({ width: parseInt(e.target.value) })
							}
							disabled={disabled}
							placeholder="1920"
							className="w-32"
						/>
					</div>
				)}

				{/* Aspect Ratio Strategy (for dimensions mode) */}
				{resizeMode === "dimensions" && (
					<div className="space-y-3 pt-3 border-t border-gray-200">
						<div className="flex items-center gap-2 text-sm font-medium text-gray-700">
							<Ratio className="h-4 w-4" />
							Aspect Ratio
						</div>
						<div className="grid grid-cols-3 gap-2">
							{ASPECT_RATIO_STRATEGIES.map((strategy) => (
								<button
									key={strategy.value}
									type="button"
									onClick={() =>
										setResizeAspectRatioStrategy(strategy.value as any)
									}
									disabled={disabled}
									className={cn(
										"flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all",
										resizeAspectRatioStrategy === strategy.value
											? "border-blue-500 bg-blue-500 text-white"
											: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
									)}
								>
									<span className="text-xs font-medium">{strategy.label}</span>
									<span
										className={cn(
											"text-[10px]",
											resizeAspectRatioStrategy === strategy.value
												? "text-blue-100"
												: "text-gray-500",
										)}
									>
										{strategy.description}
									</span>
								</button>
							))}
						</div>
					</div>
				)}

				{/* Output Suffix */}
				<div className="space-y-3 pt-3 border-t border-gray-200">
					<label className="block text-xs font-medium text-gray-700 mb-1">
						Output Suffix
					</label>
					<Input
						type="text"
						value={localSuffix}
						onChange={(e) => handleSuffixChange(e.target.value)}
						disabled={disabled}
						placeholder="_resized"
					/>
					<p className="text-xs text-gray-500">
						Result: <span className="font-medium">image{localSuffix}.jpg</span>
					</p>
				</div>

				{/* Delete Original */}
				<label className="flex items-center gap-3 cursor-pointer pt-3 border-t border-gray-200">
					<input
						type="checkbox"
						checked={resizeDeleteOriginal}
						onChange={toggleResizeDeleteOriginal}
						disabled={disabled}
						className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
					/>
					<div className="flex flex-col">
						<span className="text-sm text-gray-700 font-medium">
							Delete original after resize
						</span>
						<span className="text-xs text-gray-500">
							The original files will be permanently deleted
						</span>
					</div>
				</label>
			</div>
		</ConfigurationCard>
	);
}
