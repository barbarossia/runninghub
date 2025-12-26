/**
 * Hook for auto-translating job text outputs
 */

import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from './useTranslation';
import { useWorkspaceStore } from '@/store/workspace-store';

export function useOutputTranslation(jobId: string) {
  const { toEnglish, toChinese, isChromeAIAvailable } = useTranslation();
  const { getJobById, updateJob } = useWorkspaceStore();
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedCount, setTranslatedCount] = useState(0);

  // Get job once
  const job = getJobById(jobId);

  // Create a stable key for results to trigger effect when results are loaded
  const resultsKey = useMemo(() => {
    if (!job?.results?.textOutputs) return 'no-results';
    return job.results.textOutputs.map(to => `${to.fileName}-${to.autoTranslated}-${to.translationError}`).join('|');
  }, [job?.results?.textOutputs]);

  useEffect(() => {
    // Only translate when:
    // 1. Job is completed
    // 2. Has text outputs
    // 3. Not already translated (check ALL outputs)
    // 4. Chrome AI is available
    if (
      !job?.results?.textOutputs ||
      job.results.textOutputs.length === 0 ||
      job.status !== 'completed' ||
      !isChromeAIAvailable
    ) {
      return;
    }

    // Check if any output needs translation
    const needsTranslation = job.results.textOutputs.some(to => !to.autoTranslated && !to.translationError);
    if (!needsTranslation) {
      return;
    }

    const translateOutputs = async () => {
      setIsTranslating(true);
      setTranslatedCount(0);

      const updatedTextOutputs = [...(job.results!.textOutputs || [])];
      let translated = 0;

      for (let i = 0; i < updatedTextOutputs.length; i++) {
        const textOutput = updatedTextOutputs[i];

        // Skip if already translated or has error
        if (textOutput.autoTranslated || textOutput.translationError) {
          continue;
        }

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
          translated++;
          setTranslatedCount(translated);

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

          // Update job with error
          updateJob(jobId, {
            results: {
              ...job.results!,
              textOutputs: updatedTextOutputs,
            },
          });
        }
      }

      setIsTranslating(false);
    };

    translateOutputs();
  }, [jobId, resultsKey, job, isChromeAIAvailable, updateJob]);

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
