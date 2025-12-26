/**
 * Job Detail Component
 * Displays detailed job information with re-run capability
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import Image from 'next/image';
import { useWorkspaceStore } from '@/store/workspace-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { downloadFile } from '@/lib/download';
import { useOutputTranslation } from '@/hooks/useOutputTranslation';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/constants';
import type { Job } from '@/types/workspace';

export interface JobDetailProps {
  jobId: string;
  onBack?: () => void;
  className?: string;
}

export function JobDetail({ jobId, onBack, className = '' }: JobDetailProps) {
  const { getJobById, reRunJob, deleteJob, updateJob } = useWorkspaceStore();
  const [isReRunning, setIsReRunning] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  
  // State for split view language selection
  const [leftLang, setLeftLang] = useState<'original' | 'en' | 'zh'>('original');
  const [rightLang, setRightLang] = useState<'original' | 'en' | 'zh'>('zh');

  // Auto-translate outputs (uses server-side API)
  const { isTranslating, translatedCount } = useOutputTranslation(jobId);

  const job = getJobById(jobId);

  // Fetch job results when job is completed and results are not loaded
  useEffect(() => {
    const fetchJobResults = async () => {
      if (!job || job.status !== 'completed' || job.results || isLoadingResults) {
        return;
      }

      setIsLoadingResults(true);

      try {
        const response = await fetch(`${API_ENDPOINTS.WORKSPACE_JOB_RESULTS}?jobId=${jobId}`);
        const data = await response.json();

        if (data.success && data.results) {
          // Update job with results
          updateJob(jobId, { results: data.results });
        }
      } catch (error) {
        console.error('Failed to fetch job results:', error);
      } finally {
        setIsLoadingResults(false);
      }
    };

    fetchJobResults();
  }, [job, jobId, updateJob, isLoadingResults]);

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
      reRunJob(jobId);
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
    if (!output.workspacePath || !output.fileName) return;

    try {
      await downloadFile(output.workspacePath, output.fileName);
      toast.success('Download started');
    } catch (error) {
      toast.error('Download failed');
    }
  };
  
  // Swap languages
  const handleSwapLanguages = () => {
    setLeftLang(rightLang);
    setRightLang(leftLang);
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
          {job.status === 'completed' && (
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
                   src={`/api/workspace/serve-output?path=${encodeURIComponent(input.filePath)}`}
                   alt={input.fileName}
                   className="object-cover w-full h-full"
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
                    <span className="uppercase">{leftLang}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => {
                        const content = job.results?.textOutputs?.map(t => 
                          leftLang === 'original' ? t.content.original : (t.content[leftLang] || '')
                        ).join('\n\n') || '';
                        navigator.clipboard.writeText(content);
                        toast.success('Copied');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                 </div>
                 <div className="flex-1 p-4 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                   {job.results.textOutputs.map((output, idx) => {
                     const content = leftLang === 'original' ? output.content.original : output.content[leftLang];
                     
                     if (content) return <div key={idx} className="mb-4 last:mb-0">{content}</div>;
                     
                     if (output.translationError) {
                        return <div key={idx} className="mb-4 last:mb-0 text-red-500 italic">Error: {output.translationError}</div>;
                     }
                     if (isTranslating && !output.autoTranslated) {
                        return <div key={idx} className="mb-4 last:mb-0 text-gray-400 italic">Translating...</div>;
                     }
                     return <div key={idx} className="mb-4 last:mb-0 text-gray-400 italic">Translation not available</div>;
                   })}
                 </div>
               </Card>

               {/* Right Pane */}
               <Card className="flex flex-col overflow-hidden bg-gray-50">
                 <div className="p-2 border-b bg-gray-100 flex justify-between items-center text-xs font-medium text-gray-500">
                    <span className="uppercase">{rightLang}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => {
                         const content = job.results?.textOutputs?.map(t => 
                          rightLang === 'original' ? t.content.original : (t.content[rightLang] || '')
                        ).join('\n\n') || '';
                        navigator.clipboard.writeText(content);
                        toast.success('Copied');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                 </div>
                 <div className="flex-1 p-4 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                   {job.results.textOutputs.map((output, idx) => {
                     const content = rightLang === 'original' ? output.content.original : output.content[rightLang];
                     
                     if (content) return <div key={idx} className="mb-4 last:mb-0">{content}</div>;
                     
                     if (output.translationError) {
                        return <div key={idx} className="mb-4 last:mb-0 text-red-500 italic">Error: {output.translationError}</div>;
                     }
                     if (isTranslating && !output.autoTranslated) {
                        return <div key={idx} className="mb-4 last:mb-0 text-gray-400 italic">Translating...</div>;
                     }
                     return <div key={idx} className="mb-4 last:mb-0 text-gray-400 italic">Translation not available</div>;
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
                 {job.results.outputs.map((output, idx) => (
                   <Card key={idx} className="p-3">
                      <div className="flex items-center gap-3 mb-3">
                         {output.fileType === 'image' ? <ImageIcon className="h-5 w-5 text-blue-500"/> : <FileText className="h-5 w-5 text-gray-500"/>}
                         <div className="min-w-0 flex-1">
                           <p className="text-sm font-medium truncate" title={output.fileName}>{output.fileName}</p>
                           <p className="text-xs text-gray-500">{formatFileSize(output.fileSize || 0)}</p>
                         </div>
                         {output.workspacePath && (
                            <Button variant="outline" size="sm" onClick={() => handleDownloadOutput(output)}>
                              <Download className="h-4 w-4" />
                            </Button>
                         )}
                      </div>
                      {output.fileType === 'image' && output.workspacePath && (
                         <div className="relative aspect-video bg-gray-100 rounded overflow-hidden">
                           <img
                             src={`/api/workspace/serve-output?path=${encodeURIComponent(output.workspacePath)}`}
                             alt={output.fileName}
                             className="object-contain w-full h-full"
                           />
                         </div>
                      )}
                   </Card>
                 ))}
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
