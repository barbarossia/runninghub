'use client';

import { useMemo, useState } from 'react';
import {
	CheckCircle2,
	Clock,
	Filter,
	Loader2,
	RefreshCw,
	XCircle,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { runJobStatusBot } from '@/utils/bots';
import type { Job, JobStatus } from '@/types/workspace';

const STATUS_OPTIONS: Array<{ value: JobStatus; label: string }> = [
	{ value: 'queued', label: 'Queued' },
	{ value: 'pending', label: 'Pending' },
	{ value: 'running', label: 'Running' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'failed', label: 'Failed' },
];

const statusBadgeClasses: Record<JobStatus, string> = {
	queued: 'text-amber-700 bg-amber-50 border-amber-200',
	pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
	running: 'text-blue-700 bg-blue-50 border-blue-200',
	completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
	failed: 'text-red-700 bg-red-50 border-red-200',
};

const formatTimestamp = (timestamp?: number): string => {
	if (!timestamp) return '—';
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(timestamp));
};

const getJobTimestamp = (job: Job): number =>
	job.completedAt || job.startedAt || job.queuedAt || job.createdAt;

export function BotTab() {
	const jobs = useWorkspaceStore((state) => state.jobs);
	const fetchJobs = useWorkspaceStore((state) => state.fetchJobs);
	const [recentLimit, setRecentLimit] = useState(20);
	const [selectedStatuses, setSelectedStatuses] = useState<Set<JobStatus>>(
		new Set(),
	);
	const [selectedWorkflows, setSelectedWorkflows] = useState<Set<string>>(
		new Set(),
	);
	const [isRunning, setIsRunning] = useState(false);
	const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
	const [summary, setSummary] = useState(() =>
		runJobStatusBot([], { recentLimit: 20, groupByWorkflow: true }),
	);

	const workflowOptions = useMemo(() => {
		const names = new Set(
			jobs.map((job) => job.workflowName || job.workflowId),
		);
		return Array.from(names).sort();
	}, [jobs]);

	const toggleStatus = (status: JobStatus, checked: boolean) => {
		setSelectedStatuses((prev) => {
			const next = new Set(prev);
			if (checked) {
				next.add(status);
			} else {
				next.delete(status);
			}
			return next;
		});
	};

	const toggleWorkflow = (workflow: string, checked: boolean) => {
		setSelectedWorkflows((prev) => {
			const next = new Set(prev);
			if (checked) {
				next.add(workflow);
			} else {
				next.delete(workflow);
			}
			return next;
		});
	};

	const handleRun = async () => {
		setIsRunning(true);
		try {
			await fetchJobs();
			const latestJobs = useWorkspaceStore.getState().jobs;
			const statusFilterActive = selectedStatuses.size > 0;
			const workflowFilterActive = selectedWorkflows.size > 0;

			const filtered = latestJobs
				.filter((job) => {
					if (statusFilterActive && !selectedStatuses.has(job.status)) {
						return false;
					}
					const workflowName = job.workflowName || job.workflowId;
					if (workflowFilterActive && !selectedWorkflows.has(workflowName)) {
						return false;
					}
					return true;
				})
				.sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a))
				.slice(0, Math.max(1, recentLimit));

			setFilteredJobs(filtered);
			setSummary(
				runJobStatusBot(filtered, {
					recentLimit: Math.max(1, recentLimit),
					groupByWorkflow: true,
				}),
			);
		} finally {
			setIsRunning(false);
		}
	};

	return (
		<div className='grid grid-cols-1 gap-6 lg:grid-cols-[320px,1fr]'>
			<Card className='border border-blue-100 bg-white/95 p-4 shadow-sm'>
				<div className='flex items-center gap-2 text-sm font-semibold text-gray-800'>
					<Filter className='h-4 w-4 text-blue-600' />
					Bot Controls
				</div>

				<div className='mt-4 space-y-4 text-xs text-gray-600'>
					<div className='space-y-2'>
						<label className='text-[11px] text-gray-500'>Recent jobs</label>
						<Input
							type='number'
							min={1}
							value={recentLimit}
							onChange={(event) =>
								setRecentLimit(Math.max(1, Number(event.target.value) || 1))
							}
						/>
					</div>

					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<span className='text-[11px] text-gray-500'>Status filter</span>
							<Button
								variant='ghost'
								size='sm'
								className='text-[11px]'
								onClick={() => setSelectedStatuses(new Set())}
							>
								Clear
							</Button>
						</div>
						<div className='space-y-2'>
							{STATUS_OPTIONS.map((status) => (
								<label
									key={status.value}
									className='flex items-center gap-2 text-xs'
								>
									<Checkbox
										checked={selectedStatuses.has(status.value)}
										onCheckedChange={(checked) =>
											toggleStatus(status.value, checked === true)
										}
									/>
									<span className='text-gray-700'>{status.label}</span>
								</label>
							))}
						</div>
					</div>

					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<span className='text-[11px] text-gray-500'>Workflow filter</span>
							<Button
								variant='ghost'
								size='sm'
								className='text-[11px]'
								onClick={() => setSelectedWorkflows(new Set())}
							>
								Clear
							</Button>
						</div>
						<div className='max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-white p-2'>
							{workflowOptions.length === 0 && (
								<div className='text-[11px] text-gray-500'>
									No workflows yet.
								</div>
							)}
							{workflowOptions.map((workflow) => (
								<label
									key={workflow}
									className='flex items-center gap-2 text-xs'
								>
									<Checkbox
										checked={selectedWorkflows.has(workflow)}
										onCheckedChange={(checked) =>
											toggleWorkflow(workflow, checked === true)
										}
									/>
									<span className='truncate text-gray-700'>{workflow}</span>
								</label>
							))}
						</div>
					</div>

					<Button
						className='w-full gap-2'
						onClick={handleRun}
						disabled={isRunning}
					>
						{isRunning ? (
							<Loader2 className='h-4 w-4 animate-spin' />
						) : (
							<RefreshCw className='h-4 w-4' />
						)}
						Run Bot
					</Button>
				</div>
			</Card>

			<div className='space-y-6'>
				<Card className='border border-blue-100 bg-white/95 p-4 shadow-sm'>
					<div className='flex items-center gap-2 text-sm font-semibold text-gray-800'>
						<Clock className='h-4 w-4 text-blue-600' />
						Job Status Summary
					</div>
					<div className='mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600'>
						{STATUS_OPTIONS.map((status) => (
							<div
								key={status.value}
								className='rounded-md border border-gray-200 bg-white px-2 py-2'
							>
								<div className='text-[11px] text-gray-500 capitalize'>
									{status.label}
								</div>
								<div className='text-base font-semibold text-gray-800'>
									{summary.statusCounts[status.value] || 0}
								</div>
							</div>
						))}
					</div>
				</Card>

				<Card className='border border-blue-100 bg-white/95 p-4 shadow-sm'>
					<div className='flex items-center justify-between'>
						<div className='text-sm font-semibold text-gray-800'>
							Job Details
						</div>
						<div className='text-xs text-gray-500'>
							Showing {filteredJobs.length} job
							{filteredJobs.length === 1 ? '' : 's'}
						</div>
					</div>
					<div className='mt-4 space-y-3'>
						{filteredJobs.length === 0 && (
							<div className='rounded-md border border-dashed border-gray-200 p-4 text-center text-xs text-gray-500'>
								Run the bot to load detailed jobs.
							</div>
						)}
						{filteredJobs.map((job) => (
							<Card key={job.id} className='border border-gray-200 p-3'>
								<div className='flex flex-wrap items-center justify-between gap-2'>
									<div className='min-w-0'>
										<div className='truncate text-sm font-semibold text-gray-800'>
											{job.workflowName}
										</div>
										<div className='text-[11px] text-gray-500'>
											Job ID: <span className='font-mono'>{job.id}</span>
										</div>
									</div>
									<Badge
										variant='secondary'
										className={cn(
											'capitalize border',
											statusBadgeClasses[job.status],
										)}
									>
										{job.status}
									</Badge>
								</div>

								<div className='mt-2 grid gap-2 text-[11px] text-gray-500 sm:grid-cols-3'>
									<div>Created: {formatTimestamp(job.createdAt)}</div>
									<div>Started: {formatTimestamp(job.startedAt)}</div>
									<div>Completed: {formatTimestamp(job.completedAt)}</div>
								</div>

								<div className='mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500'>
									<span>{job.fileInputs.length} file inputs</span>
									<span>{Object.keys(job.textInputs || {}).length} text inputs</span>
									{job.deleteSourceFiles && (
										<span className='text-amber-600'>Source files deleted</span>
									)}
								</div>

								{job.results?.outputs && job.results.outputs.length > 0 ? (
									<div className='mt-3 space-y-2 text-[11px] text-gray-600'>
										<div className='text-xs font-semibold text-gray-700'>
											Outputs
										</div>
										<div className='space-y-1'>
											{job.results.outputs.map((output, index) => (
												<div
													key={`${job.id}-output-${index}`}
													className='flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1'
												>
													<div className='min-w-0 truncate'>
														{output.fileName ||
															output.path ||
															output.workspacePath ||
															'Output'}
													</div>
													<div className='flex items-center gap-2'>
														{output.fileType && (
															<Badge variant='outline' className='text-[10px]'>
																{output.fileType}
															</Badge>
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								) : (
									<div className='mt-3 text-[11px] text-gray-500'>
										No outputs available.
									</div>
								)}

								{job.error && job.status === 'failed' && (
									<div className='mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-600'>
										<XCircle className='h-3.5 w-3.5' />
										<span className='truncate'>{job.error}</span>
									</div>
								)}

								{job.status === 'completed' && (
									<div className='mt-3 flex items-center gap-2 text-[11px] text-emerald-600'>
										<CheckCircle2 className='h-3.5 w-3.5' />
										Completed
									</div>
								)}
							</Card>
						))}
					</div>
				</Card>
			</div>
		</div>
	);
}
