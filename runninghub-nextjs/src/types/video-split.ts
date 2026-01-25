/**
 * Video Split Configuration Types
 */

export interface VideoSplitConfig {
	/** Duration of each segment in seconds */
	segmentDuration: number;
	/** Output directory for split segments */
	outputDir?: string;
	/** Whether to delete original video after splitting */
	deleteOriginal?: boolean;
	/** Number of segments to create (optional - calculated from duration) */
	segmentCount?: number;
}

export interface VideoSplitOptions {
	/** Split mode: 'duration' (by time) or 'count' (by number of segments) */
	mode: "duration" | "count";
	/** Segment duration in seconds (for duration mode) */
	segmentDuration?: number;
	/** Number of segments (for count mode) */
	segmentCount?: number;
	/** Output directory */
	outputDir?: string;
	/** Delete original after split */
	deleteOriginal?: boolean;
}
