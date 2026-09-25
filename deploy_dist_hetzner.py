import os
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
import time
for attempt in range(5):
    try:
        c.connect('167.233.201.31', username='root', password='WLaKevWvV9ra', timeout=30)
        break
    except Exception as e:
        if attempt == 4:
            raise e
        time.sleep(3)

# 1. git reset on host
_, stdout_git, _ = c.exec_command('cd /opt/whatsappbot && git fetch origin && git reset --hard origin/main')
stdout_git.channel.recv_exit_status()
print("Git reset to origin/main completed")

# 2. Upload local compiled dist files
sftp = c.open_sftp()

def upload_folder(local_dir, remote_dir):
    for root, dirs, files in os.walk(local_dir):
        rel_dir = os.path.relpath(root, local_dir)
        target_dir = os.path.join(remote_dir, rel_dir).replace('\\', '/')
        try:
            sftp.mkdir(target_dir)
        except:
            pass
        for f in files:
            local_file = os.path.join(root, f)
            remote_file = os.path.join(target_dir, f).replace('\\', '/')
            sftp.put(local_file, remote_file)

print("Uploading creative-video-orchestrator dist...")
upload_folder('services/creative-video-orchestrator/dist', '/opt/whatsappbot/services/creative-video-orchestrator/dist')
print("Uploading ai-media-control dist...")
upload_folder('services/ai-media-control/dist', '/opt/whatsappbot/services/ai-media-control/dist')

sftp.close()

# 3. Copy to container and restart
cmd = """
docker cp /opt/whatsappbot/services/creative-video-orchestrator/dist/. ai-media-control:/creative-video-orchestrator/dist/
docker cp /opt/whatsappbot/services/ai-media-control/dist/. ai-media-control:/app/dist/
docker cp /opt/whatsappbot/services/omnistudio/gateway/server.js omnistudio-engine:/app/gateway/server.js
docker cp /opt/whatsappbot/services/omnistudio/gateway/generate_video.js omnistudio-engine:/app/gateway/generate_video.js
docker cp /opt/whatsappbot/services/omnistudio/gateway/gemini_video_capability.js omnistudio-engine:/app/gateway/gemini_video_capability.js
docker restart omnistudio-engine ai-media-control
"""
stdin, stdout, stderr = c.exec_command(cmd)
print("DEPLOY_RESULT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
c.close()

