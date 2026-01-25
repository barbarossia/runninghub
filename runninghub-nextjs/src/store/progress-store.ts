import { create } from "zustand";
import { ProcessingTask } from "@/types";

interface ProgressState {
	// Active tasks
	tasks: Map<string, ProcessingTask>;
	activeTaskId: string | null;

	// UI state
	isProgressModalOpen: boolean;

	// Actions
	addTask: (task: ProcessingTask) => void;
	updateTask: (taskId: string, updates: Partial<ProcessingTask>) => void;
	removeTask: (taskId: string) => void;
	setActiveTask: (taskId: string | null) => void;

	// Modal actions
	openProgressModal: () => void;
	closeProgressModal: () => void;
	toggleProgressModal: () => void;

	// Task lifecycle
	startTask: (taskId: string) => void;
	completeTask: (taskId: string) => void;
	failTask: (taskId: string, error: string) => void;

	// Progress updates
	updateProgress: (
		taskId: string,
		progress: number,
		current_image?: string,
	) => void;
	addCompletedImage: (taskId: string, imagePath: string) => void;
	addFailedImage: (taskId: string, imagePath: string, error: string) => void;

	// Batch actions
	clearTasks: () => void;
	clearCompletedTasks: () => void;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
	// Initial state
	tasks: new Map(),
	activeTaskId: null,
	isProgressModalOpen: false,

	// Task management
	addTask: (task) => {
		const state = get();
		const newTasks = new Map(state.tasks);
		newTasks.set(task.task_id, task);
		set({ tasks: newTasks });
	},

	updateTask: (taskId, updates) => {
		const state = get();
		if (!state.tasks.has(taskId)) return;

		const newTasks = new Map(state.tasks);
		const existingTask = newTasks.get(taskId)!;
		newTasks.set(taskId, { ...existingTask, ...updates });
		set({ tasks: newTasks });
	},

	removeTask: (taskId) => {
		const state = get();
		const newTasks = new Map(state.tasks);
		newTasks.delete(taskId);

		// Update active task if needed
		let newActiveTaskId = state.activeTaskId;
		if (state.activeTaskId === taskId) {
			newActiveTaskId = null;
		}

		set({ tasks: newTasks, activeTaskId: newActiveTaskId });
	},

	setActiveTask: (taskId) => set({ activeTaskId: taskId }),

	// Modal actions
	openProgressModal: () => set({ isProgressModalOpen: true }),

	closeProgressModal: () => set({ isProgressModalOpen: false }),

	toggleProgressModal: () => {
		const state = get();
		set({ isProgressModalOpen: !state.isProgressModalOpen });
	},

	// Task lifecycle
	startTask: (taskId) => {
		const state = get();
		if (!state.tasks.has(taskId)) return;

		const newTasks = new Map(state.tasks);
		const task = newTasks.get(taskId)!;
		newTasks.set(taskId, { ...task, status: "processing" });
		set({ tasks: newTasks, activeTaskId: taskId });
	},

	completeTask: (taskId) => {
		const state = get();
		if (!state.tasks.has(taskId)) return;

		const newTasks = new Map(state.tasks);
		const task = newTasks.get(taskId)!;
		newTasks.set(taskId, { ...task, status: "completed", progress: 100 });
		set({ tasks: newTasks });
	},

	failTask: (taskId, error) => {
		const state = get();
		if (!state.tasks.has(taskId)) return;

		const newTasks = new Map(state.tasks);
		const task = newTasks.get(taskId)!;
		newTasks.set(taskId, {
			...task,
			status: "failed",
			progress: task.progress || 0,
		});
		set({ tasks: newTasks });
	},

	// Progress updates
	updateProgress: (taskId, progress, current_image) => {
		const state = get();
		if (!state.tasks.has(taskId)) return;

		const newTasks = new Map(state.tasks);
		const task = newTasks.get(taskId)!;
		newTasks.set(taskId, {
			...task,
			progress: Math.min(100, Math.max(0, progress)),
			current_image,
		});
		set({ tasks: newTasks });
	},

	addCompletedImage: (taskId, imagePath) => {
		const state = get();
		if (!state.tasks.has(taskId)) return;

		const newTasks = new Map(state.tasks);
		const task = newTasks.get(taskId)!;
		const completedImages = task.completed_images || [];
		newTasks.set(taskId, {
			...task,
			completed_images: [...completedImages, imagePath],
		});
		set({ tasks: newTasks });
	},

	addFailedImage: (taskId, imagePath, error) => {
		const state = get();
		if (!state.tasks.has(taskId)) return;

		const newTasks = new Map(state.tasks);
		const task = newTasks.get(taskId)!;
		const failedImages = task.failed_images || [];
		newTasks.set(taskId, {
			...task,
			failed_images: [...failedImages, { path: imagePath, error }],
		});
		set({ tasks: newTasks });
	},

	// Batch actions
	clearTasks: () => {
		set({
			tasks: new Map(),
			activeTaskId: null,
		});
	},

	clearCompletedTasks: () => {
		const state = get();
		const newTasks = new Map<string, ProcessingTask>();

		state.tasks.forEach((task, taskId) => {
			if (task.status !== "completed" && task.status !== "failed") {
				newTasks.set(taskId, task);
			}
		});

		set({ tasks: newTasks });
	},
}));
