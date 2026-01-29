/**
 * Workspace type definitions
 * Handles workspace file management, text content, translation, workflows, and jobs
 */

// ============================================================================
// LEGACY TYPES (Backward Compatibility)
// ============================================================================

export type Language = "en" | "zh" | "auto";

export type WorkspaceFileStatus =
	| "uploaded"
	| "processing"
	| "completed"
	| "error";

/**
 * Workspace file metadata (legacy)
 * @deprecated Use MediaFile instead
 */
export interface WorkspaceFile {
	id: string;
	name: string;
	originalPath: string;
	workspacePath: string;
	status: WorkspaceFileStatus;
	uploadedAt: number;
	textContent?: WorkspaceTextContent;
	errorMessage?: string;
}

/**
 * Text content with bilingual support (legacy)
 * @deprecated Use TextContent in JobResult instead
 */
export interface WorkspaceTextContent {
	original: string;
	en: string;
	zh: string;
	lastModified: number;
	originalLanguage?: Language;
}

export interface TranslationRequest {
	text: string;
	from: Language;
	to: Language;
}

export interface TranslationResponse {
	success: boolean;
	translatedText: string;
	detectedLanguage?: string;
	error?: string;
}

/**
 * Workspace configuration (legacy)
 * @deprecated Use Workflow[] and job management instead
 */
export interface WorkspaceConfig {
	path: string;
	workflowId: string | null;
}

export interface UploadProgress {
	fileId: string;
	fileName: string;
	progress: number;
	status: "uploading" | "processing" | "completed" | "error";
}

export interface FileUploadRequest {
	name: string;
	data: string; // Base64 encoded
}

export interface FileUploadResponse {
	id: string;
	name: string;
	workspacePath: string;
	width?: number;
	height?: number;
}

export interface ProcessRequest {
	files: string[];
	workflowId: string;
	workspacePath: string;
}

export interface ProcessResponse {
	success: boolean;
	taskId: string;
	message: string;
	error?: string;
}

export interface SaveTextRequest {
	fileId: string;
	content: string;
	language: "en" | "zh";
	workspacePath: string;
}

export interface SaveTextResponse {
	success: boolean;
	savedPath: string;
	error?: string;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

/**
 * Node information from CLI
 */
export interface CliNode {
	id: number;
	name: string;
	type: string;
	description: string;
	inputType?: "image" | "video" | "text" | "number" | "boolean";
}

/**
 * Workflow template configuration
 */
export interface WorkflowTemplate {
	workflowId: string;
	workflowName: string;
	nodes: CliNode[];
	fetchedAt: number;
}

/**
 * Parameter type for workflow inputs
 */
export type ParameterType = "text" | "file" | "number" | "boolean" | "select";

/**
 * Validation rules for workflow parameters
 */
export interface ParameterValidation {
	/** File type patterns (e.g., ['image/*', 'video/*']) */
	fileType?: string[];
	/** File extensions (e.g., ['.jpg', '.png', '.mp4']) */
	extensions?: string[];
	/** Minimum value (for numbers) or minimum length (for text) */
	min?: number;
	/** Maximum value (for numbers) or maximum length (for text) */
	max?: number;
	/** Regex pattern for text validation */
	pattern?: string;
	/** Media file type for file inputs ('image' or 'video') */
	mediaType?: "image" | "video";
}

/**
 * Workflow input parameter definition
 */
export interface WorkflowInputParameter {
	id: string;
	name: string;
	type: ParameterType;
	required: boolean;
	defaultValue?: string | number | boolean;
	placeholder?: string;
	description?: string;
	validation?: ParameterValidation;
	options?: { value: string | number; label: string }[];
	configKey?: string;
}

/**
 * Workflow output definition
 */
export interface WorkflowOutput {
	type: "none" | "text" | "image" | "video" | "mixed";
	description?: string;
}

/**
 * Workflow execution type
 * Determines which API endpoint to use for execution
 */
export type WorkflowExecutionType = "ai-app" | "workflow" | "local";

/**
 * Workflow configuration
 * Represents a user-configured workflow with input parameters
 */
export interface Workflow {
	id: string;
	name: string;
	description?: string;
	inputs: WorkflowInputParameter[];
	output?: WorkflowOutput;
	createdAt: number;
	updatedAt: number;
	sourceWorkflowId?: string; // RunningHub workflow ID (numeric ID from URL like "1980237776367083521")
	sourceType?: "template" | "custom" | "local"; // How this workflow was created
	executionType?: WorkflowExecutionType; // Which API endpoint to use ('ai-app' or 'workflow')
	localOperation?: LocalWorkflowOperationType;
	localConfig?: Record<string, any>;
}

/**
 * Import workflow JSON request
 */
export interface ImportWorkflowJsonRequest {
	jsonContent: string;
	workflowName?: string;
	workflowId?: string;
}

/**
 * Import workflow JSON response
 */
export interface ImportWorkflowJsonResponse {
	success: boolean;
	workflow?: Workflow;
	error?: string;
}

// ============================================================================
// FILE TYPES
// ============================================================================

/**
 * Media file type
 */
export type MediaType = "image" | "video";

/**
 * Media file with enhanced metadata
 */
export interface MediaFile {
	id: string;
	name: string;
	path: string;
	type: MediaType;
	extension: string;
	size: number; // File size in bytes

