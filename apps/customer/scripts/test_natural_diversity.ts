import fs from 'fs';
import { submitImageJob, readImageJob, inlineReference } from '../src/lib/ai/omnistudio-image-job';

process.env.OMNISTUDIO_GATEWAY_URL = 'https://choice-harder-inserted-passengers.trycloudflare.com';
process.env.OMNISTUDIO_GATEWAY_TOKEN = 'omnistudio_secret_token_2026';

async function main() {
  const gatewayUrl = 'https://choice-harder-inserted-passengers.trycloudflare.com';
  const bofeLogo = 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc/org-logo.jpg';
  const prodBuf = fs.readFileSync('.codex_runtime/bofe-canonical-product.jpg');

  // Sade, sıfır kalıplı, tamamen serbest doğal prompt
  const prompt = `Ekli Bofe Tarım logosunu ve 16L şarjlı sırt pompasını kullanarak Instagram'da paylaşılacak ödüllü, son derece estetik ve etkileyici bir kampanya gönderisi oluştur.
Marka renkleri: Derin orman yeşili (#026009), fıstık yeşili (#acfe00) ve beyaz.
Sol üstte logo, görselde profesyonel bir kampanya başlığı ve altta şık bir eylem butonu ile 'bofe.com.tr' yer alsın. Sahneyi, ortamı ve kompozisyonu yaratıcı ve tamamen özgürce kurgula.`;

  console.log('1. Doğal varyasyon gönderiliyor...');
  const job1 = await submitImageJob(gatewayUrl, {
    prompt: prompt,
    size: '1024x1280',
    response_format: 'b64_json',
    referenceImages: [
      { role: 'logo', url: bofeLogo },
      inlineReference({ data: prodBuf, mimeType: 'image/jpeg', role: 'product' })
    ],
    expected_reference_count: 2,
    workspace: 'WhatsApp Botu',
    customer: 'Bofe — Doğal Varyasyon 1'
  });

  console.log('2. Doğal varyasyon gönderiliyor (aynı sade prompt ile)...');
  const job2 = await submitImageJob(gatewayUrl, {
    prompt: prompt,
    size: '1024x1280',
    response_format: 'b64_json',
    referenceImages: [
      { role: 'logo', url: bofeLogo },
      inlineReference({ data: prodBuf, mimeType: 'image/jpeg', role: 'product' })
    ],
    expected_reference_count: 2,
    workspace: 'WhatsApp Botu',
    customer: 'Bofe — Doğal Varyasyon 2'
  });

  console.log('İşler gönderildi:', { job1: job1.id, job2: job2.id });

  async function pollAndSave(job: any, filename: string) {
    const deadline = Date.now() + 240_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 4000));
      try {
        const res = await readImageJob(job, undefined, 2);
        if (res && res.data) {
          const outDir = 'C:\\Users\\TP2\\Desktop\\veriburada medya\\Yeni_Testler';
          const p1 = `${outDir}\\${filename}`;
          const p2 = `C:\\Users\\TP2\\.gemini\\antigravity\\brain\\30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270\\${filename}`;
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
        console.error('Hata:', err.message);
        break;
      }
    }
  }

  await Promise.all([
    pollAndSave(job1, 'Bofe_Dogal_Varyasyon_Test_A_4_5.png'),
    pollAndSave(job2, 'Bofe_Dogal_Varyasyon_Test_B_4_5.png')
  ]);

  console.log('\nTüm testler bitti!');
}

main().catch(console.error);
