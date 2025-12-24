# Video Format Conversion Guide

## Overview

RunningHub now supports automatic conversion of video files to MP4 format using FFmpeg. This feature is available in both the Python CLI and Next.js web application.

## Supported Formats

### Input Formats (converted to MP4)
- WebM (`.webm`)
- Matroska Video (`.mkv`)
- AVI (`.avi`)
- QuickTime Movie (`.mov`)
- Flash Video (`.flv`)

### Output Format
- MP4 (`.mp4`) - H.264 codec, no audio

## Prerequisites

### FFmpeg Installation

The video conversion feature requires FFmpeg to be installed on your system.

#### macOS
```bash
brew install ffmpeg
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

#### Windows
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
```

### Verify Installation
```bash
ffmpeg -version
```

## Python CLI Usage

### Convert Single Video

Convert a single video file to MP4 format:

```bash
python -m runninghub_cli.cli convert-video path/to/video.webm
```

**Options:**
- `--timeout`: Timeout in seconds (default: 3600)
- `--no-overwrite`: Keep original file (default: overwrites with .mp4)

**Example:**
```bash
# Convert with custom timeout
python -m runninghub_cli.cli convert-video video.mov --timeout 1800

# Convert without overwriting original
python -m runninghub_cli.cli convert-video video.avi --no-overwrite
```

### Convert All Videos in Directory

Convert all supported video files in a directory:

```bash
python -m runninghub_cli.cli convert-videos /path/to/videos
```

**Options:**
- `--pattern`: File pattern to match (default: `*`)
- `--timeout`: Timeout per video in seconds (default: 3600)
- `--no-overwrite`: Keep original files

**Examples:**
```bash
# Convert all MKV files in a directory
python -m runninghub_cli.cli convert-videos ~/Movies --pattern "*.mkv"

# Convert with 2-hour timeout per video
python -m runninghub_cli.cli convert-videos ~/Downloads --timeout 7200
```

## Next.js Web App Usage

### Accessing the Video Conversion Page

1. Navigate to `/videos` route in your browser
2. The video conversion page is separate from the image gallery

### Converting Videos via Web Interface

1. **Select a Folder** containing video files using the folder selector
2. **Select Videos** by clicking on them (videos show with film icon)
3. **Click "Convert to MP4"** in the selection toolbar
4. **Monitor Progress** in the console viewer

### Video Display

Videos are displayed in the gallery with:
- Film icon indicator
- Format badge (WEBM, MKV, etc.)
- File size information
- Hover selection capability

### View Modes

The video gallery supports three view modes:
- **Grid**: Multi-column grid layout
- **List**: Single-column list layout
- **Large**: Larger cards with more detail

## Technical Details

### FFmpeg Command

The conversion uses the following FFmpeg command:

```bash
ffmpeg -i input.<ext> -c:v libx264 -an -y output.mp4
```

**Parameters:**
- `-i`: Input file
- `-c:v libx264`: H.264 video codec
- `-an`: No audio track
- `-y`: Overwrite output files without prompting

### File Handling

**Overwrite Mode (default):**
1. Convert video to temporary `.tmp.mp4` file
2. Delete original video file
3. Rename temporary file to final `.mp4` name

**Preserve Mode (`--no-overwrite`):**
1. Convert video to new `.mp4` file
2. Keep original file unchanged
3. Both files exist in directory

### Error Handling

The system handles various error scenarios:
- **FFmpeg not available**: Clear error message with installation instructions
- **Corrupted video files**: Conversion fails, original file preserved
- **Timeout errors**: Conversion cancelled, partial files cleaned up
- **Permission errors**: Clear error message indicating access issues

## Integration with Existing Features

### Separate Route for Videos

The video conversion feature has its own dedicated route (`/videos`), keeping it separate from the image gallery (`/gallery`). This provides:
- Cleaner separation of concerns
- Independent state management
- Specialized UI for video operations

### Shared Components

The video conversion feature reuses:
- Folder selector component
- Progress tracking modal
- Task management system
- Error handling infrastructure

## Troubleshooting

### FFmpeg Not Found

**Error:** `FFmpeg is not installed or not accessible`

**Solution:**
1. Install FFmpeg using the instructions above
2. Verify installation: `ffmpeg -version`
3. Ensure FFmpeg is in your system PATH

### Conversion Timeout

**Error:** `Video conversion timed out`

**Solution:**
- Increase timeout using `--timeout` option
- For large videos, consider processing individually
- Check system resources (CPU, disk space)

### Permission Denied

**Error:** `Permission denied accessing file`

**Solution:**
- Check file permissions: `ls -l video.webm`
- Ensure read/write access: `chmod 644 video.webm`
- Run with appropriate user permissions

### Corrupted Output

**Error:** Conversion succeeds but output is corrupted

**Solution:**
1. Check if input file is valid: `ffprobe input.webm`
2. Try converting with different codec: `-c:v libx265`
3. Report issue with original video file details

## Best Practices

1. **Backup Important Videos**: Always keep backups before conversion
2. **Test Conversion**: Convert a sample video first before batch processing
3. **Monitor Disk Space**: Ensure sufficient space for converted files
4. **Use Appropriate Timeouts**: Large videos may require longer timeouts
5. **Check Codecs**: Verify input codec compatibility with FFmpeg

## Performance Considerations

### Conversion Speed

Conversion speed depends on:
- Input video resolution and codec
- CPU processing power
- Disk I/O speed

**Typical performance:**
- SD video (480p): ~10-30 seconds per minute of video
- HD video (1080p): ~30-60 seconds per minute of video
- 4K video (2160p): ~2-4 minutes per minute of video

### Resource Usage

FFmpeg conversion primarily uses:
- **CPU**: 80-100% of single core (H.264 encoding)
- **Memory**: ~100-500 MB depending on video resolution
- **Disk**: Temporary space equal to video file size during conversion

### Optimization Tips

1. **Process Sequentially**: Avoid concurrent conversions to prevent resource exhaustion
2. **Use SSD**: Faster disk I/O significantly improves conversion speed
3. **Close Other Apps**: Free up CPU resources for faster conversion
4. **Batch During Idle**: Run large batch conversions when system is not in use

## API Reference

### Python CLI Commands

| Command | Description |
|---------|-------------|
| `convert-video <file>` | Convert single video file |
| `convert-videos <directory>` | Convert all videos in directory |

### Next.js API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos/convert` | POST | Start video conversion task |
| `/api/videos/serve` | GET | Serve video file for preview |

## Future Enhancements

Potential improvements for future releases:
- [ ] Audio preservation option
- [ ] Custom quality/bitrate controls
- [ ] Video metadata display (duration, resolution, codec)
- [ ] Concurrent processing with queue management
- [ ] Hardware acceleration (GPU encoding)
- [ ] Multiple output format support

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review FFmpeg documentation: https://ffmpeg.org/documentation.html
3. Open an issue on the RunningHub repository
