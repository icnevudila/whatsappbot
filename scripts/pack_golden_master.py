import os
import sys
import zipfile
import hashlib

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

staging_dir = 'scratch/golden_master_staging'
desktop = os.path.expanduser('~/Desktop')
zip_path = os.path.join(desktop, 'MESAJIFY_VIDEO_ENGINE_GOLDEN_MASTER.zip')

print(f"📦 Packaging Golden Master from {staging_dir} to {zip_path}...")

file_count = 0
with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
    for root, dirs, files in os.walk(staging_dir):
        for f in files:
            full_path = os.path.join(root, f)
            arcname = os.path.relpath(full_path, staging_dir)
            zipf.write(full_path, arcname)
            file_count += 1
            print(f"  + {arcname}")

sz = os.path.getsize(zip_path)
with open(zip_path, 'rb') as f:
    sha = hashlib.sha256(f.read()).hexdigest()

print(f"\n🎉 GOLDEN MASTER PACKAGE CREATED SUCCESSFULLY!")
print(f"File Path: {zip_path}")
print(f"Total Files in Archive: {file_count}")
print(f"Package Size: {sz:,} bytes ({round(sz / (1024*1024), 2)} MB)")
print(f"Package SHA-256: {sha}")
