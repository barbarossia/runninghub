'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import path from 'path';

interface DuckDecodeButtonProps {
  imagePath: string;
  jobId: string;
  onDecoded?: (decodedFilePath: string, fileType: string, decodedFileType: 'image' | 'video') => void;
}

interface DecodeResult {
  decodedFilePath: string;
  fileType: string;
  decodedFileType: 'image' | 'video';
  fileSize: number;
}

export function DuckDecodeButton({ imagePath, jobId, onDecoded }: DuckDecodeButtonProps) {
  const [showDecodeDialog, setShowDecodeDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decodedResult, setDecodedResult] = useState<DecodeResult | null>(null);

  const handleDecode = async () => {
    setIsDecoding(true);
    setError(null);
    setDecodedResult(null);

    try {
      const response = await fetch('/api/workspace/duck-decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duckImagePath: imagePath,
          password: password,
          jobId: jobId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Decode failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Decode failed');
      }

      // Success
      setDecodedResult({
        decodedFilePath: data.decodedFilePath,
        fileType: data.fileType,
        decodedFileType: data.decodedFileType || 'image',
        fileSize: data.fileSize
      });

      toast.success(`Successfully decoded: ${path.basename(data.decodedFilePath)}`);

      // Notify parent component
      if (onDecoded) {
        onDecoded(data.decodedFilePath, data.fileType, data.decodedFileType || 'image');
      }

      // Close dialog after success
      setTimeout(() => {
        setShowDecodeDialog(false);
        setPassword('');
        setDecodedResult(null);
      }, 2000);

    } catch (err: any) {
      console.error('Decode error:', err);
      setError(err.message || 'Failed to decode image');
      toast.error('Decode failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDecoding(false);
    }
  };

  const handleCancel = () => {
    setShowDecodeDialog(false);
    setPassword('');
    setError(null);
    setDecodedResult(null);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowDecodeDialog(true)}
        className="gap-2"
      >
        <Eye className="h-4 w-4" />
        Decode Hidden Data
      </Button>

      <Dialog open={showDecodeDialog} onOpenChange={setShowDecodeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decode Hidden Data</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info message */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                This will attempt to decode hidden data from the duck image using LSB steganography.
              </AlertDescription>
            </Alert>

            {/* File path */}
            <div className="text-sm">
              <span className="font-medium">Image:</span>{' '}
              <span className="text-gray-600">{path.basename(imagePath)}</span>
            </div>

            {/* Password input */}
            <div>
              <Label htmlFor="password">Password (Optional)</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password if image is protected"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isDecoding}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty if the image is not password-protected
              </p>
            </div>

            {/* Progress */}
            {isDecoding && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Decoding...</span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success result */}
            {decodedResult && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <div className="font-medium">Decode Successful!</div>
                  <div className="mt-1">
                    File: {path.basename(decodedResult.decodedFilePath)}
                  </div>
                  <div className="text-xs text-gray-600">
                    Type: {decodedResult.fileType}
                    {' '}
                    • Size: {(decodedResult.fileSize / 1024).toFixed(1)} KB
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isDecoding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDecode}
              disabled={isDecoding}
            >
              {isDecoding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Decoding...
                </>
              ) : (
                'Decode'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
