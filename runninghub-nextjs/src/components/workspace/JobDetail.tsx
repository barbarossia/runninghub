/**
 * Job Detail Component
 * Displays detailed job information with re-run capability
 */

'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/workspace';

export interface JobDetailProps {
  jobId: string;
  onBack?: () => void;
  className?: string;
}

export function JobDetail({ jobId, onBack, className = '' }: JobDetailProps) {
  const { getJobById, reRunJob, deleteJob } = useWorkspaceStore();
  const [isReRunning, setIsReRunning] = useState(false);

  const job = getJobById(jobId);

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

  // Format date
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  // Get status color
  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold">{job.workflowName}</h2>
            <p className="text-sm text-gray-500">Job ID: {job.id.slice(0, 8)}...</p>
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

      {/* Status card */}
      <Card className={cn('p-4', getStatusColor(job.status), 'border-2')}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {job.status === 'completed' && <CheckCircle2 className="h-5 w-5" />}
              {job.status === 'failed' && <XCircle className="h-5 w-5" />}
              <span className="font-medium capitalize">{job.status}</span>
            </div>
            <div className="text-sm opacity-80">
              Created: {formatDate(job.createdAt)}
            </div>
            {job.startedAt && (
              <div className="text-sm opacity-80">
                Started: {formatDate(job.startedAt)}
              </div>
            )}
            {job.completedAt && (
              <div className="text-sm opacity-80">
                Completed: {formatDate(job.completedAt)}
              </div>
            )}
          </div>
          {job.taskId && (
            <Badge variant="outline" className="text-xs">
              Task: {job.taskId}
            </Badge>
          )}
        </div>
      </Card>

      {/* Error message */}
      {job.status === 'failed' && job.error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <h3 className="font-medium text-red-900 mb-2">Error</h3>
          <p className="text-sm text-red-700">{job.error}</p>
        </Card>
      )}

      {/* Details tabs */}
      <Tabs defaultValue="inputs">
        <TabsList>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          {job.status === 'completed' && <TabsTrigger value="results">Results</TabsTrigger>}
        </TabsList>

        {/* Inputs tab */}
        <TabsContent value="inputs" className="space-y-4">
          {/* File inputs */}
          {job.fileInputs.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">File Inputs</h3>
              <div className="space-y-2">
                {job.fileInputs.map((input, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center gap-3">
                      {input.fileType === 'image' ? (
                        <ImageIcon className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Video className="h-5 w-5 text-purple-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{input.fileName}</p>
                        <p className="text-xs text-gray-500 truncate">{input.filePath}</p>
                      </div>
                      <Badge variant={input.valid ? 'default' : 'destructive'} className="text-xs">
                        {input.valid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Text inputs */}
          {Object.keys(job.textInputs).length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Text Inputs</h3>
              <div className="space-y-2">
                {Object.entries(job.textInputs).map(([key, value]) => (
                  <Card key={key} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{key}</span>
                    </div>
                    <p className="text-sm">{value || '<empty>'}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Source file cleanup */}
          {job.deleteSourceFiles && (
            <div>
              <h3 className="text-sm font-medium mb-3">Source File Cleanup</h3>
              <Card className="p-4 bg-orange-50 border-orange-200">
                <div className="flex items-center gap-2 text-sm">
                  <Trash2 className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Source files deleted after completion</span>
                </div>
                {job.deletedSourceFiles && job.deletedSourceFiles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">
                      Deleted {job.deletedSourceFiles.length} file{job.deletedSourceFiles.length !== 1 ? 's' : ''}:
                    </p>
                    <div className="space-y-1">
                      {job.deletedSourceFiles.map((file, index) => (
                        <p key={index} className="text-xs text-gray-500 truncate font-mono">
                          {file}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Results tab */}
        {job.status === 'completed' && (
          <TabsContent value="results" className="space-y-4">
            {job.results ? (
              <>
                {/* Outputs */}
                {job.results.outputs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Outputs</h3>
                    <div className="space-y-2">
                      {job.results.outputs.map((output, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {output.type}
                            </Badge>
                            {output.parameterId && (
                              <span className="text-xs text-gray-500">{output.parameterId}</span>
                            )}
                          </div>
                          {output.path && (
                            <p className="text-sm font-mono text-gray-700 truncate">{output.path}</p>
                          )}
                          {output.content && (
                            <p className="text-sm text-gray-700 line-clamp-3">{output.content}</p>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {job.results.summary && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Summary</h3>
                    <Card className="p-4">
                      <p className="text-sm text-gray-700">{job.results.summary}</p>
                    </Card>
                  </div>
                )}

                {/* Text outputs with translation support */}
                {job.results.textOutputs && job.results.textOutputs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Text Outputs</h3>
                    <div className="space-y-2">
                      {job.results.textOutputs.map((textOutput, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{textOutput.fileName}</p>
                              <p className="text-xs text-gray-500 truncate">{textOutput.filePath}</p>
                            </div>
                            <Button variant="outline" size="sm" className="h-7">
                              <Download className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <Tabs defaultValue="original">
                            <TabsList className="w-full">
                              <TabsTrigger value="original" className="flex-1">Original</TabsTrigger>
                              {textOutput.content.en && (
                                <TabsTrigger value="en" className="flex-1">English</TabsTrigger>
                              )}
                              {textOutput.content.zh && (
                                <TabsTrigger value="zh" className="flex-1">Chinese</TabsTrigger>
                              )}
                            </TabsList>
                            <TabsContent value="original" className="mt-2">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                                {textOutput.content.original}
                              </p>
                            </TabsContent>
                            {textOutput.content.en && (
                              <TabsContent value="en" className="mt-2">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                                  {textOutput.content.en}
                                </p>
                              </TabsContent>
                            )}
                            {textOutput.content.zh && (
                              <TabsContent value="zh" className="mt-2">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                                  {textOutput.content.zh}
                                </p>
                              </TabsContent>
                            )}
                          </Tabs>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Card className="p-8 text-center text-gray-500">
                <p className="text-sm">No results available</p>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
