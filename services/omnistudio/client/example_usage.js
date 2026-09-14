/**
 * OmniStudio Test İstemcisi
 * Kullanım: node services/omnistudio/client/example_usage.js "Kahve fincanı, minimalist masa"
 */

const http = require('http');

const prompt = process.argv[2] || 'A sleek modern coffee cup on a minimalist dark stone table, soft studio lighting';
const payload = JSON.stringify({
  prompt,
  platform: 'auto',
  size: '1024x1024',
  workspace: 'WhatsApp Test İstemcisi',
});

console.log(`[Test] OmniStudio Gateway'e istek gönderiliyor...`);
console.log(`[Test] Prompt: "${prompt}"`);

const req = http.request(
  {
    hostname: 'localhost',
    port: 3456,
    path: '/v1/images/generations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 120000,
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`[Test] Yanıt Kodu: HTTP ${res.statusCode}`);
      try {
        const json = JSON.parse(data);
        if (res.statusCode === 200) {
          console.log(`✅ BAŞARILI! Üretilen Görsel:`);
          console.log(json.data[0].url);
        } else {
          console.error(`❌ HATA:`, json.error || json);
        }
      } catch (e) {
        console.log(data);
      }
    });
  }
);

req.on('error', (err) => {
  console.error(`❌ Gateway'e ulaşılamadı (Gateway açık mı? Port 3456):`, err.message);
});

req.write(payload);
req.end();
