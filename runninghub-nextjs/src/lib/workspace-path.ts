/**
 * Workspace path utilities.
 *
 * Single source of truth for resolving the workspace base directory.
 * Requires WORKSPACE_PATH to be set in the environment (.env.local or Docker ENV).
 * Throws if the variable is missing — no silent fallback.
 *
 * The value may start with `~` which is expanded to process.env.HOME.
 */

import path from "path";

/**
 * Returns the absolute path to the workspace base directory,
 * optionally joined with additional path segments.
 *
 * Throws an error if WORKSPACE_PATH env var is not set.
 *
 * @example
 * getWorkspaceDir()                          // /data/workspace
 * getWorkspaceDir(jobId)                     // /data/workspace/<jobId>
 * getWorkspaceDir(jobId, "job.json")         // /data/workspace/<jobId>/job.json
 * getWorkspaceDir("workflows", `${id}.json`) // /data/workspace/workflows/<id>.json
 */
export function getWorkspaceDir(...segments: string[]): string {
	const raw = process.env.WORKSPACE_PATH;

	if (!raw) {
		throw new Error(
			"WORKSPACE_PATH environment variable is not set. " +
			"Add it to .env.local (development) or pass it as a Docker ENV (production).",
		);
	}

	const base = raw.startsWith("~")
		? path.join(process.env.HOME || "/", raw.slice(1))
		: raw;

	return segments.length ? path.join(base, ...segments) : base;
}
