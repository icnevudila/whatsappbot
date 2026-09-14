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

# 4. Worker Havuzu (Worker Pool): NUM_WORKERS kadar Chrome ve CDP Worker başlat
NUM_WORKERS=${NUM_WORKERS:-1}
echo "⚙️ Yapılandırılan Worker Havuzu Sayısı: $NUM_WORKERS"

for i in $(seq 1 $NUM_WORKERS); do
  PORT=$((9221 + i))
  if [ "$i" -eq 1 ]; then
    PROFILE_DIR="/data/chromium-profile"
  else
    PROFILE_DIR="/data/chromium-profile-$i"
  fi
  mkdir -p "$PROFILE_DIR"
  rm -f "$PROFILE_DIR/Singleton*" "$PROFILE_DIR/*/Singleton*" "$PROFILE_DIR/LOCK" "$PROFILE_DIR/*/LOCK" 2>/dev/null || true

  echo "🖥️ Google Chrome #$i Başlatılıyor (CDP Port: $PORT, Profil: $PROFILE_DIR)..."
  google-chrome-stable --no-sandbox --disable-dev-shm-usage --disable-gpu \
    --user-data-dir="$PROFILE_DIR" \
    --remote-debugging-port=$PORT \
    --start-maximized https://chatgpt.com &
  sleep 3

  echo "🤖 CDP Worker #$i Başlatılıyor (Worker ID: chatgpt-$i, CDP: $PORT)..."
  CDP_HTTP="http://127.0.0.1:$PORT" WORKER_ID="chatgpt-$i" node --experimental-websocket cdp_worker.js &
done

# Konteyneri canlı tut
while true; do
  sleep 3600
done

