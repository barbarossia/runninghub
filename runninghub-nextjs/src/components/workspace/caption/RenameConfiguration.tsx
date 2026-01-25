"use client";

import { useEffect, useState } from "react";
import { FileEdit, Hash } from "lucide-react";
import { useCaptionStore } from "@/store/caption-store";
import { ConfigurationCard } from "@/components/ui/ConfigurationCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RenameConfigurationProps {
	onConfigChange?: (
		config: ReturnType<typeof useCaptionStore.getState>,
	) => void;
	disabled?: boolean;
	className?: string;
}

const RENAME_PATTERNS = [
	{
		value: "prefix-sequence",
		label: "Prefix + Number",
		description: "photo001.jpg, photo002.jpg",
	},
	{
		value: "suffix-sequence",
		label: "Suffix + Number",
		description: "image-001.jpg, image-002.jpg",
	},
	{
		value: "custom-template",
		label: "Custom Template",
		description: "Use variables",
	},
];

const TEMPLATE_VARIABLES = [
	{ var: "{index}", desc: "Sequence number (1, 2, 3)" },
	{ var: "{index:03d}", desc: "Padded number (001, 002, 003)" },
	{ var: "{date}", desc: "Current date (YYYY-MM-DD)" },
	{ var: "{time}", desc: "Current time (HH-MM-SS)" },
	{ var: "{original}", desc: "Original filename" },
];

