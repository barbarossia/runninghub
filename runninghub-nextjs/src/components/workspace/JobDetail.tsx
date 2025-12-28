/**
 * Job Detail Component
 * Displays detailed job information with re-run capability
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Download,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  Video,
  ImageIcon,
  Copy,
  Loader2,
  ArrowRightLeft,
  Clock,
  Save,
  ChevronDown,
} from 'lucide-react';
import Image from 'next/image';
import { useWorkspaceStore } from '@/store/workspace-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { downloadFile } from '@/lib/download';
import { useOutputTranslation } from '@/hooks/useOutputTranslation';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/constants';
import type { Job, JobResult } from '@/types/workspace';
import { DuckDecodeButton } from './DuckDecodeButton';

// Helper to get filename from path (client-side safe)
const getBasename = (filePath: string) => {
  return filePath.split(/[\\/]/).pop() || filePath;
};

export interface JobDetailProps {
  jobId: string;
  onBack?: () => void;
  className?: string;
}

export function JobDetail({ jobId, onBack, className = '' }: JobDetailProps) {
  const { getJobById, addJob, deleteJob, updateJob, setSelectedJob } = useWorkspaceStore();
  const [isReRunning, setIsReRunning] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for split view language selection
  const [leftLang, setLeftLang] = useState<'original' | 'en' | 'zh'>('en');
  const [rightLang, setRightLang] = useState<'original' | 'en' | 'zh'>('zh');

  // Local state for editable text outputs
  const [editedText, setEditedText] = useState<Record<string, { original: string; en?: string; zh?: string }>>({});
  const [translating, setTranslating] = useState<Record<string, 'left' | 'right' | null>>({});
  const [debouncedTimers, setDebouncedTimers] = useState<Record<string, NodeJS.Timeout>>({});

  // State for tracking decoded files from duck images
  const [decodedFiles, setDecodedFiles] = useState<Record<string, { decodedPath: string; fileType: string; decodedFileType: 'image' | 'video' }>>({});
  // State for cache busting to force image reload after decode
  const [imageVersion, setImageVersion] = useState<Record<string, number>>({});

  // Auto-translate outputs (uses server-side API)
  const { isTranslating, translatedCount } = useOutputTranslation(jobId);

  const job = getJobById(jobId);

  // Initialize editedText when job results load
  useEffect(() => {
    if (job?.results?.textOutputs) {
      const initial: Record<string, { original: string; en?: string; zh?: string }> = {};
      job.results.textOutputs.forEach(output => {
        initial[output.filePath] = { ...output.content };
      });
      setEditedText(initial);
    }
  }, [job?.results?.textOutputs]);

  // Cleanup debounced timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debouncedTimers).forEach(timer => clearTimeout(timer));
    };
  }, [debouncedTimers]);

  // Fetch job results when job is completed and results are not loaded
  const fetchResults = useCallback(async () => {
    if (!job || job.status !== 'completed' || isLoadingResults) {
      return;
    }

    setIsLoadingResults(true);

    try {
      const response = await fetch(`${API_ENDPOINTS.WORKSPACE_JOB_RESULTS}?jobId=${jobId}`);
      
      if (!response.ok) {
         throw new Error(`Results API error: ${response.status}`);
      }

      const textData = await response.text();
      let data;
      try {
        data = JSON.parse(textData);
      } catch (e) {
        console.error('Failed to parse results response:', textData);
        throw new Error('Invalid JSON response from results API');
      }

      if (data.success && data.results) {
        // Update job with results
        updateJob(jobId, { results: data.results });
      }
    } catch (error) {
      console.error('Failed to fetch job results:', error);
    } finally {
      setIsLoadingResults(false);
    }
  }, [jobId, job?.status, updateJob, isLoadingResults]);

  useEffect(() => {
    if (job && job.status === 'completed' && (!job.results || !job.results.textOutputs)) {
      fetchResults();
    }
  }, [job, fetchResults]);

  if (!job) {
    return (
      <div className={cn('text-center py-16', className)}>
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Job not found</h3>
        <p className="text-sm text-gray-500">The job may have been deleted</p>
        {onBack && (
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Jobs
          </Button>
        )}
      </div>
    );
  }

  // Handle re-run job
  const handleReRun = async () => {
    setIsReRunning(true);
    try {
      // Get the workflow for this job
      const workflow = useWorkspaceStore.getState().workflows.find(w => w.id === job.workflowId);
      if (!workflow) {
        toast.error('Workflow not found');
        return;
      }

      // Execute the job via API
      const response = await fetch(API_ENDPOINTS.WORKSPACE_EXECUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: workflow.id,
          sourceWorkflowId: workflow.sourceWorkflowId,
          workflowName: workflow.name,
          fileInputs: job.fileInputs,
          textInputs: job.textInputs,
          folderPath: job.folderPath,
          deleteSourceFiles: job.deleteSourceFiles || false,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : { success: false, error: 'Empty response' };
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute job');
      }

      // Create job in store
      const newJob: Job = {
        id: data.jobId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        fileInputs: job.fileInputs,
        textInputs: job.textInputs,
        status: 'pending',
        taskId: data.taskId,
        createdAt: Date.now(),
        folderPath: job.folderPath,
        deleteSourceFiles: job.deleteSourceFiles || false,
      };

      addJob(newJob);

      // Switch to the new job
      if (onBack) {
        onBack();
      }
      setSelectedJob(newJob.id);

      toast.success('Job re-started');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to re-run job';
      toast.error(errorMessage);
    } finally {
      setIsReRunning(false);
    }
  };

  // Handle delete job
  const handleDelete = () => {
    if (confirm('Delete this job? This action cannot be undone.')) {
      deleteJob(jobId);
      onBack?.();
    }
  };

  // Handle download output
  const handleDownloadOutput = async (output: any) => {
    if (!output.path || !output.fileName) return;

    try {
      await downloadFile(output.path, output.fileName);
      toast.success('Download started');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  // Handle text edit with real-time translation
  const handleTextEdit = (filePath: string, lang: 'original' | 'en' | 'zh', value: string, pane: 'left' | 'right') => {
    // Update the edited text immediately
    setEditedText(prev => ({
      ...prev,
      [filePath]: {
        ...prev[filePath],
        [lang]: value
      }
    }));

    // Clear existing timer for this file/pane combination
    const timerKey = `${filePath}-${pane}`;
    if (debouncedTimers[timerKey]) {
      clearTimeout(debouncedTimers[timerKey]);
    }

    // Debounce translation (500ms delay)
    const timer = setTimeout(async () => {
      // Determine target language based on pane
      const otherPane = pane === 'left' ? rightLang : leftLang;

      // Show translating state
      setTranslating(prev => ({ ...prev, [filePath]: pane }));

      try {
        // Detect language of the input
        const detectResponse = await fetch(`/api/translate?text=${encodeURIComponent(value.slice(0, 500))}`);
        if (!detectResponse.ok) {
          throw new Error('Language detection failed');
        }

        const detectData = await detectResponse.json();
        if (!detectData.success) {
          throw new Error('Language detection failed');
        }

        const detectedLang = detectData.detectedLang;

        // If other pane is 'original', translate to the opposite language
        if (otherPane === 'original') {
          // Determine target language: if current is zh, translate to en; if en, translate to zh
          const targetLang = detectedLang === 'zh' ? 'en' : 'zh';

          // Skip if already in target language
          if (detectedLang === targetLang) {
            setEditedText(prev => ({
              ...prev,
              [filePath]: {
                ...prev[filePath],
                original: value
              }
            }));
            setTranslating(prev => ({ ...prev, [filePath]: null }));
            return;
          }

          // Translate to the opposite language
          const translateResponse = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: value,
              sourceLang: detectedLang,
              targetLang: targetLang,
            }),
          });

          if (!translateResponse.ok) {
            throw new Error('Translation failed');
          }

          const translateData = await translateResponse.json();
          if (!translateData.success) {
            throw new Error(translateData.error || 'Translation failed');
          }

          // Update both original and the translated language
          setEditedText(prev => ({
            ...prev,
            [filePath]: {
              ...prev[filePath],
              original: value,
              [targetLang]: translateData.translatedText
            }
          }));
          setTranslating(prev => ({ ...prev, [filePath]: null }));
          return;
        }

        // Skip if detected language is the same as target language (nothing to translate)
        if (detectedLang === otherPane) {
          setTranslating(prev => ({ ...prev, [filePath]: null }));
          return;
        }

        // Translate to the other pane's language
        const translateResponse = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: value,
            sourceLang: detectedLang === 'en' || detectedLang === 'zh' ? detectedLang : 'autodetect',
            targetLang: otherPane,
          }),
        });

        if (!translateResponse.ok) {
          throw new Error('Translation failed');
        }

        const translateData = await translateResponse.json();
        if (!translateData.success) {
          throw new Error(translateData.error || 'Translation failed');
        }

        // Update the other pane with translated text
        setEditedText(prev => ({
          ...prev,
          [filePath]: {
            ...prev[filePath],
            [otherPane]: translateData.translatedText
          }
        }));
      } catch (error) {
        console.error('Real-time translation error:', error);
        // Don't show error to user on every keystroke, just log it
      } finally {
        setTranslating(prev => ({ ...prev, [filePath]: null }));
      }
    }, 500);

    setDebouncedTimers(prev => ({ ...prev, [timerKey]: timer }));
  };

  // Handle save text changes
  const handleSaveText = async (filePath: string, lang: 'original' | 'en' | 'zh') => {
    const content = editedText[filePath]?.[lang];
    if (content === undefined) return;

    setIsSaving(true);
    try {
      const response = await fetch(API_ENDPOINTS.WORKSPACE_UPDATE_CONTENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Save failed');

      toast.success('File updated successfully');
      
      // Update local store state too so it's persistent across re-renders
      if (job.results?.textOutputs) {
        const newTextOutputs = job.results.textOutputs.map(output => {
          if (output.filePath === filePath) {
            return {
              ...output,
              content: {
                ...output.content,
                [lang]: content
              }
            };
          }
          return output;
        });
        
        updateJob(jobId, {
          results: {
            ...job.results,
            textOutputs: newTextOutputs
          }
        });
      }
    } catch (error) {
      console.error('Failed to save text:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save text');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Swap languages
  const handleSwapLanguages = () => {
    setLeftLang(rightLang);
    setRightLang(leftLang);
  };

  // Handle decoded file from duck decode
  const handleFileDecoded = (sourcePath: string, decodedPath: string, fileType: string, decodedFileType: 'image' | 'video') => {
    setDecodedFiles(prev => ({
      ...prev,
      [sourcePath]: { decodedPath, fileType, decodedFileType }
    }));
    // Update image version to force cache refresh (using timestamp)
    setImageVersion(prev => ({
      ...prev,
      [sourcePath]: Date.now()
    }));
  };

  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Format date
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  // Get status color
  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className={cn('space-y-6 h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{job.workflowName}</h2>
              <Badge className={cn('capitalize', getStatusColor(job.status))}>
                {job.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
              <span>ID: {job.id.slice(0, 8)}</span>
              {job.startedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(job.startedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {(job.status === 'completed' || job.status === 'failed') && (
            <Button onClick={handleReRun} disabled={isReRunning} size="sm">
              <RefreshCw className={cn('h-4 w-4 mr-1', isReRunning && 'animate-spin')} />
              Re-run
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Inputs */}
      <div className="shrink-0 space-y-3">
        <h3 className="text-sm font-medium text-gray-500">Inputs</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
           {job.fileInputs.map((input, index) => (
             <div key={index} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
               {input.fileType === 'image' ? (
                 <img
                   src={`/api/images/serve?path=${encodeURIComponent(input.filePath)}`}
                   alt={input.fileName}
                   className="object-contain w-full h-full"
                 />
               ) : (
                 <div className="flex items-center justify-center w-full h-full text-gray-400">
                   <Video className="h-8 w-8" />
                 </div>
               )}
               <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-xs truncate">
                 <span title={input.fileName}>{input.fileName}</span>
               </div>
             </div>
           ))}
        </div>
        {/* Text inputs if any */}
        {Object.keys(job.textInputs).length > 0 && (
           <div className="flex flex-wrap gap-2 mt-2">
             {Object.entries(job.textInputs).map(([key, value]) => (
               <Badge key={key} variant="outline" className="py-1">
                 <span className="font-semibold mr-1">{key}:</span> {value}
               </Badge>
             ))}
           </div>
        )}
      </div>
      
      <Separator />

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {job.status === 'failed' && job.error && (
          <Card className="p-4 border-red-200 bg-red-50 shrink-0">
            <h3 className="font-medium text-red-900 mb-1">Error</h3>
            <p className="text-sm text-red-700">{job.error}</p>
          </Card>
        )}

        {isTranslating && (
           <div className="flex items-center gap-2 text-sm text-blue-600 shrink-0">
             <Loader2 className="h-3 w-3 animate-spin" />
             Translating...
           </div>
        )}

        {/* Text Outputs - Split View */}
        {job.results?.textOutputs && job.results.textOutputs.length > 0 ? (
          <div className="flex-1 flex flex-col min-h-0">
             <div className="flex items-center justify-between mb-2 shrink-0">
               <h3 className="text-sm font-medium text-gray-500">Translation Result</h3>
               <Button variant="ghost" size="sm" onClick={handleSwapLanguages} title="Swap languages">
                 <ArrowRightLeft className="h-4 w-4" />
               </Button>
             </div>
             
             <div className="flex-1 grid grid-cols-2 gap-4 min-h-[500px]">
               {/* Left Pane */}
               <Card className="flex flex-col overflow-hidden bg-white">
                 <div className="p-2 border-b bg-gray-50 flex justify-between items-center text-xs font-medium text-gray-500">
                    <Select value={leftLang} onValueChange={(value: any) => setLeftLang(value)}>
                      <SelectTrigger className="h-6 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-blue-600 hover:text-blue-700"
                        title="Save changes to original file"
                        onClick={() => {
                          // Find the first output for now - in reality might need more complex UI
                          const output = job.results?.textOutputs?.[0];
                          if (output) handleSaveText(output.filePath, leftLang);
                        }}
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          const content = job.results?.textOutputs?.map(t =>
                            editedText[t.filePath]?.[leftLang] || t.content[leftLang as keyof typeof t.content] || ''
                          ).join('\n\n') || '';
                          navigator.clipboard.writeText(content);
                          toast.success('Copied');
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                 </div>
                 <div className="flex-1 p-0 overflow-hidden flex flex-col">
                   {job.results.textOutputs.map((output, idx) => {
                     const originalContent = leftLang === 'original' ? output.content.original : output.content[leftLang as keyof typeof output.content] || '';
                     const currentVal = editedText[output.filePath]?.[leftLang] ?? originalContent;
                     const isPaneTranslating = translating[output.filePath] === 'left';

                     return (
                        <div key={idx} className="flex-1 flex flex-col min-h-0 relative">
                          <Textarea
                            value={currentVal}
                            onChange={(e) => handleTextEdit(output.filePath, leftLang, e.target.value, 'left')}
                            className="flex-1 resize-none border-none focus-visible:ring-0 rounded-none p-4 font-mono text-sm"
                            placeholder="No content available..."
                          />
                          {isPaneTranslating && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Translating...
                            </div>
                          )}
                          {output.translationError && leftLang !== 'original' && (
                            <div className="p-2 text-xs text-red-500 italic bg-red-50">Error: {output.translationError}</div>
                          )}
                        </div>
                     );
                   })}
                 </div>
               </Card>

               {/* Right Pane */}
               <Card className="flex flex-col overflow-hidden bg-gray-50">
                 <div className="p-2 border-b bg-gray-100 flex justify-between items-center text-xs font-medium text-gray-500">
                    <Select value={rightLang} onValueChange={(value: any) => setRightLang(value)}>
                      <SelectTrigger className="h-6 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-blue-600 hover:text-blue-700"
                        title="Save changes to original file"
                        onClick={() => {
                          const output = job.results?.textOutputs?.[0];
                          if (output) handleSaveText(output.filePath, rightLang);
                        }}
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          const content = job.results?.textOutputs?.map(t =>
                            editedText[t.filePath]?.[rightLang] || t.content[rightLang as keyof typeof t.content] || ''
                          ).join('\n\n') || '';
                          navigator.clipboard.writeText(content);
                          toast.success('Copied');
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                 </div>
                 <div className="flex-1 p-0 overflow-hidden flex flex-col">
                    {job.results.textOutputs.map((output, idx) => {
                     const originalContent = rightLang === 'original' ? output.content.original : output.content[rightLang as keyof typeof output.content] || '';
                     const currentVal = editedText[output.filePath]?.[rightLang] ?? originalContent;
                     const isPaneTranslating = translating[output.filePath] === 'right';

                     return (
                        <div key={idx} className="flex-1 flex flex-col min-h-0 relative">
                          <Textarea
                            value={currentVal}
                            onChange={(e) => handleTextEdit(output.filePath, rightLang, e.target.value, 'right')}
                            className="flex-1 resize-none border-none focus-visible:ring-0 rounded-none p-4 font-mono text-sm bg-transparent"
                            placeholder="No content available..."
                          />
                          {isPaneTranslating && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Translating...
                            </div>
                          )}
                          {output.translationError && rightLang !== 'original' && (
                            <div className="p-2 text-xs text-red-500 italic bg-red-50">Error: {output.translationError}</div>
                          )}
                        </div>
                     );
                   })}
                 </div>
               </Card>
             </div>
          </div>
        ) : (
          /* File Outputs / No Text Output Case */
          job.results?.outputs && job.results.outputs.length > 0 ? (
            <div className="space-y-2">
               <h3 className="text-sm font-medium text-gray-500">Output Files</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {job.results.outputs.map((output, idx) => {
                   const decodedFile = output.path ? decodedFiles[output.path] : null;

                   return (
                   <Card key={idx} className="p-3">
                      <div className="flex items-center gap-3 mb-3">
                         {output.fileType === 'image' ? (
                           <ImageIcon className="h-5 w-5 text-blue-500"/>
                         ) : output.fileType === 'video' ? (
                           <Video className="h-5 w-5 text-purple-500"/>
                         ) : (
                           <FileText className="h-5 w-5 text-gray-500"/>
                         )}
                         <div className="min-w-0 flex-1">
                           <p className="text-sm font-medium truncate" title={output.fileName}>{output.fileName}</p>
                           <p className="text-xs text-gray-500">{formatFileSize(output.fileSize || 0)}</p>
                         </div>
                         <div className="flex gap-2">
                            {output.fileType === 'image' && output.path && (
                              <DuckDecodeButton
                                imagePath={output.path}
                                jobId={jobId}
                                onDecoded={(decodedPath, fileType, decodedFileType) =>
                                  handleFileDecoded(output.path!, decodedPath, fileType, decodedFileType)
                                }
                              />
                            )}
                            {output.path && (
                              <Button variant="outline" size="sm" onClick={() => handleDownloadOutput(output)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                         </div>
                      </div>

                      {/* Show original media or decoded media */}
                      {(output.fileType === 'image' || output.fileType === 'video') && output.path && (
                         <div className="relative aspect-video bg-gray-100 rounded overflow-hidden mb-2">
                           {/* Use decoded path if available, otherwise use original path */}
                           {decodedFile?.decodedFileType === 'video' || output.fileType === 'video' ? (
                             <video
                               src={`/api/videos/serve?path=${encodeURIComponent(decodedFile?.decodedPath || output.path)}&v=${imageVersion[output.path] || 0}`}
                               className="w-full h-full object-contain"
                               controls
                               preload="metadata"
                             />
                           ) : (
                             <img
                               src={`/api/images/serve?path=${encodeURIComponent(decodedFile?.decodedPath || output.path)}&v=${imageVersion[output.path] || 0}`}
                               alt={decodedFile ? `Decoded: ${output.fileName}` : output.fileName}
                               className="object-contain w-full h-full"
                             />
                           )}
                           {/* Show badge if decoded */}
                           {decodedFile && (
                             <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                               <CheckCircle2 className="h-3 w-3" />
                               Decoded
                             </div>
                           )}
                         </div>
                      )}

                      {/* Show decoded file info if available */}
                      {decodedFile && (
                         <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                <p className="text-xs font-medium text-green-800">
                                  Decoded: {getBasename(decodedFile.decodedPath)}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => downloadFile(decodedFile.decodedPath, getBasename(decodedFile.decodedPath))}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </div>
                         </div>
                      )}
                   </Card>
                   );
                 })}
               </div>
            </div>
          ) : job.status === 'completed' ? (
             <div className="text-center py-12 text-gray-500">
               No outputs generated
             </div>
          ) : null
        )}
      </div>
    </div>
  );
}
