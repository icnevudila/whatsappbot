# MESAJIFY KAMPANYA VE İÇERİK WIZARD AI ÖZELLİKLERİ KANITLI DENETİM RAPORU (V2 - REVİZE)

**Tarih:** 10 Ekim 2026, 20:46:00 +03:00  
**Test Ortamı:** Localhost:3003 (Next.js 16.3.4 Turbopack Customer Panel) + Hetzner Gateway (`167.233.201.31:3456`)  
**Test Hesabı:** `test@filo.dev` (User ID: `e0784e2d-b636-4b31-8c72-dadd021adec3`)  
**İşletmeler:** 
- Bofe Tarım (`b359ccd3-3ec8-40fd-928e-bc6dbbd489c0`)
- Ayvazoğlu İnşaat (`4a58b0dd-0931-4901-880a-686457d15010`)  
**Denetim Kapsamı:** Kampanya Oluşturma Wizard (`/kampanyalar/yeni`) & İçerik / Görsel Wizard (`/icerik/yeni`) — 38 Arayüz Özelliği + Gerçek Katalog Ürün Doğrulaması.

---

## 1. YÖNETİCİ ÖZETİ VE KATEGORİK SKOR KARTI

Önceki "38/38 genel PASS" raporu revize edilmiş; tüm kontroller kullanıcı talebi doğrultusunda somut teknik gerçekliğe göre 4 ayrı sınıfa ayrılmıştır:

| Kategori | Test Sayısı | REAL_AI_PASS | TEMPLATE_FALLBACK_PASS | API_GUARD_PASS | QUALITY_DRIFT_NOTE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Kampanya Wizard — 5 Yazım Tonu** | 5 | 5 | 0 | 0 | 0 |
| **Kampanya Wizard — 20 Rewrite Seçeneği** | 20 | 20 | 0 | 0 | 20 (Bağlam Sızıntısı) |
| **Kampanya Wizard — Kreatif Handoff Hızlı Butonlar** | 3 | 3 | 0 | 0 | 3 (Stüdyo Sızıntısı) |
| **Kampanya Wizard — Gömülü AiImage & Preflight** | 2 | 0 | 0 | 2 | 0 (Görsel Üretim Değil) |
| **İçerik Wizard — 6 Fikir Önerisi Çipi** | 6 | 0 | 6 (Gateway 401) | 0 | 0 |
| **İçerik Wizard — AI Reklam Planı & Farklı Öner** | 2 | 2 | 0 | 0 | 0 |
| **TOPLAM** | **38** | **30** | **6** | **2** | **23** |

*Ek olarak: Bofe Tarım ve Ayvazoğlu İnşaat gerçek katalog ürünleriyle 11 adet teyit testi çalıştırılmıştır (Bölüm 4).*

---

## 2. P0 — FİKİR ÖNER / OMNISTUDIO GATEWAY AUTH HATASI & KÖK NEDEN ANALİZİ

### 2.1. Tespit Edilen Problem
`apps/customer/src/app/api/icerik/fikir/route.ts` rotasında OmniStudio Gateway'e (`http://167.233.201.31:3456/v1/chat/completions`) yapılan isteklerde **Authorization başlığı (Bearer token) gönderilmemektedir.**

```ts
// apps/customer/src/app/api/icerik/fikir/route.ts:25-26
const gateway = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/,'')
const response = await fetch(`${gateway}/v1/chat/completions`,{
  method:'POST',
  headers:{'content-type':'application/json'}, // <-- HATA: Authorization başlığı eksik!
  ...
})
```

### 2.2. Gateway Davranışı ve Fallback Mekanizması
1. Gateway sunucusu (`server.js`) Bearer token beklediği için bu isteğe **HTTP 401 Unauthorized** (`{"error":"Missing or invalid bearer token"}`) yanıtı dönmüştür.
2. `route.ts` 29. satırdaki `if (!response.ok ... ) throw new Error('INVALID_IDEA')` kontrolü 401 yanıtını yakalayıp 31. satırdaki `catch` bloğuna düşmüştür:
   ```ts
   catch { return NextResponse.json({text:fallback,source:'template'}) }
   ```
