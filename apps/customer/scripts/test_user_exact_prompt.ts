import fs from 'fs';
import { submitImageJob, readImageJob } from '../src/lib/ai/omnistudio-image-job';

process.env.OMNISTUDIO_GATEWAY_URL = 'https://choice-harder-inserted-passengers.trycloudflare.com';
process.env.OMNISTUDIO_GATEWAY_TOKEN = 'omnistudio_secret_token_2026';

async function main() {
  const gatewayUrl = 'https://choice-harder-inserted-passengers.trycloudflare.com';
  const logoUrl = 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/2881f690-6853-4064-8768-307463ae6255/original-logo-e383102bc1be7a58.png';

  // Kullanıcının ChatGPT'de kullandığı birebir aynı basit cümle:
  const prompt = "Instagram'da satış yapıyorum bu attığım Mesajify logosunu ve marka kitini (renkler: #008069 zümrüt yeşili, #00C27A açık yeşil, beyaz) kullanarak bana çok gösterişli kampanya afişi oluştur.";

  console.log('Kullanıcının birebir aynı promptu ile Mesajify gönderiliyor...');
  console.log('Prompt:', prompt);

  const job = await submitImageJob(gatewayUrl, {
    prompt: prompt,
    size: '1024x1280',
    response_format: 'b64_json',
    referenceImages: [{ role: 'logo', url: logoUrl }],
    expected_reference_count: 1,
    workspace: 'WhatsApp Botu',
    customer: 'Mesajify — Birebir Kullanıcı Promptu'
  });

  console.log('İş kuyruğa alındı! Job ID:', job.id);

  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4000));
    try {
      const res = await readImageJob(job, undefined, 1);
      if (res && res.data) {
        const outPath = 'C:\\Users\\TP2\\Desktop\\veriburada medya\\Yeni_Testler\\Mesajify_Birebir_Senin_Promptun_4_5.png';
        fs.writeFileSync(outPath, res.data);
        const artPath = 'C:\\Users\\TP2\\.gemini\\antigravity\\brain\\30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270\\Mesajify_Birebir_Senin_Promptun_4_5.png';
        fs.writeFileSync(artPath, res.data);
        console.log('KAYDEDİLDİ:', outPath);
        return;
      }
    } catch (err: any) {
      if (err.name === 'ImageJobPendingError') {
        process.stdout.write('.');
        continue;
      }
      console.error('Hata:', err.message);
      break;
    }
  }
}

main().catch(console.error);
