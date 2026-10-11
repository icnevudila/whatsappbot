# MESAJIFY CREATIVE DNA ENGINE — IMPLEMENTATION PROPOSAL & API CONTRACT
**Mesajify Engineering Architecture & Production Roadmap**  
*Document Version: 3.0.0 — Production Proposal*  
*Date: 2026-10-11*  
*Target Engine: Google Veo 3.1 Fast | Master Bot Integration Contract*

---

## 1. Yönetici Özeti ve Temel Taahhüt

Bu öneri; Master Bot'un çalışan üretim zincirini bozmadan, ileride entegre edilmek üzere tasarlanmış **Creative DNA Motoru Açık API & TypeScript Sözleşmesini** tanımlar.

### Kesin Üretim Güvencesi (Zero-Disruption Guarantee):
* **Mevcut Çalışan Kodlara Dokunulmaz:** Halihazırda üretimde dondurulmuş olan Google Veo 3.1 Fast 8s motoru, 2s deterministik outro birleştiricisi, kampanya sihirbazı ve medya kütüphanesi değiştirilmez.
* **Ücretli Üretim Yapılmaz:** API kredisi tüketilmez; geliştirme mock ve test fixture'ları üzerinden yürütülür.
* **Modüler Eklenti Prensibi:** Creative DNA motoru, kullanıcı prompt yazmak zorunda kalmadan 3 stratejik yaklaşım (Ürün Kullanımı, Sorun-Çözüm, Kampanya Fırsatı) ve her biri için 3 kanca sunan harici bir karar servisidir.

---

## 2. Master Bot Entegrasyonu İçin Açık TypeScript Kontratı

Mevcut TypeScript mimarisinde (`packages/creative-dna` veya `services/creative-video-orchestrator/src/dna/`) kullanılacak kesin sözleşme:

```typescript
export type OutputMode = 'BRAND_FILM' | 'PERFORMANCE_AD';

export type SectorType = 'tarim' | 'insaat' | 'restoran' | 'cicekcilik' | 'saas' | 'sanayi';

export type ProductGeometry = 
  | 'liquid_spray' 
  | 'solid_block' 
  | 'food_culinary' 
  | 'soft_botanical' 
  | 'digital_ui' 
  | 'heavy_machinery';

export type StrategicApproachId = 'product_usage' | 'problem_solution' | 'campaign_offer';

export interface HookSuggestion {
  hookId: string;
  hookTitle: string; // ör. "Makro Sis Patlaması"
  hookDescription: string;
  firstTwoSecondsVisual: string;
  openingAudioCues: string;
}

export interface StrategicApproach {
  approachId: StrategicApproachId;
  approachTitle: string; // ör. "Ürün Kullanımı"
  approachRationale: string;
  heuristicFitScore: number; // 0.00 - 1.00 (başlangıç heuristiği)
  hookSuggestions: [HookSuggestion, HookSuggestion, HookSuggestion]; // Tam 3 kanca seçeneği
}

export interface CreativeDNARecommendation {
  businessId: string;
  productId: string;
  sector: SectorType;
  productGeometry: ProductGeometry;
  outputMode: OutputMode; // BRAND_FILM veya PERFORMANCE_AD
  approaches: [StrategicApproach, StrategicApproach, StrategicApproach]; // Tam 3 stratejik seçenek
}

export interface UserCreativeSelection {
  businessId: string;
  productId: string;
  selectedApproachId: StrategicApproachId;
  selectedHookId: string;
  outputMode: OutputMode;
  verifiedOfferText?: string; // Yalnızca PERFORMANCE_AD seçildiyse (FFmpeg outro için)
  verifiedPriceText?: string;
  verifiedCtaText?: string;
}

export interface CompiledVeo31FastPayload {
  engine: 'google_veo_3.1_fast';
  aspectRatio: '9:16';
  durationSeconds: 8.0;
  rawVeoPrompt: {
    beat1_hook: string;    // 0.0 - 2.2s
    beat2_proof: string;   // 2.2 - 5.8s
    beat3_hero: string;    // 5.8 - 8.0s
  };
  mandatoryReferences: {
    canonicalProductRefUrl: string;
    canonicalLogoRefUrl: string;
  };
  postProductionConfig: {
    mode: OutputMode;
    outroDurationSeconds: 2.0;
    renderTypographyViaFfmpeg: boolean;
    brandColorHex: string;
    whatsappCtaText?: string;
  };
}

export interface ICreativeDNAService {
  // 1. Kullanıcıya 3 strateji x 3 kanca önerir
  generateRecommendations(input: {
    businessId: string;
    productId: string;
    adObjective: string;
  }): Promise<CreativeDNARecommendation>;

  // 2. Seçimi 8s Veo 3.1 Fast + 2s FFmpeg derleme yüküne çevirir
  compileProductionPayload(selection: UserCreativeSelection): Promise<CompiledVeo31FastPayload>;
}
```

