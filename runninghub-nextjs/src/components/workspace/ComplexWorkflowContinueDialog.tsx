/**
 * Complex Workflow Continue Dialog
 * Dialog for continuing to next step with parameter mapping
 */

'use client';

import { useState, useMemo } from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import type {
  WorkflowStep,
  JobResult,
  StepParameterConfig,
} from '@/types/workspace';

export interface ComplexWorkflowContinueDialogProps {
  open: boolean;
  onClose: () => void;
  onContinue: (parameters: Record<string, any>) => void;
  nextStep: WorkflowStep;
  previousOutputs?: JobResult;
  currentJobOutputs?: JobResult;
}

export function ComplexWorkflowContinueDialog({
  open,
  onClose,
  onContinue,
  nextStep,
  previousOutputs,
  currentJobOutputs,
}: ComplexWorkflowContinueDialogProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Build available outputs map from previous steps
  const availableOutputsMap = useMemo(() => {
    const map = new Map<string, any>();
    
    const addOutputs = (outputs: JobResult | undefined) => {
      if (!outputs) return;
      
      if (outputs.outputs && outputs.outputs.length > 0) {
        outputs.outputs.forEach((output, index) => {
          // Map by parameterId
          if (output.parameterId) {
            map.set(output.parameterId, output);
          }
          // Also map by index
          map.set(`output_${index}`, output);
        });
      }
    };
    
    // Add outputs from all previous steps
    if (previousOutputs) {
      addOutputs(previousOutputs);
    }
    
    return map;
  }, [previousOutputs, currentJobOutputs]);

  const handleParameterChange = (paramId: string, value: any) => {
    setParameters(prev => ({ ...prev, [paramId]: value }));
    // Clear error for this parameter
    if (errors[paramId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[paramId];
        return newErrors;
      });
    }
  };

  const toggleValueType = (paramId: string) => {
    const param = nextStep.parameters.find(p => p.parameterId === paramId);
    if (!param) return;
    
    if (param.valueType === 'static') {
      // Change to dynamic
      const newParameters = { ...parameters };
      delete newParameters[paramId];
      newParameters[paramId] = {
        valueType: 'dynamic',
        dynamicMapping: {
          sourceStepNumber: 1,
          sourceParameterId: '',
          sourceOutputName: '',
        },
      };
      setParameters(newParameters);
    } else {
      // Change to static, clear dynamic mapping
      const newParameters = { ...parameters };
      newParameters[paramId] = {
        valueType: 'static',
        staticValue: '',
      };
      delete newParameters[paramId].dynamicMapping;
      setParameters(newParameters);
    }
  };

  const setDynamicMapping = (paramId: string, sourceOutputKey: string) => {
    const output = availableOutputsMap.get(sourceOutputKey);
    
    if (!output) {
      toast.error('Selected output not available');
      return;
    }
    
    // Determine output value based on type
    
    setParameters(prev => {
      const newParams = { ...prev };
      
      if (!newParams[paramId]) {
        newParams[paramId] = {};
      }
      
      newParams[paramId].valueType = 'dynamic';
      newParams[paramId].dynamicMapping = {
        sourceStepNumber: 1,
        sourceParameterId: output.parameterId || '',
        sourceOutputName: sourceOutputKey,
      };
      
      // Clear error for this parameter
      const newErrors = { ...prev };
      delete newErrors[paramId];
      
      return newParams;
    });
    
    // Clear error for this parameter
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[paramId];
      return newErrors;
    });
  };

  const validateParameters = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    for (const param of nextStep.parameters) {
      if (param.valueType === 'dynamic') {
        // Dynamic mapping must have all required fields
        if (!param.dynamicMapping) {
          newErrors[param.parameterId] = 'Please select a previous output to map';
          isValid = false;
        } else if (!param.dynamicMapping.sourceOutputName) {
          newErrors[param.parameterId] = 'Please select which output to map';
          isValid = false;
        }
      } else if (param.valueType === 'static' && param.staticValue === undefined) {
        newErrors[param.parameterId] = 'Please provide a value';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleContinue = () => {
    if (!validateParameters()) {
      return;
    }

    onContinue(parameters);
    onClose();
  };

  const renderParameter = (param: StepParameterConfig) => {
    const isDynamic = param.valueType === 'dynamic';
    const error = errors[param.parameterId];

    return (
      <div key={param.parameterId} className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 block">
              {param.parameterName}
              </label>
            {param.required && <span className="text-red-500">*</span>}
          </div>
          
          {/* Type Toggle */}
          <div className="flex items-center gap-3">
            <Badge
              variant={isDynamic ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer',
                isDynamic ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
              )}
              onClick={() => toggleValueType(param.parameterId)}
            >
              {isDynamic ? 'Dynamic' : 'Static'}
            </Badge>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-xs text-red-600 mt-1">
            <AlertCircle className="h-3 w-3 inline mr-1" />
            {error}
          </div>
        )}

        {/* Input Value */}
        {isDynamic ? (
          <div className="space-y-2">
            {/* Source Step Selection */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">From:</span>
              <span className="text-sm font-medium text-gray-900">Step 1</span>
            </div>
            
            {/* Source Output Selection */}
            <div className="flex-1">
              <Select
                value={param.dynamicMapping?.sourceOutputName || ''}
                onValueChange={value => setDynamicMapping(param.parameterId, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select output" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(availableOutputsMap.entries()).map(([key, output]) => (
                    <SelectItem key={key} value={key}>
                      {output.type === 'text' ? 'Text Output' : `File: ${output.fileName || 'output'}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview of mapped value */}
            {param.dynamicMapping?.sourceOutputName && availableOutputsMap.get(param.dynamicMapping.sourceOutputName) && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                <div className="text-gray-600">
                  <span className="font-medium">Preview:</span>{' '}
                  {availableOutputsMap.get(param.dynamicMapping.sourceOutputName)?.type === 'text' ? 'Text' : 'File'}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Input
            type="text"
            value={param.staticValue as string || ''}
            onChange={e => handleParameterChange(param.parameterId, e.target.value)}
            placeholder={param.placeholder || 'Enter value'}
            className={cn('w-full', error && 'border-red-500')}
          />
        )}

        {/* Parameter ID */}
        <div className="text-xs text-gray-500 mt-1">
          {param.parameterId}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Continue to Next Step
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Next Step Info */}
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-purple-100 text-purple-800 text-sm">
                Step {nextStep.stepNumber}
              </Badge>
              <h4 className="font-semibold text-gray-900">{nextStep.workflowName}</h4>
            </div>
            <p className="text-sm text-gray-700">
              Configure input parameters for this workflow step.
            </p>
          </div>

          {/* Previous Outputs Available */}
          {availableOutputsMap.size > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Available Previous Outputs
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                Select which output from previous steps to use as input for each parameter below.
              </p>
              
              {/* Outputs Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded">
                {Array.from(availableOutputsMap.entries()).map(([key, output], index) => (
                  <div
                    key={key}
                    className="flex items-start gap-3 p-2 bg-white border border-gray-200 rounded hover:border-purple-300 cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        (output.type === 'text' ? output.content : (output.path || output.fileName)) || ''
                      );
                      toast.success('Copied to clipboard');
                    }}
                  >
                    <Badge className={cn('text-xs', output.type === 'text' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800')}>
                      {output.type === 'text' ? 'Text' : 'File'}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-1">
                        {output.parameterId || `output_${index}`}
                      </div>
                      <div className="font-medium text-sm text-gray-900">
                        {output.type === 'text'
                          ? output.content?.substring(0, 50) + (output.content?.length > 50 ? '...' : '')
                          : output.fileName || 'output'}
                      </div>
                    </div>
                    <Copy className="h-4 w-4 text-gray-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Parameters Configuration */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Parameters ({nextStep.parameters.length})
            </h4>
            
            {nextStep.parameters.map(param => renderParameter(param))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleContinue} className="flex-1">
            <ArrowRight className="h-4 w-4 mr-2" />
            Continue to Step {nextStep.stepNumber + 1}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
