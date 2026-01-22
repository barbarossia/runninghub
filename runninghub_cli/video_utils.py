"""Video conversion utilities for RunningHub CLI."""

import os
import subprocess
import tempfile
import yaml
from pathlib import Path
from typing import Tuple, Optional

from .utils import print_info, print_error, print_success

# Supported video formats for conversion
SUPPORTED_VIDEO_FORMATS = [".webm", ".mkv", ".avi", ".mov", ".flv"]
TARGET_FORMAT = ".mp4"


def clip_video(
    input_path: Path, clip_config: dict, output_dir: Path, timeout: int = 3600
) -> Tuple[bool, str, str]:
    """Extract frames from a video file using the video-clip tool.

    Args:
        input_path: Path to the input video file.
        clip_config: Dictionary containing extraction settings.
        output_dir: Path where extracted frames should be saved.
        timeout: Processing timeout in seconds (default: 3600 = 1 hour).

    Returns:
        Tuple of (success: bool, stdout: str, stderr: str).
    """
    if not input_path.exists():
        return False, "", f"Input file does not exist: {input_path}"

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Use a temporary directory for isolation
    with tempfile.TemporaryDirectory(prefix="clip_isolation_") as temp_dir:
        isolation_path = Path(temp_dir)
        video_temp_path = isolation_path / input_path.name

        # Create symlink to the original video
        try:
            os.symlink(input_path, video_temp_path)
        except Exception as e:
            # Fallback to copy if symlink fails
            import shutil

            shutil.copy2(input_path, video_temp_path)

        # Prepare configuration data
        config_data = {
            "paths": {
                "video_input_dir": str(isolation_path),
                "image_output_dir": str(output_dir),
                "processed_video_dir": str(isolation_path / "processed"),
            },
            "video": {"supported_formats": [input_path.suffix.lstrip(".").lower()]},
            "image": {
                "format": clip_config.get("imageFormat", "png"),
                "quality": clip_config.get("quality", 95),
                "filename_pattern": "{filename}_{index:03d}",
            },
            "processing": {
                "delete_original": clip_config.get("deleteOriginal", False),
                "verbose": True,
                "max_videos": 1,
            },
            "extraction": {
                "mode": clip_config.get("mode", "last_frame"),
                "frame_count": clip_config.get("frameCount", 5)
                if clip_config.get("mode") == "last_frames"
                else None,
                "interval_seconds": clip_config.get("intervalSeconds", 10)
                if clip_config.get("mode") == "interval"
                else None,
                "interval_frames": clip_config.get("intervalFrames", 1)
                if clip_config.get("mode") == "frame_interval"
                else None,
                "organize_by_video": clip_config.get("organizeByVideo", True),
            },
        }

        config_path = isolation_path / "config.yml"
        with open(config_path, "w", encoding="utf-8") as f:
            yaml.dump(config_data, f)

        # Build command to run the video-clip tool
        cmd = ["python3", "-m", "video_clip.cli", "-c", str(config_path), "--verbose"]

        # Set up environment with PYTHONPATH to find the video_clip package
        env = os.environ.copy()
        # Assume video-clip project is located at the specified path
        video_clip_root = "/Users/barbarossia/ai_coding/video-clip"
        env["PYTHONPATH"] = f"{env.get('PYTHONPATH', '')}:{video_clip_root}"

        print_info(
            f"Clipping: {input_path.name} (mode: {config_data['extraction']['mode']})"
        )
        print(f"Output directory: {output_dir}")

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, env=env, timeout=timeout
            )

            if result.returncode == 0:
                print_success(f"Successfully clipped: {input_path.name}")

                # Delete original video if requested
                if clip_config.get("deleteOriginal", False):
                    try:
                        if input_path.exists():
                            input_path.unlink()
                            print_success(f"Deleted original video: {input_path.name}")
                    except Exception as e:
                        print_error(f"Failed to delete original video: {e}")
            else:
                print_error(f"Failed to clip: {input_path.name}")

            return result.returncode == 0, result.stdout, result.stderr

        except subprocess.TimeoutExpired:
            print_error(f"Clipping timed out: {input_path.name}")
            return False, "", f"Clipping timed out after {timeout} seconds"
        except Exception as e:
            print_error(f"Error during clipping: {str(e)}")
            return False, "", str(e)


