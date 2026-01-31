'use client';

import { useEffect, useState } from 'react';
import { Bot, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBotCenterStore } from '@/store/bot-center-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type {
	AutoSaveDecodeBotConfig,
	BotDefinition,
	BotType,
	JobStatusBotConfig,
} from '@/types/bot';

const DEFAULT_BOT_IDS = new Set(['job-status-bot', 'auto-save-decode-bot']);

const typeLabels: Record<BotType, string> = {
	'job-status': 'Job Status',
	'auto-save-decode': 'Auto Save + Decode',
};

const defaultConfigForType = (type: BotType): JobStatusBotConfig | AutoSaveDecodeBotConfig => {
	if (type === 'auto-save-decode') {
		return {
			recentLimit: 10,
			onlyUnsaved: true,
			decodeEnabled: true,
		};
	}
	return {
		recentLimit: 20,
		groupByWorkflow: true,
	};
};

const createBotId = () =>
	`bot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function BotBuilderTab() {
	const { bots, addBot, updateBot, removeBot, resetBots } = useBotCenterStore();
	const [drafts, setDrafts] = useState<Record<string, BotDefinition>>({});
	const [dirtyBots, setDirtyBots] = useState<Set<string>>(new Set());
	const [newBotName, setNewBotName] = useState('');
	const [newBotType, setNewBotType] = useState<BotType>('job-status');
	const [newBotDescription, setNewBotDescription] = useState('');

	useEffect(() => {
		setDrafts((prev) => {
			const next: Record<string, BotDefinition> = { ...prev };
			const botIds = new Set(bots.map((bot) => bot.id));
			bots.forEach((bot) => {
				if (!next[bot.id]) {
					next[bot.id] = { ...bot, config: { ...bot.config } };
				}
			});
			Object.keys(next).forEach((botId) => {
				if (!botIds.has(botId)) {
					delete next[botId];
				}
			});
			return next;
		});
		setDirtyBots((prev) => {
			const next = new Set(prev);
			const botIds = new Set(bots.map((bot) => bot.id));
			Array.from(next).forEach((botId) => {
				if (!botIds.has(botId)) {
					next.delete(botId);
				}
			});
			return next;
		});
	}, [bots]);

	const updateDraft = (botId: string, updates: Partial<BotDefinition>) => {
		setDrafts((prev) => ({
			...prev,
			[botId]: { ...prev[botId], ...updates },
		}));
		setDirtyBots((prev) => new Set(prev).add(botId));
	};

	const updateDraftConfig = (botId: string, configUpdates: Record<string, any>) => {
		setDrafts((prev) => ({
			...prev,
			[botId]: {
				...prev[botId],
				config: {
					...prev[botId].config,
					...configUpdates,
				},
			},
		}));
		setDirtyBots((prev) => new Set(prev).add(botId));
	};

	const handleSave = (botId: string) => {
		const draft = drafts[botId];
		if (!draft) return;
		updateBot(botId, draft);
		setDirtyBots((prev) => {
			const next = new Set(prev);
			next.delete(botId);
			return next;
		});
		toast.success('Bot settings saved');
	};

	const handleSaveAll = () => {
		Array.from(dirtyBots).forEach((botId) => {
			const draft = drafts[botId];
			if (draft) {
				updateBot(botId, draft);
			}
		});
		setDirtyBots(new Set());
		toast.success('All bot settings saved');
	};

	const handleCreateBot = () => {
		const trimmedName = newBotName.trim();
		if (!trimmedName) return;

		const bot: BotDefinition = {
			id: createBotId(),
			name: trimmedName,
			description: newBotDescription.trim() || undefined,
			type: newBotType,
			enabled: true,
			config: defaultConfigForType(newBotType),
		};

		addBot(bot);
		setNewBotName('');
		setNewBotDescription('');
		setNewBotType('job-status');
	};

	return (
		<div className='space-y-6'>
			<Card className='border border-blue-100 bg-white/95 p-4 shadow-sm'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2 text-sm font-semibold text-gray-800'>
						<Bot className='h-4 w-4 text-blue-600' />
						Bot Builder
					</div>
				</div>

				<div className='mt-3 flex flex-wrap items-center gap-2'>
					<Button
						variant='outline'
						size='sm'
						className='gap-2 text-xs'
						disabled={dirtyBots.size === 0}
						onClick={handleSaveAll}
					>
						<Save className='h-3.5 w-3.5' />
						Save All
					</Button>
					<Button
						variant='ghost'
						size='sm'
						onClick={() => {
							resetBots();
							setDirtyBots(new Set());
							setDrafts({});
						}}
					>
						Reset defaults
					</Button>
				</div>

				<div className='mt-4 grid gap-3 lg:grid-cols-[1.5fr,1fr,2fr,auto]'>
					<div className='space-y-1'>
						<label className='text-[11px] text-gray-500'>Bot name</label>
						<Input
							value={newBotName}
							onChange={(event) => setNewBotName(event.target.value)}
							placeholder='New bot name'
						/>
					</div>
					<div className='space-y-1'>
						<label className='text-[11px] text-gray-500'>Type</label>
						<Select value={newBotType} onValueChange={(value) => setNewBotType(value as BotType)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='job-status'>Job Status</SelectItem>
								<SelectItem value='auto-save-decode'>Auto Save + Decode</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className='space-y-1'>
						<label className='text-[11px] text-gray-500'>Description</label>
						<Input
							value={newBotDescription}
							onChange={(event) => setNewBotDescription(event.target.value)}
							placeholder='What does this bot do?'
						/>
					</div>
					<div className='flex items-end'>
						<Button className='gap-2' onClick={handleCreateBot}>
							<Plus className='h-4 w-4' />
							Add Bot
						</Button>
					</div>
				</div>
			</Card>

			<div className='space-y-4'>
				{bots.map((bot) => {
					const draft = drafts[bot.id] || bot;
					const isDirty = dirtyBots.has(bot.id);
					return (
						<Card key={bot.id} className='border border-gray-200 p-4'>
							<div className='flex flex-wrap items-center justify-between gap-3'>
								<div className='min-w-0'>
									<div className='text-sm font-semibold text-gray-800'>
										{draft.name}
									</div>
									<div className='text-[11px] text-gray-500'>
										{typeLabels[bot.type]}{' '}
										{draft.description ? `• ${draft.description}` : ''}
									</div>
								</div>
								<div className='flex items-center gap-3'>
									{isDirty && (
										<Badge variant='outline' className='text-[10px]'>
											Unsaved
										</Badge>
									)}
									<div className='flex items-center gap-2 text-[11px] text-gray-500'>
										Enabled
										<Switch
											checked={draft.enabled}
											onCheckedChange={(value) =>
												updateDraft(bot.id, { enabled: value })
											}
										/>
									</div>
									<Button
										variant='outline'
										size='sm'
										className='gap-2 text-xs'
										disabled={!isDirty}
										onClick={() => handleSave(bot.id)}
									>
										<Save className='h-3.5 w-3.5' />
										Save
									</Button>
									{!DEFAULT_BOT_IDS.has(bot.id) && (
										<Button
											variant='ghost'
											size='icon'
											onClick={() => removeBot(bot.id)}
											title='Delete bot'
										>
											<Trash2 className='h-4 w-4 text-red-600' />
										</Button>
									)}
								</div>
							</div>

							<div className='mt-4 grid gap-3 lg:grid-cols-2'>
								<div className='space-y-1'>
									<label className='text-[11px] text-gray-500'>Name</label>
									<Input
										value={draft.name}
										onChange={(event) =>
											updateDraft(bot.id, { name: event.target.value })
										}
									/>
								</div>
								<div className='space-y-1'>
									<label className='text-[11px] text-gray-500'>
										Description
									</label>
									<Input
										value={draft.description || ''}
										onChange={(event) =>
											updateDraft(bot.id, { description: event.target.value })
										}
									/>
								</div>
							</div>

							{bot.type === 'job-status' && (
								<div className='mt-4 grid gap-3 lg:grid-cols-2'>
									<div className='space-y-1'>
										<label className='text-[11px] text-gray-500'>
											Recent jobs limit
										</label>
										<Input
											type='number'
											min={1}
											value={(draft.config as JobStatusBotConfig).recentLimit}
											onChange={(event) =>
												updateDraftConfig(bot.id, {
													recentLimit: Math.max(
														1,
														Number(event.target.value) || 1,
													),
												})
											}
										/>
									</div>
									<div className='flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600'>
										Group by workflow
										<Switch
											checked={
												(draft.config as JobStatusBotConfig).groupByWorkflow
											}
											onCheckedChange={(value) =>
												updateDraftConfig(bot.id, { groupByWorkflow: value })
											}
										/>
									</div>
								</div>
							)}

							{bot.type === 'auto-save-decode' && (
								<div className='mt-4 grid gap-3 lg:grid-cols-3'>
									<div className='space-y-1'>
										<label className='text-[11px] text-gray-500'>
											Recent jobs limit
										</label>
										<Input
											type='number'
											min={1}
											value={
												(draft.config as AutoSaveDecodeBotConfig).recentLimit
											}
											onChange={(event) =>
												updateDraftConfig(bot.id, {
													recentLimit: Math.max(
														1,
														Number(event.target.value) || 1,
													),
												})
											}
										/>
									</div>
									<div className='flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600'>
										Only unsaved outputs
										<Switch
											checked={
												(draft.config as AutoSaveDecodeBotConfig).onlyUnsaved
											}
											onCheckedChange={(value) =>
												updateDraftConfig(bot.id, { onlyUnsaved: value })
											}
										/>
									</div>
									<div className='flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600'>
										Auto-decode
										<Switch
											checked={
												(draft.config as AutoSaveDecodeBotConfig).decodeEnabled
											}
											onCheckedChange={(value) =>
												updateDraftConfig(bot.id, { decodeEnabled: value })
											}
										/>
									</div>
								</div>
							)}
						</Card>
					);
				})}
			</div>
		</div>
	);
}
