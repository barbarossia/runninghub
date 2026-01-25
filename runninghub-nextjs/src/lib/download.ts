/**
 * Download utility functions
 */

/**
 * Download a file from the server
 */
export async function downloadFile(
	filePath: string,
	fileName: string,
): Promise<void> {
	try {
		// Serve the file via API
		const response = await fetch(
			`/api/workspace/serve-output?path=${encodeURIComponent(filePath)}`,
		);

		if (!response.ok) {
			throw new Error("Failed to download file");
		}

		const blob = await response.blob();
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		window.URL.revokeObjectURL(url);
		document.body.removeChild(a);
	} catch (error) {
		console.error("Download error:", error);
		throw error;
	}
}