def build_crop_filter(
    mode: str,
    width: Optional[str] = None,
    height: Optional[str] = None,
    x: Optional[str] = None,
    y: Optional[str] = None,
) -> str:
    """Build FFmpeg crop filter based on crop mode.

    Args:
        mode: Crop mode ('left', 'right', 'center', 'top', 'bottom', 'custom').
        width: Custom width (for custom mode).
        height: Custom height (for custom mode).
        x: Custom X position (for custom mode).
        y: Custom Y position (for custom mode).

    Returns:
        FFmpeg filter_complex string for cropping.
    """
    if mode == "left":
        # Left half: width=iw/2, height=ih, x=0, y=0
        return "iw/2:ih:0:0"

    elif mode == "right":
        # Right half: width=iw/2, height=ih, x=iw/2, y=0
        return "iw/2:ih:iw/2:0"

    elif mode == "center":
        # Center crop: keep full height, crop to center half of width
        # Width = iw/2, Height = ih, X = iw/4 (centers the half-width crop)
        return "iw/2:ih:iw/4:0"

    elif mode == "top":
        # Top half: width=iw, height=ih/2, x=0, y=0
        return "iw:ih/2:0:0"

    elif mode == "bottom":
        # Bottom half: width=iw, height=ih/2, x=0, y=ih/2
        return "iw:ih/2:0:ih/2"

    elif mode == "custom":
        # Custom dimensions - handle percentages if provided
        def parse_val(val: Optional[str], default: str, ref: str) -> str:
            if not val:
                return default
            if isinstance(val, str) and val.endswith("%"):
                try:
                    percentage = float(val[:-1]) / 100.0
                    return f"{percentage}*{ref}"
                except ValueError:
                    return val
            return val

        w = parse_val(width, "iw/2", "iw")
        h = parse_val(height, "ih", "ih")
        x_pos = parse_val(x, "0", "iw")
        y_pos = parse_val(y, "0", "ih")
        return f"{w}:{h}:{x_pos}:{y_pos}"

    else:
        raise ValueError(f"Invalid crop mode: {mode}")


def crop_video(
    input_path: Path,
    mode: str,
    output_suffix: str = "_cropped",
    width: Optional[str] = None,
    height: Optional[str] = None,
    x: Optional[str] = None,
    y: Optional[str] = None,
    preserve_audio: bool = False,
    timeout: int = 3600,
) -> Tuple[bool, str, str]:
    """Crop a video file using FFmpeg.

    Args:
        input_path: Path to the input video file.
        mode: Crop mode ('left', 'right', 'center', 'top', 'bottom', 'custom').
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
    final_output = (
        input_path.parent / f"{input_path.stem}{output_suffix}{input_path.suffix}"
    )
    temp_output = (
        input_path.parent / f"{input_path.stem}{output_suffix}.temp{input_path.suffix}"
    )

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
        ffmpeg_cmd = (
            f'ffmpeg -i "{input_path}" -vf "{vf_filter}" -c:a copy -y "{temp_output}"'
        )

    print_info(f"Cropping: {input_path.name} -> {final_output.name}")
    print(f"Filter: crop={crop_params}")
    print(f"Command: {ffmpeg_cmd}")

    try:
        result = subprocess.run(
            ffmpeg_cmd,
            shell=True,  # Use shell to handle special characters
            capture_output=True,
            text=True,
            timeout=timeout,
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
            ["ffmpeg", "-version"], capture_output=True, text=True, timeout=5
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
    input_path: Path, overwrite: bool = True, timeout: int = 3600
) -> Tuple[bool, str, str]:
    """Convert a video file to MP4 format using FFmpeg."""
    # ... (existing implementation) ...
    pass  # Placeholder for replace context


def crop_video(
    input_path: Path,
    mode: str,
    width: str = None,
    height: str = None,
    x: str = None,
    y: str = None,
    output_suffix: str = "_cropped",
    preserve_audio: bool = False,
    timeout: int = 3600,
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
    output_path = (
        input_path.parent / f"{input_path.stem}{output_suffix}{input_path.suffix}"
    )
    temp_output = output_path.with_suffix(f".temp{input_path.suffix}")

    # Build crop filter
    crop_filter = ""
    if mode == "left":
        crop_filter = "crop=iw/2:ih:0:0"
    elif mode == "right":
        crop_filter = "crop=iw/2:ih:iw/2:0"
    elif mode == "center":
        crop_filter = "crop=min(iw,ih):min(iw,ih):(iw-ow)/2:(ih-oh)/2"
    elif mode == "custom":
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
        "ffmpeg",
        "-i",
        str(input_path),
        "-vf",
        crop_filter,
        "-c:v",
        "libx264",
        "-crf",
        "18",
        "-preset",
        "veryfast",
    ]

    if preserve_audio:
        cmd.extend(["-c:a", "copy"])
    else:
        cmd.append("-an")

    cmd.extend(["-y", str(temp_output)])

    print_info(f"Cropping: {input_path.name} -> {output_path.name} (Mode: {mode})")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)

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
