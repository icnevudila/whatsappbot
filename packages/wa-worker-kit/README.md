# @wa/worker-kit — harici VT / proje için worker sözleşmesi

Filo **panel/admin aynı kalır**. Bu paket yalnızca:

1. Worker’ın ihtiyaç duyduğu **SQL demeti** (sıralı manifest)
2. **Job tipleri** (`@wa/shared` re-export)
3. Harici Postgres’e bağlama talimatı

Runtime process yine [`apps/wa-service`](../../apps/wa-service) — Docker imajı veya `ROLE=worker|scaler`.

```
Harici_UI_veya_panel  --INSERT-->  public.jobs  <--claim--  wa-service
                                      |
                                   Postgres
                                      |
                              wa.* (creds, lease, …)
```

HTTP komut yolu yok. Tek kanal: `DATABASE_URL`.

## Hızlı kurulum (boş / yeni Supabase)

```bash
# 1) Sema demetini uret
node packages/wa-worker-kit/scripts/verify-schema.mjs
node packages/wa-worker-kit/scripts/bundle-sql.mjs
# → packages/wa-worker-kit/dist/worker-schema.bundle.sql

# 2) Uygula (ornek)
psql "$DATABASE_URL" -f packages/wa-worker-kit/dist/worker-schema.bundle.sql

# 3) Worker
# apps/wa-service/.env → DATABASE_URL + WORKER_ID=...
docker compose -f infra/docker-compose.yml up -d --build
```

Filo tam ürün (RLS, storage, admin RPC) için **tüm** `supabase/migrations/` sırasını uygulayın; bu kit panel katmanını bilerek dışarıda bırakır.

## Manifest

[`schema/manifest.json`](./schema/manifest.json) — zorunlu dosya listesi + panel-only dışlananlar.

Notlar:

- `brand_kits` / `creatives` worker sorgulamaz ama FK zinciri için zorunlu.
- `organizations_tenancy` `org_id` ekler — worker buna bağlı.
- Autoscale tabloları (`worker_heartbeat`, `scaler_state`) demette; bkz. [docs/autoscale.md](../../docs/autoscale.md).
- Saf Postgres: önce [`schema/standalone-auth-stub.sql`](./schema/standalone-auth-stub.sql), sonra SQL bundle.
## Env (minimum)

| Değişken | Açıklama |
|----------|---------|
| `DATABASE_URL` | Session pooler, port **5432** |
| `WORKER_ID` | Process başına benzersiz |
| `ROLE` | `worker` (varsayılan) veya `scaler` |

Örnek: [`apps/wa-service/.env.example`](../../apps/wa-service/.env.example). Compose örneği: [`docker-compose.example.yml`](./docker-compose.example.yml).

## Tip sözleşmesi

```ts
import { JOB_TYPES, type JobPayloadMap } from '@wa/worker-kit'
```

Panel job `INSERT` ederken `type` + `payload` bu tiplerle uyumlu olmalı.

## Sınırlar

- Kit **Baileys kodunu çoğaltmaz**; servis monorepoda kalır.
- Saf Postgres (Supabase `auth.users` / roller yok) → migration’lar uyarlanmalı.
- Kota / org politikası host paneline aittir; worker toplam hesabı işler.
