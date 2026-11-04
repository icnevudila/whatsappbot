import fs from 'fs';
import path from 'path';
import { submitImageJob, readImageJob, inlineReference } from '../src/lib/ai/omnistudio-image-job';

process.env.OMNISTUDIO_GATEWAY_URL = 'https://choice-harder-inserted-passengers.trycloudflare.com';
process.env.OMNISTUDIO_GATEWAY_TOKEN = 'omnistudio_secret_token_2026';

async function main() {
  const gatewayUrl = 'https://choice-harder-inserted-passengers.trycloudflare.com';

  // 1. BOFE TARIM
  const bofeLogo = 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc/org-logo.jpg';
  const bofeProd = fs.readFileSync('.codex_runtime/bofe-canonical-product.jpg');
  const bofePrompt = "Instagram'da satış yapıyorum bu attığım Bofe logosunu, ürün görselini ve marka kitini (renkler: derin orman yeşili #026009, fıstık yeşili #acfe00, beyaz) kullanarak bana çok gösterişli bir kampanya afişi oluştur.";

  console.log('Bofe gönderiliyor...');
  console.log('Prompt:', bofePrompt);
  const bofeJob = await submitImageJob(gatewayUrl, {
    prompt: bofePrompt,
    size: '1024x1280',
    response_format: 'b64_json',
    referenceImages: [
      { role: 'logo', url: bofeLogo },
      inlineReference({ data: bofeProd, mimeType: 'image/jpeg', role: 'product' })
    ],
    expected_reference_count: 2,
    workspace: 'WhatsApp Botu',
    customer: 'Bofe — Kullanıcı Sade Prompt'
  });

  // 2. AYVAZOĞLU İNŞAAT
  const ayvazLogo = 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/4a58b0dd-0931-4901-880a-686457d15010/org-logo.jpg';
  const ayvazProd = 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/creatives/4a58b0dd-0931-4901-880a-686457d15010/products/ayvazoglu_brick.jpg';
  const ayvazPrompt = "Instagram'da satış yapıyorum bu attığım Ayvazoğlu İnşaat logosunu, ürün görselini ve marka kitini (renkler: tuğla kırmızısı #A82218, antrasit, beyaz) kullanarak bana çok gösterişli bir kampanya afişi oluştur.";

  console.log('Ayvazoğlu gönderiliyor...');
  console.log('Prompt:', ayvazPrompt);
  const ayvazJob = await submitImageJob(gatewayUrl, {
    prompt: ayvazPrompt,
    size: '1024x1280',
    response_format: 'b64_json',
    referenceImages: [
      { role: 'logo', url: ayvazLogo },
      { role: 'product', url: ayvazProd }
    ],
    expected_reference_count: 2,
    workspace: 'WhatsApp Botu',
    customer: 'Ayvazoğlu — Kullanıcı Sade Prompt'
  });

  console.log('İşler gönderildi:', { bofe: bofeJob.id, ayvaz: ayvazJob.id });

  async function pollAndSave(job: any, filename: string, refCount: number) {
    const deadline = Date.now() + 240_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 4000));
      try {
        const res = await readImageJob(job, undefined, refCount);
        if (res && res.data) {
          const outDir = 'C:\\Users\\TP2\\Desktop\\veriburada medya\\Yeni_Testler';
          const p1 = path.join(outDir, filename);
          const p2 = path.join('C:\\Users\\TP2\\.gemini\\antigravity\\brain\\30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270', filename);
          fs.writeFileSync(p1, res.data);
          fs.writeFileSync(p2, res.data);
          console.log(`KAYDEDİLDİ: ${filename} (${res.data.length} bytes)`);
          return;
        }
      } catch (err: any) {
        if (err.name === 'ImageJobPendingError') {
          process.stdout.write('.');
          continue;
        }
        console.error('\nHata:', err.message);
        break;
      }
    }
  }

  await Promise.all([
    pollAndSave(bofeJob, 'Bofe_Sade_Kullanici_Afisi_4_5.png', 2),
    pollAndSave(ayvazJob, 'Ayvazoglu_Sade_Kullanici_Afisi_4_5.png', 2)
  ]);

  console.log('\nTÜM ÇIKTILAR BAŞARIYLA TAMAMLANDI!');
}

main().catch(console.error);
