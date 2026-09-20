import { test } from 'node:test';
import assert from 'node:assert';
import {
  mapSnapshotToBriefV4,
  compileDeterministicV4,
  VEO_V4_STANDARD_NEGATIVES,
} from '../apps/customer/src/lib/creative/video-compiler-v4.ts';
import type { CreativeSnapshot } from '../apps/customer/src/lib/creative/types.ts';

test('VEO v4 Compiler - Snapshot to Brief Normalization', () => {
  const snapshot: CreativeSnapshot = {
    brief: 'Bu aya özel toptan alımlarda özel iskontolar',
    style: 'premium',
    formatId: 'reels_video',
    aspect: '9:16',
    textDensity: 'balanced',
    useLogo: true,
    labels: [],
    cta: 'Bizimle İletişime Geçin',
    address: null,
    website: null,
    dateRange: null,
    customText: 'Toptan tuğlada şok kampanya',
    phones: [{ id: 'p1', label: 'WhatsApp', phone: '905551234567' }],
    socials: [],
    brandKit: {
      id: 'k1',
      name: 'Ayvazoğlu İnşaat',
      tone: 'Güven veren mimari kalite',
      colors: { primary: '#ff5733', accent: '#ffc300' },
      fonts: {},
      logoPath: '/logos/ayvazoglu.png',
    },
    products: [
      {
        id: 'prod1',
        name: 'Tuğla',
        description: 'Yüksek dayanımlı killi yapı tuğlası',
        boxContents: null,
        imageUrl: '/products/brick.png',
        price: 'Toptan Fiyat',
        oldPrice: null,
        promo: 'Bu aya özel %20 iskonto',
        extra: null,
        include: { name: true, image: true, description: true, boxContents: false, price: true, promo: true },
      },
    ],
    baseCreativeId: null,
    videoSpeech: true,
  };

  const brief = mapSnapshotToBriefV4(snapshot);

  assert.strictEqual(brief.model, 'veo_3_1_flow');
  assert.strictEqual(brief.delivery?.durationSeconds, 8);
  assert.strictEqual(brief.delivery?.aspectRatio, '9:16');
  assert.strictEqual(brief.brand?.name, 'Ayvazoğlu İnşaat');
  assert.strictEqual(brief.offer.subject, 'Tuğla');
  assert.strictEqual(brief.campaign.cta, 'Bizimle İletişime Geçin');
  assert.strictEqual(brief.text?.rawVideoPolicy, 'existing_only');
  assert.strictEqual(brief.text?.postProductionSubtitles, true);
});

test('VEO v4 Compiler - Deterministic Compilation & Quality Checks', () => {
  const brief = {
    model: 'veo_3_1_flow' as const,
    campaign: {
      goal: 'product_demo',
      message: 'Şantiyenize doğrudan toptan sevkiyat',
      cta: 'Bizimle İletişime Geçin',
      discount: 'Bu aya özel iskontolar',
    },
    brand: {
      name: 'Ayvazoğlu İnşaat',
      tone: 'Kurumsal ve güvenilir',
    },
    offer: {
      type: 'physical_product',
      subject: 'Tuğla',
      primaryBenefit: 'Yüksek dayanım ve fabrikadan teslimat',
    },
    audio: {
      mode: 'voiceover' as const,
      language: 'tr-TR',
    },
  };

  const result = compileDeterministicV4(brief);

  // 1. Durum ve Şema Kontrolü
  assert.strictEqual(result.status, 'ready');
  assert.ok(result.finalVeoPrompt.length > 50);

  // 2. Veo 3.1 Flow 8s ve 3 Kadraj Kontrolü
  assert.ok(result.finalVeoPrompt.includes('8 saniyelik'), '8 saniyelik süre belirtilmeli');
  assert.ok(result.finalVeoPrompt.includes('9:16 dikey'), '9:16 format belirtilmeli');
  assert.ok(result.finalVeoPrompt.includes('0.0s - 2.2s'), '0-2.2s görsel kanca kadrajı olmalı');
  assert.ok(result.finalVeoPrompt.includes('2.2s - 5.8s'), '2.2-5.8s eylem ve kanıt kadrajı olmalı');
  assert.ok(result.finalVeoPrompt.includes('5.8s - 8.0s'), '5.8-8.0s odak kapanış kadrajı olmalı');

  // 3. Tek Lokasyon Kuralı
  assert.ok(result.finalVeoPrompt.includes('Tek Lokasyon'), 'Tek lokasyon kuralı yer almalı');
  assert.strictEqual(result.qualityChecks.singleLocation, true);

  // 4. Post-Prodüksiyon Metin Ayrımı (Ham Videoda Yazı Yasağı)
  assert.ok(result.finalVeoPrompt.includes('NO ON-SCREEN TEXT'), 'Ham video no-text kuralı bulunmalı');
  assert.strictEqual(result.postProduction.subtitles, true);
  assert.strictEqual(result.postProduction.cta, 'Bizimle İletişime Geçin');

  // 5. Seslendirme Kelime Sınırı (Maksimum 18 Kelime)
  assert.ok(result.qualityChecks.voiceoverWordCount <= 18, 'Seslendirme 18 kelimeyi aşmamalı');
  assert.ok(result.qualityChecks.voiceoverWordCount >= 8, 'Seslendirme en az 8 kelime olmalı');
  assert.ok(!result.finalVeoPrompt.includes('"'), 'Seslendirmede tırnak işareti olmamalı');

  // 6. Kalite Puanı (>= 82)
  assert.ok(result.qualityChecks.qualityScore >= 82, 'Kalite puanı 82 veya üzeri olmalı');

  // 7. v4 Negatif Prompt Kontrolü
  assert.ok(result.negativePrompt.includes('duplicate subject'));
  assert.ok(result.negativePrompt.includes('warped packaging'));
  assert.ok(result.negativePrompt.includes('gibberish typography'));
  assert.ok(result.negativePrompt.includes('unmotivated location change'));
});

test('VEO v4 Compiler - Missing Subject Triggers Needs Clarification', () => {
  const incompleteBrief = {
    campaign: {
      goal: 'awareness',
      message: 'Hemen arayın',
    },
    brand: {
      name: 'Test Markası',
    },
    offer: {
      type: 'physical_product',
      subject: '', // Boş konu
    },
  };

  const result = compileDeterministicV4(incompleteBrief);

  assert.strictEqual(result.status, 'needs_clarification');
  assert.ok(result.clarificationQuestion, 'Açıklama sorusu üretilmeli');
  assert.ok(result.warnings.length > 0, 'Uyarı listelenmeli');
  assert.strictEqual(result.finalVeoPrompt, '');
});
