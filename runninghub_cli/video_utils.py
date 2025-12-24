"""Video conversion utilities for RunningHub CLI."""

import os
import subprocess
from pathlib import Path
from typing import Tuple

from .utils import print_info, print_error, print_success

# Supported video formats for conversion
SUPPORTED_VIDEO_FORMATS = ['.webm', '.mkv', '.avi', '.mov', '.flv']
TARGET_FORMAT = '.mp4'


def is_video_file(file_path: Path) -> bool:
    """Check if a file is a supported video format.

    Args:
        file_path: Path to the file to check.

    Returns:
        True if the file is a supported video format, False otherwise.
    """
    return file_path.suffix.lower() in SUPPORTED_VIDEO_FORMATS


def find_videos_in_directory(directory: Path, pattern: str = "*") -> list[Path]:
    """Find all supported video files in a directory.

    Args:
        directory: Directory to search.
        pattern: Glob pattern to match (default: "*" for all files).

    Returns:
        List of Path objects for supported video files.
    """
    video_files = []
    for file_path in directory.glob(pattern):
        if file_path.is_file() and is_video_file(file_path):
            video_files.append(file_path)
    return sorted(video_files)


def check_ffmpeg_available() -> bool:
    """Check if FFmpeg is installed and accessible.

    Returns:
        True if FFmpeg is available, False otherwise.
    """
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def rename_video(current_path: Path, new_name: str) -> Path:
    """Rename a video file.

    Args:
        current_path: Path to the current video file.
        new_name: The new name for the file (with or without extension).

    Returns:
        Path: The new path of the renamed file.

    Raises:
        FileNotFoundError: If current file doesn't exist.
        FileExistsError: If the new filename already exists.
    """
    if not current_path.exists():
        raise FileNotFoundError(f"File not found: {current_path}")

    # Ensure new name has an extension
    if not os.path.splitext(new_name)[1]:
        new_name = f"{new_name}{current_path.suffix}"

    new_path = current_path.parent / new_name

    if new_path.exists():
        raise FileExistsError(f"File already exists: {new_name}")

    current_path.rename(new_path)
    print_success(f"Renamed: {current_path.name} -> {new_path.name}")
    
    return new_path


def convert_video_to_mp4(
    input_path: Path,
    overwrite: bool = True,
    timeout: int = 3600
) -> Tuple[bool, str, str]:
    """Convert a video file to MP4 format using FFmpeg."""
    # ... (existing implementation) ...
    pass # Placeholder for replace context

def crop_video(
    input_path: Path,
    mode: str,
    width: str = None,
    height: str = None,
    x: str = None,
    y: str = None,
    output_suffix: str = "_cropped",
    preserve_audio: bool = False,
    timeout: int = 3600
) -> Tuple[bool, str, str, Path]:
    """Crop a video file using FFmpeg.

    Args:
        input_path: Path to the input video file.
        mode: Crop mode ('left', 'right', 'center', 'custom').
        width: Width percentage (for custom mode).
        height: Height percentage (for custom mode).
        x: X position percentage (for custom mode).
        y: Y position percentage (for custom mode).
        output_suffix: Suffix to add to the output filename.
        preserve_audio: If True, keeps the audio track.
        timeout: Conversion timeout in seconds.

    Returns:
        Tuple of (success: bool, stdout: str, stderr: str, output_path: Path).
    """
    if not check_ffmpeg_available():
        raise FileNotFoundError("FFmpeg is not installed or not accessible.")

    if not input_path.exists():
        raise FileNotFoundError(f"Input file does not exist: {input_path}")

    # Generate output path
    output_path = input_path.parent / f"{input_path.stem}{output_suffix}{input_path.suffix}"
    temp_output = output_path.with_suffix(f".temp{input_path.suffix}")

    # Build crop filter
    crop_filter = ""
    if mode == 'left':
        crop_filter = "crop=iw/2:ih:0:0"
    elif mode == 'right':
        crop_filter = "crop=iw/2:ih:iw/2:0"
    elif mode == 'center':
        crop_filter = "crop=min(iw,ih):min(iw,ih):(iw-ow)/2:(ih-oh)/2"
    elif mode == 'custom':
        # Default to 50% if not provided
        w_val = float(width) / 100 if width else 0.5
        h_val = float(height) / 100 if height else 0.5
        x_val = float(x) / 100 if x else 0
        y_val = float(y) / 100 if y else 0
        crop_filter = f"crop=iw*{w_val}:ih*{h_val}:iw*{x_val}:ih*{y_val}"
    else:
        return False, "", f"Invalid crop mode: {mode}", output_path

    # Build FFmpeg command
    cmd = [
        'ffmpeg',
        '-i', str(input_path),
        '-vf', crop_filter,
        '-c:v', 'libx264',
        '-crf', '18',
        '-preset', 'veryfast',
    ]

    if preserve_audio:
        cmd.extend(['-c:a', 'copy'])
    else:
        cmd.append('-an')

    cmd.extend(['-y', str(temp_output)])

    print_info(f"Cropping: {input_path.name} -> {output_path.name} (Mode: {mode})")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        if result.returncode != 0:
            if temp_output.exists():
                temp_output.unlink()
            return False, result.stdout, result.stderr, output_path

        # Move temp to final
        if temp_output.exists():
            if output_path.exists():
                output_path.unlink()
            temp_output.rename(output_path)

        print_success(f"Successfully cropped: {output_path.name}")
        return True, result.stdout, result.stderr, output_path

    except subprocess.TimeoutExpired:
        if temp_output.exists():
            temp_output.unlink()
        raise TimeoutError(f"Video cropping timed out after {timeout} seconds")
    except Exception as e:
        if temp_output.exists():
            temp_output.unlink()
        raise e

