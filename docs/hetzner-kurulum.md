# Hetzner VPS — Filo wa-service

Panel/dashboard Vercel’de kalır. Bu VPS yalnızca WhatsApp worker’ı çalıştırır.

## Nereden izlenir?

1. **Panel → Durum** — “Gönderim sunucusu” kartı (`hetzner-1` canlı mı, hat hangi worker’da).
2. **Durum sayfası (tarayıcı, Hetzner)** — secret URL (`http://SUNUCU_IP:9090/s/<token>`). Token sunucuda `filo-status` servisinde; paylaşma.

Load Balancer yok (gerekmez). Health asıl olarak `127.0.0.1:8080`.

## Load Balancer? Hayır

Filo’da panel → worker **HTTP LB yok**. Komut kanalı Postgres `jobs` + `session_lease`.

## Küçük / başlangıç VPS (`--profile small`)

Tek worker, **`MAX_SESSIONS=50`**.

```bash
cd /opt/whatsappbot
docker compose -f infra/docker-compose.yml --profile small up -d --build
curl -fsS http://127.0.0.1:8080/health
```

## Sunucu sertleştirme

- UFW: SSH 22 + isteğe bağlı status 9090
- fail2ban, swap 2G, unattended-upgrades
- `filo-status.service` → tarayıcı durum sayfası

## Sonra büyütünce (300 hat)

Rescale → `--profile scale` (6×50). Bkz. [scale-300.md](./scale-300.md).
