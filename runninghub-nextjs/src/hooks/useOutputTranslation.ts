/**
 * Hook for auto-translating job text outputs
 * Uses server-side translation API (no Chrome AI required)
 * Handles text chunking for files exceeding API limits
 */

import { useEffect, useState, useMemo } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";

const MYMEMORY_LIMIT = 500; // MyMemory API character limit per request
const CHUNK_OVERLAP = 50; // Overlap between chunks to maintain context
const RATE_LIMIT_DELAY = 1000; // Delay between requests to avoid rate limiting

/**
 * Split text into chunks that respect the API limit
 * Tries to split at sentence boundaries when possible
 */
function splitTextIntoChunks(text: string): string[] {
	// If text is within limit, return as-is
	if (text.length <= MYMEMORY_LIMIT) {
		return [text];
	}

	const chunks: string[] = [];
	let remaining = text;

	while (remaining.length > 0) {
		// If remaining text is short enough, take it all
		if (remaining.length <= MYMEMORY_LIMIT) {
			chunks.push(remaining);
			break;
		}

		// Take a chunk of MYMEMORY_LIMIT - CHUNK_OVERLAP characters
		const chunkEnd = MYMEMORY_LIMIT - CHUNK_OVERLAP;

		// Try to find a sentence boundary near the chunk end
		const sentenceEnds = [".", "!", "?", "\n"];
		let bestEnd = chunkEnd;

		for (const ending of sentenceEnds) {
			const pos = remaining.lastIndexOf(ending, chunkEnd);
			if (pos > chunkEnd - 100 && pos > 0) {
				bestEnd = pos + 1;
				break;
			}
		}

		// If no good boundary found, try to find a space
		if (bestEnd === chunkEnd) {
			const spacePos = remaining.lastIndexOf(" ", chunkEnd);
			if (spacePos > chunkEnd - 100 && spacePos > 0) {
				bestEnd = spacePos + 1;
			}
		}

		chunks.push(remaining.slice(0, bestEnd));
		remaining = remaining.slice(bestEnd);
	}

	return chunks;
}

/**
 * Translate a single text with chunking support
 */
async function translateText(
	text: string,
	sourceLang: string,
	targetLang: string,
	onProgress?: (chunk: number, total: number) => void,
): Promise<string> {
	const chunks = splitTextIntoChunks(text);

	if (chunks.length === 1) {
		// No chunking needed
		const response = await fetch("/api/translate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				text,
				sourceLang,
				targetLang,
			}),
		});

		if (!response.ok) {
			throw new Error(`Translation API error: ${response.status}`);
		}

		const respText = await response.text();
		let data;
		try {
			data = JSON.parse(respText);
		} catch (e) {
			console.error("Failed to parse translation response:", respText);
			throw new Error("Invalid JSON response from translation API");
		}

		if (!data.success) {
			throw new Error(data.error || "Translation failed");
		}

		return data.translatedText;
	}

	// Translate chunks and combine results
	const translatedChunks: string[] = [];

	for (let i = 0; i < chunks.length; i++) {
		onProgress?.(i + 1, chunks.length);

		const response = await fetch("/api/translate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				text: chunks[i],
				sourceLang,
				targetLang,
			}),
		});

		if (!response.ok) {
			throw new Error(
				`Translation API error (chunk ${i + 1}/${chunks.length}): ${response.status}`,
			);
		}

		const respText = await response.text();
		let data;
		try {
			data = JSON.parse(respText);
		} catch (e) {
			console.error("Failed to parse translation response:", respText);
			throw new Error(
				`Invalid JSON response (chunk ${i + 1}/${chunks.length})`,
			);
		}

		if (!data.success) {
			throw new Error(
				data.error || `Translation failed (chunk ${i + 1}/${chunks.length})`,
			);
		}

		translatedChunks.push(data.translatedText);

		// Rate limiting delay between chunks (except for last chunk)
		if (i < chunks.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
		}
	}

	// Combine chunks, removing overlap from all but first chunk
	let combined = translatedChunks[0] || "";
	for (let i = 1; i < translatedChunks.length; i++) {
		const chunk = translatedChunks[i];
		// Find the overlap position
		let overlapPos = 0;
		const minOverlap = Math.min(CHUNK_OVERLAP, chunk.length);

		for (let j = minOverlap; j >= 0; j--) {
			const chunkStart = chunk.slice(0, j);
			if (combined.endsWith(chunkStart)) {
				overlapPos = j;
				break;
			}
		}

		combined += chunk.slice(overlapPos);
	}

	return combined;
}

