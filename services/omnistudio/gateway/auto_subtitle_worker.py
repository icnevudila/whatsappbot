import os
import sys
import json
import argparse
import subprocess

# UTF-8 ayarı
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')



def extract_audio_wav(input_video, output_wav):
    """Videodan sesi 16kHz mono WAV olarak çıkarır"""
    cmd = [
        "ffmpeg", "-y",
        "-i", input_video,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        output_wav
    ]
    res = subprocess.run(cmd, capture_output=True)
    return res.returncode == 0

def detect_silence_segments(wav_file):
    """FFmpeg silencedetect ile konuşma bloklarını ayıklar"""
    cmd = [
        "ffmpeg", "-i", wav_file,
        "-af", "silencedetect=noise=-28dB:d=0.35",
        "-f", "null", "-"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    
    silences = []
    current_start = None
    for line in res.stderr.splitlines():
        if "silence_start:" in line:
            try:
                parts = line.split("silence_start:")[1].strip().split()
                current_start = float(parts[0])
            except:
                pass
        elif "silence_end:" in line and current_start is not None:
            try:
                parts = line.split("silence_end:")[1].strip().split()
                end_val = float(parts[0])
                silences.append((current_start, end_val))
                current_start = None
            except:
                pass
                
    return silences

def get_speech_spans(duration, silences):
    """Sessizlik aralıklarından konuşma aralıklarını türetir"""
    spans = []
    cur = 0.0
    for s_start, s_end in silences:
        if s_start > cur + 0.3:
            spans.append((cur, s_start))
        cur = s_end
    if cur < duration - 0.3:
        spans.append((cur, duration))
    return spans

def recognize_words_with_timestamps(wav_file, fallback_script=""):
    """
    Videodan çıkan sesi algılar.
    SpeechRecognition varsa doğrudan sesi dinler.
    Yoksa fallback_script'i ses süresine göre dinamik oranlar.
    """
    recognized_text = ""
    try:
        import speech_recognition as sr
        r = sr.Recognizer()
        with sr.AudioFile(wav_file) as source:
            audio = r.record(source)
        recognized_text = r.recognize_google(audio, language="tr-TR")
        print(f"[AutoSub] 🎙️ Veo Orijinal Sesi Başarıyla Algılandı: \"{recognized_text}\"")
    except Exception as e:
        print(f"[AutoSub] ℹ️ Canlı ses tanıma fallback'e geçti ({e}).")

    final_text = (recognized_text or fallback_script or "").strip()
    if not final_text:
        return []

    # Kelimeleri listele
    words = [w.strip() for w in final_text.split() if w.strip()]
    if not words:
        return []

    # Video / Ses süresini al
    probe_cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", wav_file
    ]
    probe_res = subprocess.run(probe_cmd, capture_output=True, text=True)
    duration = 10.0
    try:
        data = json.loads(probe_res.stdout)
        duration = float(data.get("format", {}).get("duration", 10.0))
    except:
        pass

    silences = detect_silence_segments(wav_file)
    spans = get_speech_spans(duration, silences)
    
    # 3 perdeli Veo reklam blokları (0-3.5s, 4-6.5s, 7-10s)
    word_timings = []
    
    if len(spans) >= 2:
        words_per_span = []
        cur_w_idx = 0
        total_span_dur = sum(end - start for start, end in spans)
        
        for idx, (sp_s, sp_e) in enumerate(spans):
            sp_dur = sp_e - sp_s
            ratio = sp_dur / (total_span_dur or 1.0)
            target_count = max(1, round(len(words) * ratio))
            if idx == len(spans) - 1:
                assigned = words[cur_w_idx:]
            else:
                assigned = words[cur_w_idx:cur_w_idx + target_count]
                cur_w_idx += target_count
                
            if assigned:
                w_step = (sp_e - sp_s) / len(assigned)
                for w_i, word in enumerate(assigned):
                    w_s = sp_s + (w_i * w_step)
                    w_e = w_s + w_step
                    word_timings.append({
                        "word": word,
                        "start": w_s,
                        "end": w_e
                    })
    else:
        active_start = 0.5
        active_end = max(duration - 0.5, 2.0)
        step = (active_end - active_start) / len(words)
        for i, word in enumerate(words):
            word_timings.append({
                "word": word,
                "start": active_start + (i * step),
                "end": active_start + ((i + 1) * step)
            })

    return word_timings

