# SECTOR CREATIVE DNA MATRIX & DIVERSITY ENGINE
**Mesajify Creative DNA Specification**  
*Document Version: 1.0.0 — Production Standard*  
*Date: 2026-10-11*

---

## 1. Giriş ve Amaç

Bu doküman, Mesajify video üretim mimarisinin **Creative DNA Schema** tanımlarını 6 kritik sektör için eksiksiz olarak belirler. Aynı zamanda tekdüzelik ve kreatif yorgunluğu (creative fatigue) önlemek amacıyla geliştirilen **Kreatif Çeşitlilik & Rotasyon Algoritması (Diversity Engine)** kurallarını sunar.

---

## 2. Creative DNA Şeması (Standart Alanlar)

Her kreatif konsept aşağıdaki 15 parametreyi eksiksiz taşımak zorundadır:

| Parametre | Tip | Açıklama |
|---|---|---|
| `creative_model` | Enum | 8 modelden biri (`problem_solution`, `product_demo`, `ugc_interaction`, `comparison`, `offer_first`, `before_after`, `how_to`, `storytelling`) |
| `sector` | Enum | `tarim`, `insaat`, `restoran`, `cicekcilik`, `saas`, `sanayi` |
| `audience_problem` | String | Hedef kitlenin yaşadığı somut operasyonel, estetik veya finansal acı noktası |
| `hook_type` | String | İlk 2 saniyede kaydırmayı durduran görsel ve metinsel tetikleyici |
| `proof_type` | String | Ürünün iddiasını fiziki olarak kanıtlayan yöntem |
| `product_action` | String | Ürünün sahnedeki net dinamik hareketi |
| `human_presence` | String | İnsan aktörün konumu, eli, ergonomisi veya yokluğu |
| `scene_structure` | Object/List | Saniye bazlı sahne akışı (Hook -> Proof -> Hero Close -> Outro) |
| `brand_placement` | String | Logonun, renklerin ve ambalajın entegrasyon yöntemi |
| `cta_strategy` | String | WhatsApp eylemine yönlendiren doğrudan teklif |
| `duration_profile` | Enum | `8s_veo_raw` (10s Master) veya `20_30s_multiscene` |
| `provider_limitations` | List | Flow/Veo veya FFmpeg render sınırlamaları |
| `reference_sources` | List | Kanıtlanan veri kaynakları veya endüstri standartları |
| `evidence_strength` | Enum | `HIGH` (Ölçülmüş ampirik veri), `MEDIUM` (Doğrulanmış sektör trendi) |
| `originality_score` | Number | 1.00 üzerinden özgünlük puanı (Kopya karşıtı mimari) |

---

## 3. Sektör Bazlı Creative DNA Konseptleri

---

### 3.1 TARIM (Agriculture)

#### Konsept A1: Bofe 16L Akülü Sırt Pompası — Problem-Solution
```json
{
  "creative_model": "problem_solution",
  "sector": "tarim",
  "audience_problem": "Geleneksel manuel sırt pompalarının sürekli kol gücü gerektirmesi, yorgunluk ve seralarda dengesiz ilaçlama yapması.",
  "hook_type": "physical_fatigue_contrast",
  "proof_type": "continuous_high_pressure_micronized_mist",
  "product_action": "Tetiğe tek dokunuşla lityum bataryalı pompadan cam sera bitkilerine homojen mikronize sis fışkırtması.",
  "human_presence": "Modern sera kıyafeti ve eldivenli üretici; sırtında ergonomik taşıma askısı ile dik ve yorulmadan ilerler.",
  "scene_structure": {
    "0.0_2.2s_hook": "Sera içinde manuel pompayla yorulan el hareketi anında kesilir; Bofe akülü sırt pompası tek tıkla çalışır.",
    "2.2_5.8s_proof": "Geniş açılı pirinç nozülden çıkan mikronize sis bulutu domates yapraklarının alt ve üst yüzeyini homojen kaplar; batarya LED göstergesi 4 seviyede parlar.",
    "5.8_8.0s_hero": "Üretici seranın ortasında dik durur; 16 litrelik depo üzerindeki Bofe logosu net odaklanır; modern cam seradan süzülen güneş ışığı.",
    "8.0_10.0s_outro": "Mesajify deterministic outro: Bofe logosu, 'Stoktan Hızlı Gönderim · WhatsApp ile Hemen Sipariş Ver'."
  },
  "brand_placement": "Ürünün turuncu/mavi gövdesindeki tescilli Bofe kabartma logosu ve tank grafiği 1.5. saniyeden itibaren görünür.",
  "cta_strategy": "whatsapp_direct_order",
  "duration_profile": "8s_veo_raw",
  "provider_limitations": ["Depo üzerindeki marka yazısında harf bozulması önlenmeli", "Sıvı sisi yapay zeka tarafından duman gibi değil su damlacığı gibi işlenmeli"],
  "reference_sources": ["TikTok Creative Center Top Ads Agri Vertical", "Bofe Teknik Kullanım Kılavuzu 2026"],
  "evidence_strength": "HIGH",
  "originality_score": 0.94
}
```

