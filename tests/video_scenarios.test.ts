import { test } from 'node:test';
import assert from 'node:assert';
import { generateVideoScenarios } from '../apps/customer/src/lib/creative/video-scenario.ts';

test('Video Scenarios Generator - Mesajify Dönerci & Digital Brochure Context', async () => {
  const context = {
    brandName: 'Mesajify',
    about: 'WhatsApp pazarlama ve dijital broşür otomasyonu',
    brief: 'Artık kağıt broşür basmıyorum, bunun yerine dijital broşürü etrafımdaki işletmelere gönderiyorum',
    customText: 'WhatsApp ile tek tıkla dijital menü ve broşür gönderimi',
    videoSpeech: true,
    products: [
      {
        name: 'Mesajify Dijital Broşür',
        price: 'Ücretsiz Deneme',
        promo: 'İlk 500 Mesaj Hediye',
      },
    ],
  };

  const scenarios = await generateVideoScenarios(context);

  assert.strictEqual(scenarios.length, 3, 'Tam 3 senaryo üretilmelidir');

  for (const s of scenarios) {
    // Başlık ve Rozet kontrolü
    assert.ok(s.id, 'Senaryo ID olmalı');
    assert.ok(s.title.length > 5, 'Senaryo başlığı olmalı');
    assert.ok(s.badge.length > 3, 'Senaryo rozeti olmalı');

    // Sade kullanıcı özeti kontrolü
    assert.ok(s.summary.length > 20, 'Kullanıcı dostu sade özet olmalı');
    assert.ok(!s.summary.includes('STRICT RULE'), 'Kullanıcı özetinde teknik prompt kuralları olmamalı');
    assert.ok(!s.summary.includes('100mm f/1.8'), 'Kullanıcı özetinde teknik kamera parametresi olmamalı');

    // Detaylı Veo Prompt kontrolü
    assert.ok(s.fullPrompt.includes('9:16 vertical'), '9:16 dikey format belirtilmeli');
    assert.ok(s.fullPrompt.includes('ACT 1'), '1. Perde olmalı');
    assert.ok(s.fullPrompt.includes('ACT 2'), '2. Perde olmalı');
    assert.ok(s.fullPrompt.includes('ACT 3'), '3. Perde olmalı');
    assert.ok(s.fullPrompt.includes('Mesajify'), 'Marka adı promptta yer almalı');
    assert.ok(s.fullPrompt.includes('NO ON-SCREEN TEXT') || s.fullPrompt.includes('NO TEXT'), 'Metinsiz çekim kuralı bulunmalı');
  }

  // 1. Senaryo Dönerci/Esnaf bağlamı içermeli
  const s1 = scenarios[0];
  assert.ok(
    s1.fullPrompt.toLowerCase().includes('döner') ||
    s1.fullPrompt.toLowerCase().includes('chef') ||
    s1.fullPrompt.toLowerCase().includes('smartphone') ||
    s1.summary.toLowerCase().includes('broşür'),
    '1. senaryo esnaf ve dijital broşür temasını işlemeli'
  );
});

test('Video Scenarios Generator - Silent (Konuşmasız) Mode Check', async () => {
  const context = {
    brandName: 'Mesajify',
    brief: 'Sessiz ve sadece müzikli lüks restoran tanıtımı',
    videoSpeech: false,
    products: [{ name: 'Gurme Burger Menü' }],
  };

  const scenarios = await generateVideoScenarios(context);
  assert.strictEqual(scenarios.length, 3);

  for (const s of scenarios) {
    assert.ok(
      s.fullPrompt.includes('NO VOICE') || s.fullPrompt.includes('NO SPEECH'),
      'Konuşmasız modda NO VOICE / NO SPEECH kuralı bulunmalı'
    );
  }
});
