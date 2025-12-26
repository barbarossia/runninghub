/**
 * Hook for auto-translating job text outputs
 * Uses server-side translation API (no Chrome AI required)
 */

import { useEffect, useState, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';

export function useOutputTranslation(jobId: string) {
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
    if (
      !job?.results ||
      !job.results.textOutputs ||
      job.results.textOutputs.length === 0 ||
      job.status !== 'completed'
    ) {
      return;
    }

    // Check if any output needs translation
    const needsTranslation = job.results.textOutputs.some(to => !to.autoTranslated && !to.translationError);
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
          // Detect language (truncate for detection to save bandwidth/url length)
          const detectTextSlice = originalText.slice(0, 500);
          const detectResponse = await fetch(`/api/translate?text=${encodeURIComponent(detectTextSlice)}`);
          
          if (!detectResponse.ok) {
            throw new Error(`Language detection API error: ${detectResponse.status}`);
          }
          
          // Safely parse JSON
          const detectText = await detectResponse.text();
          let detectData;
          try {
            detectData = JSON.parse(detectText);
          } catch (e) {
            console.error('Failed to parse detection response:', detectText);
            throw new Error('Invalid JSON response from language detection');
          }

          if (!detectData.success) {
            throw new Error('Language detection failed');
          }

          const detectedLang = detectData.detectedLang;

          // Set original text to detected language key if applicable
          if (detectedLang === 'en') {
             updatedTextOutputs[i].content.en = originalText;
          } else if (detectedLang === 'zh') {
             updatedTextOutputs[i].content.zh = originalText;
          }

          // Translate to English if not already English
          if (detectedLang !== 'en' && !textOutput.content.en) {
            const enResponse = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: originalText,
                sourceLang: detectedLang,
                targetLang: 'en',
              }),
            });

            if (!enResponse.ok) {
              throw new Error(`Translation API error (en): ${enResponse.status}`);
            }

            const enRespText = await enResponse.text();
            let enData;
            try {
              enData = JSON.parse(enRespText);
            } catch (e) {
              console.error('Failed to parse EN translation response:', enRespText);
              throw new Error('Invalid JSON response from EN translation');
            }

            if (enData.success) {
              updatedTextOutputs[i].content.en = enData.translatedText;
            } else {
              throw new Error(enData.error || 'English translation failed');
            }
          }

          // Translate to Chinese if not already Chinese
          if (detectedLang !== 'zh' && !textOutput.content.zh) {
            const zhResponse = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: originalText,
                sourceLang: detectedLang,
                targetLang: 'zh',
              }),
            });

            if (!zhResponse.ok) {
              throw new Error(`Translation API error (zh): ${zhResponse.status}`);
            }

            const zhRespText = await zhResponse.text();
            let zhData;
            try {
              zhData = JSON.parse(zhRespText);
            } catch (e) {
              console.error('Failed to parse ZH translation response:', zhRespText);
              throw new Error('Invalid JSON response from ZH translation');
            }

            if (zhData.success) {
              updatedTextOutputs[i].content.zh = zhData.translatedText;
            } else {
              throw new Error(zhData.error || 'Chinese translation failed');
            }
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
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Translation failed for ${textOutput.fileName}:`, errorMessage, error);
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
