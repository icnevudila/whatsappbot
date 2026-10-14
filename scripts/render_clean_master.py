import subprocess, json, hashlib, shutil
from pathlib import Path

FFMPEG = r"C:\Users\TP2\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe"
FFPROBE = r"C:\Users\TP2\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffprobe.exe"

DESKTOP = Path(r"C:\Users\TP2\Desktop\v2_smoke_tests")
ART_DIR = Path(r"C:\Users\TP2\.gemini\antigravity\brain\00c1c845-f591-452a-b6f3-6ddc54986185")

raw_video = DESKTOP / "ayvazoglu_v3_placard_free_raw.mp4"
overlay_path = DESKTOP / "ayvazoglu_v3_clean_elegant_overlay.png"
clean_master = DESKTOP / "ayvazoglu_v3_placard_free_master_clean.mp4"
master_mp4 = DESKTOP / "ayvazoglu_v3_placard_free_master.mp4"

# Filter complex: pure fade-in of elegant unboxed logo from 5.8s, zero subtitles
filter_complex = (
    "[1:v]format=rgba,fade=t=in:st=5.8:d=0.35:alpha=1[logo]; "
    "[0:v][logo]overlay=0:0:enable='gte(t,5.8)'[vout]"
)

cmd = [
    FFMPEG, "-y",
    "-ss", "0", "-t", "8.000", "-i", str(raw_video),
    "-loop", "1", "-i", str(overlay_path),
    "-filter_complex", filter_complex,
    "-map", "[vout]",
    "-map", "0:a?",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-t", "8.000",
    str(clean_master)
]

print("Rendering clean master...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("Error:", res.stderr[-500:])
    raise RuntimeError("FFmpeg failed")

print("Clean master rendered successfully!")

# Overwrite the standard master as well so that all downstream references point to the clean version
shutil.copyfile(clean_master, master_mp4)
shutil.copyfile(clean_master, ART_DIR / "ayvazoglu_v3_placard_free_master.mp4")
shutil.copyfile(clean_master, ART_DIR / "ayvazoglu_v3_placard_free_master_clean.mp4")

# Probe
p_res = subprocess.run([
    FFPROBE, "-v", "error",
    "-show_entries", "format=duration:stream=width,height,codec_name",
    "-of", "json", str(clean_master)
], capture_output=True, text=True, check=True)
d = json.loads(p_res.stdout)
fmt = d.get("format", {})
streams = d.get("streams", [{}])
v_stream = next((s for s in streams if s.get("codec_name") in ["h264", "hevc", "vp9", "av1"]), streams[0])
duration = float(fmt.get("duration", 0))
w = v_stream.get("width")
h = v_stream.get("height")
print(f"Duration: {duration:.2f}s, Resolution: {w}x{h}")

# SHA256
sha_h = hashlib.sha256()
with open(clean_master, "rb") as f:
    while chunk := f.read(65536):
        sha_h.update(chunk)
sha = sha_h.hexdigest()
print("SHA256:", sha)

# Extract frames at 1.5s, 3.8s, 6.5s, 7.5s
for t in [1.5, 3.8, 6.5, 7.5]:
    frame_name = f"ayvazoglu_v3_placard_free_master_frame_{str(t).replace('.', '_')}s.jpg"
    out_f = DESKTOP / frame_name
    subprocess.run([FFMPEG, "-y", "-ss", str(t), "-i", str(clean_master), "-vframes", "1", "-q:v", "2", str(out_f)], check=True, capture_output=True)
    shutil.copyfile(out_f, ART_DIR / frame_name)
    print(f"Extracted & saved {t}s -> {frame_name}")
