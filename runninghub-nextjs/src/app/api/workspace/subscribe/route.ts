import { NextRequest } from "next/server";
import { access, readFile, stat } from "fs/promises";
import path from "path";
import chokidar from "chokidar";
import { getFileMetadata } from "@/lib/metadata";
import { writeLog } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".bmp",
	".webp",
]);
const SUPPORTED_VIDEO_EXTENSIONS = new Set([
	".mp4",
	".webm",
	".mkv",
	".avi",
	".mov",
	".flv",
]);

async function readCaptionFile(
	filePath: string,
): Promise<{ caption: string; captionPath: string } | undefined> {
	try {
		const dir = path.dirname(filePath);
		const basename = path.basename(filePath, path.extname(filePath));
		const txtPath = path.join(dir, `${basename}.txt`);
		const caption = await readFile(txtPath, "utf-8");

		return {
			caption,
			captionPath: txtPath,
		};
	} catch {
		return undefined;
	}
}

async function buildMediaPayload(filePath: string) {
	const extension = path.extname(filePath).toLowerCase();
	const name = path.basename(filePath);

	let stats;
	try {
		stats = await stat(filePath);
	} catch {
		return null;
	}
	const createdAt = stats.birthtime?.getTime();
	const modifiedAt = stats.mtime?.getTime();

	if (SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
		const metadata = await getFileMetadata(filePath, "image");
		const captionData = await readCaptionFile(filePath);

		return {
			type: "image",
			payload: {
				name,
				path: filePath,
				size: stats.size,
				extension,
				width: metadata?.width,
				height: metadata?.height,
				created_at: createdAt,
				modified_at: modifiedAt,
				caption: captionData?.caption,
				captionPath: captionData?.captionPath,
			},
		};
	}

	if (SUPPORTED_VIDEO_EXTENSIONS.has(extension)) {
		const metadata = (await getFileMetadata(filePath, "video")) as any;
		const captionData = await readCaptionFile(filePath);

		return {
			type: "video",
			payload: {
				name,
				path: filePath,
				size: stats.size,
				extension,
				width: metadata?.width,
				height: metadata?.height,
				fps: metadata?.fps,
				duration: metadata?.duration,
				created_at: createdAt,
				modified_at: modifiedAt,
				caption: captionData?.caption,
				captionPath: captionData?.captionPath,
			},
		};
	}

	return null;
}

async function emitCaptionUpdate(
	filePath: string,
	emit: (event: string, payload: unknown) => Promise<void>,
) {
	if (!filePath.endsWith(".txt")) return;

	const basePath = filePath.replace(/\.[^/.]+$/, "");
	const candidateExtensions = [
		...SUPPORTED_IMAGE_EXTENSIONS,
		...SUPPORTED_VIDEO_EXTENSIONS,
	];
	let mediaPath: string | null = null;

	for (const extension of candidateExtensions) {
		const candidate = `${basePath}${extension}`;
		try {
			await access(candidate);
			mediaPath = candidate;
			break;
		} catch {
			continue;
		}
	}

	if (!mediaPath) return;

	try {
		const caption = await readFile(filePath, "utf-8");
		await emit("caption", {
			filePath: mediaPath,
			caption,
			captionPath: filePath,
		});
	} catch {
		return;
	}
}

function createEventStream(): TransformStream {
	return new TransformStream();
}

