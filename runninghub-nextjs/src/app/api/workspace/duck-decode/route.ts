import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Duck Decode API
 * Decodes hidden data from duck images using LSB steganography
 */

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

    // Helper function to detect file type from magic bytes
    const detectFileType = (filePath: string): 'video' | 'image' | 'unknown' => {
      try {
        const buffer = fs.readFileSync(filePath);
        const firstBytes = buffer.slice(0, 12).toString('hex').toLowerCase();

        // Check for common video signatures
        // MP4: starts with 00 00 00 xx 66 74 79 70 (ftyp)
        if (firstBytes.startsWith('000000') && firstBytes.includes('66747970')) {
          return 'video';
        }
        // AVI: starts with 52 49 46 46 (RIFF) ... 41 56 49 20 (AVI )
        if (firstBytes.startsWith('52494646') && buffer.slice(8, 12).toString('hex').toLowerCase() === '41564920') {
          return 'video';
        }
        // MOV: starts with 00 00 00 xx 6d 6f 6f 76 (moov)
        if (firstBytes.startsWith('000000') && firstBytes.includes('6d6f6f76')) {
          return 'video';
        }
        // WebM: starts with 1a 45 df a3
        if (firstBytes.startsWith('1a45dfa3')) {
          return 'video';
        }

        // Check for common image signatures
        // PNG: starts with 89 50 4e 47 (PNG)
        if (firstBytes.startsWith('89504e47')) {
          return 'image';
        }
        // JPEG: starts with ff d8 ff
        if (firstBytes.startsWith('ffd8ff')) {
          return 'image';
        }
        // GIF: starts with 47 49 46 38 (GIF8)
        if (firstBytes.startsWith('47494638')) {
          return 'image';
        }
        // WebP: starts with 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
        if (firstBytes.startsWith('52494646') && buffer.slice(8, 12).toString('hex').toLowerCase() === '57454250') {
          return 'image';
        }

        return 'unknown';
      } catch (error) {
        console.error('Failed to detect file type:', error);
        return 'unknown';
      }
    };

    // Determine output path for decoded file (same name as original, but extension may change)
    // The decoded file will replace the duck image in the result folder
    // We'll determine the correct extension after decoding based on the actual file type
    let finalOutputPath = path.join(resultDir, originalFileName);

    // Temporary output path (with _decoded suffix to avoid conflict)
    const tempOutputPath = path.join(resultDir, `${originalFileNameWithoutExt}_decoded${originalFileExt}`);

    // Build duck-decode command using Python module (like other workspace APIs)
    const args = ["-m", "runninghub_cli.cli", "duck-decode", duckImagePath];
    if (password) {
      args.push("--password", password);
    }
    args.push("--out", tempOutputPath);

    console.log('[Duck Decode] Executing: python', args.join(' '));

    // Execute decode command (timeout: 60 seconds)
    const result = execSync(`python ${args.map(arg => `"${arg}"`).join(' ')}`, {
      encoding: 'utf-8',
      timeout: 60000,
      env: {
        ...process.env,
        RUNNINGHUB_API_KEY: process.env.RUNNINGHUB_API_KEY || process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY,
        RUNNINGHUB_WORKFLOW_ID: process.env.RUNNINGHUB_WORKFLOW_ID || process.env.NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID,
      }
    });

    console.log('[Duck Decode] Command completed, output length:', result.length);

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

    // Rename decoded file to have the same name as the original (with correct extension)
    try {
      // Detect the actual file type of the decoded file
      const decodedFileType = detectFileType(decodedFilePath);
      console.log(`[Duck Decode] Detected decoded file type: ${decodedFileType}`);

      // Determine the correct extension based on file type
      let finalExtension = originalFileExt; // Default to original extension
      if (decodedFileType === 'video') {
        // For videos, use .mp4 extension
        finalExtension = '.mp4';
        finalOutputPath = path.join(resultDir, `${originalFileNameWithoutExt}.mp4`);
        console.log(`[Duck Decode] Video detected, using .mp4 extension`);
      } else if (decodedFileType === 'image') {
        // For images, keep the detected type (png, jpg, etc.)
        // Try to infer from the magic bytes
        const buffer = fs.readFileSync(decodedFilePath);
        const firstBytes = buffer.slice(0, 12).toString('hex').toLowerCase();

        if (firstBytes.startsWith('89504e47')) {
          finalExtension = '.png';
        } else if (firstBytes.startsWith('ffd8ff')) {
          finalExtension = '.jpg';
        } else if (firstBytes.startsWith('47494638')) {
          finalExtension = '.gif';
        } else if (firstBytes.startsWith('52494646') && buffer.slice(8, 12).toString('hex').toLowerCase() === '57454250') {
          finalExtension = '.webp';
        }

        finalOutputPath = path.join(resultDir, `${originalFileNameWithoutExt}${finalExtension}`);
        console.log(`[Duck Decode] Image detected, using ${finalExtension} extension`);
      } else {
        // Unknown type, keep original extension
        console.log(`[Duck Decode] Unknown file type, keeping original extension`);
      }

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
      decodedFileType: path.extname(decodedFilePath) === '.mp4' ? 'video' : 'image',
      fileSize,
      originalDuckImagePath: path.join(encodedDir, originalFileName), // Path to original duck image in encoded folder
    });

  } catch (error: any) {
    console.error('[Duck Decode] Error:', error);
    console.error('[Duck Decode] Error code:', error.code);
    console.error('[Duck Decode] Error message:', error.message);
    console.error('[Duck Decode] Error stderr:', error.stderr);

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