def fmt_ass_time(t):
    """ASS formatı: H:MM:SS.cs (örn: 0:00:03.45)"""
    t = max(0.0, float(t))
    hours = int(t // 3600)
    mins = int((t % 3600) // 60)
    secs = int(t % 60)
    cs = int(round((t - int(t)) * 100))
    if cs >= 100:
        cs = 99
    return f"{hours:01d}:{mins:02d}:{secs:02d}.{cs:02d}"

def generate_capcut_ass(word_timings, ass_file):
    """
    ASS altyazı dosyasını profesyonel CapCut / TikTok Reels stiliyle üretir.
    - SIFIR ÇAKIŞMA: Ekranda AYNI ANDA asla birden fazla satır veya grup bulunmaz.
    - 2-3 KELİMELİK MİNİ GRUPLAR: 9:16 ekranda taşma ve satır kırılması yapmaz.
    - DİNAMİK NEON VURGU: O an konuşulan kelime parlak neon sarı/yeşil, diğerleri beyaz.
    - GÜVENLİ BÖLGE: Alt Reels arayüzünün üzerinde temiz konumlanma (MarginV: 220).
    """
    header = """[Script Info]
Title: CapCut Pro Kinetic Subtitles
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: CapCutNeon,Montserrat,34,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,3.2,1.8,2,30,30,220,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    if not word_timings:
        with open(ass_file, "w", encoding="utf-8") as f:
            f.write(header)
        return

    # Zamanlamaları temizle ve sırala
    sorted_words = sorted(word_timings, key=lambda x: x["start"])

    # Kelimeleri 2-3 kelimelik kompakt bloklara (chunk) ayır
    chunks = []
    curr_chunk = []
    for w in sorted_words:
        curr_chunk.append(w)
        # 3 kelime olunca veya noktalama işareti varsa yeni bloğa geç
        if len(curr_chunk) >= 3 or w["word"].endswith(('.', '!', '?', ',')):
            chunks.append(curr_chunk)
            curr_chunk = []
    if curr_chunk:
        chunks.append(curr_chunk)

    dialogues = []
    for chk_idx, chk in enumerate(chunks):
        chk_start = chk[0]["start"]
        raw_end = chk[-1]["end"]
        # Bir sonraki chunk varsa, bu chunk'ın bitişi kesinlikle sonraki chunk'ın başlangıcından önce olmalıdır (SIFIR OVERLAP)
        if chk_idx < len(chunks) - 1:
            next_start = chunks[chk_idx + 1][0]["start"]
            chk_end = min(raw_end + 0.1, next_start - 0.05)
            if chk_end <= chk_start:
                chk_end = next_start - 0.02
        else:
            chk_end = raw_end + 0.25

        clean_words = [w["word"].upper().replace('.', '').replace('!', '').replace('?', '').replace(',', '') for w in chk]

        # Her kelimenin kendi konuşulma süresince vurgulanması
        for local_idx, w_info in enumerate(chk):
            w_s = max(chk_start, w_info["start"])
            if local_idx < len(chk) - 1:
                w_e = min(chk_end, chk[local_idx + 1]["start"])
            else:
                w_e = chk_end

            if w_e <= w_s:
                w_e = w_s + 0.15

            t_start = fmt_ass_time(w_s)
            t_end = fmt_ass_time(w_e)

            # Kelime satırı oluştur: aktif kelime neon sarı/yeşil, diğerleri saf beyaz
            parts = []
            for i, word_text in enumerate(clean_words):
                if i == local_idx:
                    # Aktif konuşulan kelime: Parlak neon sarı vurgu
                    parts.append(r"{\c&H0026FFFF&\fscx108\fscy108}" + word_text + r"{\fscx100\fscy100}")
                else:
                    # Diğer kelimeler: Beyaz
                    parts.append(r"{\c&H00FFFFFF&}" + word_text)

            line_str = " ".join(parts)
            dialogues.append(f"Dialogue: 0,{t_start},{t_end},CapCutNeon,,0,0,0,,{line_str}")

    with open(ass_file, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(dialogues) + "\n")

def create_and_apply_brand_bumper(input_video, output_video, logo_path, cta_text="Bizimle İletişime Geçin"):
    """
    Videonun son 1.5 saniyesine kurumsal logo ve şık CTA butonlu marka kartı (Bumper) ekler.
    Veo'nun halüsinasyon yapmasını önlemek için FFmpeg ile post-prodüksiyonda kusursuz giydirilir.
    """
    if not logo_path or not os.path.exists(logo_path):
        return False

    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # 720x1280 dikey video kartı
        w, h = 720, 1280
        card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(card)

        # Arka planı hafif lüks koyulaştırma
        dark_overlay = Image.new("RGBA", (w, h), (15, 20, 25, 220))
        card.paste(dark_overlay, (0, 0), dark_overlay)

        # Alt kısımda şık, sinematik, yarı saydam koyu alt bant (Lower-Third Glass Pill)
        # Videonun merkezindeki 3D sahneyi ve plakayı ASLA kapatmaz!
        card_w, card_h = 620, 140
        cx, cy = w // 2, h - 160
        card_box = [cx - card_w // 2, cy - card_h // 2, cx + card_w // 2, cy + card_h // 2]
        draw.rounded_rectangle(card_box, radius=28, fill=(15, 20, 26, 235), outline=(255, 255, 255, 40), width=1)

        # Orijinal logoyu yükle ve kartın soluna ölçekle
        logo = Image.open(logo_path).convert("RGBA")
        logo_max_w, logo_max_h = 220, 90
        logo_ratio = min(logo_max_w / max(1, logo.width), logo_max_h / max(1, logo.height))
        logo_w = int(logo.width * logo_ratio)
        logo_h = int(logo.height * logo_ratio)
        logo = logo.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
        logo_x = cx - card_w // 2 + 35
        logo_y = cy - logo_h // 2
        card.paste(logo, (logo_x, logo_y), logo)

        # Kartın sağına şık zümrüt yeşili CTA butonu
        btn_w, btn_h = 310, 58
        btn_x = cx + card_w // 2 - btn_w - 30
        btn_y = cy - btn_h // 2
        btn_box = [btn_x, btn_y, btn_x + btn_w, btn_y + btn_h]
        draw.rounded_rectangle(btn_box, radius=29, fill=(37, 211, 102, 255))

        # Linux VPS ve Windows fontlarını eksiksiz tara
        font_candidates = [
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/custom/arial.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "arialbd.ttf",
            "arial.ttf"
        ]
        font_bold = None
        for fc in font_candidates:
            if os.path.exists(fc):
                try:
                    font_bold = ImageFont.truetype(fc, 24)
                    break
                except:
                    pass
        if not font_bold:
            try:
                font_bold = ImageFont.truetype("arialbd.ttf", 24)
            except:
                font_bold = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), cta_text, font=font_bold)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((btn_x + (btn_w - tw) // 2, btn_y + (btn_h - th) // 2 - 2), cta_text, fill=(255, 255, 255, 255), font=font_bold)

        temp_bumper_png = os.path.join(os.path.dirname(output_video) or ".", "temp_bumper_overlay.png")
        card.save(temp_bumper_png)

        # Video süresini al
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", input_video],
            capture_output=True, text=True
        )
        duration = float(probe.stdout.strip())
        bumper_start = max(0.0, duration - 1.5)
        fade_duration = 0.4

        filter_complex = (
            f"[1:v]format=rgba,fade=in:st={bumper_start:.2f}:d={fade_duration:.2f}:alpha=1[bumper];"
            f"[0:v][bumper]overlay=0:0:enable='gte(t,{bumper_start:.2f})'[outv]"
        )

        temp_out = output_video + ".bumper_tmp.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-i", input_video,
            "-loop", "1",
            "-framerate", "24",
            "-i", temp_bumper_png,
            "-filter_complex", filter_complex,
            "-map", "[outv]",
            "-map", "0:a?",
            "-c:v", "libx264",
            "-preset", "fast",
            "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            "-shortest",
            temp_out
        ]
        res = subprocess.run(cmd, capture_output=True)
        if os.path.exists(temp_bumper_png):
            try: os.remove(temp_bumper_png)
            except: pass

        if res.returncode == 0 and os.path.exists(temp_out):
            if os.path.exists(output_video):
                os.remove(output_video)
            os.rename(temp_out, output_video)
            print(f"[AutoSub] 🏷️ Marka Bumper kartı başarıyla eklendi: {output_video}")
            return True
        else:
            if os.path.exists(temp_out):
                try: os.remove(temp_out)
                except: pass
            return False
    except Exception as e:
        print(f"[AutoSub] ⚠️ Bumper ekleme atlandı ({e})")
        return False

def process_video(input_video, output_with_subs, output_without_subs, fallback_script="", logo_path="", bumper_cta="Bizimle İletişime Geçin"):
    """
    1. Orijinal Veo sesini korur (HARİCİ VOICEOVER ASLA EKLENMEZ).
    2. Sesi analiz edip sese harfi harfine uyan CapCut dinamik altyazısını üretir.
    3. Hem altyazılı hem de saf altyazısız versiyonu oluşturur.
    4. Opsiyonel olarak son 1.5 saniyeye şık kurumsal logo kapanış kartını (Bumper) giydirir.
    """
    temp_dir = os.path.dirname(output_with_subs) or "."
    base = os.path.splitext(os.path.basename(output_with_subs))[0]
    wav_file = os.path.join(temp_dir, f"{base}_temp_audio.wav")
    ass_file = os.path.join(temp_dir, f"{base}_temp.ass")

    print(f"[AutoSub] 🎵 Orijinal video sesi ayrıştırılıyor...")
    extract_audio_wav(input_video, wav_file)

    print(f"[AutoSub] 🧠 Sesteki kelimeler ve zamanlamalar hesaplanıyor...")
    word_timings = recognize_words_with_timestamps(wav_file, fallback_script)
    
    if not word_timings:
        print("[AutoSub] ⚠️ Kelime zamanlaması çıkarılamadı, video kopyalanıyor.")
        subprocess.run(["ffmpeg", "-y", "-i", input_video, "-c", "copy", output_with_subs], check=True)
    else:
        generate_capcut_ass(word_timings, ass_file)
        print(f"[AutoSub] 🎨 CapCut dinamik neon altyazısı videoya yakılıyor (Orijinal ses aynen korunuyor)...")
        escaped_ass = ass_file.replace("\\", "/").replace(":", "\\:")
        cmd = [
            "ffmpeg", "-y",
            "-i", input_video,
            "-vf", f"subtitles='{escaped_ass}'",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "fast",
            "-crf", "18",
            "-movflags", "+faststart",
            "-c:a", "copy",
            output_with_subs
        ]
        res = subprocess.run(cmd, capture_output=True)
        if res.returncode != 0:
            print("[AutoSub] FFmpeg altyazı hatası:", res.stderr.decode('utf-8', errors='replace'))
            subprocess.run(["ffmpeg", "-y", "-i", input_video, "-c", "copy", output_with_subs], check=True)

    # Altyazısız saf versiyonu hazırla
    if output_without_subs and output_without_subs != input_video:
        print(f"[AutoSub] 💎 Altyazısız saf versiyon oluşturuluyor: {output_without_subs}")
        subprocess.run(["ffmpeg", "-y", "-i", input_video, "-c", "copy", output_without_subs], check=True)

    # Eğer logo verilmişse her iki versiyona da son 1.5 saniyelik marka bumper kartını giydir
    if logo_path and os.path.exists(logo_path):
        print(f"[AutoSub] 🏷️ Marka Kapanış Kartı (Bumper) ekleniyor: {logo_path}")
        if os.path.exists(output_with_subs):
            create_and_apply_brand_bumper(output_with_subs, output_with_subs, logo_path, bumper_cta)
        if output_without_subs and os.path.exists(output_without_subs):
            create_and_apply_brand_bumper(output_without_subs, output_without_subs, logo_path, bumper_cta)

    # Geçici dosyaları temizle
    for f in [wav_file, ass_file]:
        try:
            if os.path.exists(f): os.remove(f)
        except:
            pass

    print("[AutoSub] ✅ İki versiyon da başarıyla hazırlandı!")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", default="native_audio_subtitles")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--output_nosub", default="")
    parser.add_argument("--script", default="")
    parser.add_argument("--voice", default="")
    parser.add_argument("--logo", default="")
    parser.add_argument("--bumper_cta", default="Bizimle İletişime Geçin")
    args = parser.parse_args()

    process_video(args.input, args.output, args.output_nosub, args.script, args.logo, args.bumper_cta)

if __name__ == "__main__":
    main()

