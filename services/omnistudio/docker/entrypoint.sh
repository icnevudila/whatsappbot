#!/bin/bash
set -e

echo "===================================================="
echo "🚀 OmniStudio Hetzner Otonom Bot Başlatılıyor..."
echo "===================================================="

# Eski kilit dosyalarını temizle
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99

# 1. Sanal Ekranı (Xvfb) Başlat
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
sleep 2

# 2. VNC ve noVNC (Web Arayüzü) Başlat (Port 6080)
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -bg
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &
echo "🌐 noVNC Web Arayüzü Hazır: Port 6080"

# 3. Node.js Gateway Başlat (Port 3456)
cd /app/gateway
node server.js &
echo "⚡ API Gateway Hazır: Port 3456"

# 4. Google Chrome'u OmniStudio Eklentisi ile Başlat
CHROME_FLAGS="--no-sandbox --disable-dev-shm-usage --disable-gpu --user-data-dir=/data/chromium-profile --disable-extensions-except=/app/extension --load-extension=/app/extension --remote-debugging-port=9222 --start-maximized https://chatgpt.com https://gemini.google.com"

echo "🖥️ Google Chrome Başlatılıyor..."
google-chrome-stable $CHROME_FLAGS &

# Konteyneri canlı tut
while true; do
  sleep 3600
done

