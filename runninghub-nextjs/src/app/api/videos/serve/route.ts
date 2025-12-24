import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoPath = searchParams.get('path');

    if (!videoPath) {
      return NextResponse.json(
        { error: 'No video path provided' },
        { status: 400 }
      );
    }

    // Resolve the full path and ensure it's within allowed directories
    const fullPath = path.resolve(videoPath);

    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'Path is not a file' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Video file not found' },
        { status: 404 }
      );
    }

    // Check if the file is a supported video format
    const ext = path.extname(fullPath).toLowerCase();
    const supportedExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv'];
    if (!supportedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: 'File is not a supported video type' },
        { status: 400 }
      );
    }

    // Read the file
    const videoBuffer = await fs.readFile(fullPath);

    // Determine content type
    const contentTypeMap: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.flv': 'video/x-flv',
    };

    const contentType = contentTypeMap[ext] || 'video/mp4';

    // Return the video with appropriate headers
    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': videoBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Accept-Ranges': 'bytes', // Support range requests for video streaming
      },
    });
  } catch (error) {
    console.error('Error serving video:', error);
    return NextResponse.json(
      { error: 'Failed to serve video' },
      { status: 500 }
    );
  }
}
