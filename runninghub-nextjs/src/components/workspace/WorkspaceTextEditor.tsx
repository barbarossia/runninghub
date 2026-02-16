/**
 * Workspace Text Editor Component
 * Displays image preview with editable text areas for English and Chinese
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Image as ImageIcon } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { API_ENDPOINTS } from "@/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WorkspaceTextEditorProps {
	fileId: string;
}

export function WorkspaceTextEditor({ fileId }: WorkspaceTextEditorProps) {
	const { uploadedFiles, getTextContent, updateTextContent } =
		useWorkspaceStore();

	const file = uploadedFiles.find((f) => f.id === fileId);
	const textContentData = getTextContent(fileId);

	const [currentLanguage, setCurrentLanguage] = useState<"en" | "zh">("en");
	const [currentText, setCurrentText] = useState("");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	// Update text content when file changes
	useEffect(() => {
		if (textContentData) {
			const content =
				currentLanguage === "en" ? textContentData.en : textContentData.zh;
			setCurrentText(content || "");
			setHasUnsavedChanges(false);
		}
	}, [fileId, currentLanguage, textContentData]);

	const handleTextChange = (value: string) => {
		setCurrentText(value);
		setHasUnsavedChanges(true);
		updateTextContent(fileId, value, currentLanguage);
	};

	const handleSave = async () => {
		if (!hasUnsavedChanges) {
			toast.info("No changes to save");
			return;
		}

		setIsSaving(true);

		try {
			const response = await fetch(API_ENDPOINTS.WORKSPACE_SAVE, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					fileId,
					content: currentText,
					language: currentLanguage,
					workspacePath: useWorkspaceStore.getState().config.path,
				}),
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data.error || "Save failed");
			}

			setHasUnsavedChanges(false);
			toast.success("Saved successfully");
		} catch (err) {
			const error = err instanceof Error ? err.message : "Save failed";
			toast.error(error);
		} finally {
			setIsSaving(false);
		}
	};

	if (!file) {
		return null;
	}

	return (
		<Card className="overflow-hidden">
			<CardContent className="p-0">
				{/* Image Preview */}
				<div className="relative aspect-video bg-gray-100 border-b">
					{file.workspacePath ? (
						<img
							src={`/api/workspace/serve/${fileId}`}
							alt={file.name}
							className="w-full h-full object-contain"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<ImageIcon className="h-12 w-12 text-gray-400" />
						</div>
					)}
					{file.status === "processing" && (
						<Badge className="absolute top-2 right-2" variant="secondary">
							<Loader2 className="h-3 w-3 mr-1 animate-spin" />
							Processing
						</Badge>
					)}
				</div>

				{/* Text Editor */}
				<div className="p-4">
					<Tabs
						value={currentLanguage}
						onValueChange={(v) => setCurrentLanguage(v as "en" | "zh")}
					>
						<TabsList className="grid w-full grid-cols-2 mb-4">
							<TabsTrigger value="en">English</TabsTrigger>
							<TabsTrigger value="zh">中文</TabsTrigger>
						</TabsList>

						<TabsContent value="en" className="space-y-2">
							<Textarea
								value={currentText}
								onChange={(e) => handleTextChange(e.target.value)}
								placeholder="English text content..."
								className={cn(
									"min-h-[200px] resize-y",
									hasUnsavedChanges && "border-blue-500",
								)}
								disabled={file.status === "processing"}
							/>
						</TabsContent>

						<TabsContent value="zh" className="space-y-2">
							<Textarea
								value={currentText}
								onChange={(e) => handleTextChange(e.target.value)}
								placeholder="中文内容..."
								className={cn(
									"min-h-[200px] resize-y",
									hasUnsavedChanges && "border-blue-500",
								)}
								disabled={file.status === "processing"}
							/>
						</TabsContent>
					</Tabs>

					{/* Action Buttons */}
					<div className="flex gap-2 mt-4">
						<Button
							onClick={handleSave}
							disabled={
								!hasUnsavedChanges || isSaving || file.status === "processing"
							}
							size="sm"
							className="flex-1"
						>
							{isSaving ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<Save className="h-4 w-4 mr-2" />
							)}
							Save
						</Button>
					</div>

					{hasUnsavedChanges && (
						<p className="text-xs text-orange-600 mt-2">
							You have unsaved changes
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
