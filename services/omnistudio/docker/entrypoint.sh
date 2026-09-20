#!/bin/bash
set -e

echo "===================================================="
echo "🚀 OmniStudio Hetzner Otonom Bot Başlatılıyor..."
echo "===================================================="

# Eski kilit dosyalarını temizle
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99
rm -f /data/chromium-profile/Singleton* /data/chromium-profile/*/Singleton* /data/chromium-profile/LOCK /data/chromium-profile/*/LOCK 2>/dev/null || true

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

# 4. Google Chrome #1 Başlat (Port 9222, Ana Profil — Hesap 1)
PROFILE_DIR="/data/chromium-profile"
mkdir -p "$PROFILE_DIR"
rm -f "$PROFILE_DIR/Singleton*" "$PROFILE_DIR/*/Singleton*" "$PROFILE_DIR/LOCK" "$PROFILE_DIR/*/LOCK" 2>/dev/null || true

echo "🖥️ Google Chrome #1 Başlatılıyor (CDP Port: 9222, Profil: $PROFILE_DIR)..."
google-chrome-stable --no-sandbox --disable-dev-shm-usage --disable-gpu \
  --disable-search-engine-choice-screen \
  --user-data-dir="$PROFILE_DIR" \
  --remote-debugging-port=9222 \
  --start-maximized https://chatgpt.com https://gemini.google.com/videos http://localhost:3456/monitor &
sleep 5

# 4b. Google Chrome #2 Başlat (Port 9223, İkinci Profil — Hesap 2 / Gemini Yedek)
PROFILE_DIR2="/data/chromium-profile-2"
mkdir -p "$PROFILE_DIR2"
rm -f "$PROFILE_DIR2/Singleton*" "$PROFILE_DIR2/*/Singleton*" "$PROFILE_DIR2/LOCK" "$PROFILE_DIR2/*/LOCK" 2>/dev/null || true

echo "🖥️ Google Chrome #2 Başlatılıyor (CDP Port: 9223, Profil: $PROFILE_DIR2)..."
google-chrome-stable --no-sandbox --disable-dev-shm-usage --disable-gpu \
  --disable-search-engine-choice-screen \
  --user-data-dir="$PROFILE_DIR2" \
  --remote-debugging-port=9223 \
  --start-maximized https://gemini.google.com/videos &
sleep 5

# 5. Dual Worker Havuzu Başlat (chatgpt-1: Sekme 0, chatgpt-2: Sekme 1 + RAM Guard)
echo "🤖 CDP Worker #1 Başlatılıyor (Worker ID: chatgpt-1, Sekme 0)..."
CDP_HTTP="http://127.0.0.1:9222" WORKER_ID="chatgpt-1" TAB_INDEX=0 node --experimental-websocket cdp_worker.js &

echo "🤖 CDP Worker #2 Başlatılıyor (Worker ID: chatgpt-2, Sekme 1, RAM Guard Aktif)..."
CDP_HTTP="http://127.0.0.1:9222" WORKER_ID="chatgpt-2" TAB_INDEX=1 node --experimental-websocket cdp_worker.js &

# 5b. Gemini Worker Havuzu (gemini-1: Port 9222, gemini-2: Port 9223)
echo "🤖 Gemini Worker #1 Başlatılıyor (Worker ID: gemini-1, Port 9222)..."
CDP_HTTP="http://127.0.0.1:9222" WORKER_ID="gemini-1" TAB_INDEX=4 node --experimental-websocket cdp_worker.js &

echo "🤖 Gemini Worker #2 Başlatılıyor (Worker ID: gemini-2, Port 9223)..."
CDP_HTTP="http://127.0.0.1:9223" WORKER_ID="gemini-2" TAB_INDEX=0 node --experimental-websocket cdp_worker.js &

# Konteyneri canlı tut
while true; do
  sleep 3600
done

