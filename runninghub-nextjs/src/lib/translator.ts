/**
 * Translation service wrapper
 * Supports Chrome AI Translator API with fallback to Server API
 */

import type { TranslationResponse, Language } from '@/types/workspace';

// Chrome AI Translator API types
interface ChromeTranslatorAPI {
  translator: {
    create: (options: {
      sourceLanguage: string;
      targetLanguage: string;
    }) => Promise<ChromeTranslator>;
  };
}

interface ChromeTranslator {
  translate: (text: string) => Promise<string>;
}

// Extend Window interface for Chrome AI API
declare global {
  interface Window {
    translation?: ChromeTranslatorAPI;
  }
}

/**
 * Convert language code to Chrome AI format
 */
function toChromeLanguageCode(lang: Language): string {
  switch (lang) {
    case 'en':
      return 'en-US';
    case 'zh':
      return 'zh-CN';
    case 'auto':
      return 'en-US'; // Default to English for auto-detect source
    default:
      return 'en-US';
  }
}

/**
 * Check if Chrome AI Translator API is available
 */
export function isChromeAITranslatorAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'translation' in window &&
    !!(window as any).translation?.translator
  );
}

/**
 * Translate text using Server-side API (Google Translate)
 */
async function translateWithServer(
  text: string,
  from: Language,
  to: Language
): Promise<TranslationResponse> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLang: from === 'auto' ? undefined : from,
        targetLang: to,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server translation error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Server translation error:', error);
    return {
      success: false,
      translatedText: '',
      error: error instanceof Error ? error.message : 'Translation failed',
    };
  }
}

/**
 * Translate text using Chrome AI Translator API
 */
async function translateWithChromeAI(
  text: string,
  from: Language,
  to: Language
): Promise<TranslationResponse> {
  try {
    const api = (window as any).translation.translator;
    const translator = await api.create({
      sourceLanguage: toChromeLanguageCode(from),
      targetLanguage: toChromeLanguageCode(to),
    });

    const translatedText = await translator.translate(text);

    return {
      success: true,
      translatedText,
      detectedLanguage: from === 'auto' ? undefined : from,
    };
  } catch (error) {
    console.error('Chrome AI Translator API error:', error);
    // Fallback to server on Chrome AI failure
    return translateWithServer(text, from, to);
  }
}

/**
 * Translate text (Chrome AI with Server Fallback)
 */
export async function translateText(
  text: string,
  from: Language = 'auto',
  to: Language = 'en'
): Promise<TranslationResponse> {
  // Validate input
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      translatedText: '',
      error: 'Text is empty',
    };
  }

  // Same language check
  if (from !== 'auto' && from === to) {
    return {
      success: true,
      translatedText: text,
      detectedLanguage: from,
    };
  }

  // Use Chrome AI Translator API if available
  if (isChromeAITranslatorAvailable()) {
    return translateWithChromeAI(text, from, to);
  }

  // Fallback to Server-side API
  return translateWithServer(text, from, to);
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

  if (hasChinese && !hasEnglish) return 'zh';
  if (hasEnglish && !hasChinese) return 'en';
  if (hasChinese && hasEnglish) return 'en'; // Default to English for mixed content

  return 'en'; // Default fallback
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
    from: Language = 'auto',
    to: Language = 'en'
  ): Promise<TranslationResponse> {
    return translateText(text, from, to);
  }

  /**
   * Translate to English
   */
  async toEnglish(text: string, from: Language = 'auto'): Promise<TranslationResponse> {
    return this.translate(text, from, 'en');
  }

  /**
   * Translate to Chinese
   */
  async toChinese(text: string, from: Language = 'auto'): Promise<TranslationResponse> {
    return this.translate(text, from, 'zh');
  }

  /**
   * Check if Chrome AI Translator is available
   */
  isChromeAIAvailable(): boolean {
    return isChromeAITranslatorAvailable();
  }
}