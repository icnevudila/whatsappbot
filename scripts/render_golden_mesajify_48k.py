import os, subprocess, json, shutil, hashlib, sys
import speech_recognition as sr

sys.stdout.reconfigure(encoding='utf-8')

staging_mp4 = 'scratch/golden_master_staging/01_FINAL_VIDEOS/MESAJIFY_FINAL_MASTER.mp4'
desktop_mp4 = os.path.expanduser('~/Desktop/MESAJIFY_FINAL_MASTER.mp4')

ass_path = 'scratch/mesajify_golden_subs.ass'
ass_escaped = ass_path.replace('\\', '/').replace(':', '\\:')
logo_escaped = 'scratch/mesajify_logo_white_wordmark.png'.replace('\\', '/')

# Audio input: test_mesajify_concise.mp3 (vocal) + cinematic_music_bed.wav (music)
# Filter complex mixes vocal and music at 48kHz stereo, applies subtitles, video outro with logo and CTA
filter_complex = (
    f"[0:v]subtitles='{ass_escaped}'[v_sub];"
    f"[v_sub]tpad=stop_mode=add:stop_duration=2:color=black[v_pad];"
    f"[1:v]scale=480:-1[scaled_logo];"
    f"[v_pad][scaled_logo]overlay=(W-w)/2:(H-h)/2-40:enable='between(t,8.0,10.0)'[v_with_logo];"
    f"[v_with_logo]drawtext=text='WhatsApp E-Ticaret Otomasyon Platformu':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h*0.59:enable='between(t,8.1,10.0)'[v_with_tag];"
    f"[v_with_tag]drawtext=text='Ücretsiz Başlayın  ·  mesajify.com':fontcolor=white:fontsize=26:box=1:boxcolor=#0084FF@0.95:boxborderw=14:x=(w-text_w)/2:y=h*0.65:enable='between(t,8.1,10.0)'[vout];"
    f"[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=1.2,apad=whole_dur=10[vocal];"
    f"[3:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=0.18,atrim=0:10,afade=t=in:st=0:d=0.5,afade=t=out:st=8.5:d=1.5[music];"
    f"[vocal][music]amix=inputs=2:duration=first:dropout_transition=2,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[aout]"
)

cmd = [
    'ffmpeg', '-y',
    '-i', 'scratch/q4_raw/mesajify_q4_raw.mp4',
    '-i', logo_escaped,
    '-i', 'scratch/test_mesajify_concise.mp3',
    '-i', 'scratch/cinematic_music_bed.wav',
    '-filter_complex', filter_complex,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-ac', '2',
    '-t', '10.0',
    staging_mp4
]

print("Rendering MESAJIFY_FINAL_MASTER.mp4 with 48kHz / 192kbps stereo AAC...")
subprocess.run(cmd, check=True)
print("Render complete!")

# Check ffprobe
probe_out = subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-select_streams', 'a', '-of', 'json', staging_mp4])
astream = json.loads(probe_out)['streams'][0]
print(f"Audio stream: rate={astream['sample_rate']} Hz, channels={astream['channels']}, bit_rate={astream.get('bit_rate')} bps")
assert int(astream['sample_rate']) == 48000, f"Expected 48000Hz, got {astream['sample_rate']}"
assert int(astream['channels']) == 2, f"Expected 2 channels, got {astream['channels']}"
assert int(astream.get('bit_rate', 0)) >= 170000, f"Expected ~192kbps, got {astream.get('bit_rate')}"

# Run ASR on the rendered video
tmp_wav = 'scratch/mesajify_render_asr.wav'
subprocess.run(['ffmpeg', '-y', '-i', staging_mp4, '-ar', '16000', '-ac', '1', tmp_wav], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
r = sr.Recognizer()
with sr.AudioFile(tmp_wav) as source:
    audio = r.record(source)
text = r.recognize_google(audio, language='tr-TR')
print("Recognized speech from rendered master:", text)
assert "sepetleri" in text and ("büyütün" in text or "buyutun" in text)

# Copy to Desktop
shutil.copyfile(staging_mp4, desktop_mp4)

with open(staging_mp4, 'rb') as f:
    sha = hashlib.sha256(f.read()).hexdigest()
sz = os.path.getsize(staging_mp4)

print(f"MESAJIFY_FINAL_MASTER.mp4 SHA-256: {sha} ({sz:,} bytes)")