3. Bu nedenle 6 Fikir Önerisi çipinin tamamı **template fallback** olarak dönmüş; raporda `source: 'template'` olarak kaydedilmiştir.

### 2.3. Doğrulama Kanıtı (Token ile Gateway Çağrısı)
`scripts/test_gateway_idea_with_token.ts` betiği ile aynı payload Hetzner Gateway'e `Authorization: Bearer <OMNISTUDIO_GATEWAY_TOKEN>` başlığı ile gönderildiğinde Gateway **HTTP 200 OK** yanıtı vermiştir:
* **Gateway Job ID:** `chatcmpl-job_18c0ec0e27f93b49`
* **Model:** `gpt-4o`
* **Gerçek AI Yanıtı:** *"Bofe Tarım’da ilaçlama işlerinizi kolaylaştıracak bir fırsat! 16L otomatik şarjlı akülü sırt ilaçlama pompası, güçlü lityum-iyon bataryası ve ayarlanabilir nozuluyla indirim kampanyamızda sizi bekliyor."*

### 2.4. Önerilen Minimum Düzeltme (Review Proposal)
Doğrudan OpenAI/Gemini API anahtarı eklemeden, mevcut OmniStudio Gateway token standardını kullanarak `apps/customer/src/app/api/icerik/fikir/route.ts` dosyasına yapılacak düzeltme:

```diff
--- a/apps/customer/src/app/api/icerik/fikir/route.ts
+++ b/apps/customer/src/app/api/icerik/fikir/route.ts
@@ -23,8 +23,15 @@ export async function POST(request: Request) {
   const system = 'Türkçe kampanya fikri yaz. ...'
   try {
     const gateway = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/,'')
+    const token = (process.env.OMNISTUDIO_GATEWAY_TOKEN || process.env.WORKER_CONTROL_TOKEN || process.env.CHATGPT_API_KEY || '').trim()
     const response = await fetch(`${gateway}/v1/chat/completions`,{
       method:'POST',
-      headers:{'content-type':'application/json'},
+      headers:{
+        'content-type':'application/json',
+        ...(token ? { 'authorization': `Bearer ${token}` } : {})
+      },
       signal:AbortSignal.timeout(20000),
```

---

## 3. P1 — METİN İYİLEŞTİRMELERİNDE BAĞLAM SIZINTISI (DRIFT) ANALİZİ

### 3.1. Sorun
20 metin rewrite çıktısında, orijinal mesajda bulunmayan `"bu hafta sonu"` ifadesi; kreatif handoff çıktılarında ise `"organik zeytinyağı"` ifadesi yer almıştır.

### 3.2. Kök Neden: Prompt-Brief Entegrasyonu
`apps/customer/src/lib/ai/campaign-message.ts` içerisindeki `buildRewritePrompt` fonksiyonu incelendiğinde:
```ts
export function buildRewritePrompt(input: {
  currentMessage: string
  action: RewriteAction
  brief?: string
  business: BusinessContext
}): string {
  return [
    `İşlem: ${REWRITE_HINT[input.action]}`,
    input.brief?.trim() ? `Kampanya bağlamı: ${input.brief.trim()}` : null,
    formatBusiness(input.business),
    `Mevcut mesaj:\n${input.currentMessage.trim()}`,
    'Yalnızca yeni mesaj metnini döndür. Açıklama yazma.',
  ].filter(Boolean).join('\n\n')
}
```
* Wizard akışında kullanıcı bir brief girip mesaj ürettikten sonra "AI ile İyileştir" menüsünü kullandığında, frontend `brief` parametresini de API'ye göndermektedir.
* Testteki brief metni: `"Doğal soğuk sıkım erken hasat zeytinyağında bu hafta sonuna özel %25 indirim yapıyoruz..."` idi.
* LLM (gpt-4o), `Kampanya bağlamı:` satırını gördüğü için metni rewrite ederken bağlamdaki `"bu hafta sonu"` detayını mesajın içine dahil etmiştir.
* Kreatif Stüdyosu'ndan gelen mesajda ise stüdyo briefinde `"organik zeytinyağı"` yazıldığı için hızlı rewrite aksiyonları bu ifadeyi korumuştur.

