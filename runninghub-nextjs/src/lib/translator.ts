/**
 * Translation service wrapper
 * Uses Server-side API (Google Translate)
 */

import type { TranslationResponse, Language } from "@/types/workspace";

/**
 * Translate text using Server-side API (Google Translate)
 */
export async function translateText(
	text: string,
	from: Language = "auto",
	to: Language = "en",
): Promise<TranslationResponse> {
	// Validate input
	if (!text || text.trim().length === 0) {
		return {
			success: false,
			translatedText: "",
			error: "Text is empty",
		};
	}

	// Same language check
	if (from !== "auto" && from === to) {
		return {
			success: true,
			translatedText: text,
			detectedLanguage: from,
		};
	}

	try {
		const response = await fetch("/api/translate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				text,
				sourceLang: from === "auto" ? undefined : from,
				targetLang: to,
			}),
		});

		const responseText = await response.text();
		let data;
		try {
			data = responseText
				? JSON.parse(responseText)
				: { success: false, error: "Empty response" };
		} catch (e) {
			throw new Error(`Invalid JSON response: ${responseText.slice(0, 100)}`);
		}

		if (!response.ok) {
			throw new Error(
				data.error || `Server translation error: ${response.status}`,
			);
		}

		return data;
	} catch (error) {
		console.error("Translation error:", error);
		return {
			success: false,
			translatedText: "",
			error: error instanceof Error ? error.message : "Translation failed",
		};
	}
}

/**
 * Detect language (basic implementation)
 */
export function detectLanguage(text: string): Language {
	// Simple heuristic based on character ranges
	const chineseRegex = /[\u4e00-\u9fa5]/;
	const englishRegex = /[a-zA-Z]/;

	const hasChinese = chineseRegex.test(text);
	const hasEnglish = englishRegex.test(text);

	if (hasChinese && !hasEnglish) return "zh";
	if (hasEnglish && !hasChinese) return "en";
	if (hasChinese && hasEnglish) return "en"; // Default to English for mixed content

	return "en"; // Default fallback
}

/**
 * Translation utility class
 */
export class Translator {
	/**
	 * Translate text
	 */
	async translate(
		text: string,
		from: Language = "auto",
		to: Language = "en",
	): Promise<TranslationResponse> {
		return translateText(text, from, to);
	}

	/**
	 * Translate to English
	 */
	async toEnglish(
		text: string,
		from: Language = "auto",
	): Promise<TranslationResponse> {
		return this.translate(text, from, "en");
	}

	/**
	 * Translate to Chinese
	 */
	async toChinese(
		text: string,
		from: Language = "auto",
	): Promise<TranslationResponse> {
		return this.translate(text, from, "zh");
	}
}
