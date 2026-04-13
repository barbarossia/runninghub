/// <reference types="jest" />

import { useFolderStore } from "../folder-store";

describe("folder-store persistence", () => {
	it("persists only lightweight folder state", () => {
		const state = useFolderStore.getState();

		state.setSelectedFolder("workspace", {
			success: true,
			folder_name: "Downloads",
			folder_path: "/Users/barbarossia/Downloads",
			message: "Folder selected",
		});

		state.setFolderContents("workspace", {
			current_path: "/Users/barbarossia/Downloads",
			parent_path: "/Users/barbarossia",
			folders: [],
			images: [
				{
					name: "huge-image.png",
					path: "/Users/barbarossia/Downloads/huge-image.png",
					size: 123,
					type: "image",
					extension: ".png",
				},
			],
			videos: [
				{
					name: "huge-video.mp4",
					path: "/Users/barbarossia/Downloads/huge-video.mp4",
					size: 456,
					type: "video",
					extension: ".mp4",
				},
			],
			is_direct_access: true,
		});

		state.setLoadingContents("workspace", true);
		state.setError("workspace", "temporary error");
		state.addRecentFolder({
			name: "Downloads",
			path: "/Users/barbarossia/Downloads",
			source: "manual_input",
		});

		const persisted = JSON.parse(
			localStorage.getItem("runninghub-folder-storage") ?? "{}",
		);
		const persistedState = persisted.state;

		expect(persistedState.workspace.selectedFolder).toEqual({
			success: true,
			folder_name: "Downloads",
			folder_path: "/Users/barbarossia/Downloads",
			message: "Folder selected",
		});
		expect(persistedState.recentFolders).toHaveLength(1);
		expect(persistedState.workspace.folderContents).toBeUndefined();
		expect(persistedState.workspace.isLoadingContents).toBeUndefined();
		expect(persistedState.workspace.error).toBeUndefined();
	});
});
