#!/bin/bash
set -e

echo "===================================================="
echo "🚀 OmniStudio Hetzner Otonom Bot Başlatılıyor..."
echo "===================================================="

# 1. Sanal Ekranı (Xvfb) Başlat
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 &
sleep 2

# 2. VNC ve noVNC (Web Arayüzü) Başlat (Port 6080)
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 &
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &
echo "🌐 noVNC Web Arayüzü Hazır: http://<HETZNER_IP>:6080/vnc.html"

# 3. Node.js Gateway Başlat (Port 3456)
cd /app/gateway
node server.js &
echo "⚡ API Gateway Hazır: http://localhost:3456"

# 4. Chromium'u OmniStudio Eklentisi ile Başlat
CHROMIUM_FLAGS="--no-sandbox --disable-dev-shm-usage --disable-gpu --user-data-dir=/data/chromium-profile --load-extension=/app/extension --remote-debugging-port=9222 https://chatgpt.com https://gemini.google.com"

echo "🖥️ Chromium Başlatılıyor..."
chromium-browser $CHROMIUM_FLAGS &

# Konteyneri açık tut
wait -n