export function useOutputTranslation(jobId: string) {
	const { getJobById, updateJob } = useWorkspaceStore();
	const [isTranslating, setIsTranslating] = useState(false);
	const [translatedCount, setTranslatedCount] = useState(0);

	// Get job once
	const job = getJobById(jobId);

	// Create a stable key for results to trigger effect when results are loaded
	const resultsKey = useMemo(() => {
		if (!job?.results?.textOutputs) return "no-results";
		return job.results.textOutputs
			.map((to) => `${to.fileName}-${to.autoTranslated}-${to.translationError}`)
			.join("|");
	}, [job?.results?.textOutputs]);

	useEffect(() => {
		// Only translate when:
		// 1. Job is completed
		// 2. Has text outputs
		// 3. Not already translated (check ALL outputs)
		if (
			!job?.results ||
			!job.results.textOutputs ||
			job.results.textOutputs.length === 0 ||
			job.status !== "completed"
		) {
			return;
		}

		// Check if any output needs translation
		const needsTranslation = job.results.textOutputs.some(
			(to) => !to.autoTranslated && !to.translationError,
		);
		if (!needsTranslation) {
			return;
		}

		// Store results in local variable to avoid TypeScript errors
		const jobResults = job.results;

		const translateOutputs = async () => {
			setIsTranslating(true);
			setTranslatedCount(0);

			const updatedTextOutputs = [...(jobResults.textOutputs || [])];
			let translated = 0;

			for (let i = 0; i < updatedTextOutputs.length; i++) {
				const textOutput = updatedTextOutputs[i];

				// Skip if already translated or has error
				if (textOutput.autoTranslated || textOutput.translationError) {
					continue;
				}

				const originalText = textOutput.content.original;

				try {
					// Detect language (use first 500 chars for detection)
					const detectTextSlice = originalText.slice(0, 500);
					const detectResponse = await fetch(
						`/api/translate?text=${encodeURIComponent(detectTextSlice)}`,
					);

					if (!detectResponse.ok) {
						throw new Error(
							`Language detection API error: ${detectResponse.status}`,
						);
					}

					// Safely parse JSON
					const detectText = await detectResponse.text();
					let detectData;
					try {
						detectData = JSON.parse(detectText);
					} catch (e) {
						console.error("Failed to parse detection response:", detectText);
						throw new Error("Invalid JSON response from language detection");
					}

					if (!detectData.success) {
						throw new Error("Language detection failed");
					}

					const detectedLang = detectData.detectedLang;

					// Set the content for the detected language if it's one of our target languages
					if (detectedLang === "en" && !updatedTextOutputs[i].content.en) {
						updatedTextOutputs[i].content.en = originalText;
					} else if (
						detectedLang === "zh" &&
						!updatedTextOutputs[i].content.zh
					) {
						updatedTextOutputs[i].content.zh = originalText;
					}

					// Translate to English if not already English
					if (detectedLang !== "en" && !textOutput.content.en) {
						const enText = await translateText(
							originalText,
							detectedLang,
							"en",
							(chunk, total) => {
								console.log(`Translating to English: ${chunk}/${total} chunks`);
							},
						);
						updatedTextOutputs[i].content.en = enText;
					}

					// Translate to Chinese if not already Chinese
					if (detectedLang !== "zh" && !textOutput.content.zh) {
						const zhText = await translateText(
							originalText,
							detectedLang,
							"zh",
							(chunk, total) => {
								console.log(`Translating to Chinese: ${chunk}/${total} chunks`);
							},
						);
						updatedTextOutputs[i].content.zh = zhText;
					}

					updatedTextOutputs[i].autoTranslated = true;
					translated++;
					setTranslatedCount(translated);

					// Update job incrementally
					updateJob(jobId, {
						results: {
							...jobResults,
							textOutputs: updatedTextOutputs,
						},
					});

					// Small delay between files to avoid rate limiting
					if (i < updatedTextOutputs.length - 1) {
						await new Promise((resolve) =>
							setTimeout(resolve, RATE_LIMIT_DELAY),
						);
					}
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Unknown error";
					console.error(
						`Translation failed for ${textOutput.fileName}:`,
						errorMessage,
						error,
					);
					updatedTextOutputs[i].translationError = errorMessage;

					// Update job with error
					updateJob(jobId, {
						results: {
							...jobResults,
							textOutputs: updatedTextOutputs,
						},
					});
				}
			}

			setIsTranslating(false);
		};

		translateOutputs();
	}, [jobId, resultsKey, job, updateJob]);

	return { isTranslating, translatedCount };
}
