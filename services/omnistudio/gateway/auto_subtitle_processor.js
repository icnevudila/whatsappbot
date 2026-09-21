const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const { detectSector, resolveCreativeArchetype, getRecommendedCTAs } = require('./brand_learning_store.js');

function cleanSpeechText(text) {
  if (!text) return '';
  return text
    .replace(/\bbrand\s*kit\b/gi, '')
    .replace(/\bmarka\s*kiti\b/gi, '')
    .replace(/\bkampanya\s*kiti\b/gi, '')
    .replace(/\b(?:cta|prompt|act\s*\d+|shot\s*\d+|sahne\s*\d+|veo|flow|google\s*flow)\b/gi, '')
    .replace(/["“”«»*#\[\]]/g, '')
    .replace(/\byeni\s+yeni\b/gi, 'yeni')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Prompt içinden veya Marka/Sektör hafızasından 3 perdeli 10 saniyelik Türkçe reklam senaryosunu çıkarır.
 */
function extractOrGenerateScript(options = {}) {
  const { prompt, veoPrompt, chatGptPrompt, brief, brandName, customer, productName, voiceoverText } = options;
  const brand = (brandName || customer || 'İşletme')
    .replace(/\b(brand\s*kit|marka\s*kiti|kampanya\s*kiti)\b/gi, '')
    .trim() || 'İşletme';
  const product = (productName || 'Hizmet').trim();
  const allText = `${chatGptPrompt || ''} \n ${veoPrompt || ''} \n ${prompt || ''} \n ${brief || ''}`;

  // 0. Açıkça iletilmiş seslendirme metni varsa doğrudan kullan
  if (voiceoverText && voiceoverText.trim().length >= 10) {
    return cleanSpeechText(voiceoverText);
  }

  // 1. ChatGPT AUDIO: bloğu veya Türkçe Seslendirme direktifi
  const audioQuote = allText.match(/AUDIO:.*?["“](.*?)["”]/s) || 
                     allText.match(/SPİKER(?:İN\s+AYNEN\s+SÖYLEYECEĞİ)?.*?:\s*["“]?(.*?)(?:["”\n]|$)/i) ||
                     allText.match(/(?:TÜRKÇE SESLENDİRME|AUDIO VOICEOVER|SES METNİ|VOICEOVER)\s*[:\-]\s*([^\n\r"]{15,200})/i);
  if (audioQuote && audioQuote[1]) {
    const raw = cleanSpeechText(audioQuote[1]);
    if (raw.length >= 12) {
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
  let act1 = `${brand} ile kaliteyi ve güveni keşfedin.`;
  let act2 = `İşinize değer katan çözümlerle hemen tanışın.`;
  let act3 = `Bizimle iletişime geçin.`;

  const sKey = sector?.sectorKey;
  if (sKey === 'b2b_tech_data') {
    act1 = `${brand} ile Google Haritalardaki yeni müşterileri hemen bulun.`;
    act2 = `Müşterilerinize ilk siz ulaşın, satışlarınızı hızla büyütün.`;
    act3 = `Detaylı bilgi ve demo için bizimle iletişime geçin.`;
  } else if (sKey === 'food_gastronomy' || sKey === 'food_restaurant') {
    act1 = `${brand} lezzetini hemen keşfedin.`;
    act2 = `Taptaze, sıcak ve doyumsuz lezzetler sizi bekliyor.`;
    act3 = `Siparişinizi hemen oluşturun.`;
  } else if (sKey === 'automotive_service') {
    act1 = `Aracınız için en güvenilir servis ${brand}.`;
    act2 = `Uzman ekip ve garantili bakım ile yola güvenle çıkın.`;
    act3 = `Randevunuzu hemen oluşturun.`;
  } else if (sKey === 'agriculture_machinery' || sKey === 'agriculture_equipment') {
    act1 = `${brand} ile hasatta maksimum güç ve yüksek verim.`;
    act2 = `Yerli üretim, sağlam gövde ve üstün performans.`;
    act3 = `Size özel fabrika teklifi için bizimle iletişime geçin.`;
  } else if (sKey === 'real_estate_luxury' || sKey === 'real_estate_architecture') {
    act1 = `${brand} ile hayalinizdeki prestijli yaşama adım atın.`;
    act2 = `Eşsiz mimari ve kusursuz detaylar bir arada.`;
    act3 = `Ayrıcalıklı projelerimiz için bizimle iletişime geçin.`;
  } else if (sKey === 'industrial_construction') {
    act1 = `${brand} ile projelerinize sağlam temel ve üstün dayanıklılık.`;
    act2 = `Fabrikadan doğrudan şantiyenize hızlı teslimat.`;
    act3 = `Projenize özel toptan fiyat almak için bizimle iletişime geçin.`;
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

  // Logo tespit et (options.logoPath veya bilinen marka logoları)
  const brand = (options.brandName || options.customer || '').toLowerCase();
  let logoPath = options.logoPath || '';
  if (!logoPath) {
    if (brand.includes('bofe')) {
      const bofeP = path.join(__dirname, 'bofe_logo_clean_black.png');
      if (fs.existsSync(bofeP)) logoPath = bofeP;
    } else if (brand.includes('ayvaz')) {
      const ayvazP = path.join(__dirname, 'outputs', 'ayvazoglu_logo.png');
      const ayvazScratch = path.join(__dirname, '..', '..', '..', 'scratch', 'ayvazoglu_logo_official.png');
      if (fs.existsSync(ayvazP)) logoPath = ayvazP;
      else if (fs.existsSync(ayvazScratch)) logoPath = ayvazScratch;
    } else if (brand.includes('veri')) {
      const veriP = path.join(__dirname, 'outputs', 'veriburada_logo.png');
      const veriDirect = path.join(__dirname, 'veriburada_logo.png');
      if (fs.existsSync(veriP)) logoPath = veriP;
      else if (fs.existsSync(veriDirect)) logoPath = veriDirect;
    }
  }

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

  // Marka Bumper kartı sadece açıkça talep edilmişse giydirilir (options.enableBumper === true)
  if (options.enableBumper === true && logoPath && fs.existsSync(logoPath)) {
    args.push('--logo', logoPath);
    args.push('--bumper_cta', options.bumperCta || 'Bizimle İletişime Geçin');
  }

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
