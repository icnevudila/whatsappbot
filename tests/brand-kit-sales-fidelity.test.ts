import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { buildCreativePrompt } from '../apps/customer/src/lib/creative/prompt';
import { resolveArtDirectionPlanAtSubmission } from '../apps/customer/src/lib/creative/director/creative-director';
import type { CreativeSnapshot } from '../apps/customer/src/lib/creative/types';

describe('Brand Kit + Sales Campaign Fidelity Suite (EK P0)', () => {
  // Test 1: Bofe Tarım
  it('1. Bofe Tarım: Brand kit color roles, product immunity, and mandatory commercial core', () => {
    const bofeSnapshot: CreativeSnapshot = {
      brief: 'Bofe 16L Akülü Pompa — Sezona Özel %22 İndirim. Aynı Gün Ücretsiz Kargo',
      aspect: '1:1',
      formatId: 'wa',
      style: 'auto',
      objective: 'SALES_OFFER',
      sector: 'Tarım & Bahçe',
      templateFamily: 'CAMPAIGN_POSTER',
      textDensity: 'balanced',
      cta: 'Hemen İnceleyin',
      useLogo: true,
      labels: [],
      phones: [{ id: '1', phone: '+905304542816', label: 'Bofe' }],
      socials: [],
      brandKit: {
        id: 'cd4ce662-eede-48a0-ba71-80433a61a842',
        name: 'Bofe',
        tone: 'Modern, yüksek teknolojili ve profesyonel tarım & çevre sağlığı ekipmanları. Güven veren, dinamik ve net bir dil.',
        fonts: { heading: 'Inter', body: 'Inter' },
        colors: {
          primary: '#000000',
          secondary: '#026009',
          accent: '#acfe00',
          background: '#ffffff',
          text: '#000000',
        },
        logoPath: 'http://167.233.201.31:3456/outputs/bofe_logo.png',
      },
      products: [
        {
          id: 'b68d4eb9-7cc0-491e-9ece-84b8c01068b1',
          name: 'Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası',
          description: 'Geniş 16L açık mavi depo haznesi, güçlü lityum-iyon batarya, ayarlanabilir pirinç nozullu paslanmaz çelik teleskopik ilaçlama borusu.',
          price: '1.450 TL',
          oldPrice: '1.850 TL',
          promo: '%22 İndirim',
          include: { name: true, image: true, price: true, promo: true, boxContents: true, description: true },
          imageUrl: 'https://storage.example.com/bofe-pump.jpg',
        },
      ],
      customHeadline: 'Bofe 16L Akülü Pompa — Sezona Özel %22 İndirim',
      customSupporting: 'Aynı Gün Ücretsiz Kargo',
      deliveryInfo: 'Aynı Gün Ücretsiz Kargo',
      stockInfo: null,
      urgencyInfo: null,
      primaryBenefits: [],
      baseCreativeId: null,
      instruction: null,
      variationPreset: null,
      companyName: 'Bofe',
      subtitles: true,
      videoSpeech: true,
      cost: { imageCount: 1 },
      title: 'Bofe Kampanyası',
      requestKey: 'test-bofe-fidelity',
      companyAbout: 'Tarım ve Bahçe Ekipmanları',
      website: null,
      dateRange: null,
      customText: null,
      creativePlan: null as any,
      campaignMessage: null as any,
      customVoiceover: null,
      videoScenarioTitle: null,
      videoScenarioPrompt: null,
      voiceoverScript: null,
      referenceImageUrls: [],
    };

    const verifiedRefs = { logo: true, product: true, base: false };

    // A. STANDARD MODE TEST
    const stdRes = buildCreativePrompt(bofeSnapshot, { verifiedRefs, artDirectionPlan: null });
    const stdPrompt = stdRes.prompt;

    // Color roles
    assert.ok(stdPrompt.includes('MANDATORY BRAND KIT DISCIPLINE & COLOR ROLES:'), 'STD must include brand kit discipline');
    assert.ok(stdPrompt.includes('Primary Brand Color (deep rich black)'), 'STD must assign Primary color role');
    assert.ok(stdPrompt.includes('Accent Color (electric lime / chartreuse)'), 'STD must assign Accent color role');
    assert.ok(stdPrompt.includes('Secondary Color (deep agricultural forest green)'), 'STD must assign Secondary color role');
    assert.ok(stdPrompt.includes('Background Tone (clean crisp white)'), 'STD must assign Background tone role');
    assert.ok(stdPrompt.includes('PHYSICAL PRODUCT COLOR IMMUNITY'), 'STD must protect physical product colors');

    // Typography
    assert.ok(stdPrompt.includes('TYPOGRAPHY: Authoritative commercial typography matching Inter character'), 'STD must enforce Inter typography');

    // Logo & Product Fidelity
    assert.ok(stdPrompt.includes('STRICT LOGO FIDELITY: A real company logo image is attached'), 'STD must enforce strict logo fidelity');
    assert.ok(stdPrompt.includes('STRICT PRODUCT FIDELITY: The real product photo is provided'), 'STD must enforce strict product fidelity');

    // Mandatory Commercial Core
    assert.ok(stdPrompt.includes('Verified Commercial Core (Mandatory on Visual):'), 'STD must mandate commercial core');
    assert.ok(stdPrompt.includes('- Mandatory Headline: "Bofe 16L Akülü Pompa — Sezona Özel %22 İndirim"'), 'STD must include mandatory headline');
    assert.ok(stdPrompt.includes('- Mandatory Campaign Price & Offer: 1.450 TL (was 1.850 TL) · Discount: %22'), 'STD must include mandatory price/offer');
    assert.ok(stdPrompt.includes('- Mandatory Call-to-Action (CTA): Hemen İnceleyin'), 'STD must include mandatory CTA');

    // Anti-Canva Contract
    assert.ok(stdPrompt.includes('COMMERCIAL CAMPAIGN MANDATE & COMPOSITION CONTRACT:'), 'STD must include commercial mandate');
    assert.ok(stdPrompt.includes('BESPOKE AGENCY ART DIRECTION (ANTI-CANVA)'), 'STD must specify bespoke agency art direction');
    assert.ok(stdPrompt.includes('NO HALLUCINATIONS'), 'STD must forbid hallucinations');

    // B. DESIGNER MODE TEST
    const artPlan = resolveArtDirectionPlanAtSubmission({
      input: {
        orgId: bofeSnapshot.brandKit!.id,
        brandName: bofeSnapshot.brandKit!.name,
        brandTone: bofeSnapshot.brandKit!.tone,
        brandColors: bofeSnapshot.brandKit!.colors as any,
        brandFonts: bofeSnapshot.brandKit!.fonts as any,
        productName: bofeSnapshot.products[0].name,
        productDescription: bofeSnapshot.products[0].description,
        objective: bofeSnapshot.objective,
        stylePreset: 'AUTO',
        format: '1:1',
        headline: bofeSnapshot.customHeadline,
        offer: bofeSnapshot.products[0].promo,
        cta: bofeSnapshot.cta,
      },
    }).plan;

    const desRes = buildCreativePrompt(bofeSnapshot, { verifiedRefs, artDirectionPlan: artPlan });
    const desPrompt = desRes.prompt;

    assert.ok(desPrompt.includes('EXECUTIVE ART DIRECTION & DESIGNER DIRECTIVES:'), 'DES must include designer directives');
    assert.ok(desPrompt.includes('Primary Brand Color (deep rich black)'), 'DES must preserve brand kit primary');
    assert.ok(desPrompt.includes('Accent Color (electric lime / chartreuse)'), 'DES must preserve brand kit accent');
    assert.ok(desPrompt.includes('PHYSICAL PRODUCT COLOR IMMUNITY'), 'DES must protect physical product colors');
    assert.ok(desPrompt.includes('- Mandatory Campaign Price & Offer: 1.450 TL (was 1.850 TL) · Discount: %22'), 'DES must mandate price');
    assert.ok(desPrompt.includes('- Mandatory Call-to-Action (CTA): Hemen İnceleyin'), 'DES must mandate CTA');
  });

  // Test 2: Ayvazoğlu İnşaat
  it('2. Ayvazoğlu İnşaat: Brand kit color roles and heavy industry commercial facts', () => {
    const ayvazSnapshot: CreativeSnapshot = {
      brief: 'Ayvazoğlu C35 Hazır Beton Proje Kampanyası — Fabrika ve Şantiye Teslim',
      aspect: '4:5',
      formatId: 'portrait',
      style: 'corporate',
      objective: 'SALES_OFFER',
      sector: 'İnşaat & Yapı',
      templateFamily: 'CAMPAIGN_POSTER',
      textDensity: 'balanced',
      cta: 'Teklif Alın',
      useLogo: true,
      labels: [],
      phones: [{ id: '1', phone: '+905321112233', label: 'Ayvazoğlu' }],
      socials: [],
      brandKit: {
        id: '489f335c-ea99-46e4-b8dd-b75dd68255ea',
        name: 'Ayvazoğlu İnşaat',
        tone: 'Modern ve güven verici bir tasarım dili. Canlı turuncu ve nötr tonlar ile dikkat çekici profesyonellik.',
        fonts: { heading: 'Montserrat', body: 'Roboto' },
        colors: {
          primary: '#ff5733',
          secondary: '#333333',
          accent: '#ffc300',
          background: '#ffffff',
          text: '#000000',
        },
        logoPath: '4a58b0dd-0931-4901-880a-686457d15010/org-logo.jpg',
      },
      products: [
        {
          id: 'ayvaz-prod-1',
          name: 'C35 Yüksek Dayanımlı Hazır Beton',
          description: 'Büyük ölçekli şantiye ve altyapı projeleri için laboratuvar onaylı mikser teslim hazır beton.',
          price: '2.100 TL/m³',
          oldPrice: '2.400 TL/m³',
          promo: 'Toplu Alımlarda Özel İskonto',
          include: { name: true, image: true, price: true, promo: true, boxContents: false, description: true },
          imageUrl: 'https://storage.example.com/beton.jpg',
        },
      ],
      customHeadline: 'Ayvazoğlu C35 Hazır Beton Kampanyası',
      customSupporting: 'Tüm Marmara Şantiyelerine Aynı Gün Sevkiyat',
      deliveryInfo: 'Şantiyeye Mikser Teslim',
      stockInfo: null,
      urgencyInfo: null,
      primaryBenefits: ['Laboratuvar Onaylı C35 Formülü', '7/24 Kesintisiz Mikser Sevkiyatı'],
      baseCreativeId: null,
      instruction: null,
      variationPreset: null,
      companyName: 'Ayvazoğlu İnşaat',
      subtitles: true,
      videoSpeech: true,
      cost: { imageCount: 1 },
      title: 'Ayvazoğlu Beton Kampanyası',
      requestKey: 'test-ayvaz-fidelity',
      companyAbout: 'İnşaat ve Hazır Beton',
      website: 'www.ayvazogluinsaat.com.tr',
      dateRange: null,
      customText: null,
      creativePlan: null as any,
      campaignMessage: null as any,
      customVoiceover: null,
      videoScenarioTitle: null,
      videoScenarioPrompt: null,
      voiceoverScript: null,
      referenceImageUrls: [],
    };

    const verifiedRefs = { logo: true, product: true, base: false };
    const res = buildCreativePrompt(ayvazSnapshot, { verifiedRefs, artDirectionPlan: null });
    const prompt = res.prompt;

    // Brand kit color roles
    assert.ok(prompt.includes('MANDATORY BRAND KIT DISCIPLINE & COLOR ROLES:'), 'Ayvazoğlu must have brand kit discipline');
    assert.ok(prompt.includes('Primary Brand Color (brick terracotta / warm rust)'), 'Ayvazoğlu primary color described correctly');
    assert.ok(prompt.includes('Accent Color (warm amber gold)'), 'Ayvazoğlu accent color described correctly');
    assert.ok(prompt.includes('Secondary Color (dark slate charcoal)'), 'Ayvazoğlu secondary color described correctly');
    assert.ok(prompt.includes('TYPOGRAPHY: Authoritative commercial typography matching Montserrat character'), 'Ayvazoğlu Montserrat font enforced');
    assert.ok(prompt.includes('PHYSICAL PRODUCT COLOR IMMUNITY'), 'Ayvazoğlu product color immunity enforced');

    // Commercial facts
    assert.ok(prompt.includes('- Mandatory Headline: "Ayvazoğlu C35 Hazır Beton Kampanyası"'), 'Ayvazoğlu mandatory headline present');
    assert.ok(prompt.includes('- Mandatory Campaign Price & Offer: 2.100 TL/m³ (was 2.400 TL/m³)'), 'Ayvazoğlu mandatory price present');
    assert.ok(prompt.includes('- Mandatory Call-to-Action (CTA): Teklif Alın'), 'Ayvazoğlu mandatory CTA present');
  });

  // Test 3: Mesajify
  it('3. Mesajify: High-tech SaaS brand kit and conversion offer', () => {
    const mesajifySnapshot: CreativeSnapshot = {
      brief: 'Mesajify WhatsApp Tanıtım & Kitle Platformu — %30 Hoşgeldin İndirimi',
      aspect: '1:1',
      formatId: 'wa',
      style: 'modern',
      objective: 'SALES_OFFER',
      sector: 'Yazılım & Teknoloji',
      templateFamily: 'SAAS_PROMO_CARD',
      textDensity: 'balanced',
      cta: 'Hemen Başlayın',
      useLogo: true,
      labels: [],
      phones: [],
      socials: [],
      brandKit: {
        id: 'f2672f6d-7f09-4b97-a418-9d08c3a67061',
        name: 'Mesajify',
        tone: 'Modern, teknolojik, güven verici ve dinamik WhatsApp reklam ve kitle yönetim platformu.',
        fonts: { heading: 'Outfit', body: 'Inter' },
        colors: {
          primary: '#00A884',
          secondary: '#07100C',
          accent: '#168347',
          background: '#FFFFFF',
          text: '#090B0A',
        },
        logoPath: '/outputs/mesajify_logo.png',
      },
      products: [
        {
          id: 'mesajify-pro-1',
          name: 'Mesajify Büyüme Paketi',
          description: 'Sınırsız WhatsApp kampanya gönderimi, akıllı müşteri segmentasyonu ve otomatik yanıt botu.',
          price: '890 TL/ay',
          oldPrice: '1.290 TL/ay',
          promo: '%30 İndirim',
          include: { name: true, image: true, price: true, promo: true, boxContents: false, description: true },
          imageUrl: 'https://storage.example.com/mesajify-ui.png',
        },
      ],
      customHeadline: 'Mesajify ile WhatsApp Satışlarınızı Katlayın',
      customSupporting: 'Kredi Kartsız 14 Gün Ücretsiz Deneme',
      deliveryInfo: 'Anında Kurulum',
      stockInfo: null,
      urgencyInfo: null,
      primaryBenefits: ['Kişiselleştirilmiş Toplu WhatsApp Kampanyaları', 'Detaylı İletim ve Dönüşüm Raporları'],
      baseCreativeId: null,
      instruction: null,
      variationPreset: null,
      companyName: 'Mesajify',
      subtitles: true,
      videoSpeech: true,
      cost: { imageCount: 1 },
      title: 'Mesajify SaaS Kampanyası',
      requestKey: 'test-mesajify-fidelity',
      companyAbout: 'WhatsApp Pazarlama Platformu',
      website: 'www.mesajify.com',
      dateRange: null,
      customText: null,
      creativePlan: null as any,
      campaignMessage: null as any,
      customVoiceover: null,
      videoScenarioTitle: null,
      videoScenarioPrompt: null,
      voiceoverScript: null,
      referenceImageUrls: [],
    };

    const verifiedRefs = { logo: true, product: true, base: false };
    const res = buildCreativePrompt(mesajifySnapshot, { verifiedRefs, artDirectionPlan: null });
    const prompt = res.prompt;

    assert.ok(prompt.includes('MANDATORY BRAND KIT DISCIPLINE & COLOR ROLES:'), 'Mesajify must include brand kit discipline');
    assert.ok(prompt.includes('Primary Brand Color (luminous teal emerald)'), 'Mesajify primary color described correctly');
    assert.ok(prompt.includes('Accent Color (vivid vibrant green)'), 'Mesajify accent color described correctly');
    assert.ok(prompt.includes('Secondary Color (deep rich black)'), 'Mesajify secondary color described correctly');
    assert.ok(prompt.includes('TYPOGRAPHY: Authoritative commercial typography matching Outfit character'), 'Mesajify Outfit font enforced');
    assert.ok(prompt.includes('PHYSICAL PRODUCT COLOR IMMUNITY'), 'Mesajify UI/product color immunity enforced');

    assert.ok(prompt.includes('- Mandatory Headline: "Mesajify ile WhatsApp Satışlarınızı Katlayın"'), 'Mesajify mandatory headline present');
    assert.ok(prompt.includes('- Mandatory Campaign Price & Offer: 890 TL/ay (was 1.290 TL/ay) · Discount: %30'), 'Mesajify mandatory price present');
    assert.ok(prompt.includes('- Mandatory Call-to-Action (CTA): Hemen Başlayın'), 'Mesajify mandatory CTA present');
  });

  // Test 4: Verification of No Fabricated Warranties or Unverified Claims
  it('4. Negative claim safety: Unverified warranty seals or fake specs are strictly excluded', () => {
    const emptySnapshot: CreativeSnapshot = {
      brief: 'Örnek Kampanya',
      aspect: '1:1',
      formatId: 'wa',
      style: 'auto',
      objective: 'PRODUCT_INTRO',
      sector: null,
      templateFamily: 'CAMPAIGN_POSTER',
      textDensity: 'balanced',
      cta: null,
      useLogo: false,
      labels: [],
      phones: [],
      socials: [],
      brandKit: null,
      products: [],
      customHeadline: null,
      customSupporting: null,
      deliveryInfo: null,
      stockInfo: null,
      urgencyInfo: null,
      primaryBenefits: [],
      baseCreativeId: null,
      instruction: null,
      variationPreset: null,
      companyName: 'Test İşletme',
      subtitles: true,
      videoSpeech: true,
      cost: { imageCount: 1 },
      title: 'Test',
      requestKey: 'test-empty',
      companyAbout: null,
      website: null,
      dateRange: null,
      customText: null,
      creativePlan: null as any,
      campaignMessage: null as any,
      customVoiceover: null,
      videoScenarioTitle: null,
      videoScenarioPrompt: null,
      voiceoverScript: null,
      referenceImageUrls: [],
    };

    const res = buildCreativePrompt(emptySnapshot);
    assert.ok(!res.prompt.includes('2 Yıl Garanti'), 'Prompt must NOT contain unverified 2 Yıl Garanti');
    assert.ok(!res.prompt.includes('8 Saat Kesintisiz Güç'), 'Prompt must NOT contain unverified battery claims');
    assert.ok(!res.prompt.includes('Yetkili Satıcı'), 'Prompt must NOT contain unverified reseller badge');
    assert.ok(res.negative.includes('no unverified warranty claims or fake guarantee seals'), 'Negative prompt must forbid unverified claims');
    assert.ok(res.negative.includes('no fake 3-badge benefit stack'), 'Negative prompt must forbid 3-badge stack');
  });
});
