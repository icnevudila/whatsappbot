import os
import sys
import subprocess
import shutil

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

staging_dir = 'scratch/golden_master_staging/01_FINAL_VIDEOS'
os.makedirs(staging_dir, exist_ok=True)

SECTORS = [
    {
        'key': 'bofe',
        'output_name': 'BOFE_FINAL_MASTER.mp4',
        'raw_video': 'scratch/q4_raw/bofe_q4_raw.mp4',
        'audio_input': None,
        'logo_file': 'scratch/bofe_logo_official_white.png',
        'logo_scale': 440,
        'tagline': 'Akülü Sırt Pompası ve Tarım Ekipmanları',
        'cta': 'Hemen Sipariş Verin  ·  bofe.com.tr',
        'cta_color': '#27AE60@0.95',
        'subs': [
            ('00:00:00.50', '00:00:04.20', 'BOFE akülü sırt pompası ile sahada yorulmadan,', r'\N{\c&H0026FFFF&}yüksek basınçla profesyonel ilaçlama yapın{\c&H00FFFFFF&}'),
            ('00:00:04.20', '00:00:07.50', 'Sezon fırsatları için', r'\N{\c&H0026FFFF&}hemen sipariş verin!{\c&H00FFFFFF&}')
        ]
    },
    {
        'key': 'ayvazoglu',
        'output_name': 'AYVAZOGLU_FINAL_MASTER.mp4',
        'raw_video': 'scratch/q4_raw/ayvazoglu_q4_raw.mp4',
        'audio_input': None,
        'logo_file': 'scratch/ayvazoglu_logo_hd_white_transparent.png',
        'logo_scale': 480,
        'tagline': 'Yüksek Isı Yalıtımlı Klinker Tuğla',
        'cta': 'Şimdi Teklif Alın  ·  ayvazoglu.com.tr',
        'cta_color': '#D35400@0.95',
        'subs': [
            ('00:00:00.50', '00:00:04.20', 'Ayvazoğlu klinker tuğla ile modern yapılarda,', r'\N{\c&H0026FFFF&}yüksek ısı yalıtımı ve nesiller boyu sağlamlık{\c&H00FFFFFF&}'),
            ('00:00:04.20', '00:00:07.50', 'Projeniz için', r'\N{\c&H0026FFFF&}şimdi teklif alın!{\c&H00FFFFFF&}')
        ]
    },
    {
        'key': 'ustaoglu',
        'output_name': 'USTAOGLU_FINAL_MASTER.mp4',
        'raw_video': 'scratch/q4_raw/ustaoglu_q4_raw.mp4',
        'audio_input': None,
        'logo_file': 'scratch/ustaoglu_logo.png',
        'logo_scale': 480,
        'tagline': 'Odun Ateşinde Geleneksel Yaprak Döner',
        'cta': 'Hemen Sipariş Verin  ·  ustaogludoner.com',
        'cta_color': '#C0392B@0.95',
        'subs': [
            ('00:00:00.50', '00:00:04.20', 'Ustaoğlu Yaprak Döner lezzeti sofranızda,', r'\N{\c&H0026FFFF&}odun ateşinde pişen enfes lezzet{\c&H00FFFFFF&}'),
            ('00:00:04.20', '00:00:07.50', 'Sıcak ve taze sunumla', r'\N{\c&H0026FFFF&}hemen sipariş verin!{\c&H00FFFFFF&}')
        ]
    },
    {
        'key': 'veriburada',
        'output_name': 'VERIBURADA_FINAL_MASTER.mp4',
        'raw_video': 'scratch/q4_raw/veriburada_q4_raw.mp4',
        'audio_input': None,
        'logo_file': 'scratch/veriburada_fresh_logo.png',
        'logo_scale': 340,
        'tagline': 'B2B Harita Tarama ve Ticari İstihbarat',
        'cta': 'Ücretsiz Keşfedin  ·  veriburada.com',
        'cta_color': '#00A859@0.95',
        'subs': [
            ('00:00:00.50', '00:00:04.20', 'Veri Burada ile sektörünüzdeki yeni işletmeleri,', r'\N{\c&H0026FFFF&}haritada tek tıkla keşfedin{\c&H00FFFFFF&}'),
            ('00:00:04.20', '00:00:07.50', 'B2B müşteri ağınızı', r'\N{\c&H0026FFFF&}hızla büyütün!{\c&H00FFFFFF&}')
        ]
    },
    {
        'key': 'mesajify',
        'output_name': 'MESAJIFY_FINAL_MASTER.mp4',
        'raw_video': 'scratch/q4_raw/mesajify_q4_raw.mp4',
        'audio_input': 'scratch/test_mesajify_master_mix.wav',
        'logo_file': 'scratch/mesajify_logo_white_wordmark.png',
        'logo_scale': 480,
        'tagline': 'WhatsApp E-Ticaret Otomasyon Platformu',
        'cta': 'Ücretsiz Başlayın  ·  mesajify.com',
        'cta_color': '#0084FF@0.95',
        'subs': [
            ('00:00:00.50', '00:00:04.50', 'Mesajify ile terk edilen sepetleri,', r'\N{\c&H0026FFFF&}WhatsApp üzerinden anında satışa dönüştürün{\c&H00FFFFFF&}'),
            ('00:00:04.50', '00:00:08.30', 'Akıllı otomasyonla', r'\N{\c&H0026FFFF&}işletmenizi büyütün!{\c&H00FFFFFF&}')
        ]
    }
]

