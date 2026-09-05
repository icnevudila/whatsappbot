# WhatsApp worker DB sözleşmesi (Filo / wa-service)

Taşınabilir worker sözleşmesi: panel/dashboard ile `wa-service` **yalnızca Postgres üzerinden** konuşur. Worker’a HTTP komut gönderilmez.

Kaynak doğruluk: `packages/shared/src/jobs.ts`, `supabase/migrations/`, `apps/wa-service`.

---

## 1. İletişim modeli

| Kim | Ne yapar |
|-----|----------|
| Panel / dashboard | `public.jobs` tablosuna `INSERT` (tip + payload) |
| Worker (`wa-service`) | `wa.claim_jobs()` ile satır alır, işler, durum/sonuç yazar |
| Hesap / kampanya durumu | Worker `accounts`, `campaigns`, `message_log` vb. günceller; panel okur |

- Panel → worker: **HTTP yok**. Tek komut kanalı `jobs`.
- Worker dışarı port açmak zorunda değil; `/health` ve `/ready` yalnızca localhost/healthcheck için.
- Job tipleri ve payload şekilleri `packages/shared` ile DB `CHECK` kısıtlarıyla bire bir tutulmalı.

---

## 2. Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `DATABASE_URL` | Evet | Postgres bağlantı dizesi (Supabase Session pooler, port **5432** önerilir) |
| `WORKER_ID` | Evet | Sabit, process başına benzersiz kimlik (kira + job claim). Örn. `oracle-1` |
| `PORT` | Hayır | Sağlık sunucusu (varsayılan `8080`) |
| `GOOGLE_MAPS_API_KEY` | Hayır | `contacts.discover` / Places keşfi için |

Diğer isteğe bağlı ayarlar (`MAX_SESSIONS`, `STALE_JOB_SECONDS`, …) için: `apps/wa-service/.env.example`.

---

## 3. Gerekli public tablolar

Worker’ın beklediği çekirdek şema (amaç özeti):

| Tablo | Amaç |
|-------|------|
| `jobs` | Komut kuyruğu. Panel yazar; worker claim eder. |
| `accounts` | WhatsApp oturumları. `status` / QR alanlarını worker yazar. |
| `account_events` | Hesap olay günlüğü (panel canlı log). |
| `contacts` | E.164 numaralar, `wa_status` / `wa_jid` doğrulama sonucu. |
| `contact_lists` | Kişi listeleri. |
| `contact_list_members` | Liste ↔ kişi üyeliği. |
| `campaigns` | Kampanya tanımı; status/sayaçları worker yazar. |
| `campaign_accounts` | Kampanyaya bağlı gönderen hesaplar. |
| `campaign_targets` | Materyalize hedefler; claim ile `sending`. |
| `message_log` | Gönderim / inbound kayıt. Worker outbound'ta `status` ilerletir: `sent` → `delivered` → `read` (`messages.update`). |
| `blacklist` | Engelli numaralar. |
| `organizations` | Kiracı (işletme); kota/plan. |

Tam kolonlar ve RLS: `supabase/migrations/` sırasıyla.

---

## 4. Gerekli `wa.*` private şema

`wa` şeması Data API’ye **açılmaz**; yalnızca `service_role` / worker DB kullanıcısı.

### Tablolar

| Nesne | Amaç |
|-------|------|
| `wa.creds` | Baileys `AuthenticationCreds` (hesap başına bir satır) |
| `wa.auth_state` | SignalKeyStore anahtarları |
| `wa.session_lease` | Oturum kirası + epoch; aynı hesabın iki process’te açılmasını engeller |
| `wa.sent_messages` | `getMessage` deposu (ack / “message taking a while” önlemi) |

### Fonksiyonlar

| Fonksiyon | Amaç |
|-----------|------|
| `wa.claim_jobs(worker_id, limit)` | Pending job’ları `FOR UPDATE SKIP LOCKED` ile `claimed` yapar |
| `wa.claim_campaign_target(campaign_id, account_id)` | Sıradaki `queued` hedefi atomik `sending` yapar |
| `wa.acquire_lease` / `renew_lease` / `release_lease` | Oturum kirası yaşam döngüsü |
| `wa.cleanup_expired` | Eski sent_messages, lease, bitmiş job, event temizliği |