---

## 3. UI & Wizard Entegrasyon Deneyimi

Sihirbazda kullanıcı hiçbir serbest prompt metni görmez:

```
[ADIM 1: İşletme ve Ürün Seçimi]
Kullanıcı: "Bofe" -> "16L Şarjlı Sırt Pompası" seçer.
           |
           v
[ADIM 2: Mod Seçimi]
[ ( ) Marka Filmi (Brand Film) ]   [ (X) Performans Reklamı (Performance Ad) ]
           |
           v
[ADIM 3: 3 Stratejik Yaklaşım Kartı]
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│ KART 1: Ürün Kullanımı   │ KART 2: Sorun ve Çözüm   │ KART 3: Kampanya Fırsatı │
│ (Ergonomik Püskürtme)    │ (Manuel Yorulmaya Son)   │ (Eksiksiz Kutu İçeriği)  │
│                          │                          │                          │
│ Seçilebilir Kancalar:    │ Seçilebilir Kancalar:    │ Seçilebilir Kancalar:    │
│ [o] Makro Sis Patlaması  │ [o] Duraksayan Kol       │ [o] Kutu Açılışı         │
│ [ ] Serada İlerleme      │ [ ] Zaman Kaybı          │ [ ] Aksesuar Dizilimi    │
│ [ ] Yaprak Nüfuzu        │ [ ] Tek Parmak Mandalı   │ [ ] Çalışmaya Hazır      │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘
           |
           v
[ADIM 4: Tek Tıkla Üretime Gönder (8s Veo 3.1 Fast + 2s FFmpeg Outro)]
```

---

## 4. Aşamalı Dağıtım Takvimi (Phased Rollout Plan)

| Faz | Kapsam | Durum | Risk |
|---|---|---|---|
| **Faz 1: Doğrulama & Şartname** | Kaynakların denetimi, 18 vaka atfı, Veo 3.1 Fast şartnamesi. | **TAMAMLANDI** (11 Ekim 2026) | Sıfır |
| **Faz 2: İzole Tipler & Mock Servis** | `@mesajify/creative-dna` paketinin test ortamında kodlanması. | Master Bot onayından sonra | Sıfır (Canlı hat etkilenmez) |
| **Faz 3: Gölge Skorlama (Shadow Mode)**| Sihirbazda kullanıcılara gösterilmeden arka planda heuristik modellerin loglanması. | 1 Hafta Gözlem | Sıfır |
| **Faz 4: Pilot Test** | `%10` kullanıcıya 3 strateji x 3 kanca kartının açılması. | 2 Hafta Pilot | Sıfır |
| **Faz 5: Tam Entegrasyon** | Tüm Mesajify hesaplarında dinamik kreatif motorunun devreye girmesi. | Kararlı Sürüm | Kontrollü & İzlemeli |

---

*Belge Sonu — Mesajify Implementation Proposal.*
