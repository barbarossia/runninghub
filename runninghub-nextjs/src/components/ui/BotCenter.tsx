'use client';

import { useMemo } from 'react';
import {
	Bot,
	Loader2,
	Minimize2,
	Pin,
	PinOff,
	RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBotCenterStore } from '@/store/bot-center-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useWorkspaceFolder } from '@/store/folder-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
	runAutoSaveDecodeBot,
	runJobStatusBot,
} from '@/utils/bots';
import type { AutoSaveDecodeBotConfig, JobStatusBotConfig } from '@/types/bot';

const formatTimestamp = (timestamp?: number): string => {
	if (!timestamp) return '—';
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(timestamp));
};

const statusBadgeClasses: Record<string, string> = {
	queued: 'text-amber-700 bg-amber-50 border-amber-200',
	pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
	running: 'text-blue-700 bg-blue-50 border-blue-200',
	completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
	failed: 'text-red-700 bg-red-50 border-red-200',
};

export function BotCenter() {
	const {
		isOpen,
		dockMode,
		selectedBotId,
		bots,
		results,
		runStates,
		setOpen,
		toggleOpen,
		toggleDockMode,
		setSelectedBotId,
		setJobStatusResult,
		setAutoSaveDecodeResult,
		setRunState,
	} = useBotCenterStore();
	const fetchJobs = useWorkspaceStore((state) => state.fetchJobs);
	const updateJob = useWorkspaceStore((state) => state.updateJob);
	const { selectedFolder: workspaceFolder } = useWorkspaceFolder();

	const selectedBot = useMemo(
		() => bots.find((bot) => bot.id === selectedBotId) || bots[0],
		[bots, selectedBotId],
	);

	const runBot = async (botId?: string) => {
		const latestBots = useBotCenterStore.getState().bots;
		const bot = latestBots.find((entry) => entry.id === botId);
		if (!bot) return;
		if (!bot.enabled) {
			toast.warning('This bot is disabled in the builder.');
			return;
		}

		setRunState(bot.id, { status: 'running', startedAt: Date.now() });
		try {
			await fetchJobs();
			const latestJobs = useWorkspaceStore.getState().jobs;

			if (bot.type === 'job-status') {
				const summary = runJobStatusBot(
					latestJobs,
					bot.config as JobStatusBotConfig,
				);
				setJobStatusResult(bot.id, summary);
			}

			if (bot.type === 'auto-save-decode') {
				if (!workspaceFolder?.folder_path) {
					throw new Error('Select a workspace folder first.');
				}
				const summary = await runAutoSaveDecodeBot({
					jobs: latestJobs,
					config: bot.config as AutoSaveDecodeBotConfig,
					workspaceFolderPath: workspaceFolder.folder_path,
					updateJob,
				});
				setAutoSaveDecodeResult(bot.id, summary);
			}

			setRunState(bot.id, { status: 'completed', lastRunAt: Date.now() });
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Bot failed to run';
			setRunState(bot.id, {
				status: 'error',
				lastRunAt: Date.now(),
				error: message,
			});
			toast.error(message);
		}
	};

	const handleSelectBot = async (botId: string) => {
		setSelectedBotId(botId);
		setOpen(true);
		await runBot(botId);
	};

	const containerClassName = cn(
		dockMode === 'dock' ? '' : 'fixed bottom-4 right-4 z-50',
	);

	const runState = selectedBot ? runStates[selectedBot.id] : undefined;
	const botResult = selectedBot ? results[selectedBot.id] : undefined;

	const renderJobStatusResult = () => {
		const summary = botResult?.jobStatus;
		if (!summary) {
			return (
				<div className='text-xs text-gray-500'>
					Select the bot to generate a summary.
				</div>
			);
		}

		const statusEntries = Object.entries(summary.statusCounts);
		return (
			<div className='grid gap-3 text-xs text-gray-600 lg:grid-cols-[220px,1fr]'>
				<div className='grid grid-cols-2 gap-2'>
					{statusEntries.map(([status, count]) => (
						<div
							key={status}
							className='rounded-md border border-gray-200 bg-white px-2 py-1'
						>
							<div className='text-[11px] text-gray-500'>{status}</div>
							<div className='text-sm font-semibold text-gray-800'>{count}</div>
						</div>
					))}
				</div>

				<div className='space-y-2'>
					<div className='text-xs font-semibold text-gray-700'>Recent jobs</div>
					<div className='grid gap-2 sm:grid-cols-2'>
						{summary.recentJobs.map((job) => (
							<div
								key={job.id}
								className='flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2 py-1'
							>
								<div className='min-w-0'>
									<div className='truncate text-xs font-semibold text-gray-800'>
										{job.workflowName}
									</div>
									<div className='text-[11px] text-gray-500'>
										{formatTimestamp(job.timestamp)}
									</div>
								</div>
								<Badge
									variant='secondary'
									className={cn(
										'capitalize border',
										statusBadgeClasses[job.status] || 'text-gray-600 bg-gray-50',
									)}
								>
									{job.status}
								</Badge>
							</div>
						))}
					</div>
				</div>

				{summary.byWorkflow && summary.byWorkflow.length > 0 && (
					<div className='space-y-2 lg:col-span-2'>
						<div className='text-xs font-semibold text-gray-700'>
							By workflow
						</div>
						{summary.byWorkflow.map((workflow) => (
							<div
								key={workflow.workflowName}
								className='rounded-md border border-gray-200 bg-white px-2 py-1'
							>
								<div className='text-xs font-semibold text-gray-800'>
									{workflow.workflowName}
								</div>
								<div className='flex flex-wrap gap-2 text-[11px] text-gray-500'>
									<span>Total: {workflow.total}</span>
									{Object.entries(workflow.statusCounts).map(
										([status, count]) => (
											<span
												key={`${workflow.workflowName}-${status}`}
												className={cn(
													'rounded-full border px-2 py-0.5 text-[10px] capitalize',
													statusBadgeClasses[status] ||
														'text-gray-600 bg-gray-50 border-gray-200',
												)}
											>
												{status}: {count}
											</span>
										),
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		);
	};

	const renderAutoSaveResult = () => {
		const summary = botResult?.autoSaveDecode;
		if (!summary) {
			return (
				<div className='text-xs text-gray-500'>
					Select the bot to run auto save + decode.
				</div>
			);
		}

		return (
			<div className='space-y-3 text-xs text-gray-600'>
				<div className='grid grid-cols-2 gap-2'>
					<div className='rounded-md border border-gray-200 bg-white px-2 py-1'>
						<div className='text-[11px] text-gray-500'>Processed</div>
						<div className='text-sm font-semibold text-gray-800'>
							{summary.processedOutputs}
						</div>
					</div>
					<div className='rounded-md border border-gray-200 bg-white px-2 py-1'>
						<div className='text-[11px] text-gray-500'>Saved</div>
						<div className='text-sm font-semibold text-gray-800'>
							{summary.savedOutputs}
						</div>
					</div>
					<div className='rounded-md border border-gray-200 bg-white px-2 py-1'>
						<div className='text-[11px] text-gray-500'>Decoded</div>
						<div className='text-sm font-semibold text-gray-800'>
							{summary.decodedOutputs}
						</div>
					</div>
					<div className='rounded-md border border-gray-200 bg-white px-2 py-1'>
						<div className='text-[11px] text-gray-500'>Skipped</div>
						<div className='text-sm font-semibold text-gray-800'>
							{summary.skippedOutputs}
						</div>
					</div>
				</div>
				{summary.errors.length > 0 && (
					<div className='space-y-1'>
						<div className='text-xs font-semibold text-red-600'>Errors</div>
						{summary.errors.map((error, index) => (
							<div
								key={`${error.jobId || 'bot'}-${index}`}
								className='rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-600'
							>
								{error.message}
							</div>
						))}
					</div>
				)}
			</div>
		);
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className={containerClassName}>
			<Card className='w-[720px] border border-blue-100 bg-white/95 shadow-lg backdrop-blur'>
				<div className='flex items-center justify-between border-b border-blue-100 px-3 py-2'>
					<div className='flex items-center gap-2 text-sm font-semibold text-gray-800'>
						<Bot className='h-4 w-4 text-blue-600' />
						Bot Center
					</div>
					<div className='flex items-center gap-1'>
						<Button
							variant='ghost'
							size='icon'
							className='h-7 w-7'
							onClick={toggleDockMode}
							title={dockMode === 'dock' ? 'Float' : 'Dock'}
						>
							{dockMode === 'dock' ? (
								<PinOff className='h-3.5 w-3.5' />
							) : (
								<Pin className='h-3.5 w-3.5' />
							)}
						</Button>
						<Button
							variant='ghost'
							size='icon'
							className='h-7 w-7'
							onClick={toggleOpen}
							title='Minimize'
						>
							<Minimize2 className='h-3.5 w-3.5' />
						</Button>
					</div>
				</div>
				<div className='max-h-[520px] space-y-3 overflow-y-auto px-3 py-3 text-xs text-gray-600'>
					<Select
						value={selectedBot?.id}
						onValueChange={(value) => handleSelectBot(value)}
					>
						<SelectTrigger className='w-full'>
							<SelectValue placeholder='Select a bot' />
						</SelectTrigger>
						<SelectContent>
							{bots.map((bot) => (
								<SelectItem key={bot.id} value={bot.id}>
									{bot.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<div className='flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2 py-2'>
						<div className='min-w-0'>
							<div className='truncate text-sm font-semibold text-gray-800'>
								{selectedBot?.name}
							</div>
							<div className='text-[11px] text-gray-500'>
								{selectedBot?.description}
							</div>
							{runState?.status === 'running' && (
								<div className='text-[11px] text-gray-400'>
									Started: {formatTimestamp(runState.startedAt)}
								</div>
							)}
							{(runState?.status === 'completed' ||
								runState?.status === 'error') && (
								<div className='text-[11px] text-gray-400'>
									Last run: {formatTimestamp(runState.lastRunAt)}
								</div>
							)}
						</div>
						<Button
							variant='ghost'
							size='icon'
							className='h-8 w-8'
							onClick={() => runBot(selectedBot?.id)}
							disabled={runState?.status === 'running'}
							title='Run bot'
						>
							{runState?.status === 'running' ? (
								<Loader2 className='h-4 w-4 animate-spin' />
							) : (
								<RefreshCw className='h-4 w-4' />
							)}
						</Button>
					</div>

					{selectedBot?.type === 'job-status' && renderJobStatusResult()}
					{selectedBot?.type === 'auto-save-decode' && renderAutoSaveResult()}

				</div>
			</Card>
		</div>
	);
}