---

## 5. Job tipleri

Kaynak: `packages/shared/src/jobs.ts` (`JOB_TYPES`). DB `jobs.type` CHECK ile aynı olmalı.

| Tip | Kısa anlam |
|-----|------------|
| `account.connect` | Oturum bağla / QR |
| `account.disconnect` | Geçici bağlantıyı kes |
| `account.logout` | Oturumu kapat, creds temizle |
| `account.request_pairing_code` | Eşleştirme kodu iste (`phone_e164`) |
| `message.send` | Tek mesaj gönder |
| `contacts.verify` | Liste / seçili kişilerde onWhatsApp |
| `contacts.check_phone` | Tek numara anlık onWhatsApp (`phone_e164`) |
| `contacts.scrape` | URL’den numara kazı |
| `contacts.discover` | Yerel işletme keşfi (Places vb.) |
| `creative.render` | Kreatif üret |
| `campaign.start` | Kampanyayı başlat |
| `campaign.pause` | Duraklat |
| `campaign.resume` | Devam |
| `campaign.stop` | Durdur |

Durumlar: `pending` → `claimed` → `running` → `done` | `failed` | `cancelled`.

---

## 6. Sağlık uçları

Worker yalnızca sağlık için HTTP dinler (`PORT`, varsayılan `8080`). Dışarıya açılması gerekmez.

| Uç | Anlam | HTTP |
|----|--------|------|
| `GET /health` | Liveness: Postgres erişilebilir mi | 200 / 503 |
| `GET /ready` | Readiness: DB + oturumlar sağlıklı (stale yok) | 200 / 503 |
| `GET /` | `/health` ile aynı | 200 / 503 |

JSON özet alanları: `worker`, `healthy`, `ready`, `db`, `sessions`, `jobs`, `uptimeSeconds`.

Docker healthcheck örneği: `curl -fsS http://127.0.0.1:8080/health`.

---

## 7. Başka bir Supabase’e bağlama

1. **Migration’ları sırayla uygula**  
   `supabase/migrations/` altındaki dosyalar zaman damgası sırasıyla (extensions → core → contacts → campaigns → jobs → wa private → RLS → … → `contacts.check_phone` dahil sonraki job tipi migration’ları).

2. **`DATABASE_URL` ayarla**  
   Project Settings → Database → Session pooler.  
   Kullanıcı: `postgres.<project-ref>`, port **5432** (transaction pooler 6543 değil).

3. **Worker env**  
   `apps/wa-service/.env`: en az `DATABASE_URL` + `WORKER_ID`. İsteğe bağlı `GOOGLE_MAPS_API_KEY`, `PORT`.

4. **Docker Compose** (repo kökünden):

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

- Sağlık portu varsayılan: `127.0.0.1:8080` (dışarı açık değil).
- Panel ile worker arasında HTTP komut yolu yok; aynı Postgres yeterli.

---

## Özet

Panel komut yazar → `jobs` → worker `wa.claim_jobs` ile alır. Auth/kira `wa.*` içinde kalır. Yeni ortam = migration sırası + `DATABASE_URL` + `WORKER_ID` + compose.

---

## 8. Ürün checklist eşlemesi (Wp worker)

| # | Madde | Worker / DB | UI |
|---|--------|-------------|-----|
| 1 | accounts | `accounts`, lease, QR/pairing | Panel Hesaplar; dashboard onboarding WA hat |
| 2 | timeline | `account_events` | Panel Durum; Admin özet |
| 3 | kampanya mesaj-url | `campaigns.message_type` + `media_url`; send image/video/document | Panel kampanya formu |
| 7 | WA matches | `contacts.verify`, `contacts.check_phone`, `wa_status` | Kişiler WaMark / tek numara kontrol |
| 8 | blacklist | `blacklist` + skip | Panel Kara liste |
| 9 | paylaşılanlar | `campaign_targets` + receipts | Kampanya hedef feed |
| 10 | messages | `message_log` in/out + delivered/read | Gelenler / Gidenler |

Media asset CDN bilinçli dışarıda.