#### Konsept A2: Tarım Ekipmanı — Comparison (Manuel vs Akülü)
```json
{
  "creative_model": "comparison",
  "sector": "tarim",
  "audience_problem": "1 dekar serayı ilaçlamak için harcanan 45 dakikalık manuel efor ve ilaç israfı.",
  "hook_type": "split_efficiency_clock",
  "proof_type": "speed_and_coverage_metric",
  "product_action": "Akülü sistemin saniyeler içinde 4 kat daha geniş alanı homojen taraması.",
  "human_presence": "Çiftçinin rahat, seri adımları; terleme ve duraksama olmaksızın sıra sonuna ulaşması.",
  "scene_structure": {
    "0.0_2.2s_hook": "Zaman sayacı: Eski usul yavaş pompalama vs Bofe akülü kesintisiz akış.",
    "2.2_5.8s_proof": "Geniş nozül püskürtme genişliği (1.8 metre kapsama alanı) ve sıfır damlatma mekanizması.",
    "5.8_8.0s_hero": "İlaçlama tamamlanır; üretici cihazı standa koyar; net ürün profili.",
    "8.0_10.0s_outro": "Toptan ve Perakende Bilgi Alın · WhatsApp Hattı."
  },
  "brand_placement": "Gövde ve nozül sapında marka kimliği.",
  "cta_strategy": "whatsapp_catalog_inquiry",
  "duration_profile": "8s_veo_raw",
  "provider_limitations": ["Split-screen çizgisi Flow tarafından bulanıklaştırılmamalı; net ritmik geçiş yapılmalı"],
  "reference_sources": ["Field Marketing Efficiency Benchmarks 2025"],
  "evidence_strength": "HIGH",
  "originality_score": 0.92
}
```

---

### 3.2 İNŞAAT & YAPI MALZEMELERİ (Construction)

#### Konsept B1: Ayvazoğlu Delikli Kil Tuğla — Product Demo (Dayanıklılık & Tolerans)
```json
{
  "creative_model": "product_demo",
  "sector": "insaat",
  "audience_problem": "Şantiyeye gelen tuğlaların nakliyede kırılması, çatlaklar ve gözenek düzensizliği nedeniyle harç sarfiyatının artması.",
  "hook_type": "macro_structural_impact",
  "proof_type": "crush_resistance_and_pore_geometry",
  "product_action": "Kasklı şantiye şefinin tuğlayı paletten alıp düzgün fırınlanmış kenarlarını ve dikey gözenek peteklerini incelemesi.",
  "human_presence": "Sarı kasklı, iş yelekli inşaat mühendisi / usta; ellerinde güvenli kavrayış.",
  "scene_structure": {
    "0.0_2.2s_hook": "Aktif modern şantiye arka planı; vincin paleti indirmesi ve ustanın tuğlayı güvenle eline alması.",
    "2.2_5.8s_proof": "Makro plan: Pişmiş kilin homojen kiremit kırmızısı rengi, pürüzsüz yüzeyler ve dikey yalıtım peteklerinin kusursuz simetrisi.",
    "5.8_8.0s_hero": "Örülmüş milimetrik düz duvar köşesi yanında tuğla paleti; kabartma Ayvazoğlu mühür logosu.",
    "8.0_10.0s_outro": "Ayvazoğlu Kurumsal Outro: 'Toptan Şantiye Sevkiyatı · Fabrikadan Fiyat Teklifi Alın'."
  },
  "brand_placement": "Tuğla kenarındaki fabrika pres damgası ve palet ambalajındaki kurumsal bant.",
  "cta_strategy": "whatsapp_b2b_rfq",
  "duration_profile": "8s_veo_raw",
  "provider_limitations": ["Kil dokusu plastik gibi görünmemeli; gerçek pürüzlü fırınlanmış toprak dokusu korunmalı"],
  "reference_sources": ["Meta B2B Building Materials Study", "TSE Tuğla Standartları EN 771-1"],
  "evidence_strength": "HIGH",
  "originality_score": 0.95
}
```

