import fs from 'fs';
import path from 'path';
import { submitImageJob, readImageJob, inlineReference } from '../src/lib/ai/omnistudio-image-job';

process.env.OMNISTUDIO_GATEWAY_URL = 'https://choice-harder-inserted-passengers.trycloudflare.com';
process.env.OMNISTUDIO_GATEWAY_TOKEN = 'omnistudio_secret_token_2026';

interface Task {
  filename: string;
  brand: string;
  mode: string;
  prompt: string;
  references: Array<{ role: string; url?: string; localPath?: string; mimeType?: string }>;
}

const tasks: Task[] = [
  // 1. MESAJIFY - MOD 1: MARKA TANITIM (3D KONSEPT)
  {
    filename: '01_Mesajify_Mod1_Marka_Tanitim_4_5.png',
    brand: 'Mesajify',
    mode: 'Mod 1: Marka Tanıtım',
    references: [
      {
        role: 'logo',
        url: 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/2881f690-6853-4064-8768-307463ae6255/original-logo-e383102bc1be7a58.png'
      }
    ],
    prompt: `Instagram'da paylaşılacak ödüllü, estetik ve prestijli bir marka tanıtım görseli oluştur (4:5 dikey format).
Ekli Mesajify logosunu ve marka renklerini (#008069 zümrüt yeşili, beyaz, koyu antrasit) kullan.
Sol üstte Mesajify logosu.
Sol tarafta büyük, net sans-serif başlık:
"Tek tıkla.
Tüm şehre."
Altında sade alt başlık: "İşletmeniz için yeni nesil WhatsApp iletişim ve kampanya platformu."
Görsel sahnede: Masanın üzerinde katlanıp açılan 3D izometrik şehir haritası, kafeleri ve butikleri birbirine bağlayan ışıldayan zümrüt yeşili WhatsApp iletişim hatları ve parlayan cam heykel.
Altta şık koyu yeşil bir hap buton [ Hemen Keşfet → ] ve 'mesajify.com'.`
  },

  // 2. MESAJIFY - MOD 2: GÖSTERİŞLİ KAMPANYA (SATIŞ / KULLANIM)
  {
    filename: '02_Mesajify_Mod2_Kampanya_Afisi_4_5.png',
    brand: 'Mesajify',
    mode: 'Mod 2: Gösterişli Kampanya',
    references: [
      {
        role: 'logo',
        url: 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/2881f690-6853-4064-8768-307463ae6255/original-logo-e383102bc1be7a58.png'
      }
    ],
    prompt: `Instagram'da satış yapıyorum. Ekli Mesajify logosunu ve marka kitini (renkler: #008069 zümrüt yeşili, açık yeşil, beyaz) kullanarak bana çok gösterişli bir kampanya afişi oluştur (4:5 dikey format).
Sol üstte Mesajify logosu.
Sol tarafta büyük, kalın başlık:
"Müşterilerinizle
Hızlı İletişim"
Alt başlık: "WhatsApp ile toplu mesajlaşma, kampanya yönetimi ve anlık sipariş takibi."
Sahne: Güneşli ve aydınlık modern bir kafe veya mağaza tezgahı. Ahşap masa üzerinde bir fincan kahve ve açık duran ince modern bir tablet ekranında yeşil Mesajify WhatsApp sipariş yönetim paneli. Sıcak, doğal ve profesyonel işletme atmosferi.
Alt kısımda 3 yatay simgeli özellik: Hızlı Mesajlaşma | Kitle Yönetimi | Yüksek Geri Dönüş
En altta şık yeşil eylem butonu: [ Ücretsiz Deneyin → ] | mesajify.com`
  },

  // 3. BOFE TARIM - MOD 1: MARKA TANITIM (3D KONSEPT)
  {
    filename: '03_Bofe_Mod1_Marka_Tanitim_4_5.png',
    brand: 'Bofe Tarım',
    mode: 'Mod 1: Marka Tanıtım',
    references: [
      {
        role: 'logo',
        url: 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc/org-logo.jpg'
      }
    ],
    prompt: `Instagram'da paylaşılacak ödüllü, estetik ve prestijli bir tarım marka tanıtım afişi oluştur (4:5 dikey format).
Ekli Bofe Tarım logosunu ve renk paletini (#026009 orman yeşili, fıstık yeşili, beyaz) kullan.
Sol üstte Bofe logosu.
Sol tarafta büyük, kalın sans-serif başlık:
"Topraktan.
Geleceğe."
Altında sade alt başlık: "Akülü ilaçlama ve modern tarım çözümleriyle en yüksek verim."
Görsel sahnede: Masanın üzerinde duran katlanmış minyatür 3D bir vadi ve bereketli meyve bahçesi maketi, su kanalı ve arkada parlayan camdan koruyucu yeşil filiz heykeli.
Sol altta şık koyu yeşil bir hap buton [ Hemen Keşfet → ] ve 'bofe.com.tr'.`
  },

  // 4. BOFE TARIM - MOD 2: GÖSTERİŞLİ KAMPANYA (GERÇEK 16L POMPA)
  {
    filename: '04_Bofe_Mod2_Kampanya_Afisi_4_5.png',
    brand: 'Bofe Tarım',
    mode: 'Mod 2: Gösterişli Kampanya',
    references: [
      {
        role: 'logo',
        url: 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc/org-logo.jpg'
      },
      {
        role: 'product',
        localPath: '.codex_runtime/bofe-canonical-product.jpg',
        mimeType: 'image/jpeg'
      }
    ],
    prompt: `Instagram'da satış yapıyorum. Ekli Bofe logosunu, 16L şarjlı sırt pompası ürün görselini ve marka kitini (orman yeşili, fıstık yeşili, beyaz) kullanarak bana çok gösterişli bir kampanya afişi oluştur (4:5 dikey format).
Sol üstte Bofe logosu.
Sol tarafta büyük, kalın başlık:
"Bahçeniz İçin
Güçlü Yardımcı"
Alt başlık: "Yeni nesil akülü sırt ilaçlama pompasıyla daha verimli, daha kolay bakım."
Sahne: Sabahın ilk altın saat ışığında, arkasında sisli zeytinlik tepeleri uzanan ahşap hasat masasında ekli 2. referanstaki gerçek açık mavi 16L pompa; pirinç nozulundan sabah güneşine doğru havaya karışan ultra-ince berrak su sisi.
Alt kısımda 3 yatay simgeli özellik: 16 Litre Kapasite | Akülü Pratik Kullanım | Yüksek Dayanım
En altta şık koyu yeşil eylem butonu: [ Ürünleri İnceleyin → ] | bofe.com.tr`
  },

  // 5. AYVAZOĞLU İNŞAAT - MOD 1: MARKA TANITIM (3D BLUEPRINT KONSEPT)
  {
    filename: '05_Ayvazoglu_Mod1_Marka_Tanitim_4_5.png',
    brand: 'Ayvazoğlu İnşaat',
    mode: 'Mod 1: Marka Tanıtım',
    references: [
      {
        role: 'logo',
        url: 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/4a58b0dd-0931-4901-880a-686457d15010/org-logo.jpg'
      }
    ],
    prompt: `Instagram'da paylaşılacak ödüllü, mimari, estetik bir inşaat marka tanıtım afişi oluştur (4:5 dikey format).
Ekli Ayvazoğlu İnşaat logosunu ve renk paletini (#A82218 tuğla kırmızısı, antrasit, beyaz) kullan.
Sol üstte Ayvazoğlu logosu.
Sol tarafta büyük, kalın sans-serif başlık:
"Sağlam temel.
Güvenli yarınlar."
Altında sade alt başlık: "Tuğla ve yapı malzemelerinde şantiyenize doğrudan tedarik."
Görsel sahnede: Mimar masası üzerinde açılmış rulo mimari paftalar/blueprintler ve üzerinden 3D yükselen modern lüks klinker tuğla villa maketi, rulo çizimler, şık metal kalem.
Sol altta şık tuğla kırmızısı bir hap buton [ Kataloğu İncele → ] ve 'ayvazogluinsaat.com'.`
  },

  // 6. AYVAZOĞLU İNŞAAT - MOD 2: GÖSTERİŞLİ KAMPANYA (GERÇEK TUĞLA / KİREMİT)
  {
    filename: '06_Ayvazoglu_Mod2_Kampanya_Afisi_4_5.png',
    brand: 'Ayvazoğlu İnşaat',
    mode: 'Mod 2: Gösterişli Kampanya',
    references: [
      {
        role: 'logo',
        url: 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/4a58b0dd-0931-4901-880a-686457d15010/org-logo.jpg'
      },
      {
        role: 'product',
        url: 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/creatives/4a58b0dd-0931-4901-880a-686457d15010/products/ayvazoglu_brick.jpg'
      }
    ],
    prompt: `Instagram'da satış yapıyorum. Ekli Ayvazoğlu İnşaat logosunu, tuğla ürün görselini ve marka kitini (renkler: tuğla kırmızısı, antrasit, beyaz) kullanarak bana çok gösterişli bir kampanya afişi oluştur (4:5 dikey format).
Sol üstte Ayvazoğlu İnşaat logosu.
Sol tarafta büyük, kalın başlık:
"Projelerinize Değer Katan
Yapı Malzemeleri"
Alt başlık: "Tuğla, kiremit ve cephe çözümlerinde güvenilir tedarik ortağınız."
Sahne: Sıcak güneş ışığında modern klinker tuğla villanın verandasında beton kaidede özenle istiflenmiş gerçek pişmiş kil tuğla ve oluklu kiremitler, doğal zeytin ağacı dalı gölgeleri.
Alt kısımda 3 yatay simgeli özellik: Güvenilir Tedarik | Geniş Ürün Çeşidi | Zamanında Teslimat
En altta şık tuğla kırmızısı eylem butonu: [ Teklif Alın → ] | ayvazogluinsaat.com`
  }
];

