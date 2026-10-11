# WIZARD AI FIXES AND TEST VERIFICATION LOG

**Tarih:** 10 Ekim 2026  
**Geliştirme Dalı:** `feat/wizard-ai-creative-engine-v1`  
**Kapsam:** P0 ve P1 Kök Neden Düzeltmeleri, Reklam Yazarlığı Motoru Geliştirmesi, Ticari Bilgi Koruma Sistemi ve Birim Test Doğrulamaları.

---

## 1. DÜZELTİLEN KÖK NEDENLER VE KOD DEĞİŞİKLİKLERİ

### 1.1. Düzeltme 1: `apps/customer/src/app/api/icerik/fikir/route.ts` (P0)
* **Problem:** OmniStudio Gateway'e Bearer token gönderilmiyordu; Gateway 401 veriyor ve sistem 6 hazır şablona düşüyordu. Ek olarak `/\d|%/` regex'i meşru ürün ölçülerini (16L, 13.5 vb.) hata sayıp şablona zorluyordu.
* **Uygulanan Değişiklik:**
  - `OMNISTUDIO_GATEWAY_TOKEN` okunarak `Authorization: Bearer ${token}` eklendi.
  - `/\d|%/` regex engeli kaldırıldı.
  - Reklam fikri promptu sektöre özel yaratıcı vizyon üretecek şekilde güçlendirildi.
  - `result?.choices?.[0]?.message?.content` yanında Gateway'in döndüğü `result?.reply` alanı da desteklendi.

### 1.2. Düzeltme 2: `apps/customer/src/lib/ai/campaign-message.ts` (P1 & Aşama 3, 4, 5)
* **Problem:** 
  1. Kampanya yazım tonlarında yalnızca `İstenen ton: ${tone}` deniliyor, model her ton için benzer şablonik metinler üretiyordu.
  2. Metin iyileştirmede (rewrite) `brief` parametresi doğrudan prompta eklendiği için "bu hafta sonu" ve "organik zeytinyağı" gibi bağlam sızıntıları yaşanıyordu.
  3. 20 rewrite seçeneğinin direktifleri yüzeyseldi; kısaltma, genişletme veya imla düzeltme belirgin şekilde ayrışmıyordu.
  4. Ticari bilgi koruma ve halüsinasyon kontrolü eksikti.
* **Uygulanan Değişiklik:**
  - `CAMPAIGN_TONE_INSTRUCTIONS`: 5 ton için (`samimi`, `profesyonel`, `eglenceli`, `enerjik`, `satis`) ayrıntılı reklam yazarlığı yönergeleri eklendi.
  - `CAMPAIGN_GENERATE_SYSTEM`: 4 sektörel dil kılavuzu (Tarım, İnşaat, SaaS, Gıda), anti-klişe kuralları ve WhatsApp biçim standartlarıyla donatıldı.
  - `REWRITE_HINT`: 20 aksiyonun her biri için bağımsız, net ve ayırt edici reklam direktifleri tanımlandı.
  - `buildRewritePrompt`: Yeniden yazma işlemlerinde `brief` sızıntısı engellendi. `fix_grammar`, `shorten`, `remove_emoji` gibi salt biçim işlemlerinde brief prompttan tamamen izole edildi.
  - `verifyCommercialIntegrity`: Fiyat koruma, yüzde indirim uydurma ve yetkisiz zaman kısıtı ekleme durumlarını denetleyen otomatik kontrol fonksiyonu eklendi.

### 1.3. Düzeltme 3: `apps/customer/src/lib/creative/v2/ai-planner.ts` (Aşama 2 & 3)
* **Problem:** Başlıklar `${brand} ile ${product}` klişesine düşebiliyor, kullanıcı girdisindeki eski fiyat, kampanya süresi ve özel CTA gibi ticari detaylar prompta aktarılmıyordu.
* **Uygulanan Değişiklik:**
  - `userPrompt` içine `copyDetails` üzerinden eski fiyat (`oldPrice`), kampanya süresi (`dateRange`) ve kullanıcı CTA tercihi eklendi.
  - System promptuna anti-klişe kuralları eklenerek özgün pazarlama kancaları (fayda, sonuç, tasarruf, lojistik üstünlük) zorunlu kılındı.

---

## 2. BİRİM TEST DOĞRULAMALARI (`scripts/test_creative_engine_unit.ts`)

Geliştirilen mantık izole ortamda çalıştırılmış ve 15/15 PASS almıştır:

```
=== UNIT TEST: CAMPAIGN COPYWRITING ENGINE ===
  [PASS] Tone 'samimi' has detailed copywriting instructions (158 chars)
  [PASS] Tone 'profesyonel' has detailed copywriting instructions (143 chars)
  [PASS] Tone 'eglenceli' has detailed copywriting instructions (143 chars)
  [PASS] Tone 'enerjik' has detailed copywriting instructions (124 chars)
  [PASS] Tone 'satis' has detailed copywriting instructions (155 chars)
  [PASS] Generate prompt includes tone section
  [PASS] Generate prompt includes specific tone instructions
  [PASS] Generate prompt includes business name
  [PASS] Grammar rewrite strictly omits brief context leakage
  [PASS] Grammar rewrite instructs only grammar fix
  [PASS] Integrity check passes when prices are intact and no drift
  [PASS] Preserved prices count: 2
  [PASS] Integrity check fails when unverified %50 and "bu hafta sonu" added
  [PASS] Flags unverified %50 discount
  [PASS] Flags unverified "bu hafta sonu" timeframe

Unit Test Results: 15 PASS, 0 FAIL
```

---

## 3. REGRESYON VE GÜVENLİK KONTROLLERİ

* **Mevcut Video/Image Pipeline Güvenliği:** `gflow-engine`, `deploy-chat-gateway-key.py` veya CDP worker mekanizmalarına dokunulmamıştır.
* **Branch İzolasyonu:** Tüm geliştirmeler izole `feat/wizard-ai-creative-engine-v1` dalında yapılmıştır. `main` dalına merge veya production deploy yapılmamıştır.
* **Servis Sürekliliği:** Hetzner Gateway veya çalışan worker servisleri yeniden başlatılmamıştır (sıfır downtime).