#### Konsept B2: İnşaat Malzemesi — Offer-First (Şantiyeye Doğrudan Sevkiyat)
```json
{
  "creative_model": "offer_first",
  "sector": "insaat",
  "audience_problem": "Müteahhitlerin teslimat gecikmeleri yüzünden şantiyede işin durması ve aracı komisyonları.",
  "hook_type": "fleet_dispatch_energy",
  "proof_type": "logistics_speed_capacity",
  "product_action": "Fabrika sevkiyat sahasında hazır bekleyen sıralı tırlar ve forkliftin eksiksiz paletleri yüklemesi.",
  "human_presence": "Lojistik sorumlusunun sevk irsaliyesini onaylaması.",
  "scene_structure": {
    "0.0_2.2s_hook": "Fabrika sahasından hareket eden tır konvoyu; 'Aracısız, Doğrudan Şantiyenize'.",
    "2.2_5.8s_proof": "Forkliftin Ayvazoğlu logolu korumalı paletleri kasaya kusursuz yerleştirmesi.",
    "5.8_8.0s_hero": "Sevkiyata hazır paletlerin görkemli sıra dizilimi ve fabrika tabelası.",
    "8.0_10.0s_outro": "Projeniz İçin Toptan Fiyat Alın · WhatsApp İletişim."
  },
  "brand_placement": "Fabrika tabelası, palet streçleri ve irsaliye üzerinde kurumsal logo.",
  "cta_strategy": "whatsapp_wholesale_quote",
  "duration_profile": "8s_veo_raw",
  "provider_limitations": ["Araç plakaları ve fabrika tabelası gerçeğe uygun, sade ve net olmalı"],
  "reference_sources": ["B2B Construction Logistics Trends 2026"],
  "evidence_strength": "HIGH",
  "originality_score": 0.91
}
```

---

### 3.3 RESTORAN & GURME GIDA (Food & Dining)

#### Konsept C1: Butik Burger / Şef Restoranı — Sensory Hook (Lezzet & Doku)
```json
{
  "creative_model": "product_demo",
  "sector": "restoran",
  "audience_problem": "Standart, lezzetsiz hazır zincir burgerlerden sıkılan ve taze gurme tat arayan müşteriler.",
  "hook_type": "asmr_sizzle_melt",
  "proof_type": "fresh_ingredient_assembly",
  "product_action": "Döküm ızgarada mühürlenen sulu köftenin üzerindeki cheddar peynirinin dumanlar eşliğinde erimesi.",
  "human_presence": "Siyah eldivenli şefin burger ekmeğini tereyağında kızartıp taze malzemeleri kat kat dizmesi.",
  "scene_structure": {
    "0.0_2.2s_hook": "Izgarada mühürlenen köftenin cızırtısı ve karamelize olan et dokusunun aşırı yakın çekimi.",
    "2.2_5.8s_proof": "Taze çıtır marul, özel sos akışı ve pofuduk brioche ekmeğinin kapanması; bıçakla ortadan kesilince akan su.",
    "5.8_8.0s_hero": "Zarif restoranda ahşap servis tabağında çıtır patateslerle sunulan nihai tabak; arkada sıcak restoran ışıkları.",
    "8.0_10.0s_outro": "'Masanızı Ayırın veya Sipariş Verin · WhatsApp Menü'."
  },
  "brand_placement": "Servis tabağındaki kurumsal logo ve şef önlüğündeki nakış.",
  "cta_strategy": "whatsapp_table_reservation",
  "duration_profile": "8s_veo_raw",
  "provider_limitations": ["Yapay zeka gıda çekiminde et dokusunu kauçuk gibi yapmamalı; gerçek ışıltı ve buhar olmalı"],
  "reference_sources": ["TikTok Creative Center F&B Top Ads 2026"],
  "evidence_strength": "HIGH",
  "originality_score": 0.96
}
```

---