async function runTask(task: Task) {
  const gatewayUrl = 'https://choice-harder-inserted-passengers.trycloudflare.com';
  console.log(`\n======================================================`);
  console.log(`[BAŞLATILIYOR] ${task.brand} - ${task.mode}`);
  console.log(`Dosya: ${task.filename}`);

  const referenceImages: any[] = [];
  for (const ref of task.references) {
    if (ref.url) {
      referenceImages.push({ role: ref.role, url: ref.url });
    } else if (ref.localPath) {
      const data = fs.readFileSync(ref.localPath);
      referenceImages.push(inlineReference({ data, mimeType: ref.mimeType || 'image/jpeg', role: ref.role }));
    }
  }

  const job = await submitImageJob(gatewayUrl, {
    prompt: task.prompt,
    size: '1024x1280',
    response_format: 'b64_json',
    referenceImages: referenceImages,
    expected_reference_count: referenceImages.length,
    workspace: 'WhatsApp Botu',
    customer: `${task.brand} — ${task.mode}`
  });

  console.log(`İş kuyrukta! Job ID: ${job.id}`);

  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4000));
    try {
      const res = await readImageJob(job, undefined, referenceImages.length);
      if (res && res.data) {
        const outDir = 'C:\\Users\\TP2\\Desktop\\veriburada medya\\Yeni_Testler';
        fs.mkdirSync(outDir, { recursive: true });
        const p1 = path.join(outDir, task.filename);
        const p2 = path.join('C:\\Users\\TP2\\.gemini\\antigravity\\brain\\30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270', task.filename);

        fs.writeFileSync(p1, res.data);
        fs.writeFileSync(p2, res.data);
        console.log(`BAŞARILI: Kaydedildi -> ${p1} (${res.data.length} bytes)`);
        return p1;
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

async function main() {
  console.log(`Toplam ${tasks.length} adet görsel sıfırdan üretilecek.`);
  for (const task of tasks) {
    await runTask(task);
  }
  console.log('\nTÜM 6 ADET GÖRSEL SIFIRDAN BAŞARIYLA ÜRETİLDİ!');
}

main().catch(console.error);
