#!/usr/bin/env bash
#
# Oracle Cloud Always Free makinesini sifirdan servis calistirmaya hazirlar.
# Ubuntu 22.04 / 24.04 (arm64, Ampere A1) uzerinde test icin yazildi.
#
# Kullanim (makineye SSH ile girdikten sonra):
#
#   curl -fsSL https://raw.githubusercontent.com/icnevudila/whatsappbot/main/infra/oracle-setup.sh | bash
#
# veya repo zaten klonluysa:
#
#   bash infra/oracle-setup.sh
#
# Script fikirli olarak TEKRAR CALISTIRILABILIR: her adim once "zaten var mi"
# diye bakiyor. Yarim kalan bir kurulumda bastan calistirmak guvenli.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/icnevudila/whatsappbot.git}"
APP_DIR="${APP_DIR:-$HOME/whatsappbot}"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }

# --- 0. Ortam kontrolu -----------------------------------------------------

if [[ $EUID -eq 0 ]]; then
  warn "root olarak calisiyorsunuz. Oracle imajlarinda normali 'ubuntu' kullanicisidir."
fi

ARCH="$(uname -m)"
log "Mimari: $ARCH  |  Cekirdek: $(uname -r)"

# --- 1. Sistem paketleri ---------------------------------------------------

log "Paket listesi guncelleniyor"
sudo apt-get update -qq

log "Temel paketler kuruluyor"
sudo apt-get install -y -qq ca-certificates curl git gnupg lsb-release

# --- 2. Docker -------------------------------------------------------------

if command -v docker >/dev/null 2>&1; then
  log "Docker zaten kurulu: $(docker --version)"
else
  log "Docker kuruluyor (resmi depo)"
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Kullaniciyi docker grubuna al ki her komutta sudo gerekmesin. Grup
# degisikligi mevcut oturuma islemiyor; scriptin sonunda hatirlatiyoruz.
if ! id -nG "$USER" | tr ' ' '\n' | grep -qx docker; then
  log "Kullanici docker grubuna ekleniyor"
  sudo usermod -aG docker "$USER"
  NEEDS_RELOGIN=1
fi

sudo systemctl enable --now docker

# --- 3. Takas alani --------------------------------------------------------
#
# Always Free'nin ARM secenegi 24 GB RAM veriyor, takas gerekmez. Ama AMD
# micro secenegi 1 GB ile geliyor ve Baileys'in tek oturumu bile onu zorluyor;
# takas olmadan konteyner OOM ile oluyor.

TOTAL_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
log "Bellek: ${TOTAL_MB} MB"

if (( TOTAL_MB < 4000 )) && [[ ! -f /swapfile ]]; then
  log "Bellek dusuk, 4 GB takas alani olusturuluyor"
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# --- 4. Guvenlik duvari ----------------------------------------------------
#
# Oracle'in Ubuntu imajlari iptables'i kapali gelir ve INPUT zincirinde
# yalnizca 22 aciktir. Servise DISARIDAN erisim GEREKMIYOR: panel ile
# haberlesme Postgres'teki is kuyrugu uzerinden yuruyor, saglik ucu da
# 127.0.0.1'e baglaniyor. Yani hicbir port acmiyoruz -- en guvenli hali bu.

log "Guvenlik duvari: yeni port acilmiyor (servis yalnizca disari baglanti kuruyor)"

# --- 5. Repo ---------------------------------------------------------------

if [[ -d "$APP_DIR/.git" ]]; then
  log "Repo zaten var, guncelleniyor: $APP_DIR"
  git -C "$APP_DIR" fetch --quiet origin
  git -C "$APP_DIR" reset --hard --quiet origin/main
else
  log "Repo klonlaniyor: $APP_DIR"
  git clone --quiet "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

# --- 6. Ortam degiskenleri -------------------------------------------------

ENV_FILE="apps/wa-service/.env"

if [[ -f "$ENV_FILE" ]]; then
  log ".env zaten var, dokunulmuyor"
else
  log ".env olusturuluyor (DATABASE_URL doldurulmali)"
  mkdir -p apps/wa-service
  cat > "$ENV_FILE" <<'EOF'
# DOLDURULMASI ZORUNLU: Supabase session pooler baglantisi.
# Supabase panel -> Connect -> Session pooler (port 5432).
# Kullanici adi "postgres.<project-ref>" bicimindedir, duz "postgres" degil.
# Transaction pooler (6543) KULLANILAMAZ: oturum deposu prepared statement
# ve advisory lock'a dayaniyor.
DATABASE_URL=

WORKER_ID=oracle-1
MAX_SESSIONS=50
LEASE_TTL_SECONDS=60
JOB_POLL_INTERVAL_MS=2000
JOB_BATCH_SIZE=10
CAMPAIGN_TICK_MS=5000
SEND_TIMEOUT_MS=60000
DB_POOL_MAX=10
PORT=8080
LOG_LEVEL=info
NODE_ENV=production
EOF
  chmod 600 "$ENV_FILE"
fi

# --- 7. Sonuc --------------------------------------------------------------

log "Kurulum bitti"

cat <<EOF

Siradaki adimlar:

  1) Veritabani baglantisini yaz:
       nano $APP_DIR/$ENV_FILE
     DATABASE_URL satirini doldur ve kaydet (Ctrl+O, Enter, Ctrl+X).

  2) Baglantiyi dogrula (servisi baslatmadan once):
       cd $APP_DIR && docker compose -f infra/docker-compose.yml run --rm \\
         --entrypoint sh wa-service -c "cd /app/apps/wa-service && npm run db:check"

  3) Servisi baslat:
       cd $APP_DIR && bash infra/deploy.sh

  4) Gunlukleri izle:
       docker logs -f wa-service

EOF

if [[ "${NEEDS_RELOGIN:-0}" == "1" ]]; then
  warn "docker grubu eklendi ama bu oturuma islemedi."
  warn "SSH'tan cikip tekrar girin, ya da simdilik komutlarin onune sudo koyun."
fi
