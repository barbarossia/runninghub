"""Video conversion utilities for RunningHub CLI."""

import os
import subprocess
from pathlib import Path
from typing import Tuple, Optional

from .utils import print_info, print_error, print_success

# Supported video formats for conversion
SUPPORTED_VIDEO_FORMATS = ['.webm', '.mkv', '.avi', '.mov', '.flv']
TARGET_FORMAT = '.mp4'


def build_crop_filter(mode: str, width: Optional[str] = None, height: Optional[str] = None,
                      x: Optional[str] = None, y: Optional[str] = None) -> str:
    """Build FFmpeg crop filter based on crop mode.

    Args:
        mode: Crop mode ('left', 'right', 'center', 'custom').
        width: Custom width (for custom mode).
        height: Custom height (for custom mode).
        x: Custom X position (for custom mode).
        y: Custom Y position (for custom mode).

    Returns:
        FFmpeg filter_complex string for cropping.
    """
    if mode == 'left':
        # Left half: width=iw/2, height=ih, x=0, y=0
        return 'iw/2:ih:0:0'

    elif mode == 'right':
        # Right half: width=iw/2, height=ih, x=iw/2, y=0
        return 'iw/2:ih:iw/2:0'

    elif mode == 'center':
        # Center crop: keep full height, crop to center half of width
        # Width = iw/2, Height = ih, X = iw/4 (centers the half-width crop)
        return 'iw/2:ih:iw/4:0'

    elif mode == 'custom':
        # Custom dimensions
        w = width or 'iw/2'
        h = height or 'ih'
        x_pos = x or '0'
        y_pos = y or '0'
        return f'{w}:{h}:{x_pos}:{y_pos}'

    else:
        raise ValueError(f"Invalid crop mode: {mode}")


def crop_video(
    input_path: Path,
    mode: str,
    output_suffix: str = '_cropped',
    width: Optional[str] = None,
    height: Optional[str] = None,
    x: Optional[str] = None,
    y: Optional[str] = None,
    preserve_audio: bool = False,
    timeout: int = 3600
) -> Tuple[bool, str, str]:
    """Crop a video file using FFmpeg.

    Args:
        input_path: Path to the input video file.
        mode: Crop mode ('left', 'right', 'center', 'custom').
        output_suffix: Suffix to add to output filename.
        width: Custom width (for custom mode).
        height: Custom height (for custom mode).
        x: Custom X position (for custom mode).
        y: Custom Y position (for custom mode).
        preserve_audio: Whether to preserve audio track.
        timeout: Processing timeout in seconds (default: 3600 = 1 hour).

    Returns:
        Tuple of (success: bool, stdout: str, stderr: str).

    Raises:
        FileNotFoundError: If FFmpeg is not available or input file doesn't exist.
        TimeoutError: If cropping times out.
    """
    if not check_ffmpeg_available():
        raise FileNotFoundError(
            "FFmpeg is not installed or not accessible. "
            "Please install FFmpeg to use video cropping features."
        )

    if not input_path.exists():
        raise FileNotFoundError(f"Input file does not exist: {input_path}")

    # Generate output paths
    final_output = input_path.parent / f"{input_path.stem}{output_suffix}{input_path.suffix}"
    temp_output = input_path.parent / f"{input_path.stem}{output_suffix}.temp{input_path.suffix}"

    # Build crop filter parameters (w:h:x:y format)
    crop_params = build_crop_filter(mode, width, height, x, y)

    # Build FFmpeg command using -vf filter (simpler and more reliable)
    # Use crop filter with the parameters - escape commas for FFmpeg
    vf_filter = f"crop={crop_params}"

    # Use shell=True to properly handle special characters
    # Quote the filter argument to handle special characters
    ffmpeg_cmd = f'ffmpeg -i "{input_path}" -vf "{vf_filter}" -an -y "{temp_output}"'

    if preserve_audio:
        # Remove -an and add audio copy
        ffmpeg_cmd = f'ffmpeg -i "{input_path}" -vf "{vf_filter}" -c:a copy -y "{temp_output}"'

    print_info(f"Cropping: {input_path.name} -> {final_output.name}")
    print(f"Filter: crop={crop_params}")
    print(f"Command: {ffmpeg_cmd}")

    try:
        result = subprocess.run(
            ffmpeg_cmd,
            shell=True,  # Use shell to handle special characters
            capture_output=True,
            text=True,
            timeout=timeout
        )

        if result.returncode != 0:
            # Clean up temp file on failure
            if temp_output.exists():
                temp_output.unlink()
            return False, result.stdout, result.stderr

        # Delete existing output if it exists
        if final_output.exists():
            final_output.unlink()

        # Rename temp file to final output
        temp_output.rename(final_output)

        print_success(f"Cropped: {input_path.name} -> {final_output.name}")
        return True, result.stdout, result.stderr

    except subprocess.TimeoutExpired:
        # Clean up temp file if cropping timed out
        if temp_output.exists():
            temp_output.unlink()
        raise TimeoutError(f"Video cropping timed out after {timeout} seconds")

    except Exception as e:
        # Clean up temp file on any error
        if temp_output.exists():
            temp_output.unlink()
        raise e



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
    """Convert a video file to MP4 format using FFmpeg.

    Args:
        input_path: Path to the input video file.
        overwrite: If True, overwrites the original file after conversion.
        timeout: Conversion timeout in seconds (default: 3600 = 1 hour).

    Returns:
        Tuple of (success: bool, stdout: str, stderr: str).

    Raises:
        FileNotFoundError: If FFmpeg is not available.
        TimeoutError: If conversion times out.
    """
    if not check_ffmpeg_available():
        raise FileNotFoundError(
            "FFmpeg is not installed or not accessible. "
            "Please install FFmpeg to use video conversion features."
        )

    if not input_path.exists():
        raise FileNotFoundError(f"Input file does not exist: {input_path}")

    # Generate output path
    final_output = input_path.with_suffix('.mp4')
    temp_output = final_output.with_suffix('.temp.mp4')

    # Build FFmpeg command
    # -c:v libx264: Use H.264 video codec
    # -an: No audio (as per requirements)
    cmd = [
        'ffmpeg',
        '-i', str(input_path),
        '-c:v', 'libx264',
        '-an',
        '-y',  # Overwrite output file without asking
        str(temp_output)
    ]

    print_info(f"Converting: {input_path.name} -> {final_output.name}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        if result.returncode != 0:
            # Clean up temp file on failure
            if temp_output.exists():
                temp_output.unlink()
            return False, result.stdout, result.stderr

        # If overwriting original, delete it and rename temp file
        if overwrite:
            input_path.unlink()
            if temp_output != final_output and temp_output.exists():
                temp_output.rename(final_output)

        print_success(f"Converted: {input_path.name} -> {final_output.name}")
        return True, result.stdout, result.stderr

    except subprocess.TimeoutExpired:
        # Clean up temp file if conversion timed out
        if temp_output.exists():
            temp_output.unlink()
        raise TimeoutError(f"Video conversion timed out after {timeout} seconds")

    except Exception as e:
        # Clean up temp file on any error
        if temp_output.exists():
            temp_output.unlink()
        raise e
