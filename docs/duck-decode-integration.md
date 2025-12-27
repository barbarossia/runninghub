# Duck Decode Integration

## Overview

Integrated SS_tools duck decoder functionality into runninghub_cli for extracting hidden media files from cartoon duck images using LSB steganography.

## What is Duck Image Steganography?

Duck image steganography is a technique that hides images, videos, or other files inside cartoon duck images using LSB (Least Significant Bit) encoding. The hidden data is invisible to the naked eye but can be extracted with the correct tool.

## Features

- **Automatic compression detection**: Tries all compression levels (2, 6, 8) automatically
- **Password support**: Decodes password-protected duck images
- **Multiple formats**: Extracts images, videos, and other files
- **Video support**: Handles `.binpng` format for hidden videos
- **Flexible output**: Auto-generates output paths or accepts custom paths

## Installation

Install required dependencies:

```bash
pip install -r requirements.txt
```

The following packages are required for duck decoding:
- `numpy>=1.24.0`
- `pillow>=10.0.0`

## Usage

### Basic Decoding

Decode a duck image with auto-generated output filename:

```bash
python -m runninghub_cli.cli duck-decode my_duck.png
```

This will create: `my_duck_recovered.<ext>`

### Password-Protected Duck Images

Decode a password-protected duck image:

```bash
python -m runninghub_cli.cli duck-decode my_duck.png --password "secret123"
```

### Custom Output Path

Specify a custom output file:

```bash
python -m runninghub_cli.cli duck-decode my_duck.png --out recovered.jpg
```

### Output to Directory

Extract to a specific directory:

```bash
python -m runninghub_cli.cli duck-decode my_duck.png --output-dir ./recovered/
```

### Quiet Mode

Suppress verbose output:

```bash
python -m runninghub_cli.cli duck-decode my_duck.png --quiet
```

## Examples

### Example 1: Decode Image

```bash
$ python -m runninghub_cli.cli duck-decode duck.png
Loading duck image: duck.png
Extracting hidden data...
Extracted file type: .jpg
Data size: 245678 bytes
Saving extracted data to: duck_recovered.jpg
Successfully saved extracted data to: duck_recovered.jpg
✓ Successfully decoded duck image!
Output file: duck_recovered.jpg
File type: .jpg
Data size: 245678 bytes
```

### Example 2: Decode Video with Password

```bash
$ python -m runninghub_cli.cli duck-decode video_duck.png --password "mypass"
Loading duck image: video_duck.png
Extracting hidden data...
Extracted file type: .mp4.binpng
Data size: 5678901 bytes
Converting binary PNG to video data...
Saving extracted data to: video_duck_recovered.mp4
Successfully saved extracted data to: video_duck_recovered.mp4
✓ Successfully decoded duck image!
Output file: video_duck_recovered.mp4
File type: .mp4.binpng
Data size: 5678901 bytes
```

## Technical Details

### Compression Levels

The decoder automatically tries all three compression levels:
- **Level 2**: Maximum data capacity (2 bits per RGB channel)
- **Level 6**: Balanced capacity/quality (6 bits per RGB channel)
- **Level 8**: Best visual quality (8 bits per RGB channel)

### Watermark Handling

The decoder skips the watermark region (40% width, 8% height) to preserve visual integrity.

### Encryption

Password-protected duck images use:
- SHA-256 password hashing
- 16-byte salt for security
- XOR stream cipher encryption

### File Types

Supported hidden file types:
- Images: PNG, JPG, JPEG, BMP, WebP
- Videos: MP4, AVI, MOV, MKV, FLV, WebM, WMV, M4V
- Other: Any binary data

## Error Handling

The decoder provides bilingual error messages (English/Chinese):

- `FileNotFoundError`: Duck image not found
- `ValueError`: Invalid image format or corrupted data
- `ValueError`: Wrong password (if password-protected)
- `ValueError`: Insufficient image data

## Integration with RunningHub CLI

The duck decoder is integrated as a subcommand:

```bash
runninghub duck-decode [OPTIONS] DUCK_IMAGE
```

This allows seamless integration with other RunningHub CLI workflows.

## File Structure

```
runninghub_cli/
├── cli.py              # Added duck-decode command
├── duck_utils.py       # Duck decoding utilities
└── requirements.txt    # Added numpy, pillow
```

## Related Tools

- **SS_tools**: Original duck encoder/decoder project
  - Location: `/Users/barbarossia/ai_coding/SS_tools`
  - GitHub: https://github.com/copyangle/SS_tools

## Troubleshooting

### Import Error

```
Error: Required packages not installed
```

**Solution**: Install dependencies:
```bash
pip install numpy pillow
```

### Decoding Failed

```
Error: Failed to extract data
```

**Possible causes**:
1. Not a valid duck image
2. Corrupted image data
3. Wrong password (if password-protected)

### Wrong Password

```
Error: Wrong password / 密码错误
```

**Solution**: Ensure you have the correct password. Password authentication is case-sensitive.

## Future Enhancements

Possible improvements:
- [ ] Add batch decoding for multiple duck images
- [ ] Add encoding functionality (duck-encode command)
- [ ] Add progress bar for large files
- [ ] Add validation of extracted video files
- [ ] Add support for extracting metadata from duck images

## References

- SS_tools README: `/Users/barbarossia/ai_coding/SS_tools/README.md`
- SS_tools CLI Documentation: `/Users/barbarossia/ai_coding/SS_tools/README_CLI.md`
- Duck Decoder Source: `/Users/barbarossia/ai_coding/SS_tools/duck_decoder.py`

---

**Created**: 2025-12-27
**Author**: RunningHub CLI Team
**Version**: 1.0.0
