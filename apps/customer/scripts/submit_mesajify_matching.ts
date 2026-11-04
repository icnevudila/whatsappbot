import fs from 'fs';
import { submitImageJob, readImageJob } from '../src/lib/ai/omnistudio-image-job';

process.env.OMNISTUDIO_GATEWAY_URL = 'https://choice-harder-inserted-passengers.trycloudflare.com';
process.env.OMNISTUDIO_GATEWAY_TOKEN = 'omnistudio_secret_token_2026';

async function main() {
  const gatewayUrl = 'https://choice-harder-inserted-passengers.trycloudflare.com';
  const logoUrl = 'https://ilhiuzffapcrleotpfyt.supabase.co/storage/v1/object/public/brand-assets/2881f690-6853-4064-8768-307463ae6255/original-logo-e383102bc1be7a58.png';

  const prompt = `Tam olarak Bofe ve Ayvazoğlu için oluşturduğun o mükemmel Instagram kampanya postu düzeninde ve kalitesinde bir Mesajify kampanya görseli oluştur (4:5 dikey format):

DÜZEN VE KOMPOZİSYON (AYVAZOĞLU VE BOFE İLE BİREBİR AYNI ŞABLON):
- Sol Üst: Ekli Mesajify logosu.
- Başlık (Sol tarafta büyük, kalın sans-serif):
  "Müşterilerinizle
  Hızlı İletişim"
- Alt Başlık: "WhatsApp ile toplu mesajlaşma, kampanya yönetimi ve anlık sipariş takibi."

SAHNE (SAĞ VE MERKEZ ALAN):
Güneşli ve aydınlık modern bir kafe veya mağaza tezgahı.
Ahşap masa üzerinde şık bir fincan kahve ve açık duran ince modern bir tablet/telefon ekranında yeşil Mesajify WhatsApp sipariş yönetim paneli. Arka planda sıcak ışık alan modern vitrinler ve ferah bir işletme atmosferi.

ALT ÖZELLİKLER (3 İKONLU MADDE - DÜZ BİR ÇİZGİDE):
[Şimşek İkonu] Hızlı Mesajlaşma | [Kullanıcı İkonu] Kitle Yönetimi | [Grafik İkonu] Yüksek Geri Dönüş

ALT EYLEM BARI (EN ALT):
Sol tarafta koyu zümrüt yeşili şık hap buton: [ Ücretsiz Deneyin → ]
Yanında dikey çizgi | ve domain: mesajify.com`;

  console.log('Mesajify Bofe/Ayvazoğlu tarzı üretimi başlatılıyor...');
  const job = await submitImageJob(gatewayUrl, {
    prompt: prompt,
    size: '1024x1280',
    response_format: 'b64_json',
    referenceImages: [{ role: 'logo', url: logoUrl }],
    expected_reference_count: 1,
    workspace: 'WhatsApp Botu',
    customer: 'Mesajify — Bofe ve Ayvazoğlu Şablon Eşleşmesi'
  });

  console.log('İş kuyruğa alındı! Job ID:', job.id);

  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4000));
    try {
      const res = await readImageJob(job, undefined, 1);
      if (res && res.data) {
        const outPath = 'C:\\Users\\TP2\\Desktop\\veriburada medya\\Yeni_Testler\\Mesajify_Mukemmel_Ayvazoglu_Bofe_Tarzi_4_5.png';
        fs.writeFileSync(outPath, res.data);
        const artPath = 'C:\\Users\\TP2\\.gemini\\antigravity\\brain\\30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270\\Mesajify_Mukemmel_Ayvazoglu_Bofe_Tarzi_4_5.png';
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