function formatSseEvent(event: string, data: unknown) {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function debounceByKey<T extends (...args: any[]) => Promise<void>>(
	handler: T,
	delay = 50,
) {
	const timers = new Map<string, NodeJS.Timeout>();

	return (
		key: string,
		...args: Parameters<T> extends [any, ...infer Rest] ? Rest : never
	) => {
		const existing = timers.get(key);
		if (existing) {
			clearTimeout(existing);
		}

		const timer = setTimeout(async () => {
			timers.delete(key);
			await handler(key, ...(args as any));
		}, delay);

		timers.set(key, timer);
	};
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const folderPath = searchParams.get("path");

	if (!folderPath) {
		return new Response("Missing path", { status: 400 });
	}

	const stream = createEventStream();
	const writer = stream.writable.getWriter();

	let closed = false;
	const closeStream = () => {
		if (closed) return;
		closed = true;
		writer.close();
	};

	const watcher = chokidar.watch(folderPath, {
		ignored: [
			/\.git/,
			/node_modules/,
			/\.DS_Store/,
			// Ignore all subdirectories - only watch files directly in folderPath
			(filePath) => {
				const relativePath = path.relative(folderPath, filePath);
				const relativeParts = relativePath.split(path.sep);
				return relativeParts.length > 1; // Ignore if path has any subdirectories
			},
		],
		ignoreInitial: true,
		persistent: true,
		awaitWriteFinish: {
			stabilityThreshold: 50,
			pollInterval: 10,
		},
	});

	writeLog(`[Subscribe] Client connected to watch: ${folderPath}`, "info");

	const emitEvent = async (event: string, payload: unknown) => {
		if (closed) return;
		const message = formatSseEvent(event, payload);
		try {
			await writer.write(new TextEncoder().encode(message));
		} catch (err) {
			writeLog(`[Subscribe] Error writing to stream: ${err}`, "error");
			closeStream();
		}
	};

	// Heartbeat to keep connection alive
	const heartbeatInterval = setInterval(() => {
		if (closed) {
			clearInterval(heartbeatInterval);
			return;
		}
		// Send comment as keep-alive
		const keepAlive = ": keepalive\n\n";
		writer.write(new TextEncoder().encode(keepAlive)).catch(() => {
			clearInterval(heartbeatInterval);
			closeStream();
		});
	}, 15000); // 15 seconds

	const handleChange = async (filePath: string) => {
		writeLog(`[Subscribe] File changed: ${filePath}`, "info");
		if (filePath.endsWith(".txt")) {
			await emitCaptionUpdate(filePath, emitEvent);
			return;
		}

		const payload = await buildMediaPayload(filePath);
		if (!payload) return;

		// Don't emit update events for files in the 'encoded' folder
		// These files are intentionally hidden from gallery view
		if (filePath.split(path.sep).includes("encoded")) {
			writeLog(
				`[Subscribe] Skipping 'encoded' folder file: ${filePath}`,
				"info",
			);
			return;
		}

		await emitEvent("update", payload);
	};

	const handleRemove = async (filePath: string) => {
		const basePath = filePath.replace(/\.[^/.]+$/, "");
		const candidateExtensions = [
			...SUPPORTED_IMAGE_EXTENSIONS,
			...SUPPORTED_VIDEO_EXTENSIONS,
		];
		let mediaPath: string | null = null;

		for (const extension of candidateExtensions) {
			const candidate = `${basePath}${extension}`;
			try {
				await access(candidate);
				mediaPath = candidate;
				break;
			} catch {
				continue;
			}
		}

		if (mediaPath) {
			await emitEvent("caption", {
				filePath: mediaPath,
				caption: null,
				captionPath: null,
			});
		}

		await emitEvent("remove", { path: filePath });
		writeLog(`[Workspace] Removed file via subscription: ${filePath}`, "info");
	};

	const debouncedChange = debounceByKey(async (filePath: string) => {
		await handleChange(filePath);
	});
	const debouncedRemove = debounceByKey(async (filePath: string) => {
		await handleRemove(filePath);
	});

	watcher.on("add", (filePath) => debouncedChange(filePath));
	watcher.on("change", (filePath) => debouncedChange(filePath));
	watcher.on("unlink", (filePath) => debouncedRemove(filePath));

	request.signal.addEventListener("abort", async () => {
		writeLog(`[Subscribe] Client disconnected from: ${folderPath}`, "info");
		clearInterval(heartbeatInterval);
		await watcher.close();
		closeStream();
	});

	return new Response(stream.readable, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
