"use client";

import { useEffect, useState } from "react";
import { FileImage, Sliders } from "lucide-react";
import { useCaptionStore } from "@/store/caption-store";
import { ConfigurationCard } from "@/components/ui/ConfigurationCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ConvertConfigurationProps {
	onConfigChange?: (
		config: ReturnType<typeof useCaptionStore.getState>,
	) => void;
	disabled?: boolean;
	className?: string;
}

const OUTPUT_FORMATS = [
	{
		value: "jpg",
		label: "JPG",
		extension: ".jpg",
		description: "Best for photos",
	},
	{
		value: "png",
		label: "PNG",
		extension: ".png",
		description: "Lossless, transparency",
	},
	{
		value: "webp",
		label: "WebP",
		extension: ".webp",
		description: "Modern, efficient",
	},
	{
		value: "avif",
		label: "AVIF",
		extension: ".avif",
		description: "Next-gen compression",
	},
];

export function ConvertConfiguration({
	onConfigChange,
	disabled = false,
	className = "",
}: ConvertConfigurationProps) {
	const {
		convertOutputFormat,
		convertQuality,
		convertLossless,
		convertOutputSuffix,
		convertDeleteOriginal,
		setConvertOutputFormat,
		setConvertQuality,
		setConvertLossless,
		setConvertOutputSuffix,
		toggleConvertDeleteOriginal,
	} = useCaptionStore();

	const [localQuality, setLocalQuality] = useState(convertQuality);
	const [localSuffix, setLocalSuffix] = useState(convertOutputSuffix || "");

	useEffect(() => {
		onConfigChange?.(useCaptionStore.getState());
	}, [
		convertOutputFormat,
		convertQuality,
		convertLossless,
		convertOutputSuffix,
		convertDeleteOriginal,
		onConfigChange,
	]);

	const handleQualityChange = (value: string) => {
		const num = parseInt(value) || 90;
		setLocalQuality(num);
		setConvertQuality(num);
	};

	const selectedFormat = OUTPUT_FORMATS.find(
		(f) => f.value === convertOutputFormat,
	);
	const supportsQuality = ["jpg", "webp", "avif"].includes(convertOutputFormat);

	const getOutputName = (inputName = "image") => {
		const base = inputName.replace(/\.[^.]+$/, "");
		const suffix =
			localSuffix || (convertOutputSuffix !== "" ? localSuffix : "");
		return `${base}${suffix}.${convertOutputFormat}`;
	};

	return (
		<ConfigurationCard
			title="Format Convert"
			icon={FileImage}
			variant="light"
			iconBgColor="bg-orange-100"
			iconColor="text-orange-600"
			disabled={disabled}
			className={className}
			subtitle={
				<>
					Output: {selectedFormat?.label.toUpperCase()}
					{supportsQuality &&
						!convertLossless &&
						` • Quality: ${localQuality}%`}
				</>
			}
		>
			<div className="space-y-5">
				{/* Output Format */}
				<div className="space-y-3">
					<div className="text-sm font-medium text-gray-700">Output Format</div>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
						{OUTPUT_FORMATS.map((format) => (
							<button
								key={format.value}
								type="button"
								onClick={() => setConvertOutputFormat(format.value as any)}
								disabled={disabled}
								className={cn(
									"flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
									convertOutputFormat === format.value
										? "border-orange-500 bg-orange-500 text-white"
										: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
								)}
							>
								<span className="text-sm font-medium">{format.label}</span>
								<span
									className={cn(
										"text-xs",
										convertOutputFormat === format.value
											? "text-orange-100"
											: "text-gray-500",
									)}
								>
									{format.description}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* Quality Slider (for lossy formats) */}
				{supportsQuality && (
					<div className="space-y-3 pt-3 border-t border-gray-200">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm font-medium text-gray-700">
								<Sliders className="h-4 w-4" />
								Quality
							</div>
							<span className="text-sm text-orange-600 font-medium">
								{localQuality}%
							</span>
						</div>

						{!convertLossless && (
							<>
								<input
									type="range"
									min="1"
									max="100"
									value={localQuality}
									onChange={(e) => handleQualityChange(e.target.value)}
									disabled={disabled}
									className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
								/>
								<div className="flex justify-between text-xs text-gray-500">
									<span>Smallest file</span>
									<span>Best quality</span>
								</div>
							</>
						)}

						{/* Lossless Option */}
						{["webp", "avif"].includes(convertOutputFormat) && (
							<label className="flex items-center gap-3 cursor-pointer mt-2">
								<input
									type="checkbox"
									checked={convertLossless}
									onChange={(e) => setConvertLossless(e.target.checked)}
									disabled={disabled}
									className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
								/>
								<div className="flex flex-col">
									<span className="text-sm text-gray-700 font-medium">
										Lossless compression
									</span>
									<span className="text-xs text-gray-500">
										Larger file, no quality loss
									</span>
								</div>
							</label>
						)}
					</div>
				)}

				{/* Output Suffix */}
				<div className="space-y-3 pt-3 border-t border-gray-200">
					<label className="block text-xs font-medium text-gray-700 mb-1">
						Output Suffix (Optional)
					</label>
					<Input
						type="text"
						value={localSuffix}
						onChange={(e) => setConvertOutputSuffix(e.target.value)}
						disabled={disabled}
						placeholder="Leave empty to replace"
					/>
					<p className="text-xs text-gray-500">
						Result: <span className="font-medium">{getOutputName()}</span>
					</p>
				</div>

				{/* Delete Original */}
				<label className="flex items-center gap-3 cursor-pointer pt-3 border-t border-gray-200">
					<input
						type="checkbox"
						checked={convertDeleteOriginal}
						onChange={toggleConvertDeleteOriginal}
						disabled={disabled}
						className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
					/>
					<div className="flex flex-col">
						<span className="text-sm text-gray-700 font-medium">
							Delete original after conversion
						</span>
						<span className="text-xs text-gray-500">
							The original files will be permanently deleted
						</span>
					</div>
				</label>

				{/* Info */}
				<div className="pt-3 border-t border-gray-200">
					<div className="flex items-start gap-2 text-xs text-gray-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
						<FileImage className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
						<div className="space-y-1">
							<p className="font-medium text-orange-800">Format Details:</p>
							<ul className="list-disc list-inside space-y-0.5 text-orange-700">
								<li>
									<strong>JPG:</strong> Best for photos, small file size, no
									transparency
								</li>
								<li>
									<strong>PNG:</strong> Lossless, supports transparency, larger
									files
								</li>
								<li>
									<strong>WebP:</strong> Modern format, excellent compression,
									broad support
								</li>
								<li>
									<strong>AVIF:</strong> Next-gen format, best compression,
									newer browsers
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</ConfigurationCard>
	);
}
