import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { duckImagePath, password = "", outputPath, jobId } = await request.json();

    // Validation
    if (!duckImagePath) {
      return NextResponse.json(
        { error: 'Duck image path is required' },
        { status: 400 }
      );
    }

    // Validate file exists
    if (!fs.existsSync(duckImagePath)) {
      return NextResponse.json(
        { error: 'Duck image file not found' },
        { status: 404 }
      );
    }

    // Validate file type
    const validExtensions = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(duckImagePath).toLowerCase();
    if (!validExtensions.includes(ext)) {
      return NextResponse.json(
        { error: 'Invalid file type. Duck images must be PNG or JPG.' },
        { status: 400 }
      );
    }

    // Determine output directory (result directory in job folder)
    const jobDir = path.dirname(duckImagePath);
    const resultDir = path.join(jobDir, 'result');

    // Ensure result directory exists
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    // Build duck-decode command
    const duckDecodeCommand = [
      'runninghub',
      'duck-decode',
      `"${duckImagePath}"`,
      password ? `--password "${password}"` : '',
      outputPath ? `--out "${outputPath}"` : ''
    ].filter(Boolean).join(' ');

    // Execute decode command (timeout: 60 seconds)
    const result = execSync(duckDecodeCommand, {
      encoding: 'utf-8',
      timeout: 60000,
      cwd: process.env.WORKSPACE_PATH || path.join(process.env.HOME || '', 'Downloads', 'workspace')
    });

    // Parse output to find decoded file path
    // Command prints: "Successfully saved extracted data to: /path/to/file.jpg"
    const decodedPathMatch = result.match(/Successfully saved extracted data to: (.+)/);
    const decodedFilePath = decodedPathMatch ? decodedPathMatch[1].trim() : null;

    if (!decodedFilePath) {
      return NextResponse.json(
        { error: 'Failed to extract decoded file path from output' },
        { status: 500 }
      );
    }

    // Get file size
    let fileSize = 0;
    try {
      const stats = fs.statSync(decodedFilePath);
      fileSize = stats.size;
    } catch (error) {
      console.error('Failed to get file size:', error);
    }

    return NextResponse.json({
      success: true,
      decodedFilePath,
      fileType: path.extname(decodedFilePath),
      fileSize
    });

  } catch (error: any) {
    console.error('Duck decode failed:', error);

    // Check for common errors
    const errorMessage = error.message || error.stderr || error.stdout || '';

    if (errorMessage.includes('Wrong password') || errorMessage.includes('密码错误')) {
      return NextResponse.json(
        { error: 'Wrong password / 密码错误' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('Insufficient image data') || errorMessage.includes('图像数据不足')) {
      return NextResponse.json(
        { error: 'Insufficient image data / 图像数据不足' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('Payload length invalid') || errorMessage.includes('载荷长度异常')) {
      return NextResponse.json(
        { error: 'Payload length invalid / 载荷长度异常' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('Header corrupted') || errorMessage.includes('文件头损坏')) {
      return NextResponse.json(
        { error: 'Header corrupted / 文件头损坏' },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: errorMessage || 'Duck decode failed' },
      { status: 500 }
    );
  }
}
