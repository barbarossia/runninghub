"""
Duck Image Utilities for RunningHub CLI
Extracts hidden media files from cartoon duck images using LSB steganography
"""

import os
import sys
import struct
import tempfile
from pathlib import Path
from typing import Optional, Tuple

try:
    import numpy as np
    from PIL import Image
except ImportError:
    raise ImportError(
        "Required packages not installed. Install with: pip install numpy pillow"
    )

# Constants from SS_tools
WATERMARK_SKIP_W_RATIO = 0.40
WATERMARK_SKIP_H_RATIO = 0.08
DUCK_CHANNELS = 3


def _extract_payload_with_k(arr: np.ndarray, k: int) -> bytes:
    """
    Extract payload from image array using k bits per channel

    Args:
        arr: Image numpy array
        k: Number of bits to extract per channel

    Returns:
        Extracted payload bytes
    """
    h, w, c = arr.shape
    skip_w = int(w * WATERMARK_SKIP_W_RATIO)
    skip_h = int(h * WATERMARK_SKIP_H_RATIO)
    mask2d = np.ones((h, w), dtype=bool)
    if skip_w > 0 and skip_h > 0:
        mask2d[:skip_h, :skip_w] = False
    mask3d = np.repeat(mask2d[:, :, None], c, axis=2)
    flat = arr.reshape(-1)
    idxs = np.flatnonzero(mask3d.reshape(-1))
    vals = (flat[idxs] & ((1 << k) - 1)).astype(np.uint8)
    ub = np.unpackbits(vals, bitorder="big").reshape(-1, 8)[:, -k:]
    bits = ub.reshape(-1)
    if len(bits) < 32:
        raise ValueError("Insufficient image data / 图像数据不足")
    len_bits = bits[:32]
    length_bytes = np.packbits(len_bits, bitorder="big").tobytes()
    header_len = struct.unpack(">I", length_bytes)[0]
    total_bits = 32 + header_len * 8
    if header_len <= 0 or total_bits > len(bits):
        raise ValueError("Payload length invalid / 载荷长度异常")
    payload_bits = bits[32:32 + header_len * 8]
    return np.packbits(payload_bits, bitorder="big").tobytes()


def _generate_key_stream(password: str, salt: bytes, length: int) -> bytes:
    """
    Generate keystream for password-based encryption

    Args:
        password: Password string
        salt: Salt bytes
        length: Desired keystream length

    Returns:
        Generated keystream
    """
    import hashlib
    key_material = (password + salt.hex()).encode("utf-8")
    out = bytearray()
    counter = 0
    while len(out) < length:
        combined = key_material + str(counter).encode("utf-8")
        out.extend(hashlib.sha256(combined).digest())
        counter += 1
    return bytes(out[:length])


def _parse_header(header: bytes, password: str):
    """
    Parse header and extract/decrypt data

    Args:
        header: Header bytes
        password: Password for decryption

    Returns:
        Tuple of (decrypted_data, file_extension)
    """
    idx = 0
    if len(header) < 1:
        raise ValueError("Header corrupted / 文件头损坏")
    has_pwd = header[0] == 1
    idx += 1
    pwd_hash = b""
    salt = b""
    if has_pwd:
        if len(header) < idx + 32 + 16:
            raise ValueError("Header corrupted / 文件头损坏")
        pwd_hash = header[idx:idx + 32]
        idx += 32
        salt = header[idx:idx + 16]
        idx += 16
    if len(header) < idx + 1:
        raise ValueError("Header corrupted / 文件头损坏")
    ext_len = header[idx]
    idx += 1
    if len(header) < idx + ext_len + 4:
        raise ValueError("Header corrupted / 文件头损坏")
    ext = header[idx:idx + ext_len].decode("utf-8", errors="ignore")
    idx += ext_len
    data_len = struct.unpack(">I", header[idx:idx + 4])[0]
    idx += 4
    data = header[idx:]
    if len(data) != data_len:
        raise ValueError("Data length mismatch / 数据长度不匹配")
    if not has_pwd:
        return data, ext
    if not password:
        raise ValueError("Password required / 需要密码")
    import hashlib
    check_hash = hashlib.sha256((password + salt.hex()).encode("utf-8")).digest()
    if check_hash != pwd_hash:
        raise ValueError("Wrong password / 密码错误")
    ks = _generate_key_stream(password, salt, len(data))
    plain = bytes(a ^ b for a, b in zip(data, ks))
    return plain, ext


def extract_with_fallback(image_path: str, password: str = "") -> Tuple[bytes, str]:
    """
    Try all compression levels (2, 6, 8) until successful extraction

    Args:
        image_path: Path to duck image
        password: Password for decryption (if required)

    Returns:
        Tuple of (extracted_data, file_extension)
    """
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            arr = np.array(img).astype(np.uint8)

        header = None
        raw = None
        ext = None
        last_err = None

        # Try all compression levels
        for k in (2, 6, 8):
            try:
                header = _extract_payload_with_k(arr, k)
                raw, ext = _parse_header(header, password)
                return raw, ext
            except Exception as e:
                last_err = e
                continue

        if raw is None:
            raise last_err or RuntimeError("Failed to extract data / 无法提取数据")

    except Exception as e:
        raise ValueError(f"Extraction failed: {e} / 提取失败: {e}")


