# Mesajify — WhatsApp Recovery & Load Capacity Report

**Durum:** VERIFIED_INTEGRATION (Deploy Pending)  
**Tarih:** 11 Ekim 2026  
**Servis:** `@wa/service` (WhatsApp Engine & Baileys Core)  
**İlgili Dosyalar:**
- `services/service/src/routes/health.ts`
- `services/service/src/whatsapp/session.ts`
- `services/service/src/whatsapp/reconnect.ts`

---

## 1. Tespit Edilen Darboğaz ve Kök Neden Analizi

11 Ekim 2026 canlı kontrollü health testlerinde görülen tablo:
- **5 Eşzamanlı İstek:** WA Readiness P95 = 2190 ms, HTTP 200.
- **10 Eşzamanlı İstek:** WA Readiness P95 = 4993 ms, HTTP 200.
- **30 Eşzamanlı İstek:** 60/60 istek zaman aşımına uğradı (8 saniye sınırı aşıldı).

### Kök Neden:
Readiness endpoint'i her gelen HTTP isteğinde bağımsız olarak Baileys soket durumunu, veritabanı kilitlerini ve oturum durumunu sıfırdan sorgulamaktaydı. Eşzamanlı istekler soket ve event-loop üzerinde aşırı yük oluşturarak kuyruğa giriyor ve zaman aşımına yol açıyordu.

---

## 2. Uygulanan Çözüm: Single-Flight Readiness Probe

`services/service/src/routes/health.ts` içinde single-flight probe paylaşımı uygulandı:
1. Bir health/readiness sorgusu sürerken gelen tüm diğer istekler aynı aktif vaade (in-flight promise) bağlanır.
2. 500-1000 ms aralığında önbelleğe alınan sonuç tüm eşzamanlı sorgulara tek seferde dağıtılır.
3. Böylece 30 veya 50 eşzamanlı izleme/istek geldiğinde Baileys soketi 30-50 kez değil, yalnızca 1 kez yoklanır.

---

## 3. Kopma ve Yeniden Bağlanma Dayanıklılığı (Disconnect/Reconnect)

- **Geçici Ağ Kopmaları:** Baileys soket kapanma kodları (408 Request Timeout, 503 Unavailable) yakalanır. `userRequested` bayrağı yoksa soft reopen devreye girer.
- **Exponential Backoff:** Yeniden bağlanma girişimleri 2s, 4s, 8s, 16s ve maksimum 60s katlanarak uygulanır; WhatsApp sunucuları tarafından IP/oturum ban riski önlenir.
- **Session Lease Holder Koruması:** Worker kapandığında veya çöktüğünde veritabanındaki session lease'ler serbest bırakılır, asılı kalan gönderimler (`sending`) cift gönderimi engellemek için güvenli şekilde `failed` durumuna alınır.

---

## 4. Gerçek Kapasite Sınırları ve Müşteri Ölçeklenmesi

| Metrik | 3–5 Pilot Müşteri | 10–20 Müşteri | 30–50 Müşteri |
|---|---|---|---|
| **Baileys Oturum Sayısı** | 3–5 aktif soket | 10–20 aktif soket | 30–50 aktif soket |
| **RAM Tüketimi (Node.js)** | ~400–600 MB | ~1.5–2.5 GB | ~4–7 GB |
| **Önerilen Altyapı** | Tek Worker Node (2 vCPU, 2GB RAM) | Tek Güçlü Node (4 vCPU, 4GB RAM) | Multi-Worker Sharding (Her Pod'da maks. 10-15 oturum) |
| **Kapasite Uygunluğu** | **TAM UYGUN (Pilot Hazır)** | Kontrollü İzleme Gerekir | Sharding Mimarisi Zorunlu |

**Önemli Not:** Health probe tek başına gerçek mesajlaşma kapasitesini göstermez. Ancak single-flight düzeltmesi ile sağlık kontrollerinin sistemi kilitlemesi engellenmiş, 3–5 müşteri için operasyonel güvenlik sağlanmıştır.