	// Image-specific metadata
	width?: number; // Image width in pixels
	height?: number; // Image height in pixels
	format?: string; // Image format (JPEG, PNG, etc.)

	// Timestamps
	created_at?: number;
	modified_at?: number;

	// Video-specific metadata
	duration?: number; // Video duration in seconds
	fps?: number; // Frames per second
	bitrate?: number; // Video bitrate
	codec?: string; // Video codec

	// Preview
	thumbnail?: string; // Thumbnail URL
	blobUrl?: string; // Blob URL for preview

	// Status
	selected?: boolean;

	// Duck encoding status
	isDuckEncoded?: boolean; // True if image contains duck-encoded hidden data
	duckRequiresPassword?: boolean; // True if duck-encoded image requires password
	duckValidationPending?: boolean; // True while validation is in progress

	// Caption from associated txt file (dataset page only)
	caption?: string; // Text content from associated txt file
	captionPath?: string; // Path to the txt file
}

/**
 * Detailed metadata for a media file
 */
export interface MediaFileDetail {
	file: MediaFile;
	metadata: {
		// Common metadata
		createdDate: string;
		modifiedDate: string;
		mimeType: string;

		// Image-specific metadata
		exif?: {
			cameraMake?: string;
			cameraModel?: string;
			iso?: number;
			aperture?: string;
			shutterSpeed?: string;
			focalLength?: string;
		};

		// Video-specific metadata
		audio?: {
			codec: string;
			sampleRate: number;
			channels: number;
		};
	};
}

// ============================================================================
// JOB TYPES
// ============================================================================

/**
 * Job status
 */
export type JobStatus = "queued" | "pending" | "running" | "completed" | "failed";

/**
 * File input assignment to a workflow parameter
 */
export interface FileInputAssignment {
	parameterId: string;
	filePath: string;
	fileName: string;
	fileSize: number;
	fileType: MediaType;
	valid: boolean;
	validationError?: string;
	width?: number; // Image width in pixels
	height?: number; // Image height in pixels
	thumbnail?: string; // Thumbnail URL for preview
}

/**
 * Job execution result
 */
export interface JobResult {
	outputs: Array<{
		parameterId?: string;
		type: "file" | "text";
		path?: string;
		content?: string;
		metadata?: Record<string, any>;
		// Output file metadata
		fileName?: string;
		fileType?: "text" | "image" | "video";
		fileSize?: number;
		workspacePath?: string; // Path in ~/Downloads/workspace/{jobId}/result/
	}>;
	summary?: string;

	// Source file cleanup tracking
	sourceFilesDeleted?: boolean;
	deletedSourceFiles?: string[];
	deletionErrors?: Array<{ path: string; error: string }>;

