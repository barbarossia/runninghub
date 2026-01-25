import fs from "fs/promises";
import path from "path";
import os from "os";

// Use the system temp directory or a project-local temp directory
const LOG_DIR = path.join(process.cwd(), ".next/cache/runninghub-logs");
const LOG_FILE = path.join(LOG_DIR, "process.log");

// Ensure log directory exists
async function ensureLogDir() {
	try {
		await fs.mkdir(LOG_DIR, { recursive: true });
	} catch (error) {
		// Ignore error if directory already exists
	}
}

export interface LogEntry {
	timestamp: string;
	level: "info" | "error" | "success" | "warning" | "debug";
	source: "ui" | "api" | "cli";
	message: string;
	taskId?: string;
	metadata?: Record<string, any>;
}

export async function writeLog(
	message: string,
	level: LogEntry["level"] = "info",
	taskId?: string,
	source: LogEntry["source"] = "api",
	metadata?: Record<string, any>,
) {
	await ensureLogDir();

	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level,
		source,
		message,
		taskId,
		metadata,
	};

	const line = JSON.stringify(entry) + "\n";

	try {
		await fs.appendFile(LOG_FILE, line, "utf8");
	} catch (error) {
		console.error("Failed to write log:", error);
	}
}

export async function readLogs(limit: number = 100): Promise<LogEntry[]> {
	try {
		await ensureLogDir();

		// Check if file exists
		try {
			await fs.access(LOG_FILE);
		} catch {
			return [];
		}

		const content = await fs.readFile(LOG_FILE, "utf8");
		const lines = content.trim().split("\n");

		// Parse last N lines
		const entries = lines
			.slice(-limit)
			.filter((line) => line.trim())
			.map((line) => {
				try {
					return JSON.parse(line) as LogEntry;
				} catch {
					return null;
				}
			})
			.filter((entry): entry is LogEntry => entry !== null);

		return entries.reverse(); // Newest first
	} catch (error) {
		console.error("Failed to read logs:", error);
		return [];
	}
}

export async function clearLogs() {
	try {
		await ensureLogDir();
		await fs.writeFile(LOG_FILE, "", "utf8");
	} catch (error) {
		console.error("Failed to clear logs:", error);
	}
}