### 3.3. Düzeltme Önerisi
Sadece metin iyileştirme (rewrite) işlemlerinde, eğer amaç salt mevcut mesajın biçimini değiştirmekse (özellikle `fix_grammar`, `shorten`, `simplify`), `brief` parametresinin rewrite promptuna eklenmemesi veya prompta şu kuralın eklenmesi önerilir:
> *"Mevcut mesajda bulunmayan zaman, ürün niteliği veya ek kampanya şartlarını bağlamdan mesaja taşıma."*

---

## 4. P2 — GERÇEK KATALOG ÜRÜNLERİYLE DOĞRULAMA TESTLERİ

Sentetik/uydurma veriler tamamen elenmiş; Bofe Tarım ve Ayvazoğlu İnşaat'ın veritabanındaki gerçek katalog ürünleriyle testler gerçekleştirilmiştir.

### 4.1. Bofe Tarım — 16L Akülü Sırt Pompası (`b68d4eb9-7cc0-491e-9ece-84b8c01068b1`)
* **Brief:** *"Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L stoklarımızda. Bahçe ve tarla ilaçlaması için güçlü akü, ayarlanabilir nozul. 2.450 TL yerine 1.850 TL özel tanıtım fiyatı."*
* **Mevcut Mesaj (Rewrite için):** *"Değerli üreticimiz, Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L stoklarımızda! Güçlü aküsü ve ayarlanabilir nozuluyla tarla işlerinizi kolaylaştırın. Tanıtıma özel 2.450 TL yerine 1.850 TL."*

| Test Türü | Aksiyon / Ton | Status | Gateway Job ID | Gecikme | Harfiyen AI Çıktısı | Kalite / Değerlendirme |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Generate** | `samimi` | 200 OK | `chatcmpl-job_aa922fb8382b15e0` | 13.4s | 🌿 Bofe Tarım’dan bahçe ve tarla işleriyle uğraşanlara özel güzel bir fırsat!<br><br>Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L stoklarımızda!<br><br>✅ Güçlü akü<br>✅ Ayarlanabilir nozul<br>✅ 16 litre depo kapasitesi<br><br>💥 2.450 TL yerine sadece 1.850 TL!<br><br>Bahçe ve tarla ilaçlama işlerinizi kolaylaştıracak bu fırsatı değerlendirmek için bize yazabilirsiniz.<br><br>📍 Demirci Mahallesi, Nilüfer / Bursa<br>📞 0542 821 22 05<br><br>Bofe Tarım – Toprağınıza değer katar! | **REAL_AI_PASS**<br>Zeytinyağı yok, uydurma tarih yok, fiyatlar harfiyen korundu. |
| **Generate** | `satis` | 200 OK | `chatcmpl-job_9d46cebeffd1b6d8` | 20.2s | 🌿 Bofe Tarım’dan Kaçırılmayacak Tanıtım Fırsatı!<br><br>Bahçe ve tarla ilaçlama işleriniz için Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L özel fiyatıyla stoklarımızda!<br><br>✅ Güçlü akü<br>✅ Ayarlanabilir nozul<br>✅ 16 litre depo kapasitesi<br><br>💥 2.450 TL yerine sadece 1.850 TL!<br><br>600 TL avantajla ihtiyaç duyduğunuz ilaçlama pompasına sahip olun!<br><br>📞 Sipariş vermek ve detaylı bilgi almak için bize hemen ulaşın: 0542 821 22 05<br><br>📍 Demirci Mahallesi, Nilüfer / Bursa | **REAL_AI_PASS**<br>Hesaplanan 600 TL avantaj matematiksel olarak doğru (2450 - 1850). |
| **Rewrite** | `improve` | 200 OK | `chatcmpl-job_10e7602aa3afecd2` | 7.9s | Değerli üreticimiz, Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L stoklarımızda!<br><br>Güçlü aküsü ve ayarlanabilir nozuluyla tarla işlerinizi kolaylaştırın.<br><br>🌿 Tanıtıma özel 2.450 TL yerine sadece 1.850 TL!<br><br>Detaylı bilgi ve sipariş için bize ulaşabilirsiniz.<br><br>📞 Bofe Tarım: 0542 821 22 05 | **REAL_AI_PASS**<br>Net, akıcı ve orijinal verileri koruyan çıktı. |
| **Rewrite** | `shorten` | 200 OK | `chatcmpl-job_f3dd4d44da942a6d` | 6.7s | Değerli üreticimiz, Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L stoklarımızda!<br><br>Güçlü akü ve ayarlanabilir nozul avantajıyla 2.450 TL yerine tanıtıma özel 1.850 TL!<br><br>📞 Bofe Tarım: 0542 821 22 05 | **REAL_AI_PASS**<br>Başarılı kısaltma, fiyat ve ürün eksiksiz. |
| **Rewrite** | `sales_focused` | 200 OK | `chatcmpl-job_9b5cbb5d3aae5608` | 6.5s | Değerli üreticimiz, 🌿 Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L stoklarımızda!<br><br>Güçlü aküsü ve ayarlanabilir nozuluyla tarla işlerinizi kolaylaştırın.<br><br>💥 Tanıtıma özel 2.450 TL yerine sadece 1.850 TL!<br><br>Bu avantajlı fiyattan yararlanmak için siparişinizi oluşturabilir, detaylı bilgi almak için bize ulaşabilirsiniz.<br><br>📞 Bofe Tarım: 0542 821 22 05 | **REAL_AI_PASS** |
| **Rewrite** | `urgency` | 200 OK | `chatcmpl-job_6c6f838c58da29d9` | 12.4s | 🌿 Değerli üreticimiz, Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L stoklarımızda!<br><br>Güçlü aküsü ve ayarlanabilir nozuluyla tarla işlerinizi kolaylaştırın.<br><br>💥 Tanıtıma özel 2.450 TL yerine sadece 1.850 TL!<br><br>Bu avantajlı fiyatı kaçırmamak için siparişinizi geciktirmeyin!<br><br>📞 Bofe Tarım: 0542 821 22 05 | **REAL_AI_PASS**<br>Sahte bitiş tarihi uydurmadan aciliyet ekledi. |
| **Rewrite** | `whatsapp` | 200 OK | `chatcmpl-job_792f9b494997e755` | 32.9s | Değerli üreticimiz, 🌿<br><br>Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L stoklarımızda!<br><br>✅ Güçlü akü<br>✅ Ayarlanabilir nozul<br><br>Tarla işlerinizi kolaylaştırın!<br><br>💥 Tanıtıma özel fiyat:<br>2.450 TL yerine 1.850 TL!<br><br>📞 Bofe Tarım<br>0542 821 22 05 | **REAL_AI_PASS**<br>Mükemmel WhatsApp satır kırılımları. |

