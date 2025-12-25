/**
 * Translation hook
 * Provides translation functionality with Chrome AI API
 */

import { useState, useEffect, useCallback } from 'react';
import { translateText, isChromeAITranslatorAvailable } from '@/lib/translator';
import type { TranslationResponse, Language } from '@/types/workspace';

export interface UseTranslationOptions {
  enableChromeAI?: boolean;
}

export interface UseTranslationReturn {
  translate: (text: string, from: Language, to: Language) => Promise<TranslationResponse>;
  toEnglish: (text: string, from?: Language) => Promise<TranslationResponse>;
  toChinese: (text: string, from?: Language) => Promise<TranslationResponse>;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  isChromeAIAvailable: boolean;
}

/**
 * Hook for translation functionality
 */
export function useTranslation(
  options: UseTranslationOptions = {}
): UseTranslationReturn {
  const { enableChromeAI = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChromeAIAvailable, setIsChromeAIAvailable] = useState(false);

  // Check Chrome AI Translator availability on mount
  useEffect(() => {
    setIsChromeAIAvailable(isChromeAITranslatorAvailable());
  }, []);

  /**
   * Translate text
   */
  const translate = useCallback(
    async (text: string, from: Language, to: Language): Promise<TranslationResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await translateText(text, from, to);

        if (!result.success) {
          setError(result.error || 'Translation failed');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Translation failed';
        setError(errorMessage);
        return {
          success: false,
          translatedText: '',
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Translate to English
   */
  const toEnglish = useCallback(
    async (text: string, from: Language = 'auto'): Promise<TranslationResponse> => {
      return translate(text, from, 'en');
    },
    [translate]
  );

  /**
   * Translate to Chinese
   */
  const toChinese = useCallback(
    async (text: string, from: Language = 'auto'): Promise<TranslationResponse> => {
      return translate(text, from, 'zh');
    },
    [translate]
  );

  return {
    translate,
    toEnglish,
    toChinese,
    isSupported: isChromeAIAvailable,
    isLoading,
    error,
    isChromeAIAvailable,
  };
}

/**
 * Hook for translating text with debouncing
 */
export function useDebouncedTranslation(
  delay: number = 500,
  options: UseTranslationOptions = {}
) {
  const { translate, ...rest } = useTranslation(options);
  const [debouncedText, setDebouncedText] = useState<string>('');
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  /**
   * Translate text with debouncing
   */
  const translateDebounced = useCallback(
    (text: string, from: Language, to: Language): Promise<TranslationResponse> => {
      return new Promise((resolve) => {
        if (timer) {
          clearTimeout(timer);
        }

        const newTimer = setTimeout(async () => {
          const result = await translate(text, from, to);
          resolve(result);
        }, delay);

        setTimer(newTimer);
      });
    },
    [translate, delay, timer]
  );

  return {
    ...rest,
    translate: translateDebounced,
  };
}
