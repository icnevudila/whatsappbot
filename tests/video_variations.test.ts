import { test } from 'node:test';
import assert from 'node:assert';
import { buildVideoPrompt } from '../apps/customer/src/lib/creative/prompt.ts';

test('Video Prompt Generator A-Z Industry Variations', () => {
  const variations = [
    { cat: 'İnşaat / Tuğla', name: 'Tuğla', desc: 'Fabrikadan toptan ve perakende killi tuğla', brief: 'Tuğlada şok fiyat' },
    { cat: 'İnşaat / Çimento', name: 'Hazır Harç & Çimento', desc: 'Yüksek dayanımlı gri yapı çimentosu', brief: 'Şantiyelere doğrudan sevkiyat' },
    { cat: 'Tarım / Pompa', name: '16L Şarjlı Sırt Pompası', desc: 'Lityum bataryalı bahçe ilaçlama pompası', brief: 'Yeni sezon çiftçi indirimi' },
    { cat: 'Gıda / Burger', name: 'Gurme Dana Burger', desc: 'Köz patlıcanlı el yapımı smash burger', brief: 'Özel sosuyla sınırlı porsiyon' },
    { cat: 'Gıda / Kahvaltı', name: 'Serpme Köy Kahvaltısı', desc: 'Doğal bal, kaymak ve sıcak pişi', brief: 'Hafta sonuna özel kahvaltı' },
    { cat: 'Mobilya / Koltuk', name: 'Modern Nubuk Köşe Koltuk', desc: 'Leke tutmaz kumaş ve masif ahşap ayak', brief: 'Evinize şıklık katın' },
    { cat: 'Moda / Ayakkabı', name: 'Hakiki Deri Klasik Ayakkabı', desc: 'El dikişi kösele taban erkek ayakkabısı', brief: 'Yeni sezon koleksiyonu' },
    { cat: 'Kozmetik / Parfüm', name: 'Oud & Amber Parfüm', desc: 'Kalıcı odunsu esanslı lüks parfüm', brief: 'Büyüleyici koku deneyimi' },
    { cat: 'Elektronik / Kulaklık', name: 'Kablosuz ANC Kulaklık', desc: 'Aktif gürültü engelleyici bluetooth kulaklık', brief: 'Müzikte kristal netlik' },
    { cat: 'Otomotiv / Lastik', name: 'Dört Mevsim Performans Lastiği', desc: 'Islak zemin tutuşu yüksek oto lastiği', brief: 'Yola güvenle çıkın' },
    { cat: 'Temizlik / Deterjan', name: 'Doğal Yüzey Temizleyici', desc: 'Bitkisel bazlı leke çıkarıcı sprey', brief: 'Evinizde tertemiz hijyen' },
    { cat: 'Mücevher / Pırlanta', name: 'Baget Kesim Pırlanta Yüzük', desc: '18 ayar beyaz altın montürlü tektaş pırlanta', brief: 'Evlilik tekliflerine özel indirim' },
    { cat: 'Spor / Fitness', name: 'Akıllı Direnç Antrenman Seti', desc: 'Çok fonksiyonlu ev ve gym egzersiz ekipmanı', brief: 'Formunu koru yaza hazırlan' },
    { cat: 'Sağlık / Diş', name: 'Estetik Zirkonyum Diş & Gülüş Tasarımı', desc: 'Doğal ve dayanıklı estetik diş hekimliği', brief: 'Kendine güvenen gülüşler' },
    { cat: 'Emlak / Villa', name: 'Akıllı Lüks Doğa Villası', desc: 'Müstakil havuzlu ve panoramik doğa manzaralı 4+1 villa', brief: 'Lansmana özel ödeme kolaylığı' },
    { cat: 'Eğitim / Kitap', name: 'İlham Veren Girişimcilik Kitap Seti', desc: 'Özel ciltli sert kapak rehber kitap serisi', brief: 'Yeni baskı özel avantajı' }
  ];

  for (const v of variations) {
    const snap = {
      brief: v.brief,
      style: 'premium',
      formatId: 'reels_video',
      aspect: '9:16',
      textDensity: 'balanced',
      useLogo: false,
      labels: [],
      cta: 'Sipariş Ver',
      address: null,
      website: null,
      dateRange: null,
      customText: null,
      phones: [{ id: 'p1', label: 'WhatsApp', phone: '905551234567' }],
      socials: [],
      brandKit: { id: 'k1', name: 'Test Markası', tone: 'Güvenilir ve profesyonel', colors: {}, fonts: {}, logoPath: null },
      products: [{
        id: 'prod1',
        name: v.name,
        description: v.desc,
        boxContents: null,
        imageUrl: null,
        price: null,
        oldPrice: null,
        promo: null,
        extra: null,
        include: { name: true, image: false, description: true, boxContents: false, price: false, promo: false }
      }],
      baseCreativeId: null
    };

    const { prompt } = buildVideoPrompt(snap as any);

    // 1. Kesinlikle hex kodu olmamali
    assert.strictEqual(/#[0-9a-fA-F]{3,6}/.test(prompt), false, 'Hex code found in prompt for ' + v.name);

    // 2. No Text kurali bulunmali
    assert.ok(prompt.includes('STRICT RULE: NO TEXT'), 'No-text rule missing in ' + v.name);

    // 3. 3 Sahne kurgusu eksiksiz olmali
    assert.ok(prompt.includes('SAHNE 1') && prompt.includes('SAHNE 2') && prompt.includes('SAHNE 3'), '3-act structure missing in ' + v.name);

    // 4. Sinematik kamera optigi yer almali
    assert.ok(prompt.includes('Arri Alexa'), 'Camera lens spec missing in ' + v.name);

    // 5. Ses ve konuşma kurgusu testi
    const withVoice = buildVideoPrompt({ ...snap, videoSpeech: true } as any);
    assert.ok(withVoice.prompt.includes('SESLENDİRME VE TÜRKÇE REKLAM DIŞ SESİ'), 'Voiceover section missing in ' + v.name);

    const silent = buildVideoPrompt({ ...snap, videoSpeech: false } as any);
    assert.ok(silent.prompt.includes('SES DÜZENİ (KONUŞMASIZ'), 'Silent mode instruction missing in ' + v.name);
    assert.ok(silent.prompt.includes('NO VOICE, NO SPEECH'), 'Silent negative missing in ' + v.name);

    console.log('[PASS] ' + v.cat + ' -> ' + v.name);
  }
});
