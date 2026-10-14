import sys, os, subprocess, json, hashlib, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')

DESKTOP = Path(r"C:\Users\TP2\Desktop\v2_smoke_tests")
CANONICAL = DESKTOP / "canonical_assets"
ART_DIR = Path(r"C:\Users\TP2\.gemini\antigravity\brain\00c1c845-f591-452a-b6f3-6ddc54986185")

FFMPEG = r"C:\Users\TP2\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe"
FFPROBE = r"C:\Users\TP2\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffprobe.exe"

W, H = 720, 1280

def compute_sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def probe(p):
    res = subprocess.run([
        FFPROBE, '-v', 'error',
        '-show_entries', 'format=duration:stream=width,height,codec_name',
        '-of', 'json', str(p)
    ], capture_output=True, text=True, check=True)
    d = json.loads(res.stdout)
    fmt = d.get('format', {})
    streams = d.get('streams', [{}])
    video_stream = next((s for s in streams if s.get('codec_name') in ['h264', 'hevc', 'vp9', 'av1']), streams[0])
    return {
        'duration': float(fmt.get('duration', 0)),
        'width': int(video_stream.get('width', 0)),
        'height': int(video_stream.get('height', 0))
    }

def main():
    print("\n" + "="*60)
    print("🧱 BUILDING AYVAZOĞLU V3.1 RERUN COMMERCIAL MASTER (8.00 SECONDS)")
    print("="*60)

    # 1. Official Ayvazoglu Brand Card
    logo_src = CANONICAL / "ayvazoglu_logo_white.png"
    logo = Image.open(logo_src).convert("RGBA")
    
    lw = 260
    lh = int(lw * (logo.height / logo.width))
    logo_scaled = logo.resize((lw, lh), Image.Resampling.LANCZOS)
    
    card_w = 480
    card_h = 220
    card_x = (W - card_w) // 2
    card_y = 100
    
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    draw.rounded_rectangle(
        [card_x, card_y, card_x + card_w, card_y + card_h],
        radius=20,
        fill=(12, 12, 15, 225),
        outline=(255, 255, 255, 50),
        width=1
    )
    
    logo_x = (W - lw) // 2
    logo_y = card_y + 16
    overlay.alpha_composite(logo_scaled, (logo_x, logo_y))
    
    try:
        font_sub = ImageFont.truetype("arialbd.ttf", 20)
        font_tag = ImageFont.truetype("arial.ttf", 16)
    except:
        font_sub = ImageFont.load_default()
        font_tag = ImageFont.load_default()
        
    tagline = "İZOLASYONLU YAPI TUĞLASI"
    bbox_t = draw.textbbox((0, 0), tagline, font=font_sub)
    tw = bbox_t[2] - bbox_t[0]
    draw.text(((W - tw) // 2, card_y + lh + 22), tagline, fill=(245, 245, 250, 250), font=font_sub)
    
    url = "ayvazogluinsaat.com"
    bbox_u = draw.textbbox((0, 0), url, font=font_tag)
    uw = bbox_u[2] - bbox_u[0]
    draw.text(((W - uw) // 2, card_y + lh + 52), url, fill=(255, 195, 0, 240), font=font_tag)
    
    overlay_path = DESKTOP / "ayvazoglu_v3_overlay_card.png"
    overlay.save(overlay_path)
    
    # 2. Subtitles ASS file (0.5s - 5.2s)
    ass_path = DESKTOP / "ayvazoglu_v3_subtitles.ass"
    ass_content = """[Script Info]
Title: Ayvazoglu Commercial V3.1
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,34,&H00FFFFFF,&H0000C3FF,&H80000000,&HB0000000,-1,0,0,0,100,100,0,0,1,2,1,2,40,40,240,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.50,0:00:02.80,Default,,0,0,0,,{\\c&H00C3FF&}Ayvazoğlu killi izolasyon tuğlasıyla{\\c&HFFFFFF&}
Dialogue: 0,0:00:02.85,0:00:05.25,Default,,0,0,0,,binalarınızda {\\c&H00C3FF&}üstün yalıtım ve dayanıklılık.{\\c&HFFFFFF&}
"""
    with open(ass_path, 'w', encoding='utf-8') as f:
        f.write(ass_content)

    escaped_ass = str(ass_path).replace('\\', '/').replace(':', '\\:')
    
    # 3. Assemble with raw rerun video
    raw_video = DESKTOP / "ayvazoglu_v3_placard_free_raw.mp4"
    output_mp4 = DESKTOP / "ayvazoglu_v3_placard_free_master.mp4"
    
    filter_complex = (
        f"[1:v]format=rgba,fade=t=in:st=5.8:d=0.35:alpha=1[card]; "
        f"[0:v]subtitles=filename='{escaped_ass}'[subbed]; "
        f"[subbed][card]overlay=0:0:enable='gte(t,5.8)'[vout]"
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
        str(output_mp4)
    ]
    
    print("🎬 Rendering Master Video with FFmpeg...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("FFmpeg error:", res.stderr[-800:])
        raise RuntimeError("FFmpeg render failed")
        
    shutil.copyfile(output_mp4, ART_DIR / "ayvazoglu_v3_placard_free_master.mp4")
    
    p = probe(output_mp4)
    sha = compute_sha256(output_mp4)
    print(f"🎉 AYVAZOĞLU V3.1 PLACARD-FREE MASTER READY: {output_mp4.name}")
    print(f"   Duration: {p['duration']:.2f}s | Resolution: {p['width']}x{p['height']} | SHA256: {sha}")
    
    # Extract audit frames from master
    for t in [1.5, 3.8, 6.5, 7.5]:
        frame_name = f"ayvazoglu_v3_placard_free_master_frame_{str(t).replace('.', '_')}s.jpg"
        subprocess.run([FFMPEG, "-y", "-ss", str(t), "-i", str(output_mp4), "-vframes", "1", "-q:v", "2", str(DESKTOP / frame_name)], check=True, capture_output=True)
        shutil.copyfile(DESKTOP / frame_name, ART_DIR / frame_name)
        print(f"   Frame {t}s -> {frame_name}")

if __name__ == '__main__':
    main()