	// Text output content (for txt files)
	textOutputs?: Array<{
		fileName: string;
		filePath: string;
		content: {
			original: string;
			en?: string; // Translated to English
			zh?: string; // Translated to Chinese
		};
		autoTranslated?: boolean; // Track if translation was automatic
		translationError?: string; // Translation failures
	}>;
}

/**
 * Job - represents a single workflow execution
 */
export interface Job {
	id: string;
	workflowId: string;
	sourceWorkflowId?: string;
	workflowName: string;
	fileInputs: FileInputAssignment[];
	textInputs: Record<string, string>;
	status: JobStatus;
	taskId?: string; // Local task ID
	runninghubTaskId?: string; // RunningHub task ID (numeric string)
	startedAt?: number;
	completedAt?: number;
	queuedAt?: number;
	results?: JobResult;
	error?: string;
	createdAt: number;
	folderPath?: string;

	// Post-processing cleanup
	deleteSourceFiles: boolean; // Whether to delete source files after completion
	deletedSourceFiles?: string[]; // List of deleted source file paths (after completion)

	// Job series tracking (for job recreate feature)
	parentJobId?: string; // ID of job this was recreated from
	seriesId?: string; // Groups related jobs (auto-generated)
	runNumber?: number; // Position in series (1, 2, 3, ...)

	// Saved output tracking (Save to workspace actions)
	savedOutputPaths?: string[];

