# Hetzner VPS — Filo wa-service (go-live)

Panel Vercel’de kalır. Bu VPS yalnızca WhatsApp worker.

## Load Balancer? Hayır

Komut kanalı Postgres `jobs` + `session_lease`. Public 8080 / LB yok.

## Go-live checklist

1. Ubuntu + Docker + 2G swap + UFW (22 + 9443)
2. Repo: `/opt/whatsappbot` → `origin/main`
3. `apps/wa-service/.env`:
   - `DATABASE_URL` = Supabase **session pooler :5432**
   - `WORKER_ID=hetzner-1` (benzersiz; local `oracle-1` ile aynı anda çalışmasın)
   - `MAX_SESSIONS=50`, `DB_POOL_MAX=2`, `ROLE=worker`
4. Eski local worker’ı **durdur** → lease TTL (~60s) bekle veya:
   ```sql
   delete from wa.session_lease where account_id = '<uuid>';
   ```
5. Başlat:
   ```bash
   cd /opt/whatsappbot
   docker compose -f infra/docker-compose.yml --profile small up -d --build
   curl -fsS http://127.0.0.1:8080/ready
   npm run db:check --workspace @wa/service   # host’ta .env ile
   ```
6. Panel → Hesaplar: hat `connected`; Durum → worker kartı / ops sayfası
7. Medyalı `message.send` smoke

## Local → Hetzner taşıma

1. Local: `docker stop wa-service` (veya compose down)
2. Aynı anda iki `WORKER_ID` ile aynı hesabı açma (440)
3. Hetzner small profil; gerekirse `account.connect` job
4. Auth zaten Postgres’te — QR gerekmez (logout olmadıysa)

## Ops sayfası (şifreli + HTTPS)

- HTTPS: `https://SUNUCU_IP:9443/s/<TOKEN>/` (self-signed — tarayıcıda Advanced/Proceed)
- Kullanıcı/şifre: systemd `filo-status` env
- HTTP 9090 dışarı kapalı (UFW); yalnızca localhost → HTTPS proxy

## Sentry

`apps/wa-service/.env` içine:
```
SENTRY_DSN=https://...@o....ingest.sentry.io/...
```
Sonra: `docker compose -f infra/docker-compose.yml --profile small up -d --force-recreate`

## 300 hat

4 GB’de scale **yok**. Bkz. [hetzner-scale-300.md](./hetzner-scale-300.md).

## Sertleştirme

UFW SSH + HTTPS ops (9443), fail2ban, unattended-upgrades, root şifre rotasyonu.  
Cloud Firewall: [hetzner-firewall.md](./hetzner-firewall.md).
