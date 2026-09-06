# Filo WhatsApp Service — taşınabilir paket

Baileys tabanlı çok oturumlu WhatsApp **worker**. Panel / Next.js **dahil değil**.
Başka bir projeye klasör olarak kopyalayıp harici servis gibi çalıştırabilirsiniz.

```
Sizin_panel_veya_API  --INSERT-->  public.jobs  <--claim--  wa-worker
                                      |
                                   Postgres
                                      |
                         wa.* (creds, lease, auth_state, …)
```

HTTP ile komut yok. Tek kanal: `DATABASE_URL` + `jobs` tablosu.

## Bu klasörde ne var?

| Yol | Açıklama |
|-----|----------|
| `apps/wa-service/` | Worker runtime (Baileys, job consumer, kampanya, inbound) |
| `packages/shared/` | Job tipleri, telefon, spintax, kapasite |
| `packages/sdk/` | Host uygulama için ince tip paketi (`@wa/whatsapp-sdk`) |
| `schema/` | SQL demeti + saf Postgres auth stub |
| `Dockerfile` / `docker-compose.yml` | Tek başına imaj |
| `docs/worker-contract.md` | Sözleşme detayı |

Kaynak monorepoda canlı kod: `apps/wa-service` + `packages/shared`.  
Bu paket **snapshot**; güncellemek için repo kökünden:

```bash
npm run pack:whatsapp-service
# veya: node whatsapp-service/scripts/pack-from-monorepo.mjs
```

## Kurulum (başka proje)

### 1) Klasörü alın

```bash
# Örnek: alt modül / kopya
cp -r whatsapp-service /path/to/other-project/services/whatsapp
cd /path/to/other-project/services/whatsapp
```

### 2) Şemayı uygulayın

**Supabase** (auth zaten var):

```bash
psql "$DATABASE_URL" -f schema/worker-schema.bundle.sql
```

**Saf Postgres** (Supabase `auth` yok):

```bash
psql "$DATABASE_URL" -f schema/standalone-auth-stub.sql
psql "$DATABASE_URL" -f schema/worker-schema.bundle.sql
```

Session pooler port **5432** kullanın (6543 transaction mode Baileys oturumu için uygun değil).

### 3) Ortam

```bash
cp .env.example .env
# DATABASE_URL=...
# WORKER_ID=my-worker-1
```

### 4) Çalıştırın

Docker (önerilen):

```bash
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/health
```

veya Node:

```bash
npm install
npm start
```

## Host uygulamadan kullanım

1. `jobs` satırı ekleyin (`type` + `payload` — bkz. `docs/worker-contract.md`).
2. QR / durum için `accounts` tablosunu okuyun (Realtime veya poll).
3. Gelen/giden için `message_log`.

Tip güvenliği (TypeScript host):

```ts
import { JOB_TYPES, type JobPayloadMap } from '@wa/whatsapp-sdk'
```

Workspace’e `packages/sdk` + `packages/shared` ekleyin veya path ile bağlayın.

Örnek job:

```sql
INSERT INTO public.jobs (org_id, type, payload, status)
VALUES (
  '<org-uuid>',
  'account.connect',
  '{"account_id":"<account-uuid>"}'::jsonb,
  'pending'
);
```

## Sınırlar

- Kota, faturalama, RLS politikası **host**’a aittir.
- Bu paket worker + minimum şema taşır; Filo panel UI’si gelmez.
- Scraper (Playwright) imajda vardır; Places için `GOOGLE_MAPS_API_KEY` opsiyonel.

## Monorepo ile ilişki

| Canlı kaynak (Filo repo) | Bu paket |
|--------------------------|----------|
| `apps/wa-service` | `apps/wa-service` (kopya) |
| `packages/shared` | `packages/shared` (kopya) |
| `packages/wa-worker-kit` | `schema/` + `packages/sdk` |

`PACK_MANIFEST.json` son pack zamanını gösterir.
