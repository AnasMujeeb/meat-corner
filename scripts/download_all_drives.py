import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import gdown

UPLOAD_DIR = os.path.abspath('server/uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

FOLDERS = [
    ("Folder 1 (Menu Assets)", "https://drive.google.com/drive/folders/1Et2uGP_KR8FnNKDZ1v9w1RIwwaiZHJyE"),
    ("Folder 2", "https://drive.google.com/drive/folders/1VsG1F_gO4woPpm2LCDU0xpXVs8GUag1L"),
    ("Folder 3", "https://drive.google.com/drive/folders/1pEiVoxaTXpVapeHnRrbgnwFqhBnJ9h2p"),
    ("Folder 4", "https://drive.google.com/drive/folders/1tVwlg-xMf81xf95wUgI5sJkNcRZVkrIu"),
    ("Folder 5", "https://drive.google.com/drive/folders/1wG7eIIJ-X70ZNWMPaPW33aNQSSud5ZfO"),
]

def download_folder_robust(label, folder_url):
    print(f"\n=======================================================", flush=True)
    print(f"Fetching metadata for {label}...", flush=True)
    print(f"URL: {folder_url}", flush=True)
    print(f"=======================================================", flush=True)

    try:
        files = gdown.download_folder(folder_url, skip_download=True, use_cookies=False)
    except Exception as e:
        print(f"⚠️ Failed to list folder {label}: {e}", flush=True)
        return 0, 0

    if not files:
        print(f"No files found in {label}.", flush=True)
        return 0, 0

    print(f"Found {len(files)} files in {label}. Processing downloads...", flush=True)

    success_count = 0
    fail_count = 0
    skipped_count = 0

    for idx, f in enumerate(files, 1):
        target_path = os.path.join(UPLOAD_DIR, f.path)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)

        if os.path.exists(target_path) and os.path.getsize(target_path) > 0:
            print(f"[{idx}/{len(files)}] [EXISTS] {f.path}", flush=True)
            skipped_count += 1
            success_count += 1
            continue

        print(f"[{idx}/{len(files)}] [DOWNLOADING] {f.path} (ID: {f.id})", flush=True)
        try:
            res = gdown.download(id=f.id, output=target_path, quiet=True, resume=True)
            if res and os.path.exists(target_path) and os.path.getsize(target_path) > 0:
                print(f"  -> ✅ Success ({os.path.getsize(target_path)} bytes)", flush=True)
                success_count += 1
            else:
                print(f"  -> ⚠️ Download returned None or empty file", flush=True)
                fail_count += 1
        except Exception as err:
            print(f"  -> ❌ Error downloading {f.path}: {err}", flush=True)
            fail_count += 1

    print(f"\nSummary for {label}: {success_count} succeeded/present, {fail_count} failed.", flush=True)
    return success_count, fail_count

def main():
    print(f"🚀 Starting robust Google Drive asset downloader", flush=True)
    print(f"Target upload directory: {UPLOAD_DIR}", flush=True)

    total_success = 0
    total_failed = 0

    for idx, (label, url) in enumerate(FOLDERS, 1):
        s, f = download_folder_robust(label, url)
        total_success += s
        total_failed += f

    print(f"\n=======================================================")
    print(f"🎉 All 5 Google Drive folders processed!")
    print(f"Total downloaded / present: {total_success}")
    print(f"Total failed / restricted: {total_failed}")
    print(f"=======================================================\n")

if __name__ == '__main__':
    main()
