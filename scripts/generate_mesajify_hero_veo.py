import paramiko, sys, json, time, os

sys.stdout.reconfigure(encoding='utf-8')
HOST = '167.233.201.31'
USER = 'root'
PASS = 'WLaKevWvV9ra'

def run():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASS, timeout=20)

    job_id = f"mesajify_hero_veo_{int(time.time())}"
    prompt = (
        "Cinematic seamless loop commercial film for Mesajify. Modern minimalist bright tech office and marble podium desk. "
        "A luxury smartphone mockup floating gracefully, displaying live incoming WhatsApp messages with glowing emerald green checkmarks (#00A884). "
        "Smooth camera pan and gentle glide revealing incoming customer orders and chat bubbles floating toward a sleek unified workspace dashboard. "
        "Pristine Swiss design aesthetic, soft natural daylight, shallow depth of field, high dynamic range, crisp luxury commercial 4K render, perfectly balanced seamless loop."
    )

    payload = {
        "job_id": job_id,
        "attempt_id": "att_01",
        "org_id": "4a58b0dd-0931-4901-880a-686457d15010",
        "account_id": "account-02",
        "prompt": prompt,
        "aspect_ratio": "16:9",
        "model": "veo-lite",
        "duration": 8,
        "assets": [
            {
                "role": "logo",
                "file_path": "/shared/mesajify_brand.png"
            }
        ]
    }

    print(f"🎬 [Mesajify Hero Veo] Job başlatılıyor: {job_id}")
    cmd = f"docker exec ai-media-control curl -s -X POST http://gflow-engine:3461/v1/jobs/execute -H 'Content-Type: application/json' -d '{json.dumps(payload)}'"
    _, stdout, stderr = c.exec_command(cmd)
    res_str = stdout.read().decode('utf-8', errors='replace')
    print("Yanıt:", res_str)

    try:
        data = json.loads(res_str)
        remote_file = f"/opt/whatsappbot/services/omnistudio/docker/data/outputs/{job_id}.mp4"
        print(f"⏳ Video indiriliyor: {remote_file}")
        
        local_dir = r"apps/landing/public/landing/studio"
        local_file = os.path.join(local_dir, "mesajify-hero-loop-veo.mp4")
        
        sftp = c.open_sftp()
        sftp.get(remote_file, local_file)
        sftp.close()
        print(f"🎉 Başarıyla indirildi -> {local_file}")
    except Exception as e:
        print("Hata:", e)

    c.close()

if __name__ == '__main__':
    run()