---

### 4.2. Ayvazoğlu İnşaat — 13.5 Tuğla (`3c563c0e-2d46-47df-8898-e0c125455adf`)
* **Brief:** *"Ayvazoğlu İnşaat fabrikadan toptan 13.5 standart tuğla satışımız devam ediyor. Şantiye teslimi tır bazında siparişlerde net iskonto. Projeleriniz için doğrudan üreticiden tedarik avantajı."*
* **Mevcut Mesaj (Rewrite için):** *"Sayın şantiye yetkilisi, Ayvazoğlu İnşaat olarak fabrikadan toptan 13.5 tuğla satışımız devam etmektedir. Tır bazlı şantiye teslimlerinde özel iskontolarımız için arayınız: +90 462 325 10 20."*

| Test Türü | Aksiyon / Ton | Status | Gateway Job ID | Gecikme | Harfiyen AI Çıktısı | Kalite / Değerlendirme |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Generate** | `profesyonel` | 200 OK | `chatcmpl-job_ce2e3f007ceb134c` | 14.6s | Ayvazoğlu İnşaat Kampanya Mesajı<br><br>Ayvazoğlu İnşaat’ta fabrikadan toptan 13,5 standart tuğla satışımız devam ediyor.<br><br>Şantiye teslimi, tır bazında siparişlerde net iskonto avantajı sunuyoruz.<br><br>Projeleriniz için doğrudan üreticiden güvenilir ve avantajlı tedarik imkânı.<br><br>Detaylı bilgi ve sipariş için:<br>+90 462 325 10 20<br><br>Ayvazoğlu İnşaat<br>Organize Sanayi Bölgesi, Trabzon | **REAL_AI_PASS**<br>Kurumsal inşaat dili, şantiye teslimi ve doğrudan tedarik vurgusu tam. |
| **Generate** | `satis` | 200 OK | `chatcmpl-job_f2eec3b312ec7cf5` | 10.9s | 🧱 13,5 Standart Tuğlada Fabrikadan Toptan Satış Avantajı!<br><br>Ayvazoğlu İnşaat olarak toptan tuğla satışlarımız devam ediyor.<br><br>✅ Doğrudan üreticiden tedarik<br>✅ Şantiye teslimi<br>✅ Tır bazında siparişlerde net iskonto<br><br>Projelerinizde avantajlı tedarik fırsatından yararlanın!<br><br>Fiyat teklifi almak ve sipariş oluşturmak için bizimle iletişime geçin.<br><br>📞 +90 462 325 10 20<br><br>Ayvazoğlu İnşaat<br>📍 Organize Sanayi Bölgesi, Trabzon | **REAL_AI_PASS**<br>Satış argümanları madde imli, profesyonel. |
| **Rewrite** | `shorten` | 200 OK | `chatcmpl-job_8942d2ac0fe2f5be` | 12.2s | 🧱 Ayvazoğlu İnşaat olarak fabrikadan toptan 13,5 tuğla satışımız devam ediyor.<br><br>Tır bazlı şantiye teslimlerinde özel iskonto fırsatı!<br><br>📞 Fiyat teklifi için arayın: +90 462 325 10 20 | **REAL_AI_PASS** |
| **Rewrite** | `sales_focused` | 200 OK | `chatcmpl-job_fbdacc97d89f2fa3` | 12.1s | Sayın Şantiye Yetkilisi,<br><br>🧱 Ayvazoğlu İnşaat olarak fabrikadan toptan 13,5 standart tuğla satışlarımız devam ediyor.<br><br>Tır bazlı, şantiye teslimi siparişlerinizde özel iskonto avantajlarımızdan yararlanabilirsiniz.<br><br>Projeleriniz için doğrudan üreticiden avantajlı fiyat teklifi almak üzere bizimle iletişime geçin.<br><br>📞 +90 462 325 10 20<br><br>Ayvazoğlu İnşaat | **REAL_AI_PASS** |
| **Rewrite** | `cta` | 200 OK | `chatcmpl-job_34816fe1e6163746` | 6.0s | Sayın Şantiye Yetkilisi,<br><br>🧱 Ayvazoğlu İnşaat olarak fabrikadan toptan 13,5 standart tuğla satışlarımız devam ediyor.<br><br>Tır bazlı, şantiye teslimi siparişlerinizde özel iskonto avantajlarımızdan yararlanın.<br><br>📞 Hemen arayın, projenize özel fiyat teklifinizi alın!<br><br>+90 462 325 10 20<br><br>Ayvazoğlu İnşaat | **REAL_AI_PASS**<br>"Hemen arayın, projenize özel fiyat teklifinizi alın!" CTA'sı eklendi. |
| **Rewrite** | `whatsapp` | 200 OK | `chatcmpl-job_c99f3dfd54245e3d` | 29.5s | Sayın Şantiye Yetkilisi,<br><br>Ayvazoğlu İnşaat olarak fabrikadan toptan 13,5 tuğla satışımız devam etmektedir.<br><br>🧱 Tır bazlı, şantiye teslimi siparişlerinizde özel iskonto avantajları sunuyoruz.<br><br>Detaylı bilgi ve fiyat teklifi için bizi arayın.<br><br>📞 +90 462 325 10 20<br><br>Ayvazoğlu İnşaat | **REAL_AI_PASS** |

