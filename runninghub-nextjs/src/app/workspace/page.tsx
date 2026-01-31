/**
 * Workspace Page
 * Main page for workflow execution with folder selection, media gallery, workflows, and job history
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useFolderStore, useWorkspaceFolder } from "@/store/folder-store";
import { useVideoClipStore } from "@/store/video-clip-store";
import { useVideoSelectionStore } from "@/store/video-selection-store";
import { useFolderSelection } from "@/hooks/useFolderSelection";
import { useAutoLoadFolder } from "@/hooks/useAutoLoadFolder";
import { useFileSystem } from "@/hooks";
import { FolderSelectionLayout } from "@/components/folder/FolderSelectionLayout";
import { SelectedFolderHeader } from "@/components/folder/SelectedFolderHeader";
import { ConsoleViewer } from "@/components/ui/ConsoleViewer";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MediaGallery } from "@/components/workspace/MediaGallery";
import { MediaSelectionToolbar } from "@/components/workspace/MediaSelectionToolbar";
import { MediaSortControls } from "@/components/images";
import { QuickRunWorkflowDialog } from "@/components/workspace/QuickRunWorkflowDialog";
import { WorkflowList } from "@/components/workspace/WorkflowList";
import { WorkflowEditor } from "@/components/workspace/WorkflowEditor";
import { WorkflowSelector } from "@/components/workspace/WorkflowSelector";
import { WorkflowInputBuilder } from "@/components/workspace/WorkflowInputBuilder";
import { JobList } from "@/components/workspace/JobList";
import { JobDetail } from "@/components/workspace/JobDetail";
import { ComplexWorkflowBuilder } from "@/components/workspace/ComplexWorkflowBuilder";
import { ComplexWorkflowList } from "@/components/workspace/ComplexWorkflowList";
import { ComplexWorkflowRunner } from "@/components/workspace/ComplexWorkflowRunner";
import { YoutubeDownloader } from "@/components/workspace/YoutubeDownloader";
import { VideoClipConfiguration } from "@/components/videos/VideoClipConfiguration";
import { VideoClipSelectionToolbar } from "@/components/videos/VideoClipSelectionToolbar";
import { VideoGallery } from "@/components/videos/VideoGallery";
import { VideoPlayerModal } from "@/components/videos/VideoPlayerModal";
import { ImagePreviewModal } from "@/components/workspace/ImagePreviewModal";
import { ExportConfiguration } from "@/components/workspace/ExportConfiguration";
import { ResizeConfiguration } from "@/components/workspace/ResizeConfiguration";
import { VideoConvertConfiguration } from "@/components/workspace/VideoConvertConfiguration";
import { BotTab } from "@/components/workspace/BotTab";
import { BotBuilderTab } from "@/components/workspace/BotBuilderTab";
import { CropConfiguration } from "@/components/videos/CropConfiguration";
import { ProgressModal } from "@/components/progress/ProgressModal";
import {
	CreateDatasetDialog,
	SelectDatasetDialog,
} from "@/components/workspace/caption";
import {
	Settings,
	FolderOpen,
	Workflow as WorkflowIcon,
	AlertCircle,
	Play,
	Scissors,
	Youtube,
	Zap,
	Database,
	RefreshCw,
	Loader2,
	Wifi,
	WifiOff,
	Plus,
	Clock,
	Bot,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { API_ENDPOINTS, ERROR_MESSAGES } from "@/constants";
import { cn } from "@/lib/utils";
import {
	exportImagesToFolder,
	getCompatibilityMessage,
	type ExportableFile,
} from "@/lib/export-images";
import { buildCustomCropParams, validateCropConfig } from "@/lib/ffmpeg-crop";
import { useExportConfigStore } from "@/store/export-config-store";
import { useResizeConfigStore } from "@/store/resize-config-store";
import { useVideoConvertStore } from "@/store/video-convert-store";
import { useCropStore } from "@/store/crop-store";
import { useProgressStore } from "@/store";
import type {
	Workflow,
	Job,
	MediaFile,
	FileInputAssignment,
	ComplexWorkflow,
	LocalWorkflow,
	LocalWorkflowOperationType,
} from "@/types/workspace";
import { mapLocalWorkflowToWorkflow } from "@/lib/local-workflow-mapper";

export default function WorkspacePage() {
	// Folder store state - use page-specific folder state for workspace page
	const { selectedFolder } = useWorkspaceFolder();

	// Workspace store state
	const {
		mediaFiles,
		selectedWorkflowId,
		selectedComplexWorkflowId,
		workflows,
		jobs,
		selectedJobId,
		mediaSortField,
		mediaSortDirection,
		selectedDataset,
		datasetMediaFiles,
		setSelectedWorkflow,
		setSelectedDataset,
		addWorkflow,
		updateWorkflow,
		deleteWorkflow,
		addJob,
		updateJob,
		setSelectedJob,
		clearJobInputs,
		getSelectedMediaFiles,
		deselectAllMediaFiles,
		removeMediaFile,
		autoAssignSelectedFilesToWorkflow,
		fetchJobs,
		setMediaSorting,
		setDatasetMediaFiles,
		toggleDatasetFileSelection,
		selectAllDatasetFiles,
		deselectAllDatasetFiles,
		removeDatasetFile,
		updateDatasetFile,
		getSelectedDatasetFiles,
		activeComplexExecutionId,
	} = useWorkspaceStore();

	// Stable actions for effects
	const upsertMediaFile = useWorkspaceStore((state) => state.upsertMediaFile);
	const updateMediaFile = useWorkspaceStore((state) => state.updateMediaFile);
	const removeMediaFileByPath = useWorkspaceStore(
		(state) => state.removeMediaFileByPath,
	);
	const mergeMediaFiles = useWorkspaceStore((state) => state.mergeMediaFiles);
	const setMediaFiles = useWorkspaceStore((state) => state.setMediaFiles); // stable setMediaFiles

	// Local state
	const [error, setError] = useState<string>("");
	// Default active tab to media
	const [activeTab, setActiveTab] = useState<
		| "media"
		| "youtube"
		| "clip"
		| "convert"
		| "dataset"
		| "run-workflow"
		| "run-complex-workflow"
		| "workflows"
		| "jobs"
		| "bot"
		| "bot-builder"
	>("media");
	const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);
	const [editingWorkflow, setEditingWorkflow] = useState<
		Workflow | undefined
	>();
	const [viewingComplexWorkflows, setViewingComplexWorkflows] = useState(false);
	const [isCreatingComplexWorkflow, setIsCreatingComplexWorkflow] =
		useState(false);
	const [editingComplexWorkflow, setEditingComplexWorkflow] =
		useState<ComplexWorkflow | null>(null);
	const [complexWorkflowListKey, setComplexWorkflowListKey] = useState(0);
	const [activeConsoleTaskId, setActiveConsoleTaskId] = useState<string | null>(
		null,
	);
	const [showQuickRunDialog, setShowQuickRunDialog] = useState(false);
	const [previewVideo, setPreviewVideo] = useState<MediaFile | null>(null);
	const [previewImage, setPreviewImage] = useState<MediaFile | null>(null);
	const [convertTaskId, setConvertTaskId] = useState<string | null>(null);
	const [isConvertProgressModalOpen, setIsConvertProgressModalOpen] =
		useState(false);
	const lastFolderPathRef = useRef<string | null>(null);

	const handleEditComplexWorkflow = (workflow: ComplexWorkflow) => {
		setEditingComplexWorkflow(workflow);
		setIsCreatingComplexWorkflow(false);
	};

	const handleComplexWorkflowSaved = () => {
		setIsCreatingComplexWorkflow(false);
		setEditingComplexWorkflow(null);
		setComplexWorkflowListKey((prev) => prev + 1);
	};

	// Clear selectedJobId on mount to ensure we start fresh
	useEffect(() => {
		useWorkspaceStore.getState().setSelectedJob(null);
	}, []);

	// Handle URL parameters for job selection and tab switching
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const jobId = params.get("job");
		const tabParam = params.get("tab");

		if (jobId) {
			// Select the job and switch to jobs tab
			setSelectedJob(jobId);
			setActiveTab("jobs");

			// Clear URL params without reloading
			window.history.replaceState({}, "", "/workspace");
		} else if (
			tabParam &&
			[
				"media",
				"youtube",
				"clip",
				"convert",
				"dataset",
				"run-workflow",
				"run-complex-workflow",
				"workflows",
				"jobs",
			].includes(tabParam)
		) {
			setActiveTab(tabParam as any);
		}
	}, []);

	// Auto-switch to complex workflow runner if active
	useEffect(() => {
		if (activeComplexExecutionId) {
			setActiveTab("run-complex-workflow");
		}
	}, [activeComplexExecutionId]);

	// Dataset-related state
	const [datasets, setDatasets] = useState<
		Array<{ name: string; path: string; fileCount: number }>
	>([]);
	const [showCreateDatasetDialog, setShowCreateDatasetDialog] = useState(false);
	const [datasetFilesToCopy, setDatasetFilesToCopy] = useState<string[]>([]);
	const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
	const [showSelectDatasetDialog, setShowSelectDatasetDialog] = useState(false);
	const [fileToExportToDataset, setFileToExportToDataset] =
		useState<MediaFile | null>(null);
	const [selectedComplexWorkflowName, setSelectedComplexWorkflowName] =
		useState<string | null>(null);

	// Resize dialog state
	const [showResizeDialog, setShowResizeDialog] = useState(false);
	const [resizeFile, setResizeFile] = useState<MediaFile | null>(null);

	// Export config from store
	const { deleteAfterExport } = useExportConfigStore();

	// Get selected files from store
	const selectedFiles = useMemo(() => getSelectedMediaFiles(), [mediaFiles]);

	useEffect(() => {
		if (!selectedComplexWorkflowId) {
			setSelectedComplexWorkflowName(null);
			return;
		}

		let isActive = true;

		const loadSelectedComplexWorkflow = async () => {
			try {
				const response = await fetch(
					`/api/workspace/complex-workflow/${selectedComplexWorkflowId}`,
				);
				const data = await response.json();
				if (response.ok && data?.success && data?.workflow && isActive) {
					setSelectedComplexWorkflowName(data.workflow.name || null);
				}
			} catch (error) {
				console.error("Failed to load selected complex workflow:", error);
			}
		};

		loadSelectedComplexWorkflow();

		return () => {
			isActive = false;
		};
	}, [selectedComplexWorkflowId]);

	// Filter videos for Clip tab
	const filteredVideos = useMemo(() => {
		return mediaFiles.filter((file) => file.type === "video");
	}, [mediaFiles]);

	// Get selected videos from videoSelectionStore for Clip tab
	const { selectedVideos: clipSelectedVideos } = useVideoSelectionStore();

	// Get selected video count for Clip tab
	const selectedVideoCount = clipSelectedVideos.size;

	// Type adapter: MediaFile to VideoFile for Clip tab
	const adaptedVideos = useMemo(() => {
		return filteredVideos.map((file) => ({
			path: file.path,
			name: file.name,
			size: file.size,
			type: "video" as const,
			extension: file.name.split(".").pop() || "",
			width: file.width,
			height: file.height,
			fps: file.fps,
			duration: file.duration,
			thumbnail: file.thumbnail,
			created_at: file.created_at,
			modified_at: file.modified_at,
		}));
	}, [filteredVideos]);

	// Custom hooks
	const { loadFolderContents } = useFileSystem({ pageType: "workspace" });
	// Store mediaSubscription in a ref to avoid state-dependent effect loops
	const mediaSubscriptionRef = useRef<EventSource | null>(null);
	const isMediaMountedRef = useRef(true);
	const [isMediaLive, setIsMediaLive] = useState(false);
	// Manual override for live media subscription
	// true = forced on, false = forced off, null = auto (default)
	const [manualLiveOverride, setManualLiveOverride] = useState<boolean | null>(
		null,
	);

	// Reset override when switching folders
	useEffect(() => {
		logger.info(
			"[Workspace] Resetting manualLiveOverride due to folder change",
			{ toast: false },
		);
		setManualLiveOverride(null);
	}, [selectedFolder]);

	useEffect(() => {
		isMediaMountedRef.current = true;
		return () => {
			isMediaMountedRef.current = false;
		};
	}, []);

	// Validate duck encoding for all images in parallel
	const validateAllImagesForDuck = useCallback(
		async (imageFiles: MediaFile[]) => {
			const imagesOnly = imageFiles.filter((f) => f.type === "image");

			if (imagesOnly.length === 0) return;

			console.log(
				`[Workspace] Validating duck encoding for ${imagesOnly.length} images in parallel...`,
			);

			// Mark all images as pending validation
			imagesOnly.forEach((file) => {
				updateMediaFile(file.id, { duckValidationPending: true });
			});

			// Validate all images in parallel
			const validationPromises = imagesOnly.map(async (file) => {
				try {
					const response = await fetch(API_ENDPOINTS.WORKSPACE_DUCK_VALIDATE, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ imagePath: file.path }),
					});

					const data = await response.json();

					console.log(`[Workspace] Validation result for ${file.name}:`, data);

					// Update the file with validation result
					console.log(
						`[Workspace] Updating ${file.name} with isDuckEncoded=${data.isDuckEncoded}`,
					);
					updateMediaFile(file.id, {
						isDuckEncoded: data.isDuckEncoded,
						duckRequiresPassword: data.requiresPassword,
						duckValidationPending: false,
					});
					console.log(
						`[Workspace] Updated ${file.name}, new state:`,
						mediaFiles.find((f) => f.id === file.id)?.isDuckEncoded,
					);
				} catch (error) {
					console.error(`[Workspace] Failed to validate ${file.name}:`, error);
					updateMediaFile(file.id, {
						isDuckEncoded: false,
						duckValidationPending: false,
					});
				}
			});

			// Wait for all validations to complete (but don't block UI)
			Promise.allSettled(validationPromises);
		},
		[updateMediaFile],
	);

	// Helper to process and update media files
	const processFolderContents = useCallback(
		(result: any) => {
			if (!result) return;

			// DEBUG: Log raw API data
			console.log(
				"[processFolderContents] Raw API result images:",
				result.images?.slice(0, 3),
			);
			console.log(
				"[processFolderContents] First image dimensions:",
				result.images?.[0]?.width,
				"x",
				result.images?.[0]?.height,
			);

			// Convert images to MediaFile format with serve URLs
			const imageFiles = (result.images || []).map((file: any) => {
				// DEBUG: Log each file's dimensions
				// console.log(`[processFolderContents] Processing ${file.name}: width=${file.width}, height=${file.height}`);

				return {
					id: file.path,
					name: file.name,
					path: file.path,
					type: "image" as const,
					extension: "." + (file.name.split(".").pop() || "").toLowerCase(),
					size: file.size || 0,
					width: file.width,
					height: file.height,
					created_at: file.created_at,
					modified_at: file.modified_at,
					thumbnail: `/api/images/serve?path=${encodeURIComponent(file.path)}`,
					selected: false,
					// Initialize duck encoding fields
					isDuckEncoded: undefined,
					duckRequiresPassword: undefined,
					duckValidationPending: false,
					// Caption from associated txt file
					caption: file.caption,
					captionPath: file.captionPath,
				};
			});

			// Convert videos to MediaFile format with serve URLs
			const videoFiles = (result.videos || []).map((file: any) => ({
				id: file.path,
				name: file.name,
				path: file.path,
				type: "video" as const,
				extension: "." + (file.name.split(".").pop() || "").toLowerCase(),
				size: file.size || 0,
				width: file.width,
				height: file.height,
				fps: file.fps,
				duration: file.duration,
				created_at: file.created_at,
				modified_at: file.modified_at,
				thumbnail: file.thumbnail
					? `/api/images/serve?path=${encodeURIComponent(file.thumbnail)}`
					: undefined,
				blobUrl: `/api/videos/serve?path=${encodeURIComponent(file.path)}`,
				selected: false,
				// Caption from associated txt file
				caption: file.caption,
				captionPath: file.captionPath,
			}));

			// Combine both types and deduplicate by ID (path)
			const allFiles = [...imageFiles, ...videoFiles];
			const uniqueMap = new Map();
			const duplicates: string[] = [];

			allFiles.forEach((file) => {
				if (uniqueMap.has(file.id)) {
					duplicates.push(file.id);
				} else {
					uniqueMap.set(file.id, file);
				}
			});

			if (duplicates.length > 0) {
				console.warn("Duplicate files detected and removed:", duplicates);
			}

			const uniqueFiles = Array.from(uniqueMap.values());
			mergeMediaFiles(uniqueFiles as MediaFile[]);

			// NOTE: Disabled automatic validation on folder load for performance
			// Images will be validated lazily when selected instead
			// validateAllImagesForDuck(uniqueFiles as MediaFile[]);
		},
		[setMediaFiles, validateAllImagesForDuck],
	);

	const handleRefresh = useCallback(
		async (silent = false) => {
			if (selectedFolder) {
				const result = await loadFolderContents(
					selectedFolder.folder_path,
					selectedFolder.session_id,
					silent,
				);
				processFolderContents(result);
			}
		},
		[selectedFolder, loadFolderContents, processFolderContents],
	);

	const stopMediaSubscription = useCallback(() => {
		const hadSubscription = !!mediaSubscriptionRef.current;
		if (mediaSubscriptionRef.current) {
			logger.info("[Workspace] stopMediaSubscription: Closing subscription", {
				toast: false,
			});
			mediaSubscriptionRef.current.close();
			mediaSubscriptionRef.current = null;
		}
		// Only update state if we are actually stopping an active live session
		// AND the component is still mounted. This prevents loops.
		if (isMediaMountedRef.current && hadSubscription) {
			logger.info(
				"[Workspace] stopMediaSubscription: Setting isMediaLive to false",
				{ toast: false },
			);
			setIsMediaLive(false);
		}
	}, []);

	const startMediaSubscription = useCallback(
		(folderPath: string) => {
			const isPathInFolder = (filePath: string) => {
				if (!filePath) return false;
				const normalizedFolder = folderPath.endsWith("/")
					? folderPath
					: `${folderPath}/`;
				return filePath === folderPath || filePath.startsWith(normalizedFolder);
			};

			logger.info(
				`[Workspace] startMediaSubscription called for: ${folderPath} at ${new Date().toISOString()}`,
				{ toast: false },
			);
			// Clean up any existing subscription first
			if (mediaSubscriptionRef.current) {
				logger.info(
					"[Workspace] Closing existing subscription before starting new one",
					{ toast: false },
				);
				mediaSubscriptionRef.current.close();
				mediaSubscriptionRef.current = null;
			}

			logger.info("[Workspace] Creating new EventSource...", { toast: false });
			const source = new EventSource(
				`/api/workspace/subscribe?path=${encodeURIComponent(folderPath)}`,
			);
			mediaSubscriptionRef.current = source;

			source.onopen = () => {
				logger.info("[Workspace] SSE Connected (onopen)", { toast: false });
				if (isMediaMountedRef.current) {
					setIsMediaLive(true);
				}
			};

			source.addEventListener("update", (event) => {
				try {
					const payload = JSON.parse(event.data);
					const file = payload?.payload;
					if (!file || !payload?.type) return;
					if (!isPathInFolder(file.path)) {
						return;
					}

					// Defensive check: skip if file already exists in store to prevent duplicates
					const currentFiles = useWorkspaceStore.getState().mediaFiles;
					if (currentFiles.some((f) => f.id === file.path)) {
						console.log(
							"[Workspace] File already exists in store, skipping update:",
							file.path,
						);
						return;
					}

					const mediaFile: MediaFile = {
						id: file.path,
						name: file.name,
						path: file.path,
						type: payload.type,
						extension: file.extension,
						size: file.size || 0,
						width: file.width,
						height: file.height,
						fps: file.fps,
						duration: file.duration,
						created_at: file.created_at,
						modified_at: file.modified_at,
						thumbnail:
							payload.type === "image"
								? `/api/images/serve?path=${encodeURIComponent(file.path)}`
								: file.thumbnail
									? `/api/images/serve?path=${encodeURIComponent(file.thumbnail)}`
									: undefined,
						blobUrl:
							payload.type === "video"
								? `/api/videos/serve?path=${encodeURIComponent(file.path)}`
								: undefined,
						caption: file.caption,
						captionPath: file.captionPath,
					};

					upsertMediaFile(mediaFile);
				} catch (error) {
					console.error(
						"[Workspace] Failed to parse media update event",
						error,
					);
				}
			});

			source.addEventListener("caption", (event) => {
				try {
					const payload = JSON.parse(event.data);
					const filePath = payload?.filePath;
					if (!filePath) return;
					if (!isPathInFolder(filePath)) {
						return;
					}
					updateMediaFile(filePath, {
						caption: payload.caption,
						captionPath: payload.captionPath,
					});
				} catch (error) {
					console.error("[Workspace] Failed to parse caption event", error);
				}
			});

			source.addEventListener("remove", (event) => {
				try {
					const payload = JSON.parse(event.data);
					if (!payload?.path) return;
					if (!isPathInFolder(payload.path)) {
						return;
					}

					// Check if file still exists in store before attempting removal
					const mediaFiles = useWorkspaceStore.getState().mediaFiles;
					const fileExists = mediaFiles.some((f) => f.path === payload.path);

					if (fileExists) {
						// Only remove if file still in store (prevents race conditions)
						removeMediaFileByPath(payload.path);
						console.log(
							"[Workspace] Removed file via subscription:",
							payload.path,
						);

						// Force a store refresh to ensure UI reflects current file system state
						// This helps prevent stale UI state where files appear to still exist
						// but were already removed by a race condition or earlier operation
						setTimeout(() => {
							console.log(
								"[Workspace] Force refreshing store after removal to ensure UI sync",
							);
							// Refresh the workspace contents to sync with file system
							handleRefresh();
						}, 100);
					} else {
						// File already removed (e.g., by dataset export), skip to avoid warnings
						console.log(
							"[Workspace] File already removed, skipping subscription event:",
							payload.path,
						);

						// Also log store state for debugging
						const currentFiles = useWorkspaceStore.getState().mediaFiles;
						const matchingFile = currentFiles.find(
							(f) => f.path === payload.path,
						);
						console.log(
							"[Workspace] Debug: File exists check =",
							fileExists,
							"Matching file in store =",
							!!matchingFile,
							"Current store files count =",
							currentFiles.length,
						);
					}
				} catch (error) {
					console.error(
						"[Workspace] Failed to parse media remove event",
						error,
					);
					// Also log the event payload for debugging
					console.error(
						"[Workspace] Remove event payload:",
						JSON.stringify(event.data),
					);
				}
			});

			source.onerror = (err) => {
				console.error("[Workspace] SSE Connection Error:", err);
				// Don't close immediately - let the browser try to reconnect
				// Only close if it's explicitly stopped or component unmounts
				if (!isMediaMountedRef.current) {
					stopMediaSubscription();
				}
				// If we're still mounted but error occurred, just mark as not live temporarily
				// The browser will retry connection automatically
				setIsMediaLive(false);
			};
		},
		[
			removeMediaFileByPath,
			stopMediaSubscription,
			updateMediaFile,
			upsertMediaFile,
		],
	);

	const handleTaskComplete = useCallback(
		(taskId: string, status: "completed" | "failed") => {
			// Find job associated with this task
			const job = jobs.find((j) => j.taskId === taskId);
			if (job) {
				updateJob(job.id, {
					status: status,
					completedAt: Date.now(),
				});

				// Fetch fresh job data from server to get error field
				fetchJobs();

				if (status === "completed") {
					logger.success("Job completed successfully", {
						metadata: { jobId: job.id, taskId, status },
					});
				} else {
					// Note: Error message will be available after fetchJobs() completes
					// Using warning instead of error to avoid console noise during polling
					console.warn(`[Workspace] Job failed: ${job.id}`, {
						jobId: job.id,
						taskId,
						status,
					});
				}
			}

			if (taskId === convertTaskId && status === "completed") {
				handleRefresh(false);
				setConvertTaskId(null);
			}
		},
		[jobs, updateJob, handleRefresh, fetchJobs, convertTaskId],
	);

	const handleStatusChange = useCallback(
		(taskId: string, status: string) => {
			// Map task status to job status
			let jobStatus: Job["status"] = "pending";
			if (status === "processing") jobStatus = "running";
			else if (status === "completed") jobStatus = "completed";
			else if (status === "failed") jobStatus = "failed";

			// Find and update job
			const job = jobs.find((j) => j.taskId === taskId);
			if (
				job &&
				job.status !== jobStatus &&
				!(job.status === "queued" && jobStatus === "pending") &&
				job.status !== "failed" &&
				job.status !== "completed"
			) {
				updateJob(job.id, {
					status: jobStatus,
					startedAt:
						jobStatus === "running"
							? job.startedAt || Date.now()
							: job.startedAt,
				});
			}
		},
		[jobs, updateJob],
	);

	// Use folder selection hook for workspace
	const { handleFolderSelected } = useFolderSelection({
		folderType: "workspace",
	});

	// Stabilize the onFolderLoaded callback
	const handleFolderLoaded = useCallback(
		(folder: any, contents: any) => {
			// Folder is automatically set as selected by the hook
			// If contents were provided during validation, use them directly
			if (contents) {
				processFolderContents(contents);
			}
			// Otherwise, the useEffect below will load contents when selectedFolder changes
		},
		[processFolderContents],
	);

	// Auto-load last opened folder on mount
	useAutoLoadFolder({
		folderType: "workspace",
		onFolderLoaded: handleFolderLoaded,
	});

	// Load folder contents when folder is selected
	useEffect(() => {
		if (selectedFolder) {
			console.log(
				"[WorkspacePage] Selected folder changed:",
				selectedFolder.folder_path,
			);
			if (lastFolderPathRef.current !== selectedFolder.folder_path) {
				setMediaFiles([]);
				deselectAllMediaFiles();
				lastFolderPathRef.current = selectedFolder.folder_path;
			}
			loadFolderContents(
				selectedFolder.folder_path,
				selectedFolder.session_id,
			).then((result) => {
				processFolderContents(result);
			});
		} else {
			console.log("[WorkspacePage] Selected folder cleared");
			stopMediaSubscription();
		}
	}, [
		selectedFolder,
		loadFolderContents,
		processFolderContents,
		stopMediaSubscription,
	]);

	// Manage SSE subscription (persists across tabs)
	useEffect(() => {
		// We want live sync active for all tabs by default
		const shouldBeLive = !!selectedFolder;

		logger.info(
			`[Workspace] SSE Effect: shouldBeLive=${shouldBeLive}, override=${manualLiveOverride}, folder=${selectedFolder?.folder_path}`,
			{ toast: false },
		);

		if (shouldBeLive && manualLiveOverride !== false) {
			if (selectedFolder) {
				startMediaSubscription(selectedFolder.folder_path);
			} else {
				logger.info("[Workspace] Cannot start SSE: selectedFolder is missing", {
					toast: false,
				});
			}
		} else {
			logger.info("[Workspace] Stopping SSE due to override/folder state", {
				toast: false,
			});
			stopMediaSubscription();
		}

		return () => {
			// Cleanup on folder change or manual stop
			stopMediaSubscription();
		};
	}, [
		selectedFolder,
		startMediaSubscription,
		stopMediaSubscription,
		manualLiveOverride,
	]);

	// Fallback: Validate duck encoding for selected images (only if not already validated on load)
	// NOTE: Most images are validated in parallel on load via validateAllImagesForDuck()
	// This is a fallback for images that weren't validated for some reason
	useEffect(() => {
		const validateSelectedImages = async () => {
			// Only validate single selections for duck decoding
			if (selectedFiles.length !== 1) return;

			const file = selectedFiles[0];

			// Only validate images
			if (file.type !== "image") return;

			// Skip if already validated (true or false) or validation is in progress
			if (file.isDuckEncoded !== undefined || file.duckValidationPending)
				return;

			console.log(
				"[Workspace] Fallback: Validating duck encoding for selected image:",
				file.name,
			);

			// Mark as pending to prevent duplicate validations
			updateMediaFile(file.id, { duckValidationPending: true });

			try {
				const response = await fetch(API_ENDPOINTS.WORKSPACE_DUCK_VALIDATE, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ imagePath: file.path }),
				});

				const data = await response.json();

				console.log("[Workspace] Validation result for", file.name, ":", data);

				updateMediaFile(file.id, {
					isDuckEncoded: data.isDuckEncoded,
					duckRequiresPassword: data.requiresPassword,
					duckValidationPending: false,
				});
			} catch (error) {
				console.error(`[Workspace] Failed to validate ${file.name}:`, error);
				updateMediaFile(file.id, { duckValidationPending: false });
			}
		};

		validateSelectedImages();
	}, [selectedFiles, updateMediaFile]);

	// Track progress modal state (similar to crop page)
	const { isProgressModalOpen } = useProgressStore();
	useEffect(() => {
		setIsConvertProgressModalOpen(isProgressModalOpen);
	}, [isProgressModalOpen]);

	const handleError = (errorMessage: string) => {
		setError(errorMessage);
	};

	const handleBackToSelection = () => {
		const { setSelectedFolder, clearPageFolder } = useFolderStore.getState();
		const { setMediaFiles } = useWorkspaceStore.getState();
		clearPageFolder("workspace");
		setMediaFiles([]);
		setError("");
	};

	const handleSaveWorkflow = (workflow: Workflow) => {
		if (editingWorkflow) {
			updateWorkflow(workflow.id, workflow);
			logger.success("Workflow updated", {
				metadata: { workflowId: workflow.id, workflowName: workflow.name },
			});
		} else {
			addWorkflow(workflow);
			logger.success("Workflow created", {
				metadata: { workflowId: workflow.id, workflowName: workflow.name },
			});
		}
		setIsEditingWorkflow(false);
		setEditingWorkflow(undefined);
	};

	const handleEditWorkflow = (workflow: Workflow) => {
		setEditingWorkflow(workflow);
		setIsEditingWorkflow(true);
	};

	const handleRunJob = async (data?: {
		fileInputs: FileInputAssignment[];
		textInputs: Record<string, string>;
		deleteSourceFiles?: boolean;
	}) => {
		if (!selectedWorkflowId) {
			toast.error("Please select a workflow");
			return;
		}

		const workflow = workflows.find((w) => w.id === selectedWorkflowId);
		if (!workflow) {
			toast.error("Workflow not found");
			return;
		}

		if (!data) {
			toast.error("No job data provided");
			return;
		}

		const { fileInputs, textInputs, deleteSourceFiles } = data;

		// Check if this is a re-run from Job Detail page
		const currentJob = selectedJobId
			? jobs.find((j) => j.id === selectedJobId)
			: null;
		const isReRun = currentJob?.workflowId === workflow.id;

		// Generate series metadata
		let seriesId: string | undefined;
		let runNumber = 1;
		let parentJobId: string | undefined;

		if (isReRun && currentJob?.seriesId) {
			// Reuse seriesId from current job
			seriesId = currentJob.seriesId;
			runNumber = (currentJob.runNumber || 0) + 1;
			parentJobId = currentJob.id;
		} else {
			// Create new series
			seriesId = `${workflow.id}_${Date.now()}`;
			runNumber = 1;
		}

		try {
			const response = await fetch(API_ENDPOINTS.WORKSPACE_EXECUTE, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId: workflow.id,
					sourceWorkflowId: workflow.sourceWorkflowId,
					workflowName: workflow.name,
					fileInputs: fileInputs,
					textInputs: textInputs,
					folderPath: selectedFolder?.folder_path,
					deleteSourceFiles: deleteSourceFiles || false,
					parentJobId,
					seriesId,
				}),
			});

			const text = await response.text();
			let resp;
			try {
				resp = text
					? JSON.parse(text)
					: { success: false, error: "Empty response" };
			} catch (e) {
				throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
			}

			if (!response.ok || !resp.success) {
				throw new Error(resp.error || "Failed to execute job");
			}

			// Create job in store with series metadata
			const newJob: Job = {
				id: resp.jobId,
				workflowId: workflow.id,
				workflowName: workflow.name,
				fileInputs: fileInputs,
				textInputs: textInputs,
				status: "pending",
				taskId: resp.taskId,
				createdAt: Date.now(),
				folderPath: selectedFolder?.folder_path,
				deleteSourceFiles: false,
				parentJobId,
				seriesId,
				runNumber,
			};

			addJob(newJob);

			// Select the newly created job
			setSelectedJob(newJob.id);

			// Start tracking progress
			if (resp.taskId) {
				setActiveConsoleTaskId(resp.taskId);
			}

			// Clear jobFiles after starting a new job (not a re-run)
			// Re-runs from Job Detail use job's own inputs, not global jobFiles
			if (!isReRun) {
				clearJobInputs();
			}

			// DO switch to jobs tab - go to Job Detail page to see results
			setActiveTab("jobs");
			toast.success(
				`Job #${runNumber} started. View results and run variations.`,
			);
			logger.success(`Job #${runNumber} started`, {
				taskId: resp.taskId,
				metadata: {
					workflowId: workflow.id,
					jobId: resp.jobId,
					workflowName: workflow.name,
					seriesId,
					runNumber,
					parentJobId,
				},
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to execute job";
			logger.error(errorMessage, {
				metadata: { workflowId: workflow.id, error: errorMessage },
			});
		}
	};

	const handleDeleteWorkflow = async (id: string) => {
		if (confirm("Delete this workflow? This action cannot be undone.")) {
			try {
				const response = await fetch(
					`${API_ENDPOINTS.WORKFLOW_DELETE}?id=${id}`,
					{
						method: "DELETE",
					},
				);

				if (!response.ok) {
					const text = await response.text();
					let errorData;
					try {
						errorData = text ? JSON.parse(text) : { error: "Unknown error" };
					} catch (e) {
						errorData = { error: `Server error: ${response.status}` };
					}
					throw new Error(
						errorData.error || "Failed to delete workflow from server",
					);
				}

				deleteWorkflow(id);
				logger.success("Workflow deleted", {
					metadata: { workflowId: id },
				});
			} catch (error) {
				console.error("Delete workflow error:", error);
				const errorMessage =
					error instanceof Error ? error.message : "Failed to delete workflow";
				logger.error("Failed to delete workflow", {
					metadata: { workflowId: id, error: errorMessage },
				});
			}
		}
	};

	const handleAddWorkflow = () => {
		setEditingWorkflow(undefined);
		setIsEditingWorkflow(true);
	};

	// NOTE: jobInputs initialization removed - now handled locally in WorkflowInputBuilder

	// Handler for quick run workflow from Media Gallery
	const handleQuickRunWorkflow = useCallback(
		async (workflowId?: string) => {
			if (!workflowId) {
				// If no workflowId provided, just open the dialog
				setShowQuickRunDialog(true);
				return;
			}

			if (workflowId.startsWith("local_")) {
				try {
					const response = await fetch(
						`/api/workspace/local-workflow/${workflowId}`,
					);
					const data = await response.json();
					if (!response.ok || !data?.success || !data?.workflow) {
						throw new Error(data?.error || "Failed to load local workflow");
					}

					const mappedWorkflow = mapLocalWorkflowToWorkflow(data.workflow);
					const existing = workflows.find((w) => w.id === mappedWorkflow.id);

					if (existing) {
						updateWorkflow(mappedWorkflow.id, mappedWorkflow);
					} else {
						addWorkflow(mappedWorkflow);
					}

					setSelectedWorkflow(mappedWorkflow.id);
					autoAssignSelectedFilesToWorkflow(mappedWorkflow.id);
					deselectAllMediaFiles();
					setActiveTab("run-workflow");
					toast.success("Files assigned to workflow. You can now run the job.");
				} catch (error) {
					console.error("Failed to prepare local workflow:", error);
					toast.error(
						error instanceof Error
							? error.message
							: "Failed to load local workflow",
					);
				}
				return;
			}

			setSelectedWorkflow(workflowId);

			// Auto-assign files to workflow
			autoAssignSelectedFilesToWorkflow(workflowId);

			// Clear selection in gallery so it's clean when user comes back
			deselectAllMediaFiles();

			// Switch to Run Workflow tab
			setActiveTab("run-workflow");

			toast.success("Files assigned to workflow. You can now run the job.");
		},
		[
			addWorkflow,
			autoAssignSelectedFilesToWorkflow,
			deselectAllMediaFiles,
			setActiveTab,
			setSelectedWorkflow,
			setShowQuickRunDialog,
			updateWorkflow,
			workflows,
		],
	);

	const handleBatchProcess = useCallback(async () => {
		if (selectedFiles.length === 0) {
			toast.error("Select files in the media gallery first");
			return;
		}

		if (!selectedComplexWorkflowId) {
			toast.error("Select a complex workflow in Run Complex Workflow first");
			return;
		}

		try {
			const response = await fetch(
				`/api/workspace/complex-workflow/${selectedComplexWorkflowId}`,
			);
			const data = await response.json();

			if (!response.ok || !data?.success || !data?.workflow) {
				throw new Error(data?.error || "Failed to load complex workflow");
			}

			const complexWorkflow = data.workflow as ComplexWorkflow;
			const firstStep = complexWorkflow.steps.find(
				(step) => step.stepNumber === 1,
			);

			if (!firstStep) {
				toast.error("Complex workflow has no step 1 definition");
				return;
			}

			let stepWorkflow = workflows.find(
				(workflow) => workflow.id === firstStep.workflowId,
			);

			if (!stepWorkflow) {
				if (firstStep.workflowId.startsWith("local_")) {
					const localRes = await fetch(
						`/api/workspace/local-workflow/${firstStep.workflowId}`,
					);
					const localData = await localRes.json();
					if (localRes.ok && localData?.success && localData?.workflow) {
						stepWorkflow = mapLocalWorkflowToWorkflow(localData.workflow);
						const existing = workflows.find(
							(w) => w.id === stepWorkflow?.id,
						);
						if (stepWorkflow) {
							if (existing) {
								updateWorkflow(stepWorkflow.id, stepWorkflow);
							} else {
								addWorkflow(stepWorkflow);
							}
						}
					}
				} else {
					const listRes = await fetch("/api/workflow/list");
					const listData = await listRes.json();
					if (listRes.ok && listData?.success && listData?.workflows) {
						stepWorkflow = listData.workflows.find(
							(workflow: Workflow) => workflow.id === firstStep.workflowId,
						);
						if (stepWorkflow) {
							const existing = workflows.find(
								(w) => w.id === stepWorkflow?.id,
							);
							if (existing) {
								updateWorkflow(stepWorkflow.id, stepWorkflow);
							} else {
								addWorkflow(stepWorkflow);
							}
						}
					}
				}
			}

			if (!stepWorkflow) {
				toast.error("Step 1 workflow definition not found");
				return;
			}

			const inputDefinitions = new Map(
				stepWorkflow.inputs.map((input) => [input.id, input]),
			);

			const fileParams = firstStep.parameters.filter((param) => {
				if (param.valueType !== "user-input") return false;
				return inputDefinitions.get(param.parameterId)?.type === "file";
			});

			if (fileParams.length === 0) {
				toast.error("Step 1 has no file inputs for batch processing");
				return;
			}

			const staticTextInputs = firstStep.parameters.reduce(
				(acc, param) => {
					if (
						param.valueType === "static" &&
						param.staticValue !== undefined
					) {
						const input = inputDefinitions.get(param.parameterId);
						if (input?.type !== "file") {
							acc[param.parameterId] = String(param.staticValue);
						}
					}
					return acc;
				},
				{} as Record<string, string>,
			);

			const results = await Promise.allSettled(
				selectedFiles.map(async (file) => {
					const fileInputs: FileInputAssignment[] = fileParams.map((param) => ({
						parameterId: param.parameterId,
						filePath: file.path,
						fileName: file.name,
						fileSize: file.size || 0,
						fileType: file.type,
						valid: true,
						width: file.width,
						height: file.height,
					}));

					const execRes = await fetch(
						"/api/workspace/complex-workflow/execute",
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								complexWorkflowId: selectedComplexWorkflowId,
								autoContinue: true,
								initialParameters: {
									fileInputs,
									textInputs: staticTextInputs,
									deleteSourceFiles: false,
								},
							}),
						},
					);

					const execData = await execRes.json();
					if (!execRes.ok || !execData?.success) {
						throw new Error(execData?.error || "Failed to start execution");
					}

					return execData;
				}),
			);

			const succeeded = results.filter((result) => result.status === "fulfilled")
				.length;
			const failed = results.length - succeeded;

			if (failed > 0) {
				toast.warning(
					`Batch started: ${succeeded} succeeded, ${failed} failed`,
				);
			} else {
				toast.success(`Batch started: ${succeeded} executions`);
			}
		} catch (error) {
			console.error("Batch process failed:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to start batch process",
			);
		}
	}, [
		addWorkflow,
		selectedFiles,
		selectedComplexWorkflowId,
		updateWorkflow,
		workflows,
	]);

	const selectedWorkflow = useMemo(
		() => workflows.find((w) => w.id === selectedWorkflowId) || null,
		[workflows, selectedWorkflowId],
	);

	const localWorkflowPrefillInputs = useMemo(() => {
		if (!selectedWorkflow || selectedWorkflow.sourceType !== "local") {
			return undefined;
		}
		const config = selectedWorkflow.localConfig;
		if (!config) return undefined;

		const prefill: Record<string, string> = {};
		selectedWorkflow.inputs.forEach((param) => {
			if (param.type === "file") return;
			if (!param.configKey) return;
			if (Object.prototype.hasOwnProperty.call(config, param.configKey)) {
				const value = config[param.configKey];
				prefill[param.id] = value === undefined ? "" : String(value);
				return;
			}
			if (param.defaultValue !== undefined) {
				prefill[param.id] = String(param.defaultValue);
			}
		});

		return prefill;
	}, [selectedWorkflow]);

	const handleRenameFile = async (file: MediaFile, newName: string) => {
		try {
			const response = await fetch(API_ENDPOINTS.WORKSPACE_RENAME, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: file.path, newName }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to rename file");
			}

			const data = await response.json();

			const updatedPath = data?.newPath || data?.new_path || file.path;

			removeMediaFileByPath(file.path);
			upsertMediaFile({
				...file,
				id: updatedPath,
				path: updatedPath,
				name: data?.newName || data?.new_name || newName,
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to rename file";
			toast.error(errorMessage);
			throw err;
		}
	};

	const handleExport = async (files: MediaFile[]) => {
		// Check browser compatibility
		const compatibilityMessage = getCompatibilityMessage();
		if (compatibilityMessage) {
			toast.error(compatibilityMessage);
			return;
		}

		if (files.length === 0) {
			toast.error("No files selected for export");
			return;
		}

		try {
			// Convert MediaFile[] to ExportableFile[]
			const filesToExport: ExportableFile[] = files.map((f) => ({
				path: f.path,
				name: f.name,
				blob_url: undefined, // Workspace files are real files, not virtual
			}));

			// Export with progress tracking
			const result = await exportImagesToFolder(filesToExport, {
				onProgress: (progress) => {
					logger.info(
						`Exporting ${progress.current}/${progress.total}: ${progress.currentFile}`,
					);
				},
			});

			if (result.success) {
				toast.success(
					`Exported ${result.exported} file${result.exported !== 1 ? "s" : ""}`,
				);
				if (result.failed > 0) {
					toast.warning(
						`${result.failed} file${result.failed !== 1 ? "s" : ""} failed to export`,
					);
				}
				logger.success(
					`Export complete: ${result.exported}/${result.total} files exported`,
				);

				// Delete original files if export was successful and deleteAfterExport is enabled
				if (deleteAfterExport && result.exported > 0) {
					try {
						await handleDeleteFile(files);
						logger.success(
							`Deleted ${result.exported} original file${result.exported !== 1 ? "s" : ""} after export`,
						);
					} catch (deleteError) {
						const deleteErrorMsg =
							deleteError instanceof Error
								? deleteError.message
								: "Failed to delete original files";
						toast.error(
							`Export successful but failed to delete originals: ${deleteErrorMsg}`,
						);
						logger.error(
							`Failed to delete originals after export: ${deleteErrorMsg}`,
						);
					}
				}
			} else {
				toast.error("Export failed");
				logger.error(
					`Export failed: ${result.failed}/${result.total} files failed`,
				);
			}

			deselectAllMediaFiles();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to export files";
			// Don't show toast for user cancellation
			if (
				!errorMessage.includes("cancelled") &&
				!errorMessage.includes("canceled")
			) {
				toast.error(errorMessage);
			}
			logger.error(errorMessage);
		}
	};

	const handleDeleteFile = async (files: MediaFile[]) => {
		try {
			const response = await fetch(API_ENDPOINTS.WORKSPACE_DELETE, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ paths: files.map((f) => f.path) }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to delete files");
			}

			files.forEach((file) => removeMediaFileByPath(file.path));
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to delete file";
			toast.error(errorMessage);
			throw err;
		}
	};

	const handleConvertFps = async (files: MediaFile[]) => {
		// Filter to only video files
		const videos = files.filter((f) => f.type === "video");

		if (videos.length === 0) {
			toast.error("No video files selected for FPS conversion");
			return;
		}

		// Get convert config from store
		const convertConfig = useVideoConvertStore.getState().convertConfig;
		const targetFps =
			convertConfig.targetFps === "custom"
				? convertConfig.customFps
				: convertConfig.targetFps;
		const crf =
			convertConfig.quality === "custom"
				? convertConfig.customCrf
				: convertConfig.quality === "high"
					? 18
					: convertConfig.quality === "low"
						? 23
						: 20;
		const resizeWidth = convertConfig.resizeWidth
			? parseInt(convertConfig.resizeWidth, 10)
			: undefined;
		const resizeHeight = convertConfig.resizeHeight
			? parseInt(convertConfig.resizeHeight, 10)
			: undefined;
		const resizeLongestSide = convertConfig.resizeLongestSide
			? parseInt(convertConfig.resizeLongestSide, 10)
			: undefined;

		if (!targetFps || targetFps < 1 || targetFps > 120) {
			toast.error("Invalid target FPS. Must be between 1 and 120.");
			return;
		}

		if (convertConfig.resizeEnabled) {
			if (
				convertConfig.resizeMode === "longest-side" ||
				convertConfig.resizeMode === "shortest-side"
			) {
				if (!resizeLongestSide) {
					toast.error("Please provide a longest-side size");
					return;
				}
			} else if (!resizeWidth && !resizeHeight) {
				toast.error("Please provide a resize width or height");
				return;
			}
		}

		try {
			const response = await fetch("/api/workspace/fps-convert", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					videos: videos.map((v) => ({ path: v.path, name: v.name })),
					targetFps,
					deleteOriginal: convertConfig.deleteOriginal,
					outputSuffix: convertConfig.outputSuffix,
					crf,
					preset: convertConfig.encodingPreset,
					resizeEnabled: convertConfig.resizeEnabled,
					resizeMode: convertConfig.resizeMode,
					resizeWidth,
					resizeHeight,
					resizeLongestSide,
					timeout: 3600,
				}),
			});

			const data = await response.json();

			if (data.success) {
				setConvertTaskId(data.task_id);
				setActiveConsoleTaskId(data.task_id);
				toast.success(
					`Started converting ${videos.length} video${videos.length > 1 ? "s" : ""} to ${targetFps} FPS`,
				);
				useVideoSelectionStore.getState().deselectAll();

				// Folder updates handled by subscription
			} else {
				toast.error(data.error || "Failed to start FPS conversion");
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to convert video FPS";
			toast.error(errorMessage);
		}
	};

	const handleCropVideos = async (files: MediaFile[]) => {
		const { cropConfig } = useCropStore();

		// Validate crop configuration
		if (cropConfig.mode === "custom") {
			const config = {
				x: parseFloat(cropConfig.customX || "0") || 0,
				y: parseFloat(cropConfig.customY || "0") || 0,
				width: parseFloat(cropConfig.customWidth || "50") || 0,
				height: parseFloat(cropConfig.customHeight || "100") || 0,
			};

			const validation = validateCropConfig(config);
			if (!validation.valid) {
				toast.error(validation.error || ERROR_MESSAGES.INVALID_CROP_CONFIG);
				return;
			}
		}

		try {
			// Build crop config for API
			const crop_config = {
				mode: cropConfig.mode,
			};

			// Add custom dimensions if in custom mode
			if (cropConfig.mode === "custom") {
				const customWidth = cropConfig.customWidth
					? parseFloat(cropConfig.customWidth)
					: undefined;
				const customHeight = cropConfig.customHeight
					? parseFloat(cropConfig.customHeight)
					: undefined;
				const customX = cropConfig.customX
					? parseFloat(cropConfig.customX)
					: undefined;
				const customY = cropConfig.customY
					? parseFloat(cropConfig.customY)
					: undefined;

				const params = buildCustomCropParams({
					customWidth,
					customHeight,
					customX,
					customY,
				});
				Object.assign(crop_config, params);
			}

			const response = await fetch(API_ENDPOINTS.VIDEOS_CROP, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					videos: files.map((f) => f.path),
					crop_config,
					output_suffix: cropConfig.outputSuffix || "_cropped",
					preserve_audio: cropConfig.preserveAudio || false,
					timeout: 3600,
				}),
			});

			const data = await response.json();

			if (data.success) {
				if (data.task_id) {
					setConvertTaskId(data.task_id);
					setActiveConsoleTaskId(data.task_id);
				}
				toast.success(
					`Started cropping ${files.length} video${files.length > 1 ? "s" : ""}`,
				);

				// Folder updates handled by subscription
			} else {
				toast.error(data.error || ERROR_MESSAGES.CROP_FAILED);
			}
		} catch (error) {
			console.error("Error cropping videos:", error);
			toast.error(ERROR_MESSAGES.CROP_FAILED);
		}
	};

	const handleDecodeFile = async (
		file: MediaFile,
		password?: string,
		progress?: { current: number; total: number },
	) => {
		try {
			const response = await fetch(API_ENDPOINTS.WORKSPACE_DUCK_DECODE, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					duckImagePath: file.path,
					password: password || "",
					jobId: selectedFolder?.session_id,
				}),
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data.error || "Failed to decode image");
			}

			// Show different message for batch vs single
			if (progress && progress.total > 1) {
				toast.success(
					`[${progress.current}/${progress.total}] Decoded: ${file.name}`,
				);
			} else {
				toast.success(`Successfully decoded: ${file.name}`);
			}

			// For batch operations, only refresh dataset view at the end (when current === total)
			if (!progress || progress.current === progress.total) {
				if (selectedDataset) {
					await selectDataset(selectedDataset);
				}
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to decode image";
			toast.error(errorMessage);
			throw err;
		}
	};

	const handleClipVideos = async (selectedPaths: string[]) => {
		const { clipConfig } = useVideoClipStore.getState();

		// Log the config being sent for debugging
		console.log("[Workspace] Starting clip with config:", {
			saveToWorkspace: clipConfig.saveToWorkspace,
			organizeByVideo: clipConfig.organizeByVideo,
		});

		try {
			const response = await fetch(API_ENDPOINTS.VIDEOS_CLIP, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					videos: selectedPaths,
					clip_config: clipConfig,
					timeout: 3600,
					// Pass current workspace folder path if saving to workspace is enabled
					outputDir: clipConfig.saveToWorkspace
						? selectedFolder?.folder_path
						: undefined,
				}),
			});

			const data = await response.json();

			if (data.success) {
				setActiveConsoleTaskId(data.task_id);
				toast.success(
					`Started clipping ${selectedPaths.length} video${selectedPaths.length > 1 ? "s" : ""}`,
				);
			} else {
				toast.error(data.error || "Failed to start clipping");
			}
		} catch (error) {
			console.error("Error clipping videos:", error);
			toast.error("Failed to start clipping");
		}
	};

	const handleClipSingleVideo = useCallback((video: MediaFile) => {
		handleClipVideos([video.path]);
	}, []);

	const handleVideoSelectionChange = useCallback(
		(videoPath: string, selected: boolean) => {
			updateMediaFile(videoPath, { selected });
		},
		[updateMediaFile],
	);

	const handleRenameVideo = async (video: any, newName: string) => {
		try {
			const response = await fetch(API_ENDPOINTS.VIDEOS_RENAME, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					video_path: video.path,
					new_name: newName,
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast.success(`Renamed to ${data.new_name}`);
				removeMediaFileByPath(video.path);
				const updatedPath = data.new_path || data.newPath || video.path;
				upsertMediaFile({
					...video,
					id: updatedPath,
					path: updatedPath,
					name: data.new_name || newName,
				});
			} else {
				toast.error(data.error || "Failed to rename video");
			}
		} catch (error) {
			console.error("Error renaming video:", error);
			toast.error("Failed to rename video");
		}
	};

	const handleDeleteVideo = async (video: any) => {
		try {
			const response = await fetch(API_ENDPOINTS.VIDEOS_DELETE, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					videos: [video.path],
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast.success("Video deleted");
				removeMediaFileByPath(video.path);
			} else {
				toast.error(data.error || "Failed to delete video");
			}
		} catch (error) {
			console.error("Error deleting video:", error);
			toast.error("Failed to delete video");
		}
	};

	// Handle delete multiple videos by paths (for split tab toolbar)
	const handleDeleteVideosByPath = async (selectedPaths: string[]) => {
		try {
			const response = await fetch(API_ENDPOINTS.VIDEOS_DELETE, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					videos: selectedPaths,
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast.success(`Deleted ${selectedPaths.length} video(s)`);
				selectedPaths.forEach((path) => removeMediaFileByPath(path));
			} else {
				toast.error(data.error || "Failed to delete videos");
			}
		} catch (error) {
			console.error("Error deleting videos:", error);
			toast.error("Failed to delete videos");
		}
	};

	const handleCreateDataset = (filesToCopy?: string[]) => {
		// If no files specified, create empty dataset
		setDatasetFilesToCopy(filesToCopy || []);
		setShowCreateDatasetDialog(true);
	};

	const handleDatasetCreated = async (dataset: {
		name: string;
		path: string;
	}) => {
		await loadDatasets();
		toast.success(`Dataset "${dataset.name}" created successfully`);
	};

	// Handle export to dataset from toolbar
	const handleExportToDataset = () => {
		setFileToExportToDataset(null); // Export all selected files
		setShowSelectDatasetDialog(true);
	};

	// Handle export to dataset from context menu (single file)
	const handleExportFileToDataset = (file: MediaFile) => {
		setFileToExportToDataset(file);
		setShowSelectDatasetDialog(true);
	};

	// Handle dataset selected for export
	const handleDatasetSelectedForExport = async (dataset: {
		name: string;
		path: string;
	}) => {
		// Copy files to the selected dataset folder
		const filesToExport = fileToExportToDataset
			? [fileToExportToDataset]
			: selectedFiles;

		if (filesToExport.length === 0) {
			toast.error("No files to export");
			return;
		}

		try {
			const response = await fetch("/api/dataset/copy-files", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					datasetPath: dataset.path,
					files: filesToExport.map((f) => f.path),
				}),
			});

			const data = await response.json();

			if (data.success) {
				const skippedMsg =
					data.skippedCount > 0
						? ` (${data.skippedCount} skipped - already exist)`
						: "";
				const errorMsg =
					data.errorCount > 0 ? ` (${data.errorCount} failed)` : "";
				toast.success(
					`Moved ${data.movedCount} file${data.movedCount !== 1 ? "s" : ""} to "${dataset.name}"${skippedMsg}${errorMsg}`,
				);

				filesToExport.forEach((file) => removeMediaFileByPath(file.path));

				if (selectedDataset && selectedDataset.path === dataset.path) {
					await selectDataset(selectedDataset);
				}
			} else {
				toast.error(data.error || "Failed to export to dataset");
			}
		} catch (err) {
			toast.error("Failed to export to dataset");
		}
	};

	// Load datasets (subfolders) from current folder
	const loadDatasets = useCallback(async () => {
		if (!selectedFolder) {
			setDatasets([]);
			return;
		}

		setIsLoadingDatasets(true);
		try {
			const response = await fetch("/api/dataset/list", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ folderPath: selectedFolder.folder_path }),
			});

			const data = await response.json();

			if (data.success) {
				setDatasets(data.datasets || []);
			} else {
				setDatasets([]);
			}
		} catch (err) {
			console.error("Failed to load datasets:", err);
			setDatasets([]);
		} finally {
			setIsLoadingDatasets(false);
		}
	}, [selectedFolder]);

	// Select a dataset and load its files
	const selectDataset = useCallback(
		async (dataset: { name: string; path: string }) => {
			setSelectedDataset(dataset);
			setIsLoadingDatasets(true);

			try {
				const response = await fetch("/api/dataset/files", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ datasetPath: dataset.path }),
				});

				const data = await response.json();

				if (data.success) {
					// Convert files to MediaFile format
					const imageFiles = (data.images || []).map((file: any) => ({
						id: file.path,
						name: file.name,
						path: file.path,
						type: "image" as const,
						extension: "." + (file.name.split(".").pop() || "").toLowerCase(),
						size: file.size || 0,
						width: file.width,
						height: file.height,
						created_at: file.created_at,
						modified_at: file.modified_at,
						thumbnail: `/api/images/serve?path=${encodeURIComponent(file.path)}`,
						caption: file.caption,
						captionPath: file.captionPath,
						selected: false,
					}));

					const videoFiles = (data.videos || []).map((file: any) => ({
						id: file.path,
						name: file.name,
						path: file.path,
						type: "video" as const,
						extension: "." + (file.name.split(".").pop() || "").toLowerCase(),
						size: file.size || 0,
						width: file.width,
						height: file.height,
						fps: file.fps,
						duration: file.duration,
						created_at: file.created_at,
						modified_at: file.modified_at,
						thumbnail: file.thumbnail
							? `/api/images/serve?path=${encodeURIComponent(file.thumbnail)}`
							: undefined,
						blobUrl: `/api/videos/serve?path=${encodeURIComponent(file.path)}`,
						caption: file.caption,
						captionPath: file.captionPath,
						selected: false,
					}));

					setDatasetMediaFiles([...imageFiles, ...videoFiles]);
				} else {
					setDatasetMediaFiles([]);
					toast.error(data.error || "Failed to load dataset files");
				}
			} catch (err) {
				console.error("Failed to load dataset files:", err);
				setDatasetMediaFiles([]);
				toast.error("Failed to load dataset files");
			} finally {
				setIsLoadingDatasets(false);
			}
		},
		[setDatasetMediaFiles],
	);

	// Go back to dataset list
	const backToDatasetList = useCallback(() => {
		setSelectedDataset(null);
		setDatasetMediaFiles([]);
	}, [setDatasetMediaFiles]);

	// Load datasets when switching to dataset tab
	useEffect(() => {
		if (activeTab === "dataset") {
			loadDatasets();
		}
	}, [activeTab, loadDatasets]);

	// Auto-load last selected dataset when switching to dataset tab
	useEffect(() => {
		if (activeTab === "dataset" && selectedDataset) {
			// Load the files for the persisted selected dataset
			selectDataset(selectedDataset);
		}
	}, [activeTab, selectedDataset, selectDataset]);

	const handlePreviewFile = useCallback((file: MediaFile) => {
		if (file.type === "video") {
			setPreviewVideo(file);
		} else if (file.type === "image") {
			setPreviewImage(file);
		} else {
			toast.error("Preview is only available for image and video files");
		}
	}, []);

	// Handle dataset file rename
	const handleDatasetRename = useCallback(
		async (file: MediaFile, newName: string) => {
			if (!selectedDataset) return;

			try {
				const extension = file.name.includes(".")
					? "." + file.name.split(".").pop()
					: "";
				const fullPath = file.path;
				const directory = fullPath.substring(0, fullPath.lastIndexOf("/"));
				const newPath = `${directory}/${newName}${extension}`;

				const response = await fetch("/api/workspace/rename", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						oldPath: fullPath,
						newName: newName + extension,
					}),
				});

				const data = await response.json();

				if (data.success) {
					// Update the file in the store
					updateDatasetFile(file.id, {
						name: newName + extension,
						path: newPath,
						thumbnail:
							file.type === "image"
								? `/api/images/serve?path=${encodeURIComponent(newPath)}`
								: file.thumbnail,
						blobUrl:
							file.type === "video"
								? `/api/videos/serve?path=${encodeURIComponent(newPath)}`
								: file.blobUrl,
					});
					toast.success(`Renamed to ${newName}${extension}`);
				} else {
					toast.error(data.error || "Failed to rename file");
				}
			} catch (err) {
				console.error("Failed to rename file:", err);
				toast.error("Failed to rename file");
			}
		},
		[selectedDataset, updateDatasetFile],
	);

	// Handle dataset file delete
	const handleDatasetDelete = useCallback(
		async (files: MediaFile[]) => {
			if (!selectedDataset) return;

			const filePaths = files.map((f) => f.path);

			try {
				const response = await fetch("/api/workspace/delete", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ paths: filePaths }),
				});

				const data = await response.json();

				if (data.success) {
					// Remove files from the store
					files.forEach((f) => removeDatasetFile(f.id));
					toast.success(
						`Deleted ${files.length} file${files.length !== 1 ? "s" : ""}`,
					);
				} else {
					toast.error(data.error || "Failed to delete files");
				}
			} catch (err) {
				console.error("Failed to delete files:", err);
				toast.error("Failed to delete files");
			}
		},
		[selectedDataset, removeDatasetFile],
	);

	// Handle dataset file resize (from toolbar - uses config from store)
	const handleDatasetResize = useCallback(
		async (
			files: MediaFile[],
			longestEdge?: number,
			deleteOriginal?: boolean,
		) => {
			console.log("[handleDatasetResize] Called with:", {
				files: files.length,
				longestEdge,
				deleteOriginal,
			});
			if (!selectedDataset) return;

			// Use config from store if not provided
			const resizeConfig = useResizeConfigStore.getState();
			console.log("[handleDatasetResize] Config from store:", resizeConfig);
			const edge = longestEdge ?? parseInt(resizeConfig.longestEdge);
			const deleteOrig = deleteOriginal ?? resizeConfig.deleteOriginal;
			const suffix = resizeConfig.outputSuffix;

			const filesData = files.map((f) => ({
				path: f.path,
				type: f.type,
				width: f.width || 0,
				height: f.height || 0,
			}));
			console.log("[handleDatasetResize] Sending to API:", {
				edge,
				deleteOrig,
				suffix,
				filesData,
			});

			try {
				const response = await fetch("/api/media/resize", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						files: filesData,
						longestEdge: edge,
						outputSuffix: suffix,
						deleteOriginal: deleteOrig,
					}),
				});

				const data = await response.json();
				console.log("[handleDatasetResize] API response:", data);

				if (data.success) {
					const msg = deleteOrig
						? `Resized and deleted ${data.processed} original file${data.processed !== 1 ? "s" : ""}`
						: `Resized ${data.processed} file${data.processed !== 1 ? "s" : ""}`;
					toast.success(msg);
					// Refresh dataset to show resized files
					await selectDataset(selectedDataset);
				} else {
					toast.error(data.error || "Failed to resize files");
				}
			} catch (err) {
				console.error("Failed to resize files:", err);
				toast.error("Failed to resize files");
			}
		},
		[selectedDataset, selectDataset],
	);

	// Handle manual caption creation (empty file)
	const handleManualAddCaption = useCallback(
		async (files: MediaFile[]) => {
			if (!selectedDataset) return;

			let createdCount = 0;

			for (const file of files) {
				if (file.captionPath) continue; // Skip if already has caption

				try {
					// Construct .txt path
					const lastDotIndex = file.path.lastIndexOf(".");
					const txtPath =
						(lastDotIndex > -1
							? file.path.substring(0, lastDotIndex)
							: file.path) + ".txt";

					const response = await fetch("/api/files/write-txt", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							path: txtPath,
							content: "", // Empty content
						}),
					});

					if (response.ok) {
						// Update store
						updateDatasetFile(file.id, {
							caption: "",
							captionPath: txtPath,
						});
						createdCount++;
					}
				} catch (error) {
					console.error("Failed to create caption file:", error);
				}
			}

			if (createdCount > 0) {
				toast.success(
					`Created ${createdCount} caption file${createdCount !== 1 ? "s" : ""}`,
				);
			}
		},
		[selectedDataset, updateDatasetFile],
	);

	// Handle dataset media caption (AI description)
	const handleDatasetCaption = useCallback(
		async (files: MediaFile[]) => {
			if (!selectedDataset) return;

			// Filter for video or image files
			const mediaFiles = files.filter(
				(f) => f.type === "video" || f.type === "image",
			);
			if (mediaFiles.length === 0) {
				toast.error("No media files selected");
				return;
			}

			const mediaFile = mediaFiles[0]; // Caption one at a time for now

			try {
				toast.info(`Generating caption for ${mediaFile.name}...`);

				const response = await fetch("/api/dataset/caption", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						videoPath: mediaFile.path, // Legacy field name, handles both
						videoName: mediaFile.name,
						datasetPath: selectedDataset.path,
					}),
				});

				const data = await response.json();

				if (data.success) {
					toast.success(
						`Caption saved: ${mediaFile.name.replace(/\.[^/.]+$/, "")}.txt`,
					);
					// Refresh dataset to show the new caption file
					await selectDataset(selectedDataset);
				} else {
					toast.error(data.message || "Failed to generate caption");
				}
			} catch (err) {
				console.error("Failed to generate caption:", err);
				toast.error("Failed to generate caption");
			}
		},
		[selectedDataset, selectDataset],
	);

	// Handle single file resize from context menu
	const handleResizeFromContextMenu = useCallback((file: MediaFile) => {
		setResizeFile(file);
		setShowResizeDialog(true);
	}, []);

	const handleSortChange = useCallback(
		(field: typeof mediaSortField, direction: typeof mediaSortDirection) => {
			setMediaSorting(field, direction);
		},
		[setMediaSorting],
	);

	// Feature cards for workspace
	const featureCards = (
		<div className="grid md:grid-cols-2 gap-6 mt-12">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<FolderOpen className="h-5 w-5 text-purple-600" />
						File System Access
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<p className="text-sm text-gray-600">
							Modern, secure folder selection directly in your browser.
						</p>
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary" className="text-xs">
								Secure
							</Badge>
							<Badge variant="secondary" className="text-xs">
								Cross-platform
							</Badge>
							<Badge variant="secondary" className="text-xs">
								No Upload
							</Badge>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<WorkflowIcon className="h-5 w-5 text-indigo-600" />
						Workflow Management
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<p className="text-sm text-gray-600">
							Configure custom workflows with input parameters and job history
							tracking.
						</p>
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary" className="text-xs">
								Flexible
							</Badge>
							<Badge variant="secondary" className="text-xs">
								Parameterized
							</Badge>
							<Badge variant="secondary" className="text-xs">
								Re-runnable
							</Badge>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:bg-[#0d1117] dark:from-[#0d1117] dark:to-[#161b22]">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<PageHeader
					badgeText="RunningHub Workspace"
					icon={Settings}
					showBackButton={!!selectedFolder}
					onBackClick={handleBackToSelection}
					colorVariant="purple"
				/>

				{/* Error Display */}
				{error && (
					<Alert className="mb-6 border-red-200 bg-red-50">
						<AlertCircle className="h-4 w-4 text-red-600" />
						<AlertDescription className="text-sm text-red-700">
							{error}
						</AlertDescription>
					</Alert>
				)}

				{/* Main Content */}
				{!selectedFolder ? (
					<FolderSelectionLayout
						title="Select Workspace Folder"
						description="Choose a folder containing media files to process using RunningHub AI workflows. Configure custom workflows and track job history."
						icon={Settings}
						iconBgColor="bg-purple-50"
						iconColor="text-purple-600"
						onFolderSelected={handleFolderSelected}
						onError={handleError}
						features={featureCards}
					/>
				) : (
					/* Selected Folder Display */
					<div className="space-y-6">
						<SelectedFolderHeader
							folderName={selectedFolder.folder_name}
							folderPath={selectedFolder.folder_path}
							itemCount={mediaFiles.length}
							itemType="images"
							isVirtual={selectedFolder.is_virtual}
							isLoading={false}
							onRefresh={() => handleRefresh(false)}
							colorVariant="purple"
						/>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<button
								onClick={() => {
									// Toggle manual override
									if (isMediaLive) {
										setManualLiveOverride(false);
									} else {
										setManualLiveOverride(true);
									}
								}}
								className={`inline-flex items-center gap-2 rounded-full px-2 py-1 transition-colors hover:opacity-80 cursor-pointer ${isMediaLive ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
								title={
									isMediaLive
										? "Click to disable live sync"
										: "Click to enable live sync"
								}
							>
								{isMediaLive ? (
									<Wifi className="h-3 w-3" />
								) : (
									<WifiOff className="h-3 w-3" />
								)}
								{isMediaLive ? "Live" : "Offline"}
							</button>
							<span className="text-muted-foreground/70">
								{isMediaLive
									? "Changes sync automatically"
									: "Click to enable live sync"}
							</span>
						</div>

						{/* Tab Navigation */}
						<Tabs
							value={activeTab}
							onValueChange={(v) => {
								setActiveTab(v as any);
								setManualLiveOverride(null); // Reset override on tab switch (batched update)
							}}
						>
							<TabsList className="flex w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50 scrollbar-none">
								<TabsTrigger
									value="media"
									className="flex items-center gap-2 min-w-fit px-4"
								>
									<FolderOpen className="h-4 w-4" />
									Media Gallery
								</TabsTrigger>
								<TabsTrigger
									value="youtube"
									className="flex items-center gap-2 min-w-fit px-4"
								>
									<Youtube className="h-4 w-4" />
									YouTube
								</TabsTrigger>
								<TabsTrigger
									value="clip"
									className="flex items-center gap-2 min-w-fit px-4"
								>
									<Scissors className="h-4 w-4" />
									Clip
								</TabsTrigger>
								<TabsTrigger
									value="convert"
									className="flex items-center gap-2 min-w-fit px-4"
								>
									<Zap className="h-4 w-4" />
									Convert
								</TabsTrigger>
								<TabsTrigger
									value="dataset"
									className="flex items-center gap-2 min-w-fit px-4"
								>
									<Database className="h-4 w-4" />
									Dataset
								</TabsTrigger>
								<TabsTrigger
									value="run-workflow"
									className="flex items-center gap-2 min-w-fit px-4"
								>
									<Play className="h-4 w-4" />
									Run Workflow
								</TabsTrigger>
								<TabsTrigger
									value="run-complex-workflow"
									className="flex items-center gap-2 min-w-fit px-4"
								>
									<Zap className="h-4 w-4" />
									Run Complex Workflow
								</TabsTrigger>
								<TabsTrigger
									value="workflows"
									className="flex items-center gap-2 min-w-fit px-4"
								>
									<WorkflowIcon className="h-4 w-4" />
									Workflows
								</TabsTrigger>
								<TabsTrigger
									value="jobs"
									className="flex items-center gap-2 min-w-fit px-4"
								>
									<Clock className="h-4 w-4" />
									Job History
								</TabsTrigger>
								<TabsTrigger
									value="bot"
									className="flex items-center gap-2 min-w-fit px-4"
								>
									<Bot className="h-4 w-4" />
									Bot
								</TabsTrigger>
								<TabsTrigger
									value="bot-builder"
									className="flex items-center gap-2 min-w-fit px-4"
								>
									<Bot className="h-4 w-4" />
									Bot Builder
								</TabsTrigger>
							</TabsList>

							{/* Media Gallery Tab */}
							<TabsContent value="media" className="space-y-6 mt-6">
								{/* Export Configuration */}
								<ExportConfiguration />

								{/* Media Selection Toolbar */}
								<MediaSelectionToolbar
									selectedFiles={selectedFiles}
									onRename={handleRenameFile}
									onDelete={handleDeleteFile}
									onDecode={handleDecodeFile}
									onRunWorkflow={handleQuickRunWorkflow}
									onBatchProcess={handleBatchProcess}
									batchWorkflowId={selectedComplexWorkflowId}
									batchWorkflowName={selectedComplexWorkflowName}
									onPreview={handlePreviewFile}
									onExport={handleExport}
									onExportToDataset={() => {
										setFileToExportToDataset(null); // null means use selectedFiles
										setShowSelectDatasetDialog(true);
									}}
									onDeselectAll={deselectAllMediaFiles}
								/>

								{/* Sort Controls */}
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<MediaSortControls
											sortField={mediaSortField}
											sortDirection={mediaSortDirection}
											onSortChange={handleSortChange}
										/>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleRefresh(false)}
										className="gap-2"
									>
										<RefreshCw className="h-4 w-4" />
										Refresh
									</Button>
								</div>

								{/* Media Gallery */}
								<MediaGallery
									onFileClick={(file) => {
										// Optional: add custom click handling here if needed
									}}
									onFileDoubleClick={(file) => {
										if (file.type === "video") {
											setPreviewVideo(file);
										} else {
											setPreviewImage(file);
										}
									}}
									onRename={handleRenameFile}
									onDelete={handleDeleteFile}
									onExport={handleExport}
									onDecode={handleDecodeFile}
									onPreview={(file) => {
										if (file.type === "video") {
											setPreviewVideo(file);
										} else {
											setPreviewImage(file);
										}
									}}
									onConvertFps={handleConvertFps}
									onExportToDataset={handleExportFileToDataset}
									onResize={(file) => {
										setResizeFile(file);
										setShowResizeDialog(true);
									}}
								/>
							</TabsContent>

							{/* YouTube Download Tab */}
							<TabsContent value="youtube" className="mt-6">
								<div className="max-w-2xl mx-auto">
									<div className="mb-6">
										<h3 className="text-lg font-semibold">
											Download YouTube Videos
										</h3>
										<p className="text-sm text-gray-600 mt-1">
											Download videos from YouTube (including shorts) directly
											to your workspace folder
										</p>
									</div>
									<YoutubeDownloader
										onDownloadStart={(taskId) => {
											setActiveConsoleTaskId(taskId);
										}}
										onDownloadComplete={(success) => {
											if (success) {
												// Refresh media gallery to show downloaded video
												handleRefresh(false);
											}
											setActiveConsoleTaskId(null);
										}}
									/>
								</div>
							</TabsContent>

							{/* Clip Tab */}
							<TabsContent value="clip" className="space-y-6 mt-6">
								<div className="mb-6">
									<h3 className="text-lg font-semibold">Video Clipping</h3>
									<p className="text-sm text-gray-600 mt-1">
										Extract images from videos using FFmpeg. Videos are
										automatically filtered from your workspace folder.
									</p>
								</div>

								{/* Clip Configuration */}
								<VideoClipConfiguration />

								{/* Selection Toolbar */}
								<VideoClipSelectionToolbar
									selectedCount={selectedVideoCount}
									onClip={(selectedPaths) => handleClipVideos(selectedPaths)}
									onRefresh={() => handleRefresh(true)}
									onRename={handleRenameVideo}
									onPreview={(selectedPaths) => {
										if (selectedPaths.length > 0) {
											const video = filteredVideos.find(
												(v) => v.path === selectedPaths[0],
											);
											if (video) {
												handlePreviewFile(video);
											}
										}
									}}
									disabled={false}
								/>

								{/* Video Gallery - filtered to videos only */}
								<VideoGallery
									videos={adaptedVideos}
									isLoading={false}
									onRefresh={() => handleRefresh(true)}
									onRename={handleRenameVideo}
									onDelete={handleDeleteVideo}
								/>
							</TabsContent>

							{/* Convert Tab */}
							<TabsContent value="convert" className="space-y-6 mt-6">
								<div className="mb-6">
									<h3 className="text-lg font-semibold">Video Conversion</h3>
									<p className="text-sm text-gray-600 mt-1">
										Convert video FPS, crop videos, or both. Videos are
										automatically filtered from your workspace folder.
									</p>
								</div>

								{/* Configuration Grid - Crop and FPS Convert */}
								<div className="grid md:grid-cols-2 gap-6">
									{/* Crop Configuration */}
									<CropConfiguration />

								{/* Convert Configuration */}
									<VideoConvertConfiguration />
								</div>

								{/* Selection Toolbar */}
								<VideoClipSelectionToolbar
									selectedCount={selectedVideoCount}
									onRefresh={() => handleRefresh(true)}
									onRename={handleRenameVideo}
									onPreview={(selectedPaths) => {
										if (selectedPaths.length > 0) {
											const video = filteredVideos.find(
												(v) => v.path === selectedPaths[0],
											);
											if (video) {
												handlePreviewFile(video);
											}
										}
									}}
									onClip={async (selectedPaths) => {
										const selectedVideoFiles = filteredVideos.filter((v) =>
											selectedPaths.includes(v.path),
										);
										await handleCropVideos(
											selectedVideoFiles.map((v) => ({ ...v, id: v.path })),
										);
									}}
									clipButtonText="Crop"
									onConvertFps={async (selectedPaths) => {
										const selectedVideoFiles = filteredVideos.filter((v) =>
											selectedPaths.includes(v.path),
										);
										await handleConvertFps(
											selectedVideoFiles.map((v) => ({ ...v, id: v.path })),
										);
									}}
									disabled={false}
									label="Select videos to convert"
								/>

								{/* Video Gallery - filtered to videos only */}
								<VideoGallery
									videos={adaptedVideos}
									isLoading={false}
									onRefresh={() => handleRefresh(true)}
									onRename={handleRenameVideo}
									onDelete={handleDeleteVideo}
									onCrop={(video) =>
										handleCropVideos([{ ...video, id: video.path }])
									}
									onConvertFps={(video) =>
										handleConvertFps([{ ...video, id: video.path }])
									}
								/>
							</TabsContent>

							{/* Dataset Tab */}
							<TabsContent value="dataset" className="space-y-6 mt-6">
								{!selectedDataset ? (
									// Dataset List View
									<>
										<div className="mb-6">
											<h3 className="text-lg font-semibold">Datasets</h3>
											<p className="text-sm text-gray-600 mt-1">
												Datasets are subfolders in your current workspace
												folder. Create a new dataset or select an existing one
												to manage files.
											</p>
										</div>

										{/* Create Dataset Button */}
										<div className="flex items-center justify-between mb-4">
											<Button
												onClick={() => handleCreateDataset()}
												className="bg-purple-600 hover:bg-purple-700"
											>
												<Database className="h-4 w-4 mr-2" />
												Create New Dataset
											</Button>
											<Button
												variant="outline"
												onClick={() => loadDatasets()}
												disabled={isLoadingDatasets}
											>
												Refresh
											</Button>
										</div>

										{/* Dataset Grid */}
										{datasets.length === 0 && !isLoadingDatasets ? (
											<Card className="p-12 text-center">
												<Database className="h-16 w-16 mx-auto mb-4 text-gray-400" />
												<h4 className="text-lg font-semibold text-gray-700 mb-2">
													No Datasets Found
												</h4>
												<p className="text-sm text-gray-500 mb-6">
													Create a new dataset to organize your media files into
													subfolders.
												</p>
												<Button
													onClick={() => handleCreateDataset()}
													className="bg-purple-600 hover:bg-purple-700"
												>
													<Database className="h-4 w-4 mr-2" />
													Create First Dataset
												</Button>
											</Card>
										) : (
											<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
												{datasets.map((dataset) => (
													<Card
														key={dataset.path}
														className="cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all group"
														onClick={() => selectDataset(dataset)}
													>
														<div className="p-4">
															<div className="flex items-center justify-center mb-3">
																<div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
																	<Database className="h-8 w-8 text-purple-600" />
																</div>
															</div>
															<p
																className="text-sm font-medium text-center truncate text-gray-700"
																title={dataset.name}
															>
																{dataset.name}
															</p>
															<p className="text-xs text-gray-500 text-center mt-1">
																{dataset.fileCount} file
																{dataset.fileCount !== 1 ? "s" : ""}
															</p>
														</div>
													</Card>
												))}
											</div>
										)}
									</>
								) : (
									// Dataset Detail View
									<>
										<div className="flex items-center justify-between mb-4">
											<div>
												<div className="flex items-center gap-2">
													<Button
														variant="ghost"
														size="sm"
														onClick={backToDatasetList}
														className="text-gray-600 hover:text-gray-900"
													>
														← Back to Datasets
													</Button>
												</div>
												<h3 className="text-lg font-semibold mt-2">
													<Database className="h-5 w-5 inline mr-2 text-purple-600" />
													{selectedDataset.name}
												</h3>
												<p className="text-sm text-gray-600">
													{datasetMediaFiles.length} file
													{datasetMediaFiles.length !== 1 ? "s" : ""} in dataset
												</p>
											</div>
											<Button
												variant="outline"
												onClick={() => {
													selectDataset(selectedDataset);
												}}
												disabled={isLoadingDatasets}
											>
												Refresh
											</Button>
										</div>

										{/* Resize Configuration */}
										<ResizeConfiguration />

										{/* Dataset Selection Toolbar */}
										{datasetMediaFiles.filter((f) => f.selected).length > 0 && (
											<MediaSelectionToolbar
												selectedFiles={datasetMediaFiles.filter(
													(f) => f.selected,
												)}
												onRename={handleDatasetRename}
												onDelete={handleDatasetDelete}
												onResize={handleDatasetResize}
												onCaption={handleDatasetCaption}
												onAddCaption={handleManualAddCaption}
												onPreview={handlePreviewFile}
												onDeselectAll={() => deselectAllDatasetFiles()}
												skipResizeDialog={false}
												showCaptionButton={true}
											/>
										)}

										{/* Media Gallery for Dataset */}
										<MediaGallery
											mode="dataset"
											onFileDoubleClick={handlePreviewFile}
											onRename={handleDatasetRename}
											onDelete={handleDatasetDelete}
											onResize={handleResizeFromContextMenu}
											onPreview={handlePreviewFile}
											onAddCaption={handleManualAddCaption}
										/>
									</>
								)}
							</TabsContent>

							{/* Run Workflow Tab */}
							<TabsContent value="run-workflow" className="space-y-6 mt-6">
								<div className="flex items-center justify-between">
									<h3 className="text-lg font-semibold">
										Select Files & Run Workflow
									</h3>
								</div>

								{/* Workflow Selector and Input Builder */}
								<div className="grid lg:grid-cols-3 gap-6">
									{/* Workflow Selector */}
									<div className="lg:col-span-1 overflow-visible">
										<WorkflowSelector onAddWorkflow={handleAddWorkflow} />
									</div>

									{/* Workflow Input Builder */}
									<div className="lg:col-span-2">
										{selectedWorkflowId &&
										workflows.find((w) => w.id === selectedWorkflowId) ? (
											<WorkflowInputBuilder
												workflow={
													workflows.find((w) => w.id === selectedWorkflowId)!
												}
												onRunJob={handleRunJob}
											/>
										) : (
											<Card className="p-8 text-center text-gray-500">
												<WorkflowIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
												<p className="text-sm">
													Select a workflow to configure inputs
												</p>
											</Card>
										)}
									</div>
								</div>
							</TabsContent>

							{/* Run Complex Workflow Tab */}
							<TabsContent
								value="run-complex-workflow"
								className="space-y-6 mt-6"
							>
								<ComplexWorkflowRunner />
							</TabsContent>

							{/* Workflows Tab */}
							<TabsContent value="workflows" className="mt-6">
								{isCreatingComplexWorkflow || editingComplexWorkflow ? (
									<div className="bg-white rounded-lg p-6 border shadow-sm">
										<div className="flex justify-between items-center mb-6">
											<h3 className="text-xl font-semibold">
												{editingComplexWorkflow
													? "Edit Complex Workflow"
													: "Create Complex Workflow"}
											</h3>
											<Button
												variant="outline"
												onClick={() => {
													setIsCreatingComplexWorkflow(false);
													setEditingComplexWorkflow(null);
												}}
											>
												Cancel
											</Button>
										</div>
										<ComplexWorkflowBuilder
											workflow={editingComplexWorkflow || undefined}
											onSave={handleComplexWorkflowSaved}
											onCancel={() => {
												setIsCreatingComplexWorkflow(false);
												setEditingComplexWorkflow(null);
											}}
										/>
									</div>
								) : (
									<div className="space-y-6">
										<div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
											<Button
												variant={
													!viewingComplexWorkflows ? "secondary" : "ghost"
												}
												size="sm"
												onClick={() => setViewingComplexWorkflows(false)}
												className={cn(
													!viewingComplexWorkflows && "bg-white shadow-sm",
												)}
											>
												Simple Workflows
											</Button>
											<Button
												variant={
													viewingComplexWorkflows ? "secondary" : "ghost"
												}
												size="sm"
												onClick={() => setViewingComplexWorkflows(true)}
												className={cn(
													viewingComplexWorkflows && "bg-white shadow-sm",
												)}
											>
												Complex Workflows
											</Button>
										</div>

										{viewingComplexWorkflows ? (
											<div className="space-y-4">
												<div className="flex justify-end">
													<Button
														onClick={() => {
															setIsCreatingComplexWorkflow(true);
															setEditingComplexWorkflow(null);
														}}
													>
														<Plus className="h-4 w-4 mr-2" />
														Create Complex Workflow
													</Button>
												</div>
												<ComplexWorkflowList
													key={complexWorkflowListKey}
													onEdit={handleEditComplexWorkflow}
												/>
											</div>
										) : (
											<WorkflowList />
										)}
									</div>
								)}
							</TabsContent>

							{/* Jobs Tab */}
							<TabsContent value="jobs" className="mt-6">
								{selectedJobId ? (
									<JobDetail
										jobId={selectedJobId}
										onBack={() => setSelectedJob(null)}
									/>
								) : (
									<JobList onJobClick={(job) => setSelectedJob(job.id)} />
								)}
							</TabsContent>

							{/* Bot Tab */}
							<TabsContent value="bot" className="mt-6">
								<BotTab />
							</TabsContent>

							{/* Bot Builder Tab */}
							<TabsContent value="bot-builder" className="mt-6">
								<BotBuilderTab />
							</TabsContent>
						</Tabs>
					</div>
				)}

				{/* Console Viewer */}
				<ConsoleViewer
					onRefresh={handleRefresh}
					onTaskComplete={handleTaskComplete}
					onStatusChange={handleStatusChange}
					taskId={activeConsoleTaskId}
					defaultVisible={false}
				/>


				{/* Workflow Editor Dialog */}
				{isEditingWorkflow && (
					<WorkflowEditor
						workflow={editingWorkflow}
						onSave={handleSaveWorkflow}
						onCancel={() => {
							setIsEditingWorkflow(false);
							setEditingWorkflow(undefined);
						}}
						onDelete={editingWorkflow ? handleDeleteWorkflow : undefined}
						open={isEditingWorkflow}
					/>
				)}

				{/* Quick Run Workflow Dialog */}
				<QuickRunWorkflowDialog
					open={showQuickRunDialog}
					onOpenChange={setShowQuickRunDialog}
					selectedFiles={selectedFiles}
					workflows={workflows}
					onConfirm={handleQuickRunWorkflow}
				/>

				{/* Video Player Modal */}
				<VideoPlayerModal
					video={
						previewVideo
							? {
									path: previewVideo.path,
									name: previewVideo.name,
									size: previewVideo.size,
									type: "video" as const,
									extension: previewVideo.extension || "",
									blob_url: previewVideo.blobUrl,
									duration: previewVideo.duration,
									created_at: previewVideo.created_at || 0,
									modified_at: previewVideo.modified_at || 0,
									width: previewVideo.width,
									height: previewVideo.height,
									fps: previewVideo.fps,
								}
							: null
					}
					isOpen={!!previewVideo}
					onClose={() => setPreviewVideo(null)}
				/>

				{/* Image Preview Modal */}
				<ImagePreviewModal
					file={previewImage}
					isOpen={!!previewImage}
					onClose={() => setPreviewImage(null)}
				/>

				{/* Progress Modal */}
				{isConvertProgressModalOpen && (
					<ProgressModal
						open={isConvertProgressModalOpen}
						onOpenChange={setIsConvertProgressModalOpen}
					/>
				)}

				{/* Create Dataset Dialog */}
				<CreateDatasetDialog
					open={showCreateDatasetDialog}
					onOpenChange={setShowCreateDatasetDialog}
					selectedFiles={datasetFilesToCopy}
					parentPath={selectedFolder?.folder_path || ""}
					onSuccess={handleDatasetCreated}
				/>

				{/* Select Dataset Dialog (for export) */}
				<SelectDatasetDialog
					open={showSelectDatasetDialog}
					onOpenChange={setShowSelectDatasetDialog}
					parentPath={selectedFolder?.folder_path || ""}
					onSuccess={handleDatasetSelectedForExport}
				/>

				{/* Single File Resize Dialog */}
				<SingleFileResizeDialog
					open={showResizeDialog}
					onOpenChange={setShowResizeDialog}
					file={resizeFile}
					onResize={async (longestEdge, deleteOriginal) => {
						if (resizeFile) {
							await handleDatasetResize(
								[resizeFile],
								longestEdge,
								deleteOriginal,
							);
						}
					}}
				/>
			</div>
		</div>
	);
}

// Single File Resize Dialog component
function SingleFileResizeDialog({
	open,
	onOpenChange,
	file,
	onResize,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	file: MediaFile | null;
	onResize: (longestEdge: number, deleteOriginal: boolean) => Promise<void>;
}) {
	const [longestEdge, setLongestEdge] = useState("768");
	const [deleteOriginal, setDeleteOriginal] = useState(false);
	const [isResizing, setIsResizing] = useState(false);

	const handleResize = async () => {
		const edge = parseInt(longestEdge);
		if (isNaN(edge) || edge <= 0) {
			toast.error("Please enter a valid longest edge value");
			return;
		}

		setIsResizing(true);
		try {
			await onResize(edge, deleteOriginal);
			onOpenChange(false);
			setLongestEdge("768");
			setDeleteOriginal(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to resize file",
			);
		} finally {
			setIsResizing(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Resize {file?.name || "File"}</DialogTitle>
					<DialogDescription>
						Scale by specifying the longest edge. The aspect ratio will be
						preserved.
					</DialogDescription>
				</DialogHeader>
				<div className="py-4 space-y-4">
					<div>
						<Label htmlFor="longest-edge-single">Longest Edge (pixels)</Label>
						<Input
							id="longest-edge-single"
							type="number"
							min="1"
							placeholder="e.g., 768"
							value={longestEdge}
							onChange={(e) => setLongestEdge(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleResize()}
							autoFocus
						/>
						<p className="text-xs text-muted-foreground mt-2">
							Current: {file?.width}×{file?.height}
						</p>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="delete-original-single"
							checked={deleteOriginal}
							onCheckedChange={(checked) => setDeleteOriginal(checked === true)}
						/>
						<Label
							htmlFor="delete-original-single"
							className="text-sm font-normal cursor-pointer"
						>
							Delete original file after resize
						</Label>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isResizing}
					>
						Cancel
					</Button>
					<Button
						onClick={handleResize}
						disabled={isResizing || !longestEdge.trim()}
						className="bg-indigo-600 hover:bg-indigo-700"
					>
						{isResizing ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Resizing...
							</>
						) : (
							"Resize"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