	// Complex workflow fields
	complexWorkflowId?: string;
	complexExecutionId?: string;
	stepNumber?: number;
	totalSteps?: number;
	isComplexWorkflowStep?: boolean;
	stepStatus?: "pending" | "running" | "completed" | "failed";
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * File validation result
 */
export interface FileValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Job validation result
 */
export interface JobValidationResult {
	valid: boolean;
	errors: string[];
}

// ============================================================================
// REQUEST/RESPONSE TYPES FOR NEW API
// ============================================================================

/**
 * Execute job request
 */
export interface ExecuteJobRequest {
	workflowId: string; // Actual workflow ID (for loading output config)
	sourceWorkflowId?: string; // Template ID (for CLI)
	workflowName: string; // Name of the workflow for display
	fileInputs: FileInputAssignment[]; // Full file assignment details
	textInputs: Record<string, string>;
	folderPath?: string;
	deleteSourceFiles: boolean;
	parentJobId?: string; // ID of job this was recreated from
	seriesId?: string; // Groups related jobs
}

/**
 * Execute job response
 */
export interface ExecuteJobResponse {
	success: boolean;
	taskId: string;
	jobId: string;
	message: string;
	error?: string;
}

/**
 * File metadata request
 */
export interface FileMetadataRequest {
	filePath: string;
}

/**
 * File metadata response
 */
export interface FileMetadataResponse {
	success: boolean;
	file: MediaFile;
	metadata: MediaFileDetail["metadata"];
	error?: string;
}

/**
 * File rename request
 */
export interface FileRenameRequest {
	oldPath: string;
	newName: string;
}

/**
 * File rename response
 */
export interface FileRenameResponse {
	success: boolean;
	newPath: string;
	error?: string;
}

/**
 * File delete request
 */
export interface FileDeleteRequest {
	paths: string[];
}

/**
 * File delete response
 */
export interface FileDeleteResponse {
	success: boolean;
	deletedCount: number;
	errors?: Array<{ path: string; error: string }>;
}

/**
 * Duck validation request
 */
export interface DuckValidateRequest {
	imagePath: string;
}

/**
 * Duck validation response
 */
export interface DuckValidateResponse {
	isDuckEncoded: boolean;
	requiresPassword: boolean;
	error?: string;
}

/**
 * Duck decode request
 */
export interface DuckDecodeRequest {
	duckImagePath: string;
	password?: string;
	outputPath?: string;
	jobId?: string;
}

/**
 * Duck decode response
 */
export interface DuckDecodeResponse {
	success: boolean;
	decodedFilePath: string;
	decodedFileType: string;
	fileSize: number;
	originalDuckImagePath: string;
	error?: string;
}

/**
 * File validation request
 */
export interface ValidateFileRequest {
	filePath: string;
	parameter: WorkflowInputParameter;
}

/**
 * File validation response
 */
export interface ValidateFileResponse {
	valid: boolean;
	error?: string;
}

// ============================================================================
// LOCAL WORKFLOW TYPES
// ============================================================================

export type LocalWorkflowOperationType =
	| "video-convert"
	| "video-fps-convert"
	| "video-clip"
	| "video-crop"
	| "image-resize"
	| "duck-decode"
	| "caption";

export type LocalWorkflowInput = {
	id: string;
	name: string;
	type: "local";
	operation: LocalWorkflowOperationType;
	config: Record<string, any>;
};

export type LocalWorkflow = {
	id: string;
	name: string;
	description?: string;
	inputs: LocalWorkflowInput[];
	output?: WorkflowOutput;
	createdAt: number;
	updatedAt: number;
};

export type SaveLocalWorkflowRequest = {
	workflow: LocalWorkflow;
};

export type SaveLocalWorkflowResponse = {
	success: boolean;
	workflowId?: string;
	error?: string;
};

export type ListLocalWorkflowResponse = {
	success: boolean;
	workflows: LocalWorkflow[];
	error?: string;
};

export type GetLocalWorkflowResponse = {
	success: boolean;
	workflow?: LocalWorkflow;
	error?: string;
};

// ============================================================================
// COMPLEX WORKFLOW TYPES
// ============================================================================

export interface ComplexWorkflow {
	id: string;
	name: string;
	description?: string;
	steps: WorkflowStep[];
	createdAt: number;
	updatedAt: number;
}

export interface WorkflowStep {
	id: string;
	stepNumber: number;
	workflowId: string;
	workflowName: string;
	parameters: StepParameterConfig[];
}

export interface StepParameterConfig {
	parameterId: string;
	parameterName: string;
	valueType: "static" | "dynamic" | "user-input" | "previous-input";
	staticValue?: string | number | boolean;
	required?: boolean;
	placeholder?: string;
	dynamicMapping?: {
		sourceStepNumber: number;
		sourceParameterId: string;
		sourceOutputName: string;
	};
	previousInputMapping?: {
		sourceStepNumber: number;
		sourceParameterId: string;
		sourceParameterName: string;
	};
}

export interface ComplexWorkflowExecution {
	id: string;
	complexWorkflowId: string;
	name: string;
	status: "pending" | "running" | "paused" | "completed" | "failed";
	currentStep: number;
	steps: ExecutionStep[];
	createdAt: number;
	startedAt?: number;
	completedAt?: number;
}

export interface ExecutionStep {
	stepNumber: number;
	workflowId: string;
	workflowName?: string;
	jobId: string;
	status: "pending" | "running" | "completed" | "failed";
	inputs: Record<string, any>;
	outputs?: JobResult;
	startedAt?: number;
	completedAt?: number;
}

export interface SaveComplexWorkflowRequest {
	workflow: ComplexWorkflow;
}

export interface SaveComplexWorkflowResponse {
	success: boolean;
	workflowId: string;
	error?: string;
}

export interface ExecuteComplexWorkflowRequest {
	complexWorkflowId: string;
	initialParameters?: Record<string, any>;
}

export interface ExecuteComplexWorkflowResponse {
	success: boolean;
	executionId: string;
	message: string;
	error?: string;
}

export interface ContinueComplexWorkflowRequest {
	executionId: string;
	stepNumber: number;
	parameters: Record<string, any>;
}

export interface ContinueComplexWorkflowResponse {
	success: boolean;
	message: string;
	jobId: string;
	error?: string;
}

export interface GetComplexWorkflowExecutionResponse {
	success: boolean;
	execution?: ComplexWorkflowExecution;
	error?: string;
}
