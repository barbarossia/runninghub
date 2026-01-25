import { create } from "zustand";
import { ImageFile } from "@/types";

interface SelectionState {
	// Selection state
	selectedImages: Map<string, ImageFile>;
	lastSelectedImagePath: string | null;
	isAllSelected: boolean;

	// Range selection state
	rangeStartIndex: number | null;
	rangeEndIndex: number | null;

	// Actions
	selectImage: (image: ImageFile) => void;
	deselectImage: (imagePath: string) => void;
	toggleImage: (image: ImageFile) => void;
	selectAll: (images: ImageFile[]) => void;
	deselectAll: () => void;
	selectRange: (
		images: ImageFile[],
		startIndex: number,
		endIndex: number,
	) => void;

	// Batch actions
	addSelections: (images: ImageFile[]) => void;
	removeSelections: (imagePaths: string[]) => void;

	// Clear
	clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
	// Initial state
	selectedImages: new Map(),
	lastSelectedImagePath: null,
	isAllSelected: false,
	rangeStartIndex: null,
	rangeEndIndex: null,

	// Single image actions
	selectImage: (image) => {
		const state = get();
		const newSelected = new Map(state.selectedImages);
		newSelected.set(image.path, image);
		set({
			selectedImages: newSelected,
			lastSelectedImagePath: image.path,
			isAllSelected: false,
		});
	},

	deselectImage: (imagePath) => {
		const state = get();
		const newSelected = new Map(state.selectedImages);
		newSelected.delete(imagePath);
		set({
			selectedImages: newSelected,
			isAllSelected: false,
		});
	},

	toggleImage: (image) => {
		const state = get();
		const newSelected = new Map(state.selectedImages);

		if (newSelected.has(image.path)) {
			newSelected.delete(image.path);
		} else {
			newSelected.set(image.path, image);
		}

		set({
			selectedImages: newSelected,
			lastSelectedImagePath: image.path,
			isAllSelected: false,
		});
	},

	selectAll: (images) => {
		const newSelected = new Map<string, ImageFile>();
		images.forEach((img) => newSelected.set(img.path, img));
		set({
			selectedImages: newSelected,
			isAllSelected: images.length > 0,
		});
	},

	deselectAll: () => {
		set({
			selectedImages: new Map(),
			lastSelectedImagePath: null,
			isAllSelected: false,
			rangeStartIndex: null,
			rangeEndIndex: null,
		});
	},

	selectRange: (images, startIndex, endIndex) => {
		const start = Math.min(startIndex, endIndex);
		const end = Math.max(startIndex, endIndex);
		const newSelected = new Map<string, ImageFile>();

		for (let i = start; i <= end; i++) {
			if (images[i]) {
				newSelected.set(images[i].path, images[i]);
			}
		}

		set({
			selectedImages: newSelected,
			rangeStartIndex: startIndex,
			rangeEndIndex: endIndex,
		});
	},

	// Batch actions
	addSelections: (images) => {
		const state = get();
		const newSelected = new Map(state.selectedImages);
		images.forEach((img) => newSelected.set(img.path, img));
		set({ selectedImages: newSelected });
	},

	removeSelections: (imagePaths) => {
		const state = get();
		const newSelected = new Map(state.selectedImages);
		imagePaths.forEach((path) => newSelected.delete(path));
		set({
			selectedImages: newSelected,
			isAllSelected: false,
		});
	},

	// Clear
	clearSelection: () => {
		set({
			selectedImages: new Map(),
			lastSelectedImagePath: null,
			isAllSelected: false,
			rangeStartIndex: null,
			rangeEndIndex: null,
		});
	},
}));
