import { spawn } from 'child_process';

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
 * Has a 3-second timeout to prevent hanging on corrupted videos
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

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      ffprobe.kill();
      console.warn(`Video metadata extraction timeout for ${filePath}`);
      resolve(null);
    }, 3000);

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0 || !stdout) {
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
      } catch {
        resolve(null);
      }
    });

    ffprobe.on('error', (error) => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

/**
 * Extract image dimensions using sharp (if available)
 * Note: This requires installing sharp: npm install sharp
 * Has a 2-second timeout to prevent hanging on large/corrupted images
 */
async function getImageMetadata(filePath: string): Promise<ImageMetadata | null> {
  try {
    // Try to use sharp if available
    const sharp = (await import('sharp')).default;

    // Add timeout to prevent hanging on large images
    const metadata = await Promise.race([
      sharp(filePath).metadata(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Metadata extraction timeout')), 2000)
      )
    ]);

    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  } catch (error) {
    // sharp not available, error reading image, or timeout
    // Silently fail - metadata is optional for display
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
