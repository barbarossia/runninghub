/**
 * Export Images Utility
 * Handles client-side export of images/videos using File System Access API
 */

import type { ImageFile } from "@/types";

export interface ExportProgress {
	current: number;
	total: number;
	currentFile: string;
}

export interface ExportResult {
	success: boolean;
	total: number;
	exported: number;
	failed: number;
	errors: string[];
}

export interface ExportOptions {
	onProgress?: (progress: ExportProgress) => void;
	signal?: AbortSignal;
}

// Simplified type for files that can be exported
export interface ExportableFile {
	path: string;
	name: string;
	blob_url?: string;
}

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessAPISupported(): boolean {
	return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/**
 * Export images to a user-selected folder
 */
export async function exportImagesToFolder(
	images: ImageFile[] | ExportableFile[],
	options: ExportOptions = {},
): Promise<ExportResult> {
	const { onProgress, signal } = options;

	// Check browser support
	if (!isFileSystemAccessAPISupported()) {
		throw new Error(
			"Your browser does not support folder export. " +
				"Please use Chrome, Edge, or Opera 86+ for this feature.",
		);
	}

	if (images.length === 0) {
		throw new Error("No images to export");
	}

	// Check for abort signal
	if (signal?.aborted) {
		throw new Error("Export was cancelled");
	}

	let directoryHandle: FileSystemDirectoryHandle;

	try {
		// Show directory picker
		directoryHandle = await window.showDirectoryPicker({
			mode: "readwrite",
			id: "runninghub-export-folder", // Remember last used folder
		});
	} catch (error) {
		// User cancelled the picker
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error("Folder selection was cancelled");
		}
		throw error;
	}

	// Prepare data for export
	const exportData = images.map((img) => ({
		path: img.path,
		name: img.name,
		blobUrl: img.blob_url,
	}));

	// Call API to get file data
	const apiResponse = await fetch("/api/images/export", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ images: exportData }),
	});

	if (!apiResponse.ok) {
		const errorData = await apiResponse
			.json()
			.catch(() => ({ error: "Unknown error" }));
		throw new Error(errorData.error || "Failed to prepare files for export");
	}

	const { results } = await apiResponse.json();

	// Export files to selected folder
	let exportedCount = 0;
	let failedCount = 0;
	const errors: string[] = [];

	for (let i = 0; i < results.length; i++) {
		const file = results[i];

		// Check for abort signal
		if (signal?.aborted) {
			throw new Error("Export was cancelled");
		}

		// Update progress
		onProgress?.({
			current: i + 1,
			total: results.length,
			currentFile: file.name,
		});

		try {
			// Handle blob URLs (virtual files)
			if (file.error === "BLOB_URL") {
				const image = images.find((img) => img.path === file.path);
				if (image?.blob_url) {
					const response = await fetch(image.blob_url);
					const blob = await response.blob();
					await writeFileToHandle(directoryHandle, file.name, blob);
					exportedCount++;
				} else {
					failedCount++;
					errors.push(`${file.name}: Could not access virtual file`);
				}
				continue;
			}

			// Handle error from API
			if (file.error) {
				failedCount++;
				errors.push(`${file.name}: ${file.error}`);
				continue;
			}

			// Convert base64 to blob
			const byteCharacters = atob(file.base64!);
			const byteNumbers = new Array(byteCharacters.length);
			for (let j = 0; j < byteCharacters.length; j++) {
				byteNumbers[j] = byteCharacters.charCodeAt(j);
			}
			const byteArray = new Uint8Array(byteNumbers);
			const blob = new Blob([byteArray], { type: file.mimeType });

			// Write file to directory
			await writeFileToHandle(directoryHandle, file.name, blob);
			exportedCount++;
		} catch (error) {
			failedCount++;
			const errorMsg = error instanceof Error ? error.message : "Unknown error";
			errors.push(`${file.name}: ${errorMsg}`);
		}
	}

	return {
		success: exportedCount > 0,
		total: results.length,
		exported: exportedCount,
		failed: failedCount,
		errors,
	};
}

/**
 * Write a blob to a directory handle
 */
async function writeFileToHandle(
	directoryHandle: FileSystemDirectoryHandle,
	fileName: string,
	blob: Blob,
): Promise<void> {
	const fileHandle = await directoryHandle.getFileHandle(fileName, {
		create: true,
	});
	const writable = await fileHandle.createWritable();
	await writable.write(blob);
	await writable.close();
}

/**
 * Get browser compatibility message
 */
export function getCompatibilityMessage(): string | null {
	if (typeof window === "undefined") {
		return null;
	}

	if (isFileSystemAccessAPISupported()) {
		return null;
	}

	const userAgent = navigator.userAgent;

	if (userAgent.includes("Firefox")) {
		return (
			"Firefox does not support folder export yet. " +
			"Please use Chrome, Edge, or Opera for this feature."
		);
	}

	if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
		return (
			"Safari does not support folder export yet. " +
			"Please use Chrome, Edge, or Opera for this feature."
		);
	}

	return (
		"Your browser does not support folder export. " +
		"Please use Chrome, Edge, or Opera 86+ for this feature."
	);
}
