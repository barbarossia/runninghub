import { spawn } from 'child_process';
import { promisify } from 'util';

export interface ImageMetadata {
  width: number;
  height: number;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  fps: number;
}

/**
 * Extract video metadata using ffprobe
 */
async function getVideoMetadata(filePath: string): Promise<VideoMetadata | null> {
  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate',
      '-show_entries', 'format=duration',
      '-of', 'json',
      filePath
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0 || !stdout) {
        console.warn(`Failed to get video metadata for ${filePath}:`, stderr);
        resolve(null);
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const stream = data.streams?.[0];
        const format = data.format;

        if (!stream || !format) {
          resolve(null);
          return;
        }

        // Parse frame rate (e.g., "30/1" -> 30)
        const fpsStr = stream.r_frame_rate;
        let fps = 0;
        if (fpsStr) {
          const [num, den] = fpsStr.split('/');
          fps = den ? parseFloat(num) / parseFloat(den) : parseFloat(num);
        }

        resolve({
          width: stream.width || 0,
          height: stream.height || 0,
          duration: parseFloat(format.duration) || 0,
          fps: fps || 0
        });
      } catch (error) {
        console.error(`Error parsing video metadata for ${filePath}:`, error);
        resolve(null);
      }
    });

    ffprobe.on('error', (error) => {
      console.error(`ffprobe error for ${filePath}:`, error);
      resolve(null);
    });
  });
}

/**
 * Extract image dimensions using sharp (if available)
 * Note: This requires installing sharp: npm install sharp
 */
async function getImageMetadata(filePath: string): Promise<ImageMetadata | null> {
  try {
    // Try to use sharp if available
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(filePath).metadata();

    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  } catch (error) {
    // sharp not available or error reading image
    console.warn(`Failed to get image metadata for ${filePath} (sharp not available):`, error);
    return null;
  }
}

/**
 * Get metadata for a file based on its type
 */
export async function getFileMetadata(
  filePath: string,
  fileType: 'image' | 'video'
): Promise<ImageMetadata | VideoMetadata | null> {
  if (fileType === 'video') {
    return getVideoMetadata(filePath);
  } else {
    return getImageMetadata(filePath);
  }
}