export function RenameConfiguration({
	onConfigChange,
	disabled = false,
	className = "",
}: RenameConfigurationProps) {
	const {
		renamePattern,
		renamePrefix,
		renameSuffix,
		renameStartNumber,
		renamePadding,
		renameTemplate,
		renamePreserveExtension,
		setRenamePattern,
		setRenamePrefix,
		setRenameSuffix,
		setRenameStartNumber,
		setRenamePadding,
		setRenameTemplate,
		toggleRenamePreserveExtension,
	} = useCaptionStore();

	const [localPrefix, setLocalPrefix] = useState(renamePrefix);
	const [localSuffix, setLocalSuffix] = useState(renameSuffix);
	const [localStartNumber, setLocalStartNumber] = useState(renameStartNumber);
	const [localPadding, setLocalPadding] = useState(renamePadding);
	const [localTemplate, setLocalTemplate] = useState(renameTemplate);

	useEffect(() => {
		onConfigChange?.(useCaptionStore.getState());
	}, [
		renamePattern,
		renamePrefix,
		renameSuffix,
		renameStartNumber,
		renamePadding,
		renameTemplate,
		renamePreserveExtension,
		onConfigChange,
	]);

	const getPreview = () => {
		const num = String(renameStartNumber).padStart(renamePadding, "0");
		const ext = renamePreserveExtension ? ".jpg" : "";

		if (renamePattern === "prefix-sequence") {
			return `${renamePrefix}${num}${ext}`;
		} else if (renamePattern === "suffix-sequence") {
			return `image${renameSuffix}${num}${ext}`;
		} else {
			return (
				localTemplate
					?.replace("{index}", num)
					.replace(/\{index:(\d+)d\}/, (_, w) =>
						String(renameStartNumber).padStart(parseInt(w), "0"),
					)
					.replace("{date}", new Date().toISOString().split("T")[0])
					.replace("{original}", "example") + ext
			);
		}
	};

	return (
		<ConfigurationCard
			title="Batch Rename"
			icon={FileEdit}
			variant="light"
			iconBgColor="bg-green-100"
			iconColor="text-green-600"
			disabled={disabled}
			className={className}
			subtitle={`Preview: ${getPreview()}`}
		>
			<div className="space-y-5">
				{/* Rename Pattern */}
				<div className="space-y-3">
					<div className="text-sm font-medium text-gray-700">
						Rename Pattern
					</div>
					<div className="grid grid-cols-1 gap-2">
						{RENAME_PATTERNS.map((pattern) => (
							<button
								key={pattern.value}
								type="button"
								onClick={() => setRenamePattern(pattern.value as any)}
								disabled={disabled}
								className={cn(
									"flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left",
									renamePattern === pattern.value
										? "border-green-500 bg-green-500 text-white"
										: "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
								)}
							>
								<span className="text-sm font-medium">{pattern.label}</span>
								<span
									className={cn(
										"text-xs",
										renamePattern === pattern.value
											? "text-green-100"
											: "text-gray-500",
									)}
								>
									{pattern.description}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* Prefix Mode */}
				{renamePattern === "prefix-sequence" && (
					<div className="space-y-3 pt-3 border-t border-gray-200">
						<label className="block text-xs font-medium text-gray-700 mb-1">
							Prefix
						</label>
						<Input
							type="text"
							value={localPrefix}
							onChange={(e) => {
								setLocalPrefix(e.target.value);
								setRenamePrefix(e.target.value);
							}}
							disabled={disabled}
							placeholder="photo"
						/>
					</div>
				)}

				{/* Suffix Mode */}
				{renamePattern === "suffix-sequence" && (
					<div className="space-y-3 pt-3 border-t border-gray-200">
						<label className="block text-xs font-medium text-gray-700 mb-1">
							Separator/Suffix
						</label>
						<Input
							type="text"
							value={localSuffix}
							onChange={(e) => {
								setLocalSuffix(e.target.value);
								setRenameSuffix(e.target.value);
							}}
							disabled={disabled}
							placeholder="-"
						/>
					</div>
				)}

				{/* Custom Template Mode */}
				{renamePattern === "custom-template" && (
					<div className="space-y-3 pt-3 border-t border-gray-200">
						<label className="block text-xs font-medium text-gray-700 mb-1">
							Custom Template
						</label>
						<Input
							type="text"
							value={localTemplate}
							onChange={(e) => {
								setLocalTemplate(e.target.value);
								setRenameTemplate(e.target.value);
							}}
							disabled={disabled}
							placeholder="{original}_{index:03d}"
						/>
						<div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
							<div className="font-medium mb-1">Variables:</div>
							<div className="grid grid-cols-2 gap-1">
								{TEMPLATE_VARIABLES.map((v) => (
									<div key={v.var}>
										<code className="text-blue-600">{v.var}</code>
										<span className="ml-1 text-gray-600">- {v.desc}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				)}

				{/* Number Settings */}
				{(renamePattern === "prefix-sequence" ||
					renamePattern === "suffix-sequence") && (
					<div className="space-y-3 pt-3 border-t border-gray-200">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Start Number
								</label>
								<Input
									type="number"
									min="1"
									value={localStartNumber}
									onChange={(e) => {
										setLocalStartNumber(parseInt(e.target.value) || 1);
										setRenameStartNumber(parseInt(e.target.value) || 1);
									}}
									disabled={disabled}
									className="mt-1"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Zero Padding
								</label>
								<Input
									type="number"
									min="1"
									max="10"
									value={localPadding}
									onChange={(e) => {
										setLocalPadding(parseInt(e.target.value) || 3);
										setRenamePadding(parseInt(e.target.value) || 3);
									}}
									disabled={disabled}
									className="mt-1"
								/>
							</div>
						</div>
						<p className="text-xs text-gray-500">
							Example:{" "}
							<span className="font-medium">
								{String(localStartNumber).padStart(localPadding, "0")}
							</span>
						</p>
					</div>
				)}

				{/* Preserve Extension */}
				<label className="flex items-center gap-3 cursor-pointer pt-3 border-t border-gray-200">
					<input
						type="checkbox"
						checked={renamePreserveExtension}
						onChange={toggleRenamePreserveExtension}
						disabled={disabled}
						className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
					/>
					<span className="text-sm text-gray-700 font-medium">
						Preserve file extension
					</span>
				</label>

				{/* Preview */}
				<div className="pt-3 border-t border-gray-200">
					<div className="text-xs text-gray-600 bg-green-50 p-3 rounded-lg border border-green-200">
						<div className="font-medium text-green-800 mb-1">
							Preview (first 3 files):
						</div>
						<div className="space-y-0.5 text-green-700">
							<div>
								1. {getPreview().replace(/\.[^.]+$/, "")}
								{renamePreserveExtension ? ".jpg" : ""}
							</div>
							<div>
								2.{" "}
								{getPreview().replace(/\d+/g, (_, p) =>
									String(parseInt(p || "1") + 1).padStart(localPadding, "0"),
								)}
							</div>
							<div>
								3.{" "}
								{getPreview().replace(/\d+/g, (_, p) =>
									String(parseInt(p || "1") + 2).padStart(localPadding, "0"),
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</ConfigurationCard>
	);
}
