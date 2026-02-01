export type BotType = 'job-status' | 'auto-save-decode';

export type JobStatusBotConfig = {
	recentLimit: number;
	groupByWorkflow: boolean;
};

export type AutoSaveDecodeBotConfig = {
	recentLimit: number;
	onlyUnsaved: boolean;
	decodeEnabled: boolean;
	workflowFilter?: string;
};

export type BotConfig = JobStatusBotConfig | AutoSaveDecodeBotConfig;

export type BotDefinition = {
	id: string;
	name: string;
	description?: string;
	type: BotType;
	enabled: boolean;
	config: BotConfig;
};

export type JobStatusSummary = {
	statusCounts: Record<string, number>;
	byWorkflow?: Array<{
		workflowName: string;
		total: number;
		statusCounts: Record<string, number>;
	}>;
	recentJobs: Array<{
		id: string;
		workflowName: string;
		status: string;
		timestamp?: number;
	}>;
};

export type AutoSaveDecodeSummary = {
	processedOutputs: number;
	savedOutputs: number;
	decodedOutputs: number;
	skippedOutputs: number;
	errors: Array<{ message: string; jobId?: string; outputPath?: string }>;
};

export type BotRunState =
	| {
			status: 'idle';
			lastRunAt?: number;
	  }
	| {
			status: 'running';
			startedAt: number;
	  }
	| {
			status: 'completed';
			lastRunAt: number;
	  }
	| {
			status: 'error';
			lastRunAt: number;
			error: string;
	  };

export type BotResult = {
	jobStatus?: JobStatusSummary;
	autoSaveDecode?: AutoSaveDecodeSummary;
};