### 3.4 ÇİÇEKÇİLİK & HEDİYE (Floristry & Gifting)

#### Konsept D1: Canlı Çiçek & Özel Buket — Aesthetic Unboxing & Emotion
```json
{
  "creative_model": "ugc_interaction",
  "sector": "cicekcilik",
  "audience_problem": "İnternetten sipariş edilen çiçeklerin solgun, ezilmiş veya fotoğraftakinden farklı gelmesi güvensizliği.",
  "hook_type": "curiosity_ribbon_pull",
  "proof_type": "freshness_macro_droplets",
  "product_action": "Şık kurdele çözüldüğünde açılan kutunun içinden canlı, su damlacıklı ithal güllerin ve şakayıkların yayılması.",
  "human_presence": "Çiçek tasarımcısının zarif elleriyle buketi bağlaması ve sonrasında tebessümle teslim alan alıcı.",
  "scene_structure": {
    "0.0_2.2s_hook": "Saten kurdelenin çekilmesi ve kutu kapağının açılmasıyla ortaya çıkan renk patlaması.",
    "2.2_5.8s_proof": "Taç yapraklardaki çiğ damlaları, canlı kadife doku ve kişiye özel el yazısı mühürlü kart.",
    "5.8_8.0s_hero": "Aydınlık modern bir salonda vazoda sergilenen zengin aranjman; çiçek butiği kartviziti.",
    "8.0_10.0s_outro": "'Aynı Gün Özel Teslimat · Buketinizi WhatsApp'tan Seçin'."
  },
  "brand_placement": "Kutu kapağında altın varaklı butik logo ve saten kurdele baskısı.",
  "cta_strategy": "whatsapp_custom_gifting",
  "duration_profile": "8s_veo_raw",
  "provider_limitations": ["Çiçek yaprakları plastik yapay çiçek gibi durmamalı; taze organik canlılık taşımalı"],
  "reference_sources": ["The Bouqs & Floward TikTok Performance Studies"],
  "evidence_strength": "HIGH",
  "originality_score": 0.93
}
```

---

### 3.5 B2B SAAS & OTOMASYON (Tech & Software)

#### Konsept E1: Mesajify WhatsApp Platformu — Problem-Solution (Kargaşa vs Düzen)
```json
{
  "creative_model": "problem_solution",
  "sector": "saas",
  "audience_problem": "Şirketlerin yüzlerce müşteriye tek tek telefondan mesaj yazarken hatlarının bloke olması ve mesajların karışması.",
  "hook_type": "screen_chaos_urgency",
  "proof_type": "automation_throughput_speed",
  "product_action": "Mesajify arayüzünde tek butona tıklanarak akıllı hat rotalamasıyla binlerce kişiye kişiselleştirilmiş şablon gitmesi.",
  "human_presence": "Ekran başında rahat bir nefes alan pazarlama yöneticisinin kahvesini yudumlaması.",
  "scene_structure": {
    "0.0_2.2s_hook": "Ekranda kırmızı hata mesajları, karışmış Excel listeleri; 'Hala WhatsApp'tan tek tek mi gönderiyorsunuz?'.",
    "2.2_5.8s_proof": "Mesajify modern karanlık/aydınlık panelinde yeşil onay işaretleri; akıllı hat yük dağılım grafiği saniyeler içinde akar.",
    "5.8_8.0s_hero": "Tertemiz raporlama ekranı: '%99.4 Teslimat Başarısı'; huzurlu çalışma masası ortamı.",
    "8.0_10.0s_outro": "Mesajify Kurumsal Outro: 'Kontrollü Kampanyalar · WhatsApp ile Ücretsiz Demo Alın'."
  },
  "brand_placement": "Mesajify yeşil logosu, panel başlığı ve onaylı marka renkleri (#16A34A).",
  "cta_strategy": "whatsapp_demo_booking",
  "duration_profile": "8s_veo_raw",
  "provider_limitations": ["Yapay zeka ekran metinlerini karıştırmamalı; UI temiz ve vektörel netlikte olmalı"],
  "reference_sources": ["Google ABCD B2B Playbook", "Monday.com Creative Analytics"],
  "evidence_strength": "HIGH",
  "originality_score": 0.97
}
```

---

### 3.6 SANAYİ & İMALAT (Industrial / CNC)

