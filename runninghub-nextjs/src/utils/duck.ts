const SKIP_MARKERS = ["_decoded", "-decoded", "_recovered", "-recovered"] as const;

export const isDuckEncodedFilename = (fileName?: string | null): boolean => {
	if (!fileName) return false;
	const normalized = fileName.toLowerCase();
	if (SKIP_MARKERS.some((marker) => normalized.includes(marker))) return false;
	return normalized.includes("duck");
};
