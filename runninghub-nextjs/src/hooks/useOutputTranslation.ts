/**
 * Hook for auto-translating job text outputs
 */

import { useEffect, useState } from 'react';
import { useTranslation } from './useTranslation';
import { useWorkspaceStore } from '@/store/workspace-store';

export function useOutputTranslation(jobId: string) {
  const { toEnglish, toChinese, isChromeAIAvailable } = useTranslation();
  const { getJobById, updateJob } = useWorkspaceStore();
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedCount, setTranslatedCount] = useState(0);

  useEffect(() => {
    const job = getJobById(jobId);

    // Only translate when:
    // 1. Job is completed
    // 2. Has text outputs
    // 3. Not already translated
    // 4. Chrome AI is available
    if (
      job?.status !== 'completed' ||
      !job.results?.textOutputs ||
      job.results.textOutputs.length === 0 ||
      job.results.textOutputs.some(to => to.autoTranslated) ||
      !isChromeAIAvailable
    ) {
      return;
    }

    const translateOutputs = async () => {
      setIsTranslating(true);
      setTranslatedCount(0);

      const updatedTextOutputs = [...(job.results!.textOutputs || [])];

      for (let i = 0; i < updatedTextOutputs.length; i++) {
        const textOutput = updatedTextOutputs[i];
        const originalText = textOutput.content.original;

        try {
          // Detect language first
          const detectedLang = detectLanguage(originalText);

          // Translate to English if not already English
          if (detectedLang !== 'en') {
            const enResult = await toEnglish(originalText, detectedLang);
            if (enResult.success) {
              updatedTextOutputs[i].content.en = enResult.translatedText;
            }
          }

          // Translate to Chinese if not already Chinese
          if (detectedLang !== 'zh') {
            const zhResult = await toChinese(originalText, detectedLang);
            if (zhResult.success) {
              updatedTextOutputs[i].content.zh = zhResult.translatedText;
            }
          }

          updatedTextOutputs[i].autoTranslated = true;
          setTranslatedCount(i + 1);

          // Update job incrementally
          updateJob(jobId, {
            results: {
              ...job.results!,
              textOutputs: updatedTextOutputs,
            },
          });
        } catch (error) {
          console.error(`Translation failed for ${textOutput.fileName}:`, error);
          updatedTextOutputs[i].translationError = error instanceof Error ? error.message : 'Translation failed';
        }
      }

      setIsTranslating(false);
    };

    translateOutputs();
  }, [jobId, isChromeAIAvailable, getJobById, updateJob]);

  return { isTranslating, translatedCount };
}

// Simple language detection
function detectLanguage(text: string): 'en' | 'zh' {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  const englishRegex = /[a-zA-Z]/;

  const hasChinese = chineseRegex.test(text);
  const hasEnglish = englishRegex.test(text);

  if (hasChinese && !hasEnglish) return 'zh';
  return 'en'; // Default to English
}
