import fs from 'fs';
import path from 'path';
import { submitImageJob, readImageJob, inlineReference } from '../src/lib/ai/omnistudio-image-job';

process.env.OMNISTUDIO_GATEWAY_URL = 'https://choice-harder-inserted-passengers.trycloudflare.com';
process.env.OMNISTUDIO_GATEWAY_TOKEN = 'omnistudio_secret_token_2026';

interface TestCase {
  id: string;
  brand: string;
  mode: 'brand_intro' | 'campaign';
  references: Array<{ url?: string; localPath?: string; mimeType: string; role: string }>;
  prompt: string;
  outputName: string;
}

const testCases: TestCase[] = [
  {
    id: 'mesajify-campaign',
    brand: 'Mesajify',
    mode: 'campaign',
    references: [
      {
        url: 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/2881f690-6853-4064-8768-307463ae6255/original-logo-e383102bc1be7a58.png',
        mimeType: 'image/png',
        role: 'logo'
      }
    ],
    prompt: `Veriburada editoryal kalitesinde, nefes kesici bir WhatsApp kampanya platformu afişi (4:5 dikey format).`,
    outputName: '01_Mesajify_10_Numara_Kampanya_4_5.png'
  },
  {
    id: 'bofe-campaign-clean',
    brand: 'Bofe Tarım',
    mode: 'campaign',
    references: [
      {
        url: 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc/org-logo.jpg',
        mimeType: 'image/jpeg',
        role: 'logo'
      },
      {
        localPath: '.codex_runtime/bofe-canonical-product.jpg',
        mimeType: 'image/jpeg',
        role: 'product'
      }
    ],
    prompt: `Veriburada editoryal kalitesinde, prestijli bir tarım ekipmanı lansman afişi (4:5 dikey format).

GENEL TASARIM PRENSİPLERİ (SIFIR ÇIKARTMA, SIFIR KUTULU ÖZELLİK LİSTESİ):
Sağ tarafa veya ortaya ASLA kutu kutu özellik listeleri ([Lityum pil], [Teleskopik boru]), fosforlu sarı rozetler veya market afişi kartları KOYMA!
Görsel Apple veya Leica ürün lansmanı gibi temiz, ferah, doğal ve prestijli olmalı.

SAHNE (SAĞ VE MERKEZ ALAN):
Sabahın ilk altın saat ışığında, arkasında sisli zeytinlik tepeleri uzanan modern bir meyve bahçesi.
Ön planda sağlam bir ahşap hasat masası üzerinde duran, ekli 2. referanstaki gerçek açık mavi 16L Bofe şarjlı sırt pompası.
Pompanın pirinç nozulundan sabah güneşine doğru havaya karışan ultra-ince, berrak bir su pusu (su sisi) çıkıyor; güneş ışınları bu berrak siste hafif altın rengi parıltılar yaratıyor.
Yerde taze yeşil yapraklar, doğal çiy damlaları.

TİPOGRAFİ VE DÜZEN (SOL SÜTUN):
- Sol üstte ekli Bofe logosu.
- Logonun hemen altında büyük, kalın sans-serif başlık (iki satır, her satır nokta ile biten):
  "16 Litre Güç.
  Kesintisiz Hasat."
- Altında sade alt başlık:
  "Yeni nesil akülü sırt ilaçlama pompasıyla bahçenizi koruyun."
- Sol altta koyu orman yeşili şık hap buton:
  [ Ürünleri İnceleyin → ]
- Butonun altında:
  bofe.com.tr`,
    outputName: '02_Bofe_10_Numara_Kampanya_4_5.png'
  },
  {
    id: 'ayvazoglu-campaign-clean',
    brand: 'Ayvazoğlu İnşaat',
    mode: 'campaign',
    references: [
      {
        url: 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/4a58b0dd-0931-4901-880a-686457d15010/org-logo.jpg',
        mimeType: 'image/jpeg',
        role: 'logo'
      }
    ],
    prompt: `Veriburada editoryal kalitesinde, prestijli bir mimari inşaat ve yapı malzemesi kampanya afişi (4:5 dikey format).

GENEL TASARIM PRENSİPLERİ:
Asla kutu kutu indirim etiketleri veya ucuz broşür çıkartmaları koyma.
Ödüllü mimarlık dergisi kapağı gibi sofistike, geniş negatif alanlı ve yüksek bütçeli bir estetik olmalı.

SAHNE (SAĞ VE MERKEZ ALAN):
Güneşli bir öğleden sonra, modern lüks bir villa projesinin klinker kiremit ve sıcak kırmızı tuğla duvarı önünde çekilmiş mimari fotoğraf.
Ön planda temiz beton kaide üzerinde estetik olarak istiflenmiş birinci sınıf pişmiş kil tuğla örnekleri, doğal ağaç dalı gölgeleri ve güneş ışığı kırılmaları.
Arka planda geniş cam terasları olan modern villa cephesi.

TİPOGRAFİ VE DÜZEN (SOL SÜTUN):
- Sol üstte ekli Ayvazoğlu İnşaat logosu.
- Logonun altında büyük, kalın sans-serif başlık (iki satır, her satır nokta ile biten):
  "Şantiyenize Doğrudan.
  Fabrika Fiyatıyla."
- Altında sade alt başlık:
  "Tüm projeleriniz için birinci sınıf tuğla ve yapı malzemesi tedariki."
- Sol altta koyu tuğla kırmızısı şık hap buton:
  [ Teklif Alın → ]
- Butonun altında:
  ayvazogluinsaat.com`,
    outputName: '03_Ayvazoglu_10_Numara_Kampanya_4_5.png'
  }
];

