# Filo — Autoscale ve harici VT bağlama

Özet rehber: otomatik worker ölçekleme + harici Postgres/proje için worker-kit.
Tarih: 2026-09-05 · Commit: eb02f4f

---

## A) Otomatik worker ölçekleme (autoscale)

Hat talebine göre `desired_workers` Postgres’te tutulur; actuator (noop / docker / webhook) replica sayısını uygular.

**HTTP load balancer yok.** Dağıtım `session_lease` + `claim_jobs` affinity ile kalır.

### Formül

```
demand = aktif hatlar (enabled, kilitli değil,
         status ∈ connected | connecting | qr_pending | pairing_pending)
       + lease’siz pending account.connect işleri

desired = clamp( ceil(demand / capacity), MIN_WORKERS, MAX_WORKERS )
```

`capacity` = `SCALER_CAPACITY_PER_WORKER` veya `MAX_SESSIONS` (varsayılan 50).

### Bileşenler

| Parça | Rol |
|--------|-----|
| `wa.worker_heartbeat` | Her worker boot + interval upsert |
| `wa.scaler_state` | Tek satır: demand / desired / reason |
| `ROLE=scaler` | Demand hesaplar, desired yazar, actuator çağırır |
| Admin `admin_overview.scaler` | demand → desired, canlı heartbeat |

### Compose

```bash
# Solo worker ile çakışmasın
docker compose -f infra/docker-compose.yml stop wa-service

# Scaler + scale edilebilir wa-worker (varsayılan actuator=noop)
docker compose -f infra/docker-compose.yml --profile autoscale up -d --build

# Desired’ı elle uygulamak (noop sonrası)
docker compose -f infra/docker-compose.yml -p filo-wa --profile autoscale \
  up -d --scale wa-worker=N wa-worker
```

- `wa-worker`: `container_name` yok; `WORKER_ID=auto` → entrypoint `worker-$hostname`
- `wa-scaler`: varsayılan `SCALE_ACTUATOR=noop` (imajda Docker CLI yok)
- Gerçek `docker` scale: host’ta `ROLE=scaler` veya imaja docker-cli; Coolify için `webhook`

Scaler health: `http://127.0.0.1:8090/health`

### Ortam değişkenleri

| Değişken | Varsayılan | Anlam |
|----------|------------|--------|
| `ROLE` | `worker` | `scaler` = sadece kontrol düzlemi |
| `SCALE_ACTUATOR` | `noop` | `noop` \| `docker` \| `webhook` |
| `SCALER_MIN_WORKERS` | `1` | Alt tavan |
| `SCALER_MAX_WORKERS` | `40` | Üst tavan (20k için yükseltin) |
| `SCALER_CAPACITY_PER_WORKER` | `MAX_SESSIONS` | Demand bölücü |
| `SCALER_INTERVAL_MS` | `20000` | Tick aralığı |
| `SCALE_WEBHOOK_URL` | — | webhook actuator |
| `HEARTBEAT_INTERVAL_MS` | `20000` | Worker heartbeat |

**Pool kuralı:** `desired * DB_POOL_MAX` < Postgres / session pooler limiti.

### Doğrulama

1. `SCALE_ACTUATOR=noop` → hat ekle → `wa.scaler_state.desired_workers` artar; admin Autoscale kartı güncellenir.
2. Host’ta `SCALE_ACTUATOR=docker` → desired 1→2 → ikinci `wa-worker` heartbeat.
3. İki worker aynı hesabı açmaz (lease).

### Sınırlar

- Scaler RAM sihirbazı değil: `MAX_WORKERS` host kapasitesine göre set edilir.
- K8s HPA ileride aynı `scaler_state.desired_workers` okur.
- Org `accounts_quota` ayrı; scaler **toplam** demand’e bakar.

Detay: `docs/autoscale.md` · Elle filo: `docs/scale-300.md` · SaaS: `docs/saas-scale.md`

---

## B) Harici VT / proje — `@wa/worker-kit`

Filo **panel/admin aynı kalır**. Bu paket yalnızca:

1. Worker’ın ihtiyaç duyduğu **SQL demeti** (sıralı manifest)
2. **Job tipleri** (`@wa/shared` re-export)
3. Harici Postgres’e bağlama talimatı

Runtime process: `apps/wa-service` (Docker imajı veya `ROLE=worker|scaler`).

### Mimari

```
Harici_UI_veya_panel  --INSERT-->  public.jobs  <--claim--  wa-service
                                      |
                                   Postgres
                                      |
                              wa.* (creds, lease, …)
```

**HTTP komut yolu yok.** Tek kanal: `DATABASE_URL`.

### Hızlı kurulum (boş / yeni Supabase)

```bash
# 1) Sema demetini üret
node packages/wa-worker-kit/scripts/verify-schema.mjs
node packages/wa-worker-kit/scripts/bundle-sql.mjs
# → packages/wa-worker-kit/dist/worker-schema.bundle.sql

# 2) Uygula
psql "$DATABASE_URL" -f packages/wa-worker-kit/dist/worker-schema.bundle.sql

# 3) Worker
# apps/wa-service/.env → DATABASE_URL + WORKER_ID=...
docker compose -f infra/docker-compose.yml up -d --build

# veya kit örneği:
docker compose -f packages/wa-worker-kit/docker-compose.example.yml up -d --build
```

Filo tam ürün (RLS, storage, admin RPC) için **tüm** `supabase/migrations/` sırasını uygulayın; kit panel katmanını bilerek dışarıda bırakır.

### Manifest

Dosya: `packages/wa-worker-kit/schema/manifest.json`

- ~17 zorunlu migration (core + jobs + wa.* + affinity + heartbeat/scaler)
- Panel-only dışlanır: RLS, storage, realtime, admin_overview, …

Notlar:

- `brand_kits` / `creatives` worker sorgulamaz ama FK zinciri için zorunlu.
- `organizations_tenancy` `org_id` ekler — worker buna bağlı.
- Autoscale tabloları demette (`worker_heartbeat`, `scaler_state`).

### Minimum env

| Değişken | Açıklama |
|----------|---------|
| `DATABASE_URL` | Session pooler, port **5432** |
| `WORKER_ID` | Process başına benzersiz |
| `ROLE` | `worker` (varsayılan) veya `scaler` |

Örnek: `apps/wa-service/.env.example`

### Tip sözleşmesi (harici panel)

```ts
import { JOB_TYPES, type JobPayloadMap } from '@wa/worker-kit'
```

Panel `jobs` satırı `INSERT` ederken `type` + `payload` bu tiplerle uyumlu olmalı.

### Sınırlar

- Kit Baileys kodunu çoğaltmaz; servis monorepoda kalır.
- Saf Postgres (Supabase `auth.users` / roller yok) → migration uyarlanmalı.
- Kota / org politikası host paneline aittir; worker toplam hesabı işler.

Paket README: `packages/wa-worker-kit/README.md` · Sözleşme: `docs/worker-contract.md`
