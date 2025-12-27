/**
 * Custom Workflow ID Dialog
 * Dialog for manually adding workflow IDs and saving them to .env.local
 */

'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface CustomWorkflowIdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkflowSaved: () => void;
}

export function CustomWorkflowIdDialog({
  open,
  onOpenChange,
  onWorkflowSaved,
}: CustomWorkflowIdDialogProps) {
  const [step, setStep] = useState<'enter' | 'review'>('enter');
  const [workflowId, setWorkflowId] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [envKey, setEnvKey] = useState('');
  const [fetchedWorkflow, setFetchedWorkflow] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Generate env key and workflow name on mount
  useEffect(() => {
    if (open && step === 'enter') {
      const timestamp = Date.now();
      setEnvKey(`NEXT_PUBLIC_RUNNINGHUB_CUSTOM_ID_${timestamp}`);
      setWorkflowName(`Custom Workflow ${new Date(timestamp).toLocaleTimeString()}`);
    }
  }, [open, step]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep('enter');
      setWorkflowId('');
      setFetchedWorkflow(null);
    }
  }, [open]);

  // Fetch workflow from API
  const handleFetchWorkflow = async () => {
    if (!workflowId.trim()) {
      toast.error('Please enter a workflow ID');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/workflow/validate-custom-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid workflow ID');
      }

      const data = await response.json();
      setFetchedWorkflow(data.workflow);
      setStep('review');
      toast.success('Workflow found!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch workflow. Please check the workflow ID.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save to .env.local
  const handleSaveToEnvLocal = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/workflow/add-custom-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          workflowName,
          envKey,
          workflow: fetchedWorkflow,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save workflow');
      }

      toast.success('Custom workflow ID saved successfully!');
      onWorkflowSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save workflow to .env.local');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Add Custom Workflow ID</DialogTitle>

        {/* Step 1: Enter Workflow ID */}
        {step === 'enter' && (
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="workflow-id">Workflow ID</Label>
              <Input
                id="workflow-id"
                placeholder="Enter workflow ID from RunningHub..."
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchWorkflow()}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the workflow ID from your RunningHub account
              </p>
            </div>

            <Button
              onClick={handleFetchWorkflow}
              disabled={!workflowId.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching Workflow...
                </>
              ) : (
                'Fetch Workflow'
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Review and Save */}
        {step === 'review' && (
          <div className="space-y-4 py-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Workflow Found</AlertTitle>
              <AlertDescription>
                Found workflow with {fetchedWorkflow?.inputs?.length || 0} input parameter(s)
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Auto-generated name"
                disabled={isSaving}
              />
            </div>

            <div>
              <Label htmlFor="env-key">Environment Variable</Label>
              <Input
                id="env-key"
                value={envKey}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be added to your .env.local file
              </p>
            </div>

            <div className="border rounded p-3">
              <p className="text-sm font-medium mb-2">Parameters:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {fetchedWorkflow?.inputs?.map((input: any, idx: number) => (
                  <div key={idx} className="text-sm flex justify-between items-center">
                    <span className="truncate flex-1">{input.name || input.id}</span>
                    <Badge variant={input.required ? 'default' : 'secondary'} className="ml-2">
                      {input.required ? 'Required' : 'Optional'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSaveToEnvLocal}
              disabled={isSaving || !workflowName.trim()}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save to .env.local'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setStep('enter')}
              disabled={isSaving}
              className="w-full"
            >
              Back
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving || isLoading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
