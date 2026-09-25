#!/bin/bash
set -e

echo "===================================================="
echo "🚀 OmniStudio Hetzner Otonom Bot Başlatılıyor..."
echo "===================================================="

# Eski kilit dosyalarını temizle (Profil verilerine dokunulmaz!)
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99
rm -f /data/chromium-profile/Singleton* /data/chromium-profile/*/Singleton* /data/chromium-profile/LOCK /data/chromium-profile/*/LOCK 2>/dev/null || true
rm -f /data/chromium-profile-*/Singleton* /data/chromium-profile-*/*/Singleton* /data/chromium-profile-*/LOCK 2>/dev/null || true

# 1. Sanal Ekranı (Xvfb) Başlat
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
sleep 2

# 2. VNC ve noVNC (Web Arayüzü) — Sadece bakım modunda başlatılır
if [ "${ENABLE_VNC:-false}" = "true" ]; then
  x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -bg
  websockify --web=/usr/share/novnc/ 6080 localhost:5900 &
  echo "🌐 noVNC Web Arayüzü Hazır: Port 6080 (Bakım Modu Aktif)"
else
  echo "🔒 VNC Normal Üretim Modunda KAPALI (ENABLE_VNC=false)"
fi

# 3. Node.js API Gateway & BrowserWorkerSupervisor Başlat (Port 3456)
cd /app/gateway
node server.js &
echo "⚡ API Gateway & BrowserWorkerSupervisor Hazır: Port 3456"

# 4. Google Chrome #1 Başlat (Port 9222, Ana Profil — Görsel Üretimi / ChatGPT)
PROFILE_DIR="/data/chromium-profile"
mkdir -p "$PROFILE_DIR"
rm -f "$PROFILE_DIR/Singleton*" "$PROFILE_DIR/*/Singleton*" "$PROFILE_DIR/LOCK" "$PROFILE_DIR/*/LOCK" 2>/dev/null || true

echo "🖥️ Google Chrome #1 Başlatılıyor (CDP Port: 9222, Profil: $PROFILE_DIR)..."
google-chrome-stable --no-sandbox --disable-dev-shm-usage --disable-gpu \
  --disable-search-engine-choice-screen \
  --user-data-dir="$PROFILE_DIR" \
  --remote-debugging-port=9222 \
  --start-maximized https://chatgpt.com &
sleep 5

# 5. Görsel Üretim İşçisi (chatgpt-1)
echo "🤖 CDP Worker #1 Başlatılıyor (Worker ID: chatgpt-1)..."
CDP_HTTP="http://127.0.0.1:9222" WORKER_ID="chatgpt-1" TAB_INDEX=0 node --experimental-websocket /app/gateway/cdp_worker.js &

# Konteyneri canlı tut
while true; do
  sleep 3600
done
