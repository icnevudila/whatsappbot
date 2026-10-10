# OMNISTUDIO WIZARD ROUTING VERIFICATION & ARCHITECTURE AUDIT

**Tarih:** 10 Ekim 2026  
**Ortam:** Next.js Customer Panel + Hetzner OmniStudio Gateway (`167.233.201.31:3456`)  
**İnceleme Amacı:** Mesajify Kampanya Wizard ve İçerik Wizard bünyesindeki tüm AI üretim fonksiyonlarının uçtan uca yönlendirme mimarisini doğrulamak, harici sağlayıcı sızıntılarını denetlemek ve Gateway izolasyonunu kanıtlamak.

---

## 1. MİMARİ İZOLASYON KURALI VE DOĞRULAMA

### 1.1. Mimari İlke
Mesajify müşteri paneli (`apps/customer`), metin üretimi veya yaratıcı reklam planlaması için **kesinlikle doğrudan OpenAI, Gemini, Anthropic veya başka bir ücretli harici sağlayıcıya istek göndermez**.

Bütün yapay zekâ çağrıları:
1. `apps/customer/src/lib/ai/config.ts` içerisindeki `resolveTextProviderOrder()` fonksiyonu üzerinden **yalnızca `['omnistudio']`** sağlayıcısına kilitlenmiştir.
2. OmniStudio Gateway (`http://167.233.201.31:3456/v1/chat/completions`), Hetzner dedicated sunucusu üzerinde izole bir servis olarak çalışır.
3. Gateway arka planda GPT-4o motorunu işletir, loglamayı, token yönetimini ve tenant izolasyonunu sağlar.
4. Gateway'e ulaşılamaması veya hata dönmesi durumunda **arka planda gizlice ücretli harici sağlayıcıya geçilmez**; kontrollü hata veya açıkça etiketlenmiş güvenli fallback mekanizması devreye girer.

---

## 2. DOKUZ WIZARD AI ÖZELLİĞİNİN YÖNLENDİRME ZİNCİRİ (TRACE MATRIX)

| # | Wizard Özelliği | UI Kontrolü | Customer Backend Rotası | Dahili Çağrı Zinciri | Gateway Endpoint & Model | Geri Dönüş Tipi |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Kampanya — AI ile Yaz** | `AiWriteModal` (`campaign-wizard-ui.tsx:372`) | `POST /api/mesaj-yaz` (`mode: 'generate'`) | `completeText()` -> `lib/ai/text.ts` | `167.233.201.31:3456/v1/chat/completions` (`gpt-4o`) | `{ text: string }` |
| **2** | **5 Kampanya Tonu** | `AiWriteModal` Ton Butonları (`samimi`, `profesyonel`, `eglenceli`, `enerjik`, `satis`) | `POST /api/mesaj-yaz` (`tone: ...`) | `buildGeneratePrompt()` -> `completeText()` | `167.233.201.31:3456/v1/chat/completions` (`gpt-4o`) | `{ text: string }` |
| **3** | **20 Metin Rewrite Seçeneği** | `AiRewriteBar` Menüsü (`campaign-wizard-ui.tsx:499`) | `POST /api/mesaj-yaz` (`mode: 'rewrite'`, `action: ...`) | `buildRewritePrompt()` -> `completeText()` | `167.233.201.31:3456/v1/chat/completions` (`gpt-4o`) | `{ text: string }` |
| **4** | **Kreatiften Otomatik Mesaj** | Handoff Butonları (`/kampanyalar/yeni?creative_id=...`) | `POST /api/mesaj-yaz` (`creativeId: ...`) | `loadCampaignCreativeHandoff()` -> `buildGeneratePrompt()` | `167.233.201.31:3456/v1/chat/completions` (`gpt-4o`) | `{ text: string }` |
| **5** | **Görsel Wizard — Fikir Öner** | `BRIEF_CHIPS` Butonları (`creative-studio-v2.tsx:170`) | `POST /api/icerik/fikir` | Doğrudan Gateway fetch (Bearer Token ile) | `167.233.201.31:3456/v1/chat/completions` (`gpt-4o`) | `{ text: string, source: 'gpt' \| 'template' }` |
| **6** | **Creative Studio — AI Reklam Planı** | Otomatik tetikleyici (`creative-studio-v2.tsx:380`) | `POST /api/ai-media/plan` | `generateCreativePlan()` -> `completeText()` | `167.233.201.31:3456/v1/chat/completions` (`gpt-4o`) | `{ ok: true, plan: CreativePlanV2 }` |
| **7** | **Farklı Öner (Force Refresh)** | "↻ Farklı Öner" Butonu (`creative-studio-v2.tsx:842`) | `POST /api/ai-media/plan` (`forceRefresh: true`) | `generateCreativePlan()` -> `completeText()` | `167.233.201.31:3456/v1/chat/completions` (`gpt-4o`) | `{ ok: true, plan: CreativePlanV2 }` |
| **8** | **Gömülü AI Görsel Üretimi** | `MediaPicker` (`AiImage`) | `GET / POST /api/gorsel-uret` | Preflight Session Guard (`org:userId`) | Local Guard Doğrulaması (Raster üretimi tetiklemez) | `{ requestScope: string }` / `400 Bad Request` |
| **9** | **Uygulama, Kaydetme & Geri Yükleme** | "Taslağı Kaydet" & Adım İlerleme | `POST /api/campaigns` & LocalStorage | Zustand Store -> Supabase `campaigns` tablosu | Gateway Çağrısı Yok (Veri Bütünlüğü Doğrulaması) | `{ success: true, draftId: string }` |

