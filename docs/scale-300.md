# 300 WhatsApp oturumu — ölçek ve deploy

Sohbet gereksinimleri: VPS servis, Docker/Coolify, min 300 hat, bölme, “load balancing”.

## Stack (arkadaşa net)

- Dil: **Node.js + TypeScript + Baileys** (Python değil).
- Deploy birimi: **Docker imajı** (`apps/wa-service/Dockerfile`).
- Coolify = aynı imajı çalıştıran PaaS; ayrı bir “Coolify-only” kod yolu yok.
- Panel/dashboard ile worker arasında **HTTP komut yok** → klasik reverse-proxy LB yok.

## “Load balancing” burada ne demek?

| Klasik | Filo |
|--------|------|
| Nginx → HTTP worker’lar | Yok (worker dışarı port açmak zorunda değil) |
| Sticky session | `wa.session_lease` + benzersiz `WORKER_ID` |
| İş dağıtımı | `wa.claim_jobs` (**hesap affinity**: send yalnız kira sahibi worker’da) |

Aynı hesabı iki process açmak WhatsApp’ta `connectionReplaced` (440) üretir — lease bunu engeller.

## Kapasite

| | Değer |
|--|--------|
| Oturum başına RAM (kaba) | ~60–80 MB |
| 300 oturum brüt | ~20–25 GB + Node/OS |
| Önerilen dilim | **6 worker × `MAX_SESSIONS=50`** |
| Tek Oracle Always Free 24 GB | 300 **garanti edilmez**; 1–2 worker veya ikinci VPS |

## Docker Compose

Repo kökünden:

```bash
# Tek worker (varsayılan)
docker compose -f infra/docker-compose.yml up -d --build

# 6 worker (scale profili) — once tekil wa-service'i durdur (WORKER_ID carpismasin)
docker compose -f infra/docker-compose.yml stop wa-service
docker compose -f infra/docker-compose.yml --profile scale up -d --build
# Health: 127.0.0.1:8081 .. 8086
```

Her scale instance: `WORKER_ID=worker-1` … `worker-6`. **Aynı `WORKER_ID` iki kez kullanılmaz.**

Gerekli env (`apps/wa-service/.env` / Coolify secrets):

- `DATABASE_URL` (Supabase session pooler, port 5432)
- `WORKER_ID` (instance başına unique; compose environment override eder)
- İsteğe bağlı: `MAX_SESSIONS`, `GOOGLE_MAPS_API_KEY`, `PORT`

## Coolify

1. Yeni Resource → Docker Compose veya Dockerfile.
2. Build context: monorepo kökü; Dockerfile: `apps/wa-service/Dockerfile`.
3. **Her replica / her uygulama** için ayrı env: `WORKER_ID=coolify-a`, `coolify-b`, …
4. `DATABASE_URL` tümünde aynı.
5. Public HTTP gerekmez; health için internal `GET /health` yeterli.
6. Replicas = istenen worker sayısı (ör. 6); sticky gerekmez (state Postgres + lease).

## VPS (özet)

1. Docker kur.
2. Repo clone + `.env`.
3. Tek makine ~50–100 hat: tek `wa-service` veya 2 worker.
4. 300 hat: 2–3 VPS × birkaç worker **veya** bir büyük VPS + `--profile scale`.
5. Detay: [oracle-kurulum.md](./oracle-kurulum.md).

## Çift worker smoke (doğrulama)

```bash
# Terminal A
WORKER_ID=smoke-a MAX_SESSIONS=10 npm run dev --workspace @wa/service

# Terminal B (ayrı süreç — ayni DATABASE_URL)
WORKER_ID=smoke-b MAX_SESSIONS=10 npm run start --workspace @wa/service
```

Beklenen:

1. A ve B aynı hesabı aynı anda lease alamaz (`wa.session_lease`).
2. `message.send` / verify job’ları yalnızca kira sahibi worker’da claim edilir.
3. Admin → Worker dağılımı’nda `smoke-a` / `smoke-b` sayıları görünür (lease varken).

Compose ile: `stop wa-service` sonra `--profile scale` (bkz. yukarı).

