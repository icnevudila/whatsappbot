/**
 * WhatsApp Botu için OmniStudio Ücretsiz Görsel Üretim İstemcisi
 * (Otomatik Resmi API Yedeklemeli / Failover Garantili)
 * 
 * Kullanım:
 * import { generateVisual } from './whatsapp_image_client';
 * const imageUrl = await generateVisual('Kırmızı spor araba, stüdyo ışığı');
 */

const GATEWAY_URL = process.env.OMNISTUDIO_GATEWAY_URL || 'http://localhost:3456';
const FALLBACK_OPENAI_KEY = process.env.OPENAI_API_KEY;

export async function generateVisual(prompt, options = {}) {
  const {
    platform = 'auto',       // 'auto' | 'chatgpt' | 'gemini'
    size = '1024x1024',
    workspace = 'WhatsApp Botu',
    timeoutMs = 95000,
  } = options;

  // 1. ADIM: Önce OmniStudio Ücretsiz Gateway'i dene
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${GATEWAY_URL}/v1/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, platform, size, workspace }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const url = json?.data?.[0]?.url;
      if (url) {
        console.log(`[OmniStudio] Görsel ücretsiz üretildi (${json.platform || 'browser'}): ${url}`);
        return { url, provider: 'omnistudio_free', free: true };
      }
    }
    console.warn(`[OmniStudio] Gateway yanıt vermedi (HTTP ${res.status}), yedek resmi API'ye geçiliyor...`);
  } catch (err) {
    console.warn(`[OmniStudio] Yerel tarayıcı servisine ulaşılamadı (${err.message}), otomatik resmi API'ye düşülüyor...`);
  }

  // 2. ADIM: FAILOVER (YEDEK HAT) - Resmi OpenAI DALL-E API'sine sessizce düş
  if (!FALLBACK_OPENAI_KEY) {
    throw new Error('OmniStudio servisi çevrimdışı ve yedek OPENAI_API_KEY tanımlı değil.');
  }

  console.log('[OmniStudio Fallback] Resmi OpenAI DALL-E API çağrılıyor...');
  const oaiRes = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FALLBACK_OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size,
      n: 1,
    }),
  });

  if (!oaiRes.ok) {
    throw new Error(`Resmi OpenAI Hatası: ${await oaiRes.text()}`);
  }

  const oaiData = await oaiRes.json();
  return { url: oaiData.data[0].url, provider: 'openai_official', free: false };
}
