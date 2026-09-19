const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const { detectSector, resolveCreativeArchetype, getRecommendedCTAs } = require('./brand_learning_store.js');

/**
 * Prompt içinden veya Marka/Sektör hafızasından 3 perdeli 10 saniyelik Türkçe reklam senaryosunu çıkarır.
 */
function extractOrGenerateScript(options = {}) {
  const { prompt, veoPrompt, chatGptPrompt, brief, brandName, customer, productName } = options;
  const brand = (brandName || customer || 'İşletme').trim();
  const product = (productName || 'Hizmet').trim();
  const allText = `${chatGptPrompt || ''} \n ${veoPrompt || ''} \n ${prompt || ''} \n ${brief || ''}`;

  // 1. Prompt içinde tanımlı Türkçe Seslendirme bloğu var mı?
  const voMatch = allText.match(/(?:TÜRKÇE SESLENDİRME|AUDIO VOICEOVER|SES METNİ|VOICEOVER)\s*[:\-]\s*([^\n\r"]{15,200})/i);
  if (voMatch && voMatch[1]) {
    const raw = voMatch[1].replace(/["“”]/g, '').trim();
    if (raw.length >= 15) {
      return raw;
    }
  }

  // 2. Tırnak içindeki Türkçe reklam cümleleri var mı?
  const quoteMatch = allText.match(/"([^"]{20,150})"/);
  if (quoteMatch && quoteMatch[1] && (quoteMatch[1].includes('ile') || quoteMatch[1].includes('için') || quoteMatch[1].includes('hemen') || quoteMatch[1].includes('WhatsApp'))) {
    return quoteMatch[1].trim();
  }

  // 3. Hafıza Bankasından Sektöre Özel 3 Perdeli Altın Replik Üret
  const sector = detectSector(brand, product, allText);
  const ctas = getRecommendedCTAs(sector?.sectorKey);
  const chosenCta = (ctas && ctas.length > 0) ? ctas[0] : 'WhatsApp ile hemen başlayın';

  let act1 = `${brand} ile ${sector?.name || 'en iyisini'} keşfedin.`;
  let act2 = `Kaliteyi ve hızı anında yaşayın.`;
  let act3 = `Şimdi ${chosenCta}!`;

  const sKey = sector?.sectorKey;
  if (sKey === 'b2b_tech_data') {
    act1 = `${brand} ile Google Haritalardaki yeni müşterileri hemen bulun.`;
    act2 = `Müşterilerinize ilk siz ulaşın, satışlarınızı büyütün.`;
    act3 = `WhatsApp ile yazın, hemen başlayın!`;
  } else if (sKey === 'food_gastronomy') {
    act1 = `${brand} lezzetini hemen keşfedin.`;
    act2 = `Taptaze, sıcak ve doyumsuz lezzetler sizi bekliyor.`;
    act3 = `Hemen WhatsApp ile sipariş verin!`;
  } else if (sKey === 'automotive_service') {
    act1 = `Aracınız için en güvenilir servis ${brand}.`;
    act2 = `Uzman ekip ve garantili bakım ile yola güvenle çıkın.`;
    act3 = `WhatsApp ile hemen randevu alın!`;
  } else if (sKey === 'agriculture_machinery') {
    act1 = `${brand} ile hasatta maksimum güç ve yüksek verim.`;
    act2 = `Yerli üretim, sağlam gövde ve üstün performans.`;
    act3 = `Fabrikadan doğrudan teklif için WhatsApp ile yazın!`;
  } else if (sKey === 'real_estate_luxury') {
    act1 = `${brand} ile hayalinizdeki prestijli yaşama adım atın.`;
    act2 = `Eşsiz mimari ve kusursuz detaylar bir arada.`;
    act3 = `Özel katalog için WhatsApp ile iletişime geçin.`;
  }

  return `${act1} ${act2} ${act3}`;
}

/**
 * Videoyu işler:
 * @param {Object} params
 * @param {string} params.videoPath Ham video dosya yolu
 * @param {string} params.outputPath Çıktı video dosya yolu (verilmezse videoPath üzerine yazar)
 * @param {'flow' | 'gemini'} params.engine Video motoru
 * @param {Object} params.options Üretim seçenekleri (brandName, prompt vb.)
 */
async function processVideoAudioAndSubtitles({ videoPath, outputPath, engine = 'flow', options = {} }) {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video dosyası bulunamadı: ${videoPath}`);
  }

  const finalOutput = outputPath || videoPath.replace('.mp4', '_capcut_final.mp4');
  const cleanOutput = finalOutput.replace(/(_capcut_final|_final|_sub)?\.mp4$/, '_clean_nosub.mp4');
  const scriptText = extractOrGenerateScript(options);
  console.log(`[AutoSub] 🎬 [${engine.toUpperCase()}] Otomatik CapCut & Veo Natif Ses Senkronu Başlatılıyor...`);
  console.log(`[AutoSub] 📜 Referans Senaryo: "${scriptText}"`);

  const workerScript = path.join(__dirname, 'auto_subtitle_worker.py');

  // Windows'ta py/python, Linux VPS'te python3
  const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';

  const args = [
    workerScript,
    '--mode', 'native_audio_subtitles',
    '--input', videoPath,
    '--output', finalOutput,
    '--output_nosub', cleanOutput,
    '--script', scriptText
  ];

  console.log(`[AutoSub] 🚀 Python Worker çalıştırılıyor: ${pythonCmd} ${args.join(' ')}`);
  const res = spawnSync(pythonCmd, args, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

  if (res.error || res.status !== 0) {
    console.error(`[AutoSub] ❌ Worker Hatası:`, res.stderr || res.error?.message);
    throw new Error(`AutoSub Worker başarısız oldu: ${res.stderr || res.error?.message}`);
  }

  console.log(`[AutoSub] ✅ Worker Başarıyla Tamamlandı:\n${res.stdout}`);

  // Eğer outputPath verilmemişse finalOutput'u videoPath yerine taşı
  if (!outputPath && fs.existsSync(finalOutput)) {
    fs.copyFileSync(finalOutput, videoPath);
    try { fs.removeSync(finalOutput); } catch(e){}
  }

  // Thumbnail güncelle
  const thumbPath = (outputPath || videoPath).replace('.mp4', '_thumb.jpg');
  try {
    execSync(`ffmpeg -y -ss 00:00:02 -i "${outputPath || videoPath}" -vframes 1 -q:v 2 "${thumbPath}"`, { stdio: 'ignore' });
  } catch (tErr) {}

  return {
    success: true,
    processedVideoPath: outputPath || videoPath,
    cleanVideoPath: cleanOutput,
    thumbPath,
    scriptUsed: scriptText
  };
}

module.exports = {
  extractOrGenerateScript,
  processVideoAudioAndSubtitles
};