def make_ass(sub_path, subs):
    content = """[Script Info]
Title: Golden Master Commercial Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 720
PlayResY: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,34,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2.8,1.5,2,40,40,240,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    for start, end, line1, line2 in subs:
        content += f"Dialogue: 0,{start},{end},Default,,0,0,0,," + r"{\b1}" + line1 + line2 + r"{\b0}" + "\n"
    with open(sub_path, 'w', encoding='utf-8') as f:
        f.write(content)

for sec in SECTORS:
    key = sec['key']
    out_final = os.path.join(staging_dir, sec['output_name'])
    desktop_final = os.path.expanduser(f"~/Desktop/{sec['output_name']}")
    
    ass_path = f"scratch/{key}_golden_subs.ass"
    make_ass(ass_path, sec['subs'])
    
    ass_escaped = ass_path.replace('\\', '/').replace(':', '\\:')
    logo_escaped = sec['logo_file'].replace('\\', '/')
    logo_w = sec['logo_scale']
    tagline = sec['tagline']
    cta = sec['cta']
    cta_color = sec['cta_color']
    
    if sec['audio_input'] is None:
        filter_complex = (
            f"[0:v]subtitles='{ass_escaped}'[v_sub];"
            f"[v_sub]tpad=stop_mode=add:stop_duration=2:color=black[v_pad];"
            f"[1:v]scale={logo_w}:-1[scaled_logo];"
            f"[v_pad][scaled_logo]overlay=(W-w)/2:(H-h)/2-40:enable='between(t,8.0,10.0)'[v_with_logo];"
            f"[v_with_logo]drawtext=text='{tagline}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h*0.59:enable='between(t,8.1,10.0)'[v_with_tag];"
            f"[v_with_tag]drawtext=text='{cta}':fontcolor=white:fontsize=26:box=1:boxcolor={cta_color}:boxborderw=14:x=(w-text_w)/2:y=h*0.65:enable='between(t,8.1,10.0)'[vout];"
            f"[0:a]apad=whole_dur=10,afade=t=out:st=8.0:d=1.8[aout]"
        )
        cmd = [
            "ffmpeg", "-y",
            "-i", sec['raw_video'],
            "-i", logo_escaped,
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "[aout]",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-t", "10.0",
            out_final
        ]
    else:
        filter_complex = (
            f"[0:v]subtitles='{ass_escaped}'[v_sub];"
            f"[v_sub]tpad=stop_mode=add:stop_duration=2:color=black[v_pad];"
            f"[1:v]scale={logo_w}:-1[scaled_logo];"
            f"[v_pad][scaled_logo]overlay=(W-w)/2:(H-h)/2-40:enable='between(t,8.0,10.0)'[v_with_logo];"
            f"[v_with_logo]drawtext=text='{tagline}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h*0.59:enable='between(t,8.1,10.0)'[v_with_tag];"
            f"[v_with_tag]drawtext=text='{cta}':fontcolor=white:fontsize=26:box=1:boxcolor={cta_color}:boxborderw=14:x=(w-text_w)/2:y=h*0.65:enable='between(t,8.1,10.0)'[vout];"
            f"[2:a]apad=whole_dur=10,afade=t=out:st=8.8:d=1.0[aout]"
        )
        cmd = [
            "ffmpeg", "-y",
            "-i", sec['raw_video'],
            "-i", logo_escaped,
            "-i", sec['audio_input'],
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "[aout]",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ac", "2",
            "-t", "10.0",
            out_final
        ]
        
    print(f"🎬 Rendering {sec['output_name']}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Error:", res.stderr)
    else:
        sz = os.path.getsize(out_final)
        print(f"✅ Rendered: {out_final} ({sz:,} bytes)")
        shutil.copyfile(out_final, desktop_final)
        print(f"✅ Copied to Desktop: {desktop_final}")

print("\n🎉 All 5 Golden Masters rendered and placed in staging + Desktop!")
