'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { validateEnvironment } from '@/utils/validation';
import { ENVIRONMENT_VARIABLES } from '@/constants';

export default function Home() {
  const [envValidation, setEnvValidation] = useState<{
    isValid: boolean;
    missing: string[];
    warnings: string[];
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Run validation only after client-side hydration
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
    setEnvValidation(validateEnvironment());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Theme Toggle */}
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            RunningHub Image Processing Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A modern web interface for processing and managing images with the RunningHub AI platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Link href="/gallery">
            <Card className="cursor-pointer transition-all hover:shadow-xl hover:scale-105 hover:border-blue-400 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🖼️</span>
                  Image Gallery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Browse and manage your images with multiple view modes.
                  Select, delete, and process images with keyboard shortcuts.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Grid View</Badge>
                  <Badge variant="secondary">List View</Badge>
                  <Badge variant="secondary">Large View</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/videos">
            <Card className="cursor-pointer transition-all hover:shadow-xl hover:scale-105 hover:border-purple-400 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🎬</span>
                  Video Conversion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Convert video files to MP4 format using FFmpeg. Supports WebM, MKV, AVI, MOV, and FLV formats.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">FFmpeg</Badge>
                  <Badge variant="secondary">Batch Conversion</Badge>
                  <Badge variant="secondary">MP4 Output</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/videos/crop">
            <Card className="cursor-pointer transition-all hover:shadow-xl hover:scale-105 hover:border-green-400 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">✂️</span>
                  Video Cropping
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Crop videos to specific regions using FFmpeg. Support for preset ratios and custom dimensions.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">FFmpeg</Badge>
                  <Badge variant="secondary">Custom Crop</Badge>
                  <Badge variant="secondary">Preset Ratios</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/videos/clip">
            <Card className="cursor-pointer transition-all hover:shadow-xl hover:scale-105 hover:border-orange-400 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📸</span>
                  Video Clipping
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Extract frames from videos as images. Supports multiple extraction modes and high-quality output.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Python</Badge>
                  <Badge variant="secondary">Batch Extract</Badge>
                  <Badge variant="secondary">Multi-mode</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="opacity-60 cursor-not-allowed border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                AI Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Process selected images using RunningHub AI workflows with real-time progress tracking.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Batch Processing</Badge>
                <Badge variant="secondary">Progress Tracking</Badge>
                <Badge variant="secondary">Real-time Updates</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="opacity-60 cursor-not-allowed border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📁</span>
                File System Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Modern File System Access API integration for secure folder selection and browsing.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Secure Access</Badge>
                <Badge variant="secondary">Cross-platform</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="opacity-60 cursor-not-allowed border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Built with Next.js 14, TypeScript, and modern web technologies for optimal performance.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Next.js 14</Badge>
                <Badge variant="secondary">TypeScript</Badge>
                <Badge variant="secondary">Tailwind CSS</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Environment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">⚙️</span>
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : envValidation ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${envValidation.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">
                    Environment Configuration: {envValidation.isValid ? 'Valid' : 'Invalid'}
                  </span>
                </div>

                {envValidation.missing.length > 0 && (
                  <div>
                    <p className="font-medium text-red-600 mb-2">Missing Variables:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {envValidation.missing.map((variable, index) => (
                        <li key={index} className="text-sm text-red-600">{variable}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {envValidation.warnings.length > 0 && (
                  <div>
                    <p className="font-medium text-yellow-600 mb-2">Warnings:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {envValidation.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-600">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4">
                  <h4 className="font-medium mb-2">Configuration Summary:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">API Host:</span> {ENVIRONMENT_VARIABLES.API_HOST}
                    </div>
                    <div>
                      <span className="font-medium">Default Node:</span> {ENVIRONMENT_VARIABLES.DEFAULT_NODE_ID}
                    </div>
                    <div>
                      <span className="font-medium">Max File Size:</span> {Math.round(ENVIRONMENT_VARIABLES.MAX_FILE_SIZE / 1024 / 1024)}MB
                    </div>
                    <div>
                      <span className="font-medium">Default Timeout:</span> {ENVIRONMENT_VARIABLES.DEFAULT_TIMEOUT}s
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Getting Started */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
          <p className="text-gray-600 mb-6">
            Click on any feature card above to get started. The application provides various tools for image and video processing.
          </p>
        </div>
      </div>
    </div>
  );
}