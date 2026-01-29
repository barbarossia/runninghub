"use client";

import { useEffect } from "react";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
	LOCAL_OPS_DEFINITIONS,
	type LocalOpInputDefinition,
} from "@/constants/local-ops";
import type { LocalWorkflowOperationType } from "@/types/workspace";

interface LocalNodeConfiguratorProps {
	operationType: LocalWorkflowOperationType;
	config: Record<string, any>;
	onConfigChange: (config: Record<string, any>) => void;
	disabled?: boolean;
	className?: string;
}

export function LocalNodeConfigurator({
	operationType,
	config,
	onConfigChange,
	disabled = false,
	className,
}: LocalNodeConfiguratorProps) {
	const definition = LOCAL_OPS_DEFINITIONS[operationType];

	if (!definition) {
		return (
			<div className="p-4 border border-red-200 rounded bg-red-50 text-red-700 text-sm">
				Unknown operation type: {operationType}
			</div>
		);
	}

	// Initialize default values if missing
	useEffect(() => {
		const newConfig = { ...config };
		let hasChanges = false;

		definition.inputs.forEach((input) => {
			if (newConfig[input.name] === undefined && input.defaultValue !== undefined) {
				newConfig[input.name] = input.defaultValue;
				hasChanges = true;
			}
		});

		if (hasChanges) {
			onConfigChange(newConfig);
		}
	}, [operationType, definition.inputs, config, onConfigChange]);

	const updateField = (name: string, value: any) => {
		onConfigChange({
			...config,
			[name]: value,
		});
	};

	return (
		<div className={cn("space-y-4", className)}>
			<div className="text-sm text-gray-500 mb-4">{definition.description}</div>

			<div className="grid gap-4">
				{definition.inputs.map((input) => {
					// Check visibility
					if (input.showIf && !input.showIf(config)) {
						return null;
					}

					return (
						<InputRenderer
							key={input.name}
							input={input}
							value={config[input.name]}
							onChange={(val) => updateField(input.name, val)}
							disabled={disabled}
						/>
					);
				})}
			</div>
		</div>
	);
}

function InputRenderer({
	input,
	value,
	onChange,
	disabled,
}: {
	input: LocalOpInputDefinition;
	value: any;
	onChange: (val: any) => void;
	disabled: boolean;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<Label className="text-xs font-medium text-gray-700">
					{input.label}
					{input.required && <span className="text-red-500 ml-1">*</span>}
				</Label>
				{input.description && (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger>
								<Info className="h-3 w-3 text-gray-400" />
							</TooltipTrigger>
							<TooltipContent>
								<p className="max-w-xs text-xs">{input.description}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</div>

			<div className="flex-1">
				{input.type === "text" && (
					<Input
						type="text"
						value={value ?? ""}
						onChange={(e) => onChange(e.target.value)}
						disabled={disabled}
						placeholder={input.placeholder}
						className="h-8 text-xs"
					/>
				)}

				{input.type === "number" && (
					<Input
						type="number"
						value={value ?? ""}
						onChange={(e) => {
							const val = e.target.value === "" ? undefined : Number(e.target.value);
							onChange(val);
						}}
						disabled={disabled}
						min={input.min}
						max={input.max}
						placeholder={input.placeholder}
						className="h-8 text-xs"
					/>
				)}

				{input.type === "boolean" && (
					<div className="flex items-center gap-2 h-8">
						<Switch
							checked={value === true}
							onCheckedChange={onChange}
							disabled={disabled}
						/>
						<span className="text-xs text-gray-500">
							{value ? "Enabled" : "Disabled"}
						</span>
					</div>
				)}

				{input.type === "select" && input.options && (
					<Select
						value={String(value ?? "")}
						onValueChange={(val) => {
                            // Try to preserve number type if original option was number
                            const originalOpt = input.options?.find(o => String(o.value) === val);
                            onChange(originalOpt ? originalOpt.value : val);
                        }}
						disabled={disabled}
					>
						<SelectTrigger className="h-8 text-xs w-full">
							<SelectValue placeholder="Select..." />
						</SelectTrigger>
						<SelectContent>
							{input.options.map((opt) => (
								<SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>
		</div>
	);
}
