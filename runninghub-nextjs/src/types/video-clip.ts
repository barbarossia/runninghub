import { CLIP_MODES } from '@/constants';

export type ClipMode = typeof CLIP_MODES[keyof typeof CLIP_MODES];

export interface VideoClipConfig {
  mode: ClipMode;
  imageFormat: 'png' | 'jpg';
  quality: number;
  frameCount: number;
  intervalSeconds: number;
  intervalFrames: number;
  organizeByVideo: boolean;
  deleteOriginal: boolean;
}
