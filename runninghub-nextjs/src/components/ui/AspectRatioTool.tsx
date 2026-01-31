"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelectionStore } from "@/store/selection-store";
import { useUiPreferencesStore } from "@/store/ui-preferences-store";
import { useVideoSelectionStore } from "@/store/video-selection-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Calculator, Minimize2, RefreshCw } from "lucide-react";
import type { MediaFile } from "@/types/workspace";

type Mode = "width" | "height";

const parsePositiveInt = (value: string): number | null => {
	if (!value) return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return null;
	return Math.round(parsed);
};

const gcd = (a: number, b: number): number => {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y !== 0) {
		const temp = y;
		y = x % y;
		x = temp;
	}
	return x || 1;
};

interface AspectRatioToolProps {
	className?: string;
}

export function AspectRatioTool({ className = "" }: AspectRatioToolProps) {
	const workspaceMediaFiles = useWorkspaceStore((state) => state.mediaFiles);
	const selectedImages = useSelectionStore((state) => state.selectedImages);
	const lastSelectedImagePath = useSelectionStore(
		(state) => state.lastSelectedImagePath,
	);
	const selectedVideos = useVideoSelectionStore((state) => state.selectedVideos);
	const lastSelectedVideoPath = useVideoSelectionStore(
		(state) => state.lastSelectedVideoPath,
	);
	const { aspectToolCollapsed, setAspectToolCollapsed } =
		useUiPreferencesStore();

	const [mode, setMode] = useState<Mode>("width");
	const [originalWidth, setOriginalWidth] = useState<string>("");
	const [originalHeight, setOriginalHeight] = useState<string>("");
	const [targetWidth, setTargetWidth] = useState<string>("");
	const [targetHeight, setTargetHeight] = useState<string>("");
 
	const selectedWorkspaceFile = useMemo(() => {
		return workspaceMediaFiles.find((file) => file.selected);
	}, [workspaceMediaFiles]);

	const selectedImage = useMemo(() => {
		if (lastSelectedImagePath && selectedImages.has(lastSelectedImagePath)) {
			return selectedImages.get(lastSelectedImagePath);
		}
		return selectedImages.values().next().value as MediaFile | undefined;
	}, [selectedImages, lastSelectedImagePath]);

	const selectedVideo = useMemo(() => {
		if (lastSelectedVideoPath && selectedVideos.has(lastSelectedVideoPath)) {
			return selectedVideos.get(lastSelectedVideoPath);
		}
		return selectedVideos.values().next().value as MediaFile | undefined;
	}, [selectedVideos, lastSelectedVideoPath]);

	const selectedMedia = useMemo(() => {
		const candidates = [
			selectedWorkspaceFile,
			selectedImage,
			selectedVideo,
		].filter(Boolean) as MediaFile[];
		return (
			candidates.find((item) => item.width && item.height) || candidates[0]
		);
	}, [selectedWorkspaceFile, selectedImage, selectedVideo]);

	useEffect(() => {
		if (selectedMedia?.width && selectedMedia?.height) {
			setOriginalWidth(String(Math.round(selectedMedia.width)));
			setOriginalHeight(String(Math.round(selectedMedia.height)));
		}
	}, [selectedMedia?.width, selectedMedia?.height]);

	const originalW = parsePositiveInt(originalWidth);
	const originalH = parsePositiveInt(originalHeight);
	const targetW = parsePositiveInt(targetWidth);
	const targetH = parsePositiveInt(targetHeight);

	const computedValue = useMemo(() => {
		if (!originalW || !originalH) return "";
		if (mode === "width") {
			if (!targetW) return "";
			const height = Math.round((targetW * originalH) / originalW);
			return String(height);
		}
		if (!targetH) return "";
		const width = Math.round((targetH * originalW) / originalH);
		return String(width);
	}, [mode, originalW, originalH, targetW, targetH]);

	const aspectText = useMemo(() => {
		if (!originalW || !originalH) return "Aspect: -";
		const divisor = gcd(originalW, originalH);
		return `Aspect: ${originalW / divisor}:${originalH / divisor}`;
	}, [originalW, originalH]);

	const handleReset = () => {
		setTargetWidth("");
		setTargetHeight("");
	};

	if (aspectToolCollapsed) {
		return null;
	}

	return (
		<div className={cn("w-[280px]", className)}>
			<Card className="border border-blue-100 bg-white/95 shadow-lg backdrop-blur">
				<div className="flex items-center justify-between border-b border-blue-100 px-3 py-2">
					<div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
						<Calculator className="h-4 w-4 text-blue-600" />
						Aspect Tool
					</div>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={handleReset}
							title="Reset target"
						>
							<RefreshCw className="h-3.5 w-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={() => setAspectToolCollapsed(true)}
							title="Minimize"
						>
							<Minimize2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
				<div className="space-y-3 px-3 py-3 text-xs text-gray-600">
					<div className="flex gap-2">
						<Button
							variant={mode === "width" ? "secondary" : "ghost"}
							size="sm"
							className="flex-1 text-xs"
							onClick={() => setMode("width")}
						>
							Width to Height
						</Button>
						<Button
							variant={mode === "height" ? "secondary" : "ghost"}
							size="sm"
							className="flex-1 text-xs"
							onClick={() => setMode("height")}
						>
							Height to Width
						</Button>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<label className="text-[11px] text-gray-500">Orig W</label>
							<Input
								value={originalWidth}
								onChange={(e) => setOriginalWidth(e.target.value)}
								placeholder="e.g. 480"
								inputMode="numeric"
							/>
						</div>
						<div className="space-y-1">
							<label className="text-[11px] text-gray-500">Orig H</label>
							<Input
								value={originalHeight}
								onChange={(e) => setOriginalHeight(e.target.value)}
								placeholder="e.g. 650"
								inputMode="numeric"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<label className="text-[11px] text-gray-500">
								{mode === "width" ? "Target W" : "Target H"}
							</label>
							<Input
								value={mode === "width" ? targetWidth : targetHeight}
								onChange={(e) =>
									mode === "width"
										? setTargetWidth(e.target.value)
										: setTargetHeight(e.target.value)
								}
								placeholder={mode === "width" ? "e.g. 720" : "e.g. 975"}
								inputMode="numeric"
							/>
						</div>
						<div className="space-y-1">
							<label className="text-[11px] text-gray-500">
								{mode === "width" ? "Result H" : "Result W"}
							</label>
							<Input value={computedValue} readOnly placeholder="-" />
						</div>
					</div>

					<div className="flex items-center justify-between text-[11px] text-gray-500">
						<span>{aspectText}</span>
						{selectedMedia?.width && selectedMedia?.height && (
							<span className="text-blue-600">Auto</span>
						)}
					</div>
				</div>
			</Card>
		</div>
	);
}
