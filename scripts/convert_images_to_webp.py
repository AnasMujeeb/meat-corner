import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import re
from PIL import Image
import pillow_heif

# Register HEIF opener with PIL so Image.open supports .heic / .heif directly!
pillow_heif.register_heif_opener()

SOURCE_DIR = os.path.abspath('server/uploads')
TARGET_DIR = os.path.abspath('server/uploads/processed')
os.makedirs(TARGET_DIR, exist_ok=True)

def slugify(text):
    text = os.path.splitext(text)[0].lower()
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    return text

def convert_image(src_path, dest_slug):
    main_out = os.path.join(TARGET_DIR, f"{dest_slug}.webp")
    thumb_out = os.path.join(TARGET_DIR, f"{dest_slug}_thumb.webp")

    # If already converted and valid size, skip
    if os.path.exists(main_out) and os.path.exists(thumb_out) and os.path.getsize(main_out) > 0:
        return f"/uploads/processed/{dest_slug}.webp", f"/uploads/processed/{dest_slug}_thumb.webp"

    try:
        with Image.open(src_path) as img:
            # Convert RGBA / P / CMYK to RGB
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                # keep RGBA for transparency
                pass
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # Main image: max 1200px dimension
            img_main = img.copy()
            img_main.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
            img_main.save(main_out, 'WEBP', quality=85, method=4)

            # Thumb image: max 400px dimension
            img_thumb = img.copy()
            img_thumb.thumbnail((400, 400), Image.Resampling.LANCZOS)
            img_thumb.save(thumb_out, 'WEBP', quality=80, method=4)

            print(f"  ✅ Converted {os.path.basename(src_path)} -> {dest_slug}.webp", flush=True)
            return f"/uploads/processed/{dest_slug}.webp", f"/uploads/processed/{dest_slug}_thumb.webp"
    except Exception as e:
        print(f"  ❌ Error converting {src_path}: {e}", flush=True)
        return None, None

def process_all_uploads():
    print(f"Processing uploads in {SOURCE_DIR} -> {TARGET_DIR}...", flush=True)
    converted_map = {}

    valid_exts = {'.jpg', '.jpeg', '.png', '.heic', '.webp'}

    for root, dirs, files in os.walk(SOURCE_DIR):
        # Skip the processed output directory itself
        if 'processed' in root:
            continue
        for f in files:
            if f.startswith('.') or f.startswith('img_'):
                continue
            ext = os.path.splitext(f)[1].lower()
            if ext in valid_exts:
                full_path = os.path.join(root, f)
                slug = slugify(f)
                main_url, thumb_url = convert_image(full_path, slug)
                if main_url:
                    converted_map[slug] = {
                        'url': main_url,
                        'thumbUrl': thumb_url,
                        'original': os.path.relpath(full_path, SOURCE_DIR)
                    }

    print(f"Successfully processed {len(converted_map)} web-optimized images.", flush=True)
    return converted_map

if __name__ == '__main__':
    mapping = process_all_uploads()
    import json
    with open('scripts/media_mapping.json', 'w', encoding='utf-8') as out:
        json.dump(mapping, out, indent=2)
    print("Saved media mapping to scripts/media_mapping.json", flush=True)