---

## 3. P0 KÖK NEDEN TESPİTİ VE DÜZELTME KANITI (`/api/icerik/fikir`)

### 3.1. Hata Tespiti
`apps/customer/src/app/api/icerik/fikir/route.ts` dosyasında:
* Gateway'e yapılan istekte `Authorization: Bearer <token>` başlığı gönderilmediği için Gateway isteği **HTTP 401 Unauthorized** ile reddetmekteydi.
* Route kodu 401 hatasını yakaladığında sessizce `catch` bloğuna düşerek sabit bir şablon dizesi dönmekteydi:  
  `"${org.name} için ${category} odaklı, markamızın renkleriyle sade bir tanıtım görseli hazırlayalım."`
* Ek olarak satır 29'daki `/\d|%/.test(text)` kontrolü, ürün adında veya açıklamasında geçen meşru teknik sayıları (ör. "16L", "13.5") hatalı kabul ederek GPT yanıtını çöpe atıp şablona zorlamaktaydı.

### 3.2. Uygulanan Kök Neden Düzeltmesi
1. `process.env.OMNISTUDIO_GATEWAY_TOKEN` okunarak Gateway isteğine `Authorization: Bearer ${token}` eklendi.
2. `/\d|%/` sayısal reddetme hatası kaldırıldı; yalnızca boş metin ve uzunluk doğrulaması (`15 < length < 500`) korundu.
3. System prompt profesyonel reklam kreatif direktörü düzeyine yükseltildi.
4. Başarısızlık durumunda kaynak `source: 'template'` olarak açıkça etiketlenmeye devam edildi.

---

## 4. OMNISTUDIO GATEWAY TOKEN VE GÜVENLİK PROTOKOLÜ

* Gateway URL: `http://167.233.201.31:3456`
* Token Kaynağı: `OMNISTUDIO_GATEWAY_TOKEN` (`apps/customer/.env.local`, 64 karakter)
* Güvenlik İlkesi: Token hiçbir log dosyasında, kullanıcı arayüzünde veya rapor çıktısında açık metin olarak gösterilmez (Maskeleme: `U9A...jSr`).
* Tenant İzolasyonu: Her Gateway isteğine `tenant_id` (`org.id`) ve `customer` (`org.name`) parametreleri zorunlu olarak eklenir.
