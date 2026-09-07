#!/usr/bin/env bash
#
# Servisi guncelle ve yeniden baslat. Repo kokunden calistirilir:
#
#   bash infra/deploy.sh
#
# Ne yapiyor: son kodu ceker, imaji yeniden kurar, konteyneri degistirir ve
# gercekten ayaga kalktigini dogrular. Saglik kontrolu gecmezse SIFIR DISI
# kod dondurur ki bozuk bir dagitim sessizce "basarili" gorunmesin.

set -euo pipefail

COMPOSE_FILE="infra/docker-compose.yml"
ENV_FILE="apps/wa-service/.env"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mHATA: %s\033[0m\n' "$*" >&2; exit 1; }

[[ -f "$COMPOSE_FILE" ]] || fail "$COMPOSE_FILE yok. Repo kokunde misiniz?"
[[ -f "$ENV_FILE" ]] || fail "$ENV_FILE yok. Once infra/oracle-setup.sh calistirin."

# .env'de DATABASE_URL bos kalmis olabilir; bu en sik yapilan atlama ve
# hatasi konteyner icinde kayboldugu icin burada yakaliyoruz.
if ! grep -qE '^DATABASE_URL=.+' "$ENV_FILE"; then
  fail "$ENV_FILE icinde DATABASE_URL bos. Doldurup tekrar deneyin."
fi

log "Son kod cekiliyor"
git fetch --quiet origin
git reset --hard --quiet origin/main
log "Surum: $(git log --oneline -1)"

log "Imaj kuruluyor"
PROFILE="${COMPOSE_PROFILE:-small}"
docker compose -f "$COMPOSE_FILE" --profile "$PROFILE" build

# up -d, degisen imajda konteyneri degistirir. stop_grace_period sayesinde
# eski process kapanis sirasini tamamlar (creds yazimi, kira birakma), yani
# yeni process kirayi devralirken 440 dongusune girmez.
log "Konteyner degistiriliyor"
log "Compose profil: $PROFILE"
docker compose -f "$COMPOSE_FILE" --profile "$PROFILE" up -d --remove-orphans

# --- Dogrulama -------------------------------------------------------------
#
# Oturumlarin geri yuklenmesi dakikalar surebiliyor, bu yuzden saglik
# kontrolune 3 dakika muhlet veriyoruz.

log "Saglik kontrolu (en fazla 180 saniye)"

CONTAINER_NAME="${COMPOSE_CONTAINER:-wa-service}"

for _ in $(seq 1 60); do
  state="$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo missing)"

  case "$state" in
    healthy)
      log "Servis ayakta ve sagliki"
      docker compose -f "$COMPOSE_FILE" --profile "$PROFILE" ps
      exit 0
      ;;
    unhealthy)
      docker logs --tail 60 "$CONTAINER_NAME"
      fail "Servis sagliksiz durumda. Yukaridaki gunluge bakin."
      ;;
    missing)
      docker logs --tail 60 "$CONTAINER_NAME" 2>/dev/null || true
      fail "Konteyner bulunamadi ($CONTAINER_NAME), baslatilamamis olabilir."
      ;;
  esac

  sleep 3
done

docker logs --tail 60 "$CONTAINER_NAME"
fail "Saglik kontrolu 180 saniyede gecmedi. Gunluge bakin."