---

## 5. P3 — GÖMÜLÜ `AiImage` & `/api/gorsel-uret` GERÇEK SINIFLANDIRMASI

Kampanya Sihirbazı'nın 1. adımındaki `MediaPicker` bileşeni içerisinde yer alan `AiImage` kontrolleri test edilmiştir:
* **GET `/api/gorsel-uret`:** 200 OK döndü. Dönen veri: `{ requestScope: "b359ccd3-...:e0784e2d-..." }`. Bu bir **Tenant/Session Isolation Guard** kontrolüdür.
* **POST `/api/gorsel-uret`:** 400 Bad Request döndü (`"Kalıcı üretim kimliği gerekli."`). Bu bir **Input Validation Guard** kontrolüdür.

> [!IMPORTANT]
> **Bu kontroller yeni bir piksel/raster görsel üretimi değildir.** Bu nedenle durumları `API_GUARD_PASS` olarak sınıflandırılmıştır.
> Kullanıcı talimatı gereği yeni ücretli görsel üretimi tetiklenmemiştir.
> Gerçek tamamlanmış görsel üretim doğrulaması, daha önce başarıyla üretilen ve veritabanında saklanan üretim kayıtlarına dayanmaktadır:
> - **Bofe Tarım Görsel İşi:** `job_5d0dde4007c37a0f`
> - **Ayvazoğlu İnşaat Görsel İşi:** `job_d8e786fff11a1e82`

