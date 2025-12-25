/**
 * Workflow List Component
 * Displays list of configured workflows with edit/delete actions
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Settings,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { WorkflowEditor } from './WorkflowEditor';
import type { Workflow } from '@/types/workspace';

export interface WorkflowListProps {
  onSelectWorkflow?: (workflow: Workflow) => void;
  className?: string;
}

export function WorkflowList({ onSelectWorkflow, className = '' }: WorkflowListProps) {
  const { workflows, addWorkflow, updateWorkflow, deleteWorkflow } = useWorkspaceStore();

  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>();
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Handle create workflow
  const handleCreateWorkflow = () => {
    setEditingWorkflow(undefined);
    setIsEditorOpen(true);
  };

  // Handle edit workflow
  const handleEditWorkflow = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setIsEditorOpen(true);
  };

  // Handle save workflow
  const handleSaveWorkflow = (workflow: Workflow) => {
    if (editingWorkflow) {
      updateWorkflow(workflow.id, workflow);
    } else {
      addWorkflow(workflow);
    }
    setIsEditorOpen(false);
    setEditingWorkflow(undefined);
  };

  // Handle delete workflow
  const handleDeleteWorkflow = () => {
    if (deletingWorkflowId) {
      deleteWorkflow(deletingWorkflowId);
      setDeletingWorkflowId(undefined);
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const requiredParams = (workflow: Workflow) =>
    workflow.inputs.filter((i) => i.required).length;
  const optionalParams = (workflow: Workflow) =>
    workflow.inputs.filter((i) => !i.required).length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Workflows</h2>
          <p className="text-sm text-gray-500">
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Button onClick={handleCreateWorkflow} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Create New
        </Button>
      </div>

      {/* Workflow list */}
      {workflows.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows configured</h3>
          <p className="text-sm text-gray-500 mb-4">
            Create your first workflow to start processing files
          </p>
          <Button onClick={handleCreateWorkflow}>
            <Plus className="h-4 w-4 mr-1" />
            Create Workflow
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {workflows.map((workflow) => (
              <motion.div
                key={workflow.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={cn(
                    'p-4 transition-all hover:shadow-md cursor-pointer',
                    onSelectWorkflow && 'hover:border-blue-300'
                  )}
                  onClick={() => onSelectWorkflow?.(workflow)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Icon and info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Settings className="h-5 w-5 text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{workflow.name}</h3>
                        </div>

                        {workflow.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{workflow.description}</p>
                        )}

                        {/* Parameters info */}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {requiredParams(workflow)} required
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {optionalParams(workflow)} optional
                          </Badge>
                        </div>

                        {/* Created date */}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>Created {formatDate(workflow.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditWorkflow(workflow);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingWorkflowId(workflow.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Workflow Editor Dialog */}
      <WorkflowEditor
        workflow={editingWorkflow}
        open={isEditorOpen}
        onSave={handleSaveWorkflow}
        onCancel={() => {
          setIsEditorOpen(false);
          setEditingWorkflow(undefined);
        }}
        onDelete={deletingWorkflowId ? undefined : handleDeleteWorkflow}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingWorkflowId} onOpenChange={() => setDeletingWorkflowId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkflow}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
