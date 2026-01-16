'use client';

import { useState, useEffect } from 'react';
import { Database, Loader2, Plus, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Dataset {
  name: string;
  path: string;
  fileCount: number;
}

interface SelectDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPath: string;
  onSuccess?: (dataset: { name: string; path: string }) => void;
}

export function SelectDatasetDialog({
  open,
  onOpenChange,
  parentPath,
  onSuccess,
}: SelectDatasetDialogProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Load datasets when dialog opens
  useEffect(() => {
    if (open) {
      loadDatasets();
    }
  }, [open, parentPath]);

  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/dataset/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: parentPath }),
      });

      const data = await response.json();
      if (data.success) {
        setDatasets(data.datasets || []);
      } else {
        setDatasets([]);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
      setDatasets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewDataset = async () => {
    if (!newDatasetName.trim()) {
      toast.error('Please enter a dataset name');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/dataset/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDatasetName.trim(),
          files: [],
          parentPath,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        // Select the newly created dataset
        const newDataset = { name: data.dataset.name, path: data.dataset.path };
        setSelectedDataset(newDataset as Dataset);
        setShowCreateNew(false);
        setNewDatasetName('');
        await loadDatasets();
      } else {
        toast.error(data.error || 'Failed to create dataset');
      }
    } catch (err) {
      toast.error('Failed to create dataset');
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportToDataset = async () => {
    if (!selectedDataset) {
      toast.error('Please select a dataset');
      return;
    }

    setIsCopying(true);
    try {
      // Copy files will be handled by the onSuccess callback
      onSuccess?.(selectedDataset);
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to export to dataset');
    } finally {
      setIsCopying(false);
    }
  };

  const handleClose = () => {
    if (!isCopying && !isCreating) {
      setSelectedDataset(null);
      setShowCreateNew(false);
      setNewDatasetName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            Export to Dataset
          </DialogTitle>
          <DialogDescription>
            Select an existing dataset or create a new one to export your files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {showCreateNew ? (
            // Create new dataset form
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-dataset-name">New Dataset Name</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateNew(false);
                    setNewDatasetName('');
                  }}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  id="new-dataset-name"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  placeholder="e.g., my-dataset"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNewDataset()}
                  disabled={isCreating}
                  autoFocus
                />
                <Button
                  onClick={handleCreateNewDataset}
                  disabled={isCreating || !newDatasetName.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Dataset selection list
            <>
              <div className="flex items-center justify-between">
                <Label>Select Dataset</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateNew(true)}
                  className="h-7"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  New
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : datasets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No datasets found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateNew(true)}
                    className="mt-3"
                  >
                    Create First Dataset
                  </Button>
                </div>
              ) : (
                <div className="h-48 rounded-md border overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {datasets.map((dataset) => (
                      <button
                        key={dataset.path}
                        type="button"
                        onClick={() => setSelectedDataset(dataset)}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all
                          ${selectedDataset?.path === dataset.path
                            ? 'bg-purple-100 border-2 border-purple-500 text-purple-900'
                            : 'hover:bg-gray-100 border-2 border-transparent'
                          }
                        `}
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <FolderOpen className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{dataset.name}</p>
                          <p className="text-xs text-gray-500">
                            {dataset.fileCount} file{dataset.fileCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {selectedDataset?.path === dataset.path && (
                          <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCopying}>
            Cancel
          </Button>
          <Button
            onClick={handleExportToDataset}
            disabled={!selectedDataset || isCopying}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isCopying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Export to Dataset
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
