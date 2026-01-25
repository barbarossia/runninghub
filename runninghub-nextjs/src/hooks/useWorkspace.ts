/**
 * Workspace operations hook
 * Handles file upload, processing, and saving for workspace functionality
 */

import { useCallback } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import {
	API_ENDPOINTS,
	ENVIRONMENT_VARIABLES,
	ERROR_MESSAGES,
} from "@/constants";
import type {
	FileUploadRequest,
	FileUploadResponse,
	ProcessRequest,
	ProcessResponse,
	SaveTextRequest,
	SaveTextResponse,
} from "@/types/workspace";

export interface UseWorkspaceOptions {
	onUploadComplete?: (files: FileUploadResponse[]) => void;
	onProcessComplete?: (taskId: string) => void;
	onSaveComplete?: (savedPath: string) => void;
	onError?: (error: string) => void;
}

/**
 * Hook for workspace operations
 */
export function useWorkspace(options: UseWorkspaceOptions = {}) {
	const { onUploadComplete, onProcessComplete, onSaveComplete, onError } =
		options;

	const {
		config,
		addUploadedFile,
		updateFileStatus,
		setActiveTaskId,
		setProcessing,
	} = useWorkspaceStore();

	/**
	 * Upload files to workspace
	 */
	const uploadImages = useCallback(
		async (files: File[]): Promise<FileUploadResponse[]> => {
			if (!config.path) {
				const error = ERROR_MESSAGES.WORKSPACE_NOT_CONFIGURED;
				onError?.(error);
				throw new Error(error);
			}

			setProcessing(true);

			try {
				// Convert files to base64
				const filePromises = Array.from(files).map(async (file) => {
					return new Promise<FileUploadRequest>((resolve, reject) => {
						const reader = new FileReader();
						reader.onload = () => {
							const base64 = (reader.result as string).split(",")[1];
							resolve({
								name: file.name,
								data: base64,
							});
						};
						reader.onerror = reject;
						reader.readAsDataURL(file);
					});
				});

				const fileData = await Promise.all(filePromises);

				// Upload to API
				const response = await fetch(API_ENDPOINTS.WORKSPACE_UPLOAD, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						files: fileData,
						workspacePath: config.path,
					}),
				});

				const text = await response.text();
				let data: {
					success: boolean;
					uploadedFiles?: FileUploadResponse[];
					error?: string;
				};
				try {
					data = text
						? JSON.parse(text)
						: { success: false, error: "Empty response" };
				} catch (e) {
					throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
				}

				if (!response.ok || !data.success) {
					throw new Error(data.error || ERROR_MESSAGES.UPLOAD_FAILED);
				}

				if (data.uploadedFiles) {
					// Add files to store
					data.uploadedFiles.forEach((file) => {
						addUploadedFile({
							id: file.id,
							name: file.name,
							originalPath: file.name,
							workspacePath: file.workspacePath,
							status: "uploaded",
							uploadedAt: Date.now(),
						});
					});

					onUploadComplete?.(data.uploadedFiles);
				}

				return data.uploadedFiles || [];
			} catch (err) {
				const error =
					err instanceof Error ? err.message : ERROR_MESSAGES.UPLOAD_FAILED;
				onError?.(error);
				throw err;
			} finally {
				setProcessing(false);
			}
		},
		[config.path, setProcessing, addUploadedFile, onError, onUploadComplete],
	);

	/**
	 * Process uploaded files with RunningHub workflow
	 */
	const processImages = useCallback(
		async (fileIds: string[]): Promise<ProcessResponse> => {
			if (!config.workflowId) {
				const error = ERROR_MESSAGES.NO_WORKFLOW_ID;
				onError?.(error);
				return {
					success: false,
					taskId: "",
					message: error,
					error,
				};
			}

			if (!config.path) {
				const error = ERROR_MESSAGES.WORKSPACE_NOT_CONFIGURED;
				onError?.(error);
				return {
					success: false,
					taskId: "",
					message: error,
					error,
				};
			}

			if (fileIds.length === 0) {
				const error = ERROR_MESSAGES.NO_FILES_SELECTED;
				onError?.(error);
				return {
					success: false,
					taskId: "",
					message: error,
					error,
				};
			}

			setProcessing(true);

			// Update file statuses to processing
			fileIds.forEach((id) => {
				updateFileStatus(id, "processing");
			});

			try {
				// Get file paths from store
				const files = useWorkspaceStore
					.getState()
					.uploadedFiles.filter((f) => fileIds.includes(f.id));

				const filePaths = files.map((f) => f.workspacePath);

				const response = await fetch(API_ENDPOINTS.WORKSPACE_PROCESS, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						files: filePaths,
						workflowId: config.workflowId,
						workspacePath: config.path,
					} as ProcessRequest),
				});

				const text = await response.text();
				let data: ProcessResponse;
				try {
					data = text
						? JSON.parse(text)
						: ({ success: false, error: "Empty response" } as any);
				} catch (e) {
					throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
				}

				if (!response.ok || !data.success) {
					throw new Error(data.error || "Processing failed");
				}

				// Update file statuses
				fileIds.forEach((id) => {
					updateFileStatus(id, "completed");
				});

				if (data.taskId) {
					setActiveTaskId(data.taskId);
					onProcessComplete?.(data.taskId);
				}

				return data;
			} catch (err) {
				const error = err instanceof Error ? err.message : "Processing failed";
				onError?.(error);

				// Update file statuses to error
				fileIds.forEach((id) => {
					updateFileStatus(id, "error", error);
				});

				return {
					success: false,
					taskId: "",
					message: error,
					error,
				};
			} finally {
				setProcessing(false);
			}
		},
		[
			config.workflowId,
			config.path,
			setProcessing,
			updateFileStatus,
			setActiveTaskId,
			onError,
			onProcessComplete,
		],
	);

	/**
	 * Save text content to file
	 */
	const saveTextContent = useCallback(
		async (
			fileId: string,
			content: string,
			language: "en" | "zh",
		): Promise<SaveTextResponse> => {
			if (!config.path) {
				const error = ERROR_MESSAGES.WORKSPACE_NOT_CONFIGURED;
				onError?.(error);
				return {
					success: false,
					savedPath: "",
					error,
				};
			}

			try {
				const response = await fetch(API_ENDPOINTS.WORKSPACE_SAVE, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						fileId,
						content,
						language,
						workspacePath: config.path,
					} as SaveTextRequest),
				});

				const text = await response.text();
				let data: SaveTextResponse;
				try {
					data = text
						? JSON.parse(text)
						: ({ success: false, error: "Empty response" } as any);
				} catch (e) {
					throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
				}

				if (!response.ok || !data.success) {
					throw new Error(data.error || ERROR_MESSAGES.SAVE_FAILED);
				}

				onSaveComplete?.(data.savedPath);
				return data;
			} catch (err) {
				const error =
					err instanceof Error ? err.message : ERROR_MESSAGES.SAVE_FAILED;
				onError?.(error);
				return {
					success: false,
					savedPath: "",
					error,
				};
			}
		},
		[config.path, onError, onSaveComplete],
	);

	/**
	 * Clear all uploaded files
	 */
	const clearAll = useCallback(() => {
		useWorkspaceStore.getState().clearAllFiles();
	}, []);

	return {
		uploadImages,
		processImages,
		saveTextContent,
		clearAll,
		config,
	};
}
