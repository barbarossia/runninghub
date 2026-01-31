import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
	AutoSaveDecodeSummary,
	BotDefinition,
	BotResult,
	BotRunState,
	BotType,
	JobStatusSummary,
} from '@/types/bot';

export type BotCenterDockMode = 'dock' | 'float';

type BotResultsMap = Record<string, BotResult | undefined>;
type BotRunStateMap = Record<string, BotRunState | undefined>;

interface BotCenterState {
	isOpen: boolean;
	dockMode: BotCenterDockMode;
	selectedBotId: string | null;
	bots: BotDefinition[];
	results: BotResultsMap;
	runStates: BotRunStateMap;

	setOpen: (open: boolean) => void;
	toggleOpen: () => void;
	setDockMode: (mode: BotCenterDockMode) => void;
	toggleDockMode: () => void;
	setSelectedBotId: (botId: string) => void;
	updateBot: (botId: string, updates: Partial<BotDefinition>) => void;
	addBot: (bot: BotDefinition) => void;
	removeBot: (botId: string) => void;
	resetBots: () => void;
	setJobStatusResult: (botId: string, result: JobStatusSummary) => void;
	setAutoSaveDecodeResult: (
		botId: string,
		result: AutoSaveDecodeSummary,
	) => void;
	setRunState: (botId: string, state: BotRunState) => void;
}

const defaultBots: BotDefinition[] = [
	{
		id: 'job-status-bot',
		name: 'Job Status Bot',
		description: 'Summarize recent job status and categories.',
		type: 'job-status',
		enabled: true,
		config: {
			recentLimit: 20,
			groupByWorkflow: true,
		},
	},
	{
		id: 'auto-save-decode-bot',
		name: 'Auto Save + Decode Bot',
		description: 'Save job outputs to workspace and auto-decode duck images.',
		type: 'auto-save-decode',
		enabled: true,
		config: {
			recentLimit: 10,
			onlyUnsaved: true,
			decodeEnabled: true,
		},
	},
];

const cloneDefaultBots = (): BotDefinition[] =>
	defaultBots.map((bot) => ({
		...bot,
		config: { ...bot.config },
	}));

const ensureBot = (bots: BotDefinition[], type: BotType): BotDefinition => {
	const found = bots.find((bot) => bot.type === type);
	if (found) return found;
	return cloneDefaultBots().find((bot) => bot.type === type)!;
};

const DEFAULT_BOT_IDS = new Set(defaultBots.map((bot) => bot.id));

export const useBotCenterStore = create<BotCenterState>()(
	persist(
		(set, get) => ({
			isOpen: false,
			dockMode: 'dock',
			selectedBotId: defaultBots[0].id,
			bots: cloneDefaultBots(),
			results: {},
			runStates: {},

			setOpen: (open) => set({ isOpen: open }),
			toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
			setDockMode: (mode) => set({ dockMode: mode }),
			toggleDockMode: () =>
				set((state) => ({
					dockMode: state.dockMode === 'dock' ? 'float' : 'dock',
				})),
			setSelectedBotId: (botId) => set({ selectedBotId: botId }),
			updateBot: (botId, updates) =>
				set((state) => ({
					bots: state.bots.map((bot) =>
						bot.id === botId ? { ...bot, ...updates } : bot,
					),
				})),
			addBot: (bot) =>
				set((state) => {
					if (state.bots.some((entry) => entry.id === bot.id)) {
						return state;
					}
					return { bots: [...state.bots, bot] };
				}),
			removeBot: (botId) =>
				set((state) => ({
					bots: state.bots.filter((bot) => bot.id !== botId),
				})),
			resetBots: () => set({ bots: cloneDefaultBots() }),
			setJobStatusResult: (botId, result) =>
				set((state) => ({
					results: {
						...state.results,
						[botId]: { ...state.results[botId], jobStatus: result },
					},
				})),
			setAutoSaveDecodeResult: (botId, result) =>
				set((state) => ({
					results: {
						...state.results,
						[botId]: { ...state.results[botId], autoSaveDecode: result },
					},
				})),
			setRunState: (botId, state) =>
				set((prev) => ({
					runStates: { ...prev.runStates, [botId]: state },
				})),
		}),
		{
			name: 'runninghub-bot-center',
			partialize: (state) => {
				const byId = new Map(state.bots.map((bot) => [bot.id, bot]));
				const defaults = cloneDefaultBots().map((bot) => byId.get(bot.id) || bot);
				const custom = state.bots.filter((bot) => !DEFAULT_BOT_IDS.has(bot.id));
				const mergedBots = [...defaults, ...custom];
				const selected = state.selectedBotId;

				return {
					isOpen: state.isOpen,
					dockMode: state.dockMode,
					selectedBotId:
						selected && mergedBots.some((bot) => bot.id === selected)
							? selected
							: defaultBots[0].id,
					bots: mergedBots,
				};
			},
			migrate: (persistedState: any) => {
				if (!persistedState) return persistedState;
				const bots = (Array.isArray(persistedState.bots)
					? persistedState.bots
					: cloneDefaultBots()) as BotDefinition[];
				const customBots = bots.filter((bot) => !DEFAULT_BOT_IDS.has(bot.id));
				return {
					...persistedState,
					bots: [
						ensureBot(bots, 'job-status'),
						ensureBot(bots, 'auto-save-decode'),
						...customBots,
					],
				};
			},
		},
	),
);
