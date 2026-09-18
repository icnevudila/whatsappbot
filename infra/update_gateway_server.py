import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('167.233.201.31', username='root', password='WLaKevWvV9ra', timeout=30)

# 1. Upload updated server.js and generate_video.js
sftp = c.open_sftp()
sftp.put('remote_gateway_server.js', '/tmp/server_updated.js')
sftp.put('services/omnistudio/gateway/generate_video.js', '/tmp/generate_video.js')
sftp.close()

# 2. Copy to container, copy videos, restart daemon
cmd = """
docker cp /tmp/server_updated.js omnistudio-engine:/app/gateway/server.js
docker cp /tmp/generate_video.js omnistudio-engine:/app/gateway/generate_video.js
docker exec omnistudio-engine mkdir -p /app/gateway/outputs /app/gateway/public

# Copy all mp4 files to outputs and public
docker exec omnistudio-engine sh -c "cp -f /app/gateway/public/*.mp4 /app/gateway/outputs/ 2>/dev/null || true"
docker exec omnistudio-engine sh -c "cp -f /app/gateway/outputs/*.mp4 /app/gateway/public/ 2>/dev/null || true"

# Install ws in gateway directory just in case
docker exec omnistudio-engine sh -c "cd /app/gateway && npm install --no-save ws 2>/dev/null || true"

# Kill existing server
docker exec omnistudio-engine pkill -9 -f 'server.js' 2>/dev/null || true
sleep 1

# Start fresh daemon with --experimental-websocket and -d
docker exec -d omnistudio-engine node --experimental-websocket /app/gateway/server.js
sleep 2

# Verify
docker exec omnistudio-engine ps aux | grep 'server.js'
curl -I http://127.0.0.1:3456/public/bofe_sarjli_pompa_kampanya.mp4
curl -I http://127.0.0.1:3456/outputs/bofe_sarjli_pompa_kampanya.mp4
"""

stdin, stdout, stderr = c.exec_command(cmd)
print("STDOUT:\n", stdout.read().decode('utf-8', errors='replace'))
print("STDERR:\n", stderr.read().decode('utf-8', errors='replace'))
c.close()

