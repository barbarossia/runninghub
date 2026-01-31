import type {
	AutoSaveDecodeBotConfig,
	AutoSaveDecodeSummary,
	JobStatusBotConfig,
	JobStatusSummary,
} from '@/types/bot';
import type { Job } from '@/types/workspace';

const getJobTimestamp = (job: Job): number => {
	return job.completedAt || job.startedAt || job.queuedAt || job.createdAt;
};

const getOutputPath = (output: {
	path?: string;
	workspacePath?: string;
}): string => {
	return output.path || output.workspacePath || '';
};

const isImagePath = (filePath: string): boolean => {
	const ext = filePath.split('.').pop()?.toLowerCase();
	if (!ext) return false;
	return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext);
};

const isVideoPath = (filePath: string): boolean => {
	const ext = filePath.split('.').pop()?.toLowerCase();
	if (!ext) return false;
	return ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext);
};

export const runJobStatusBot = (
	jobs: Job[],
	config: JobStatusBotConfig,
): JobStatusSummary => {
	const statusCounts: Record<string, number> = {};
	const workflowMap = new Map<
		string,
		{ total: number; statusCounts: Record<string, number> }
	>();

	const recentJobs = [...jobs]
		.sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a))
		.slice(0, Math.max(1, config.recentLimit));

	recentJobs.forEach((job) => {
		statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
		if (config.groupByWorkflow) {
			const workflowName = job.workflowName || job.workflowId;
			const entry = workflowMap.get(workflowName) || {
				total: 0,
				statusCounts: {},
			};
			entry.total += 1;
			entry.statusCounts[job.status] = (entry.statusCounts[job.status] || 0) + 1;
			workflowMap.set(workflowName, entry);
		}
	});

	const recentJobSummaries = recentJobs.map((job) => ({
		id: job.id,
		workflowName: job.workflowName || job.workflowId,
		status: job.status,
		timestamp: getJobTimestamp(job),
	}));

	return {
		statusCounts,
		byWorkflow: config.groupByWorkflow
			? Array.from(workflowMap.entries()).map(([workflowName, summary]) => ({
					workflowName,
					total: summary.total,
					statusCounts: summary.statusCounts,
				}))
			: undefined,
		recentJobs: recentJobSummaries,
	};
};

export const runAutoSaveDecodeBot = async ({
	jobs,
	config,
	workspaceFolderPath,
	updateJob,
}: {
	jobs: Job[];
	config: AutoSaveDecodeBotConfig;
	workspaceFolderPath: string;
	updateJob: (jobId: string, updates: Partial<Job>) => void;
}): Promise<AutoSaveDecodeSummary> => {
	const summary: AutoSaveDecodeSummary = {
		processedOutputs: 0,
		savedOutputs: 0,
		decodedOutputs: 0,
		skippedOutputs: 0,
		errors: [],
	};

	let completedJobs = jobs.filter((job) => job.status === 'completed');

	if (config.workflowFilter) {
		const filters = config.workflowFilter
			.split(',')
			.map((f) => f.trim().toLowerCase())
			.filter((f) => f.length > 0);

		if (filters.length > 0) {
			completedJobs = completedJobs.filter((job) => {
				const name = (job.workflowName || '').toLowerCase();
				const id = (job.workflowId || '').toLowerCase();
				return filters.some((f) => name.includes(f) || id.includes(f));
			});
		}
	}

	completedJobs = completedJobs
		.sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a))
		.slice(0, Math.max(1, config.recentLimit));

	for (const job of completedJobs) {
		const outputs = job.results?.outputs || [];
		for (const output of outputs) {
			if (output.type === 'text' || output.fileType === 'text') {
				continue;
			}
			const outputPath = getOutputPath(output);
			if (!outputPath) {
				summary.skippedOutputs += 1;
				continue;
			}
			const isMedia =
				output.fileType === 'image' ||
				output.fileType === 'video' ||
				isImagePath(outputPath) ||
				isVideoPath(outputPath);
			if (!isMedia) {
				continue;
			}

			const savedOutputPaths = job.savedOutputPaths || [];
			if (config.onlyUnsaved && savedOutputPaths.includes(outputPath)) {
				summary.skippedOutputs += 1;
				continue;
			}

			summary.processedOutputs += 1;

			let sourcePath = outputPath;
			try {
				if (config.decodeEnabled && isImagePath(outputPath)) {
					const validateRes = await fetch('/api/workspace/duck-validate', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ imagePath: outputPath }),
					});
					const validateData = await validateRes.json();
					if (!validateRes.ok) {
						throw new Error(validateData.error || 'Duck validate failed');
					}
					if (validateData.isDuckEncoded) {
						if (validateData.requiresPassword) {
							summary.errors.push({
								message: 'Duck decode requires password',
								jobId: job.id,
								outputPath,
							});
							summary.skippedOutputs += 1;
							continue;
						}
						const decodeRes = await fetch('/api/workspace/duck-decode', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ duckImagePath: outputPath, jobId: job.id }),
						});
						const decodeData = await decodeRes.json();
						if (!decodeRes.ok || !decodeData.success) {
							throw new Error(decodeData.error || 'Duck decode failed');
						}
						if (decodeData.decodedFilePath) {
							sourcePath = decodeData.decodedFilePath as string;
							summary.decodedOutputs += 1;
						}
					}
				}

				const copyRes = await fetch('/api/workspace/copy-to-folder', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						sourcePath,
						targetFolder: workspaceFolderPath,
						fileName: sourcePath.split(/[/\\]/).pop(),
						jobId: job.id,
						jobOutputPath: sourcePath,
					}),
				});
				const copyData = await copyRes.json();
				if (!copyRes.ok || !copyData.success) {
					throw new Error(copyData.error || 'Copy to workspace failed');
				}

				summary.savedOutputs += 1;

				const nextSavedOutputPaths = job.savedOutputPaths || [];
				if (!nextSavedOutputPaths.includes(sourcePath)) {
					updateJob(job.id, {
						savedOutputPaths: [...nextSavedOutputPaths, sourcePath],
					});
				}
			} catch (error) {
				summary.errors.push({
					message: error instanceof Error ? error.message : 'Bot failed',
					jobId: job.id,
					outputPath,
				});
			}
		}
	}

	return summary;
};