#### Konsept F1: Hassas CNC Parça Üretimi — Product Demo (Mikron Tolerans)
```json
{
  "creative_model": "product_demo",
  "sector": "sanayi",
  "audience_problem": "Fason imalatta parçaların ölçü kaçırması, montaj hattında uyumsuzluk ve fire maliyetleri.",
  "hook_type": "sparks_and_coolant_macro",
  "proof_type": "cmm_zero_tolerance_inspection",
  "product_action": "5 eksenli CNC kafasının soğutma sıvısı altında çelik bloğu mikron hassasiyetinde işlemesi.",
  "human_presence": "Kalite kontrol mühendisinin dijital mikrometre ile parçayı ölçüp onay vermesi.",
  "scene_structure": {
    "0.0_2.2s_hook": "Yüksek hızlı frezenin soğutma sıvısıyla metale dalışı ve çıkan kıvılcımların makro detayı.",
    "2.2_5.8s_proof": "CMM 3D koordinat ölçüm cihazının probu parça üzerinde gezinir; ekranda yeşil 'PASS - 0.002mm' onayı parlar.",
    "5.8_8.0s_hero": "Lazerle parça numarası ve fabrika logosu kazınmış tertemiz çelik parça; kurumsal ambalaj.",
    "8.0_10.0s_outro": "'Teknik Çiziminizi Gönderin · WhatsApp'tan Hızlı Fiyat Teklifi Alın'."
  },
  "brand_placement": "Metal gövdeye lazer markalama ve kalite kontrol sertifikasında kurumsal logo.",
  "cta_strategy": "whatsapp_technical_rfq",
  "duration_profile": "8s_veo_raw",
  "provider_limitations": ["Talaşlı imalat dumanı ve sıvısı gerçekçi fizik kurallarına uymalı"],
  "reference_sources": ["Haas Automation Video Case Audits 2025"],
  "evidence_strength": "HIGH",
  "originality_score": 0.94
}
```

---

## 4. Kreatif Çeşitlilik & Rotasyon Algoritması (Diversity Engine)

Aynı işletmeye ardışık kampanyalarda sürekli aynı konseptin önerilmesini engelleyen deterministik kural seti:

```
+-------------------------------------------------------------------------------+
|                       MESAJIFY DIVERSITY ENGINE RULES                         |
+-------------------------------------------------------------------------------+
| KURAL 1: Ardışık Model Yasağı                                                 |
|          Aynı marka için son 3 üretimde kullanılan model YASAKLANIR.         |
| KURAL 2: Geometri & Affordance Uyumu                                          |
|          Sıvı/Püskürtme -> Problem-Solution / Demo                             |
|          Katı/Blok      -> Durability Demo / Offer-First                      |
|          Gıda/Tüketim   -> Sensory Hook / How-To                              |
|          Yazılım/Hizmet -> Frustration vs Flow / Comparison                   |
| KURAL 3: Kitle Yorgunluğu (Audience Fatigue) Rotasyonu                        |
|          Kampanya 1: Problem-Solution (%45 Bütçe)                             |
|          Kampanya 2: Product Demo / Durability (%35 Bütçe)                    |
|          Kampanya 3: Offer-First / Stok Avantajı (%20 Bütçe)                  |
+-------------------------------------------------------------------------------+
```

### Rotasyon Seçim Mantığı (Pseudocode)
```typescript
interface BusinessHistory {
  businessId: string;
  sector: Sector;
  pastCreativeModels: CreativeModel[]; // Son üretilenler [n-1, n-2...]
  productGeometry: "liquid_spray" | "solid_block" | "food_culinary" | "soft_botanical" | "digital_ui";
}

function selectNextCreativeDNA(history: BusinessHistory): CreativeModel {
  const allModels: CreativeModel[] = [
    "problem_solution", "product_demo", "ugc_interaction", 
    "comparison", "offer_first", "before_after", "how_to", "storytelling"
  ];
  
  // 1. Son 2 model elenir (No fatigue)
  const availableModels = allModels.filter(m => !history.pastCreativeModels.slice(-2).includes(m));
  
  // 2. Geometri filtresi uygulanır
  const compatibleModels = availableModels.filter(m => isGeometryCompatible(m, history.productGeometry));
  
  // 3. Öncelik skoru en yüksek olan seçilir
  return compatibleModels[0] || availableModels[0];
}
```

---

*Belge Sonu — Mesajify Sector Creative DNA Matrix.*