---

## 6. P4 — OMNISTUDIO GATEWAY DOĞRULAMA KANITLARI

Hetzner Gateway (`167.233.201.31:3456`) üzerinde çalışan gerçek isteklerin log ve kimlik kanıtları:

1. **Aktif Model:** `gpt-4o` (OmniStudio Chat Completion Gateway)
2. **Kullanılan Bearer Anahtarı:** `.env.local` dosyasındaki 64 karakterlik `OMNISTUDIO_GATEWAY_TOKEN`
3. **Doğrulanmış Örnek Gateway Job ID'leri:**
   - `chatcmpl-job_18c0ec0e27f93b49` (Bofe Fikir Öner Testi)
   - `chatcmpl-job_aa922fb8382b15e0` (Bofe Samimi Ton Üretimi)
   - `chatcmpl-job_9d46cebeffd1b6d8` (Bofe Satış Odaklı Ton Üretimi)
   - `chatcmpl-job_10e7602aa3afecd2` (Bofe Improve Rewrite)
   - `chatcmpl-job_f3dd4d44da942a6d` (Bofe Shorten Rewrite)
   - `chatcmpl-job_792f9b494997e755` (Bofe WhatsApp Rewrite)
   - `chatcmpl-job_ce2e3f007ceb134c` (Ayvazoğlu Profesyonel Ton Üretimi)
   - `chatcmpl-job_f2eec3b312ec7cf5` (Ayvazoğlu Satış Ton Üretimi)
   - `chatcmpl-job_8942d2ac0fe2f5be` (Ayvazoğlu Shorten Rewrite)
   - `chatcmpl-job_34816fe1e6163746` (Ayvazoğlu CTA Rewrite)
   - `chatcmpl-job_c99f3dfd54245e3d` (Ayvazoğlu WhatsApp Rewrite)

---

## 7. DOĞRULAMA DOSYALARI LİSTESİ

1. **Revize Edilmiş 38 Testlik Tam Matris:**  
   [comprehensive_wizard_audit_results.json](file:///c:/Users/TP2/Documents/whatsapp/docs/evidence/wizard_audit_evidence/comprehensive_wizard_audit_results.json)
2. **Gerçek Katalog Ürün Test Çıktıları (11 Kayıt):**  
   [real_catalog_audit_results.json](file:///c:/Users/TP2/Documents/whatsapp/docs/evidence/wizard_audit_evidence/real_catalog_audit_results.json)
3. **Gateway Token Doğrulama Betiği:**  
   [test_gateway_idea_with_token.ts](file:///c:/Users/TP2/Documents/whatsapp/scripts/test_gateway_idea_with_token.ts)
4. **Gerçek Katalog Test Betiği:**  
   [test_real_catalog_audit.ts](file:///c:/Users/TP2/Documents/whatsapp/scripts/test_real_catalog_audit.ts)
5. **E2E Playwright Otomasyon Betiği & Ekran Görüntüleri:**  
   [playwright_audit_full.ts](file:///c:/Users/TP2/Documents/whatsapp/scripts/playwright_audit_full.ts)  
   [campaign_wizard_live/](file:///c:/Users/TP2/Documents/whatsapp/docs/evidence/wizard_audit_evidence/campaign_wizard_live/)
