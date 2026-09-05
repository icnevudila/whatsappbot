# Filo public API (CRM)

Panel üzerinden oluşturulan `filo_…` anahtarları ile harici sistemler iş kuyruğuna yazar.

## Kimlik

```
Authorization: Bearer filo_<secret>
```

Anahtar Ayarlar → Entegrasyonlar’da bir kez gösterilir; hash DB’de saklanır (`org_api_keys`).

## POST `/api/v1/jobs`

İş oluşturur (worker `wa.claim_jobs` ile alır — panel→worker HTTP yok).

```json
{
  "type": "message.send",
  "accountId": "<uuid>",
  "payload": {
    "phone_e164": "+905551112233",
    "body": "Merhaba"
  }
}
```

**İzinli tipler:** `message.send`, `contacts.verify`, `contacts.check_phone`, `campaign.start|pause|resume|stop`.

**Yanıt:** `{ "id": 123, "status": "pending" }` (201).

## GET `/api/v1/jobs?id=123`

Aynı Bearer ile durum: `pending|claimed|running|done|failed|cancelled`.

## Limitler

- ~120 istek / dakika / anahtar (bellek içi; çok instance’ta gevşer).
- `accountId` / `campaignId` org’a ait olmalı.
- Panel’de `SUPABASE_SERVICE_ROLE_KEY` gerekir (anahtar çözümleme).

## CRM webhook (ters yön)

Org `webhook_url` + isteğe bağlı `webhook_secret` → Filo dışarı `message.inbound` / `campaign.completed` gönderir. Bkz. Ayarlar → Webhook.