def validate_duck_image(image_path: str) -> bool:
    """
    Validate that input is a proper duck image

    Args:
        image_path: Path to the image file

    Returns:
        True if valid duck image
    """
    path = Path(image_path)

    if not path.exists():
        raise FileNotFoundError(f"Duck image not found: {image_path}")

    if not path.is_file():
        raise ValueError(f"Path is not a file: {image_path}")

    if path.suffix.lower() not in ['.png', '.jpg', '.jpeg']:
        raise ValueError(f"Duck image must be PNG/JPG format: {image_path}")

    try:
        with Image.open(image_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            if img.size[0] != img.size[1]:
                print(f"Warning: Image is not square ({img.size[0]}x{img.size[1]}). "
                      f"May not be a valid duck image.")
            return True
    except Exception as e:
        raise ValueError(f"Invalid image file: {e}")


def binpng_bytes_to_video_data(png_bytes: bytes) -> bytes:
    """
    Convert binary PNG data back to video bytes

    Args:
        png_bytes: Binary PNG data

    Returns:
        Raw video bytes
    """
    try:
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            tmp.write(png_bytes)
            tmp_path = tmp.name

        try:
            img = Image.open(tmp_path).convert("RGB")
            arr = np.array(img).astype(np.uint8)
            flat = arr.reshape(-1, 3).reshape(-1)
            return flat.tobytes().rstrip(b"\x00")
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        raise ValueError(f"Failed to convert binary PNG to video: {e}")


def save_extracted_data(raw_data: bytes, file_ext: str, output_path: str):
    """
    Save extracted data to appropriate file format

    Args:
        raw_data: Extracted raw data
        file_ext: File extension
        output_path: Output file path
    """
    try:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

        if file_ext.endswith(".binpng"):
            # Handle video files - convert binary PNG back to raw video bytes
            print("Converting binary PNG to video data...")
            print("正在转换二进制PNG为视频数据...")
            video_bytes = binpng_bytes_to_video_data(raw_data)
            with open(output_path, 'wb') as f:
                f.write(video_bytes)
        else:
            # Handle regular files
            with open(output_path, 'wb') as f:
                f.write(raw_data)

        print(f"Successfully saved extracted data to: {output_path}")
        print(f"成功保存提取的数据到: {output_path}")

    except Exception as e:
        raise ValueError(f"Failed to save extracted data: {e}")


def generate_output_path(input_duck_path: str, file_ext: str,
                        output_spec: str = None, output_dir: str = None) -> str:
    """
    Generate appropriate output file path

    Args:
        input_duck_path: Path to input duck image
        file_ext: Extracted file extension
        output_spec: User-specified output path or name
        output_dir: User-specified output directory

    Returns:
        Generated output path
    """
    # Handle .binpng extensions
    clean_ext = file_ext.replace('.binpng', '') if file_ext.endswith('.binpng') else file_ext

    if output_spec:
        # If output_spec is a directory, use it with auto-generated filename
        if os.path.isdir(output_spec):
            output_dir = output_spec
            base_name = Path(input_duck_path).stem + "_recovered"
            output_path = os.path.join(output_dir, f"{base_name}.{clean_ext}")
        else:
            # Use as full path
            output_path = output_spec
            # Ensure extension matches extracted file
            if not output_path.lower().endswith(clean_ext.lower()):
                if '.' in output_path:
                    output_path = output_path.rsplit('.', 1)[0] + '.' + clean_ext
                else:
                    output_path += '.' + clean_ext
    else:
        # Auto-generate path
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            base_name = Path(input_duck_path).stem + "_recovered"
            output_path = os.path.join(output_dir, f"{base_name}.{clean_ext}")
        else:
            base_name = Path(input_duck_path).stem + "_recovered"
            output_path = f"{base_name}.{clean_ext}"

    return output_path


def decode_duck_image(duck_path: str, password: str = "", output: str = None,
                     output_dir: str = None, quiet: bool = False) -> dict:
    """
    Main decoding function

    Args:
        duck_path: Path to duck image
        password: Password for decryption (if required)
        output: Output file path or directory
        output_dir: Output directory (alternative to output)
        quiet: Suppress verbose output

    Returns:
        Dict with keys: success, output_path, file_type, data_size, error
    """
    result = {
        'success': False,
        'output_path': None,
        'file_type': None,
        'data_size': 0,
        'error': None
    }

    try:
        if not quiet:
            print(f"Loading duck image: {duck_path}")
            print(f"加载鸭子图片: {duck_path}")

        # Validate duck image
        validate_duck_image(duck_path)

        if not quiet:
            print("Extracting hidden data...")
            print("正在提取隐藏数据...")

        # Extract data with fallback
        raw_data, file_ext = extract_with_fallback(duck_path, password)

        if not quiet:
            print(f"Extracted file type: {file_ext}")
            print(f"提取的文件类型: {file_ext}")
            print(f"Data size: {len(raw_data)} bytes")
            print(f"数据大小: {len(raw_data)} 字节")

        # Generate output path
        output_path = generate_output_path(duck_path, file_ext, output, output_dir)

        if not quiet:
            print(f"Saving extracted data to: {output_path}")
            print(f"保存提取的数据到: {output_path}")

        # Save extracted data
        save_extracted_data(raw_data, file_ext, output_path)

        result['success'] = True
        result['output_path'] = output_path
        result['file_type'] = file_ext
        result['data_size'] = len(raw_data)

        return result

    except Exception as e:
        error_msg = str(e)
        if not quiet:
            print(f"Error: {error_msg}")
        result['error'] = error_msg
        return result