async function runTestCase(tc: TestCase) {
  const outDir = 'C:\\Users\\TP2\\Desktop\\veriburada medya\\Yeni_Testler';
  const filePath = path.join(outDir, tc.outputName);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100000) {
    console.log(`[ATLANDI] ${tc.outputName} zaten üretilmiş ve masaüstünde mevcut.`);
    return filePath;
  }

  const gatewayUrl = 'https://choice-harder-inserted-passengers.trycloudflare.com';
  console.log(`\n======================================================`);
  console.log(`[10/10 Üretim] Başlatılıyor: ${tc.brand} (${tc.id})`);

  const referenceImages: any[] = [];
  for (const ref of tc.references) {
    if (ref.url) {
      referenceImages.push({ role: ref.role, url: ref.url });
    } else if (ref.localPath) {
      const data = fs.readFileSync(ref.localPath);
      referenceImages.push(inlineReference({ data, mimeType: ref.mimeType, role: ref.role }));
    }
  }

  const job = await submitImageJob(gatewayUrl, {
    prompt: tc.prompt,
    size: '1024x1280',
    response_format: 'b64_json',
    referenceImages: referenceImages,
    expected_reference_count: referenceImages.length,
    workspace: 'WhatsApp Botu',
    customer: tc.brand + ' — 10/10 Kalite Testi'
  });

  console.log(`İş kuyruğa alındı! Job ID: ${job.id}`);

  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4000));
    try {
      const res = await readImageJob(job, undefined, referenceImages.length);
      if (res && res.data) {
        console.log(`Üretim tamamlandı! Boyut: ${res.data.length} bytes`);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(filePath, res.data);

        const artPath = path.join('C:\\Users\\TP2\\.gemini\\antigravity\\brain\\30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270', tc.outputName);
        fs.writeFileSync(artPath, res.data);

        console.log(`BAŞARILI: Masaüstüne ve brain klasörüne kaydedildi: ${filePath}`);
        return filePath;
      }
    } catch (err: any) {
      if (err.name === 'ImageJobPendingError') {
        process.stdout.write('.');
        continue;
      }
      console.error(`\nOkuma hatası:`, err.message);
      break;
    }
  }
}

async function main() {
  for (const tc of testCases) {
    await runTestCase(tc);
  }
  console.log('\nTÜM 10/10 VARYASYONLAR TAMAMLANDI!');
}

main().catch(console.error);
