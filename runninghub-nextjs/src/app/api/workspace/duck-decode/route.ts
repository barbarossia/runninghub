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
    const resultDir = jobDir; // duck image is already in result directory

    // Create encoded subdirectory for original duck images
    const encodedDir = path.join(resultDir, 'encoded');
    if (!fs.existsSync(encodedDir)) {
      fs.mkdirSync(encodedDir, { recursive: true });
    }

    // Get the filename and extension
    const originalFileName = path.basename(duckImagePath);
    const originalFileNameWithoutExt = path.parse(originalFileName).name;
    const originalFileExt = path.parse(originalFileName).ext;

    // Determine output path for decoded file (same name as original)
    // The decoded file will replace the duck image in the result folder
    const finalOutputPath = path.join(resultDir, originalFileName);

    // Temporary output path (with _decoded suffix to avoid conflict)
    const tempOutputPath = path.join(resultDir, `${originalFileNameWithoutExt}_decoded${originalFileExt}`);

    // Determine runninghub CLI path
    // Try environment variable first, then common locations
    let runninghubPath = process.env.RUNNINGHUB_CLI_PATH;

    if (!runninghubPath) {
      // Try common installation paths
      const commonPaths = [
        '/opt/homebrew/Caskroom/miniconda/base/bin/runninghub',
        '/usr/local/bin/runninghub',
        '/opt/homebrew/bin/runninghub',
        `${process.env.HOME}/miniconda3/bin/runninghub`,
        `${process.env.HOME}/anaconda3/bin/runninghub`,
      ];

      for (const testPath of commonPaths) {
        if (fs.existsSync(testPath)) {
          runninghubPath = testPath;
          break;
        }
      }
    }

    // If still not found, use fallback (will fail with clear error)
    if (!runninghubPath) {
      runninghubPath = 'runninghub';
    }

    // Build duck-decode command with explicit output path
    const duckDecodeCommand = [
      `"${runninghubPath}"`,
      'duck-decode',
      `"${duckImagePath}"`,
      password ? `--password "${password}"` : '',
      `--out "${tempOutputPath}"`
    ].filter(Boolean).join(' ');

    // Execute decode command (timeout: 60 seconds)
    const result = execSync(duckDecodeCommand, {
      encoding: 'utf-8',
      timeout: 60000,
      cwd: process.env.WORKSPACE_PATH || path.join(process.env.HOME || '', 'Downloads', 'workspace'),
      env: {
        ...process.env,
        RUNNINGHUB_API_KEY: process.env.RUNNINGHUB_API_KEY || process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY,
        RUNNINGHUB_WORKFLOW_ID: process.env.RUNNINGHUB_WORKFLOW_ID || process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID,
      }
    });

    // Parse output to find decoded file path
    // Command prints: "Successfully saved extracted data to: /path/to/file.jpg"
    const decodedPathMatch = result.match(/Successfully saved extracted data to: (.+)/);
    let decodedFilePath = decodedPathMatch ? decodedPathMatch[1].trim() : null;

    if (!decodedFilePath) {
      return NextResponse.json(
        { error: 'Failed to extract decoded file path from output' },
        { status: 500 }
      );
    }

    // Move original duck image to encoded folder
    try {
      const encodedImagePath = path.join(encodedDir, originalFileName);
      fs.renameSync(duckImagePath, encodedImagePath);
      console.log(`Moved original duck image to: ${encodedImagePath}`);
    } catch (error) {
      console.error('Failed to move original duck image to encoded folder:', error);
      // Continue anyway - this is not a critical failure
    }

    // Rename decoded file to have the same name as the original
    try {
      // If the final output path already exists, remove it first
      if (fs.existsSync(finalOutputPath)) {
        fs.unlinkSync(finalOutputPath);
      }

      // Rename the decoded file to the final output path
      fs.renameSync(decodedFilePath, finalOutputPath);
      decodedFilePath = finalOutputPath;
      console.log(`Decoded file saved as: ${finalOutputPath}`);
    } catch (error) {
      console.error('Failed to rename decoded file:', error);
      // If rename fails, try to keep the temp file
      if (!fs.existsSync(decodedFilePath)) {
        decodedFilePath = tempOutputPath;
      }
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
      fileSize,
      originalDuckImagePath: path.join(encodedDir, originalFileName), // Path to original duck image in encoded folder
    });

  } catch (error: any) {
    console.error('Duck decode failed:', error);

    // Check for ENOENT error (command not found)
    if (error.code === 'ENOENT') {
      return NextResponse.json(
        {
          error: 'runninghub CLI not found. Please ensure it is installed and RUNNINGHUB_CLI_PATH environment variable is set correctly.',
          details: `Tried path: ${process.env.RUNNINGHUB_CLI_PATH || 'default locations'}`
        },
        { status: 500 }
      );
    }

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
