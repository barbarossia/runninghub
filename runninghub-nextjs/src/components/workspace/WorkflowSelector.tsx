/**
 * Workflow Selector Component
 * Dropdown for selecting a configured workflow
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import { Settings, Plus, Loader2, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { Workflow } from '@/types/workspace';

export interface WorkflowSelectorProps {
  onAddWorkflow?: () => void;
  className?: string;
}

export function WorkflowSelector({ onAddWorkflow, className = '' }: WorkflowSelectorProps) {
  const { workflows, selectedWorkflowId, setSelectedWorkflow, setWorkflows } = useWorkspaceStore();

  // Loading and error states for workflow fetching
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedWorkflow = useMemo(() => {
    return workflows.find((w) => w.id === selectedWorkflowId);
  }, [workflows, selectedWorkflowId]);

  const requiredCount = useMemo(() => {
    if (!selectedWorkflow) return 0;
    return selectedWorkflow.inputs.filter((i) => i.required).length;
  }, [selectedWorkflow]);

  const optionalCount = useMemo(() => {
    if (!selectedWorkflow) return 0;
    return selectedWorkflow.inputs.filter((i) => !i.required).length;
  }, [selectedWorkflow]);

  // Load workflows from workspace folder on component mount
  useEffect(() => {
    const loadWorkflows = async () => {
      setIsLoadingWorkflows(true);
      setLoadError(null);

      try {
        const response = await fetch('/api/workflow/list');

        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : { workflows: [] };
        } catch (e) {
          throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load workflows');
        }

        // Replace localStorage workflows with fetched workflows
        setWorkflows(data.workflows || []);
      } catch (error) {
        console.error('Failed to load workflows:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load workflows');

        // Clear workflows on error (empty state)
        setWorkflows([]);
      } finally {
        setIsLoadingWorkflows(false);
      }
    };

    loadWorkflows();
  }, [setWorkflows]);

  const handleValueChange = (value: string) => {
    if (value === 'add_new') {
      onAddWorkflow?.();
    } else {
      setSelectedWorkflow(value);
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1">
        <Select value={selectedWorkflowId || ''} onValueChange={handleValueChange}>
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2 flex-1">
              <Settings className="h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Select a workflow..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            {isLoadingWorkflows ? (
              <div className="p-4 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                <span className="text-sm text-gray-500">Loading workflows...</span>
              </div>
            ) : loadError ? (
              <div className="p-4 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-600 font-medium">Failed to load workflows</p>
                  <p className="text-xs text-gray-500 mt-1">{loadError}</p>
                </div>
              </div>
            ) : workflows.length === 0 ? (
              <div className="p-2 text-sm text-gray-500 text-center">
                No workflows configured
              </div>
            ) : (
              workflows.map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{workflow.name}</span>
                    {workflow.description && (
                      <span className="text-xs text-gray-500 truncate max-w-[200px]">
                        - {workflow.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
            {onAddWorkflow && (
              <>
                {workflows.length > 0 && <div className="border-t my-1" />}
                <SelectItem value="add_new">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Configure New Workflow</span>
                  </div>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Workflow info badges */}
      {selectedWorkflow && (
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs">
            {requiredCount} required
          </Badge>
          <Badge variant="outline" className="text-xs">
            {optionalCount} optional
          </Badge>
        </div>
      )}
    </div>
  );
}
