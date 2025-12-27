# Duck Decode - Quick Reference

## Command Syntax

```bash
python -m runninghub_cli.cli duck-decode [OPTIONS] DUCK_IMAGE
```

## Quick Examples

### Decode Duck Image (Basic)
```bash
python -m runninghub_cli.cli duck-decode my_duck.png
```

### Decode with Password
```bash
python -m runninghub_cli.cli duck-decode my_duck.png --password "secret123"
```

### Decode to Specific File
```bash
python -m runninghub_cli.cli duck-decode my_duck.png --out recovered.jpg
```

### Decode to Directory
```bash
python -m runninghub_cli.cli duck-decode my_duck.png --output-dir ./recovered/
```

### Quiet Mode
```bash
python -m runninghub_cli.cli duck-decode my_duck.png --quiet
```

## Command Options

| Option | Description |
|--------|-------------|
| `--password TEXT` | Password for decryption (if required) |
| `--out TEXT` | Output file path or directory |
| `--output-dir TEXT` | Output directory (alternative to --out) |
| `--quiet` | Suppress verbose output |

## What Gets Decoded

The decoder automatically detects and extracts:
- ✅ Images (PNG, JPG, JPEG, BMP, WebP)
- ✅ Videos (MP4, AVI, MOV, MKV, FLV, WebM, WMV, M4V)
- ✅ Any binary data

## Features

- **Auto-detects compression level**: Tries levels 2, 6, 8 automatically
- **Password support**: Decodes password-protected duck images
- **Video conversion**: Handles `.binpng` format for hidden videos
- **Flexible output**: Auto-generates names or accepts custom paths

## Error Messages (Bilingual)

All errors show in English and Chinese:
- "Wrong password / 密码错误"
- "Insufficient image data / 图像数据不足"
- "Header corrupted / 文件头损坏"

## Requirements

Install dependencies:
```bash
pip install numpy pillow
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

## Help

```bash
python -m runninghub_cli.cli duck-decode --help
```

---

**More Info**: See `docs/duck-decode-integration.md` for complete documentation.
