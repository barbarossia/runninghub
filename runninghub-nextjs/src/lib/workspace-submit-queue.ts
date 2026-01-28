import fs from "fs/promises";
import path from "path";

export interface SubmitQueueItem {
	jobId: string;
	taskId: string;
	workflowId: string;
	enqueuedAt: number;
}

interface SubmitQueueState {
	activeCount: number;
	queue: SubmitQueueItem[];
}

const QUEUE_DIR = path.join(process.cwd(), ".next/cache");
const QUEUE_PATH = path.join(QUEUE_DIR, "runninghub-submit-queue.json");

let cachedState: SubmitQueueState | null = null;
let loadPromise: Promise<SubmitQueueState> | null = null;
let queueLock = Promise.resolve();

async function ensureDir() {
	await fs.mkdir(QUEUE_DIR, { recursive: true });
}

async function loadState(): Promise<SubmitQueueState> {
	if (cachedState) return cachedState;
	if (loadPromise) return loadPromise;

	loadPromise = (async () => {
		await ensureDir();
		try {
			const content = await fs.readFile(QUEUE_PATH, "utf-8");
			const parsed = JSON.parse(content) as SubmitQueueState;
			const normalized: SubmitQueueState = {
				activeCount: Math.max(0, parsed.activeCount || 0),
				queue: Array.isArray(parsed.queue) ? parsed.queue : [],
			};

			if (normalized.activeCount !== 0) {
				normalized.activeCount = 0;
				await fs.writeFile(QUEUE_PATH, JSON.stringify(normalized, null, 2));
			}

			cachedState = normalized;
			return normalized;
		} catch {
			const initial: SubmitQueueState = { activeCount: 0, queue: [] };
			await fs.writeFile(QUEUE_PATH, JSON.stringify(initial, null, 2));
			cachedState = initial;
			return initial;
		} finally {
			loadPromise = null;
		}
	})();

	return loadPromise;
}

async function saveState(nextState: SubmitQueueState) {
	cachedState = nextState;
	await fs.writeFile(QUEUE_PATH, JSON.stringify(nextState, null, 2));
}

async function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
	const next = queueLock.then(fn, fn);
	queueLock = next.then(
		() => undefined,
		() => undefined,
	);
	return next;
}

export async function enqueueJob(item: SubmitQueueItem): Promise<number> {
	return runExclusive(async () => {
		const state = await loadState();
		const existingIndex = state.queue.findIndex(
			queued => queued.jobId === item.jobId,
		);
		if (existingIndex >= 0) {
			return existingIndex + 1;
		}
		state.queue.push(item);
		await saveState(state);
		return state.queue.length;
	});
}

export async function tryAcquireSlot(limit: number): Promise<boolean> {
	return runExclusive(async () => {
		const state = await loadState();
		if (state.activeCount >= limit) {
			return false;
		}
		state.activeCount += 1;
		await saveState(state);
		return true;
	});
}

export async function takeNextQueued(
	limit: number,
): Promise<SubmitQueueItem | null> {
	return runExclusive(async () => {
		const state = await loadState();
		if (state.queue.length === 0 || state.activeCount >= limit) {
			return null;
		}
		const next = state.queue.shift() || null;
		if (next) {
			state.activeCount += 1;
			await saveState(state);
		}
		return next;
	});
}

export async function releaseSlot(): Promise<number> {
	return runExclusive(async () => {
		const state = await loadState();
		state.activeCount = Math.max(0, state.activeCount - 1);
		await saveState(state);
		return state.activeCount;
	});
}

export async function getQueueState(): Promise<SubmitQueueState> {
	return runExclusive(async () => {
		const state = await loadState();
		return {
			activeCount: state.activeCount,
			queue: [...state.queue],
		};
	});
}
