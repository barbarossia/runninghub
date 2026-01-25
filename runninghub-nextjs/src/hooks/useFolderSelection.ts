import { useCallback } from "react";
import { useFolderStore, type PageType } from "@/store/folder-store";
import { useVideoStore } from "@/store/video-store";
import { useImageStore } from "@/store/image-store";
import type { FolderInfo as FolderSelectorFolderInfo } from "@/components/folder/FolderSelector";
import type { ImageFile, VideoFile } from "@/types";

export type FolderType = "images" | "videos" | "workspace" | "clip" | "crop";

interface UseFolderSelectionOptions {
	folderType: FolderType;
	onFolderLoaded?: () => void;
}

const folderTypeToPageType: Record<FolderType, PageType> = {
	images: "images",
	videos: "videos",
	workspace: "workspace",
	clip: "clip",
	crop: "crop",
};

export function useFolderSelection({
	folderType,
	onFolderLoaded,
}: UseFolderSelectionOptions) {
	const { setSelectedFolder, addRecentFolder, setFolderContents } =
		useFolderStore();
	const { setVideos } = useVideoStore();
	const { setImages } = useImageStore();

	const pageType = folderTypeToPageType[folderType];

	const handleFolderSelected = useCallback(
		(folderInfo: FolderSelectorFolderInfo) => {
			// Set the selected folder in the store for the specific page
			const folderResponse = {
				success: true,
				folder_name: folderInfo.name,
				folder_path: folderInfo.path,
				session_id: folderInfo.session_id,
				is_virtual: folderInfo.is_virtual,
				message: "Folder selected",
			};

			setSelectedFolder(pageType, folderResponse);

			// Add to recent folders
			if (folderInfo.path) {
				addRecentFolder({
					name: folderInfo.name,
					path: folderInfo.path,
					source: (folderInfo.source ||
						(folderInfo.is_virtual ? "filesystem_api" : "manual_input")) as
						| "filesystem_api"
						| "manual_input",
				});
			}

			// Load content based on folder type
			if (
				folderType === "videos" &&
				folderInfo.videos &&
				folderInfo.videos.length > 0
			) {
				setVideos(folderInfo.videos as VideoFile[]);
			} else if (
				folderType === "images" &&
				folderInfo.images &&
				folderInfo.images.length > 0
			) {
				setImages(folderInfo.images as ImageFile[]);

				// Also set folder contents for images
				setFolderContents(pageType, {
					current_path: folderInfo.path,
					parent_path: undefined,
					images: folderInfo.images as ImageFile[],
					folders: (folderInfo.folders || []).map((f) => ({
						name: f.name,
						path: f.path,
						is_virtual: f.is_virtual,
						type: "folder" as const,
					})),
					videos: [],
					is_direct_access: true,
				});
			}

			// For workspace, clip, crop - set folder contents with all available data
			if (
				(folderType === "workspace" ||
					folderType === "clip" ||
					folderType === "crop") &&
				folderInfo
			) {
				setFolderContents(pageType, {
					current_path: folderInfo.path,
					parent_path: undefined,
					images: (folderInfo.images || []) as ImageFile[],
					videos: (folderInfo.videos || []) as VideoFile[],
					folders: (folderInfo.folders || []).map((f) => ({
						name: f.name,
						path: f.path,
						is_virtual: f.is_virtual,
						type: "folder" as const,
					})),
					is_direct_access: true,
				});
			}

			onFolderLoaded?.();
		},
		[
			pageType,
			folderType,
			setSelectedFolder,
			addRecentFolder,
			setVideos,
			setImages,
			setFolderContents,
			onFolderLoaded,
		],
	);

	return {
		handleFolderSelected,
	};
}
