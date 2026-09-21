const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const WebSocket = globalThis.WebSocket || (() => {
  try { return require('ws'); } catch (e) { return null; }
})();

const OUTPUT_DIR = '/app/gateway/outputs';
const PUBLIC_HOST = process.env.PUBLIC_HOST || '167.233.201.31';
const PORT = process.env.PORT || '3456';

const CDP_PORTS = (process.env.GEMINI_CDP_PORTS || '9222,9223,9224,9225')
  .split(',')
  .map(p => parseInt(p.trim(), 10))
  .filter(Boolean);

// Havuzdaki 4 hesabın canlı durumunu tutar
// port -> { limitedUntil: timestamp, lastUsed: timestamp, accountName: string, limitReason: string }
const accountPool = {};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const { getActiveBrandKit, buildTurkishVeoDirectorPrompt, getLogoVisualDescription } = require('./brand_resolver.js');
let recordSuccess;
try {
  ({ recordSuccess } = require('./brand_learning_store.js'));
} catch (e) {
  recordSuccess = () => {};
}

const {
  getCompanyChat,
  setCompanyChat,
  getExpectedChatTitle
} = require('./chat_manager.js');
let processVideoAudioAndSubtitles;
try {
  ({ processVideoAudioAndSubtitles } = require('./auto_subtitle_processor.js'));
} catch (e) {
  processVideoAudioAndSubtitles = null;
}

/**
 * Full + Full Sinematik Reklam Prompt Genişleticisi (Veo & AI Video Engine)
 * Kısa veya standart bir brief'i 3 perdeli bir reklam filmi yönetmeni vizyonuna genişletir.
 * Marka kitinden marka adı, logosu ve renkleri otomatik çeker; %100 Türkçe 3D sahne metinlerini hazırlar.
 */
async function enhanceVideoPrompt(options = {}) {
  const { buildTurkishVeoDirectorPrompt } = require('./brand_resolver.js');
  return await buildTurkishVeoDirectorPrompt(options);
}

/**
 * Resolves concrete local file paths for logo and product images.
 * Downloads remote HTTP(S) URLs to local temporary files if needed, or verifies existing local files.
 * If user didn't explicitly upload an image in the wizard, falls back to the organization's brand kit.
 */
async function resolveLocalMediaFiles(options = {}) {
  const files = [];
  const candidateItems = [];

  // 1. Wizard veya API çağrısından gelen somut görseller (ana ürün, detay açısı ve logo)
  if (options.productImageUrl) candidateItems.push({ url: options.productImageUrl, role: 'product' });
  if (options.detailImageUrl && options.detailImageUrl !== options.productImageUrl) {
    candidateItems.push({ url: options.detailImageUrl, role: 'product_detail' });
  }
  if (options.logoUrl) candidateItems.push({ url: options.logoUrl, role: 'logo' });

  // 2. Çoklu referans görselleri (en fazla 5 adet ek referans görseli)
  const incomingRefs = Array.isArray(options.referenceImageUrls)
    ? options.referenceImageUrls
    : (Array.isArray(options.referenceImages) ? options.referenceImages : []);

  for (const ref of incomingRefs.slice(0, 5)) {
    const u = typeof ref === 'string' ? ref : ref?.url;
    if (u && u !== options.productImageUrl && u !== options.detailImageUrl && u !== options.logoUrl) {
      candidateItems.push({ url: u, role: typeof ref === 'object' ? ref.role || 'reference' : 'reference' });
    }
  }

  // 3. Kullanıcı yüklemediyse veya eksikse, kayıtlı kurumsal Marka Kitinden çek
  if (!options.productImageUrl || !options.logoUrl) {
    try {
      const bk = options.brandKit || await getActiveBrandKit(options.orgId, options.brandName || options.customer);
      if (bk) {
        if (!options.logoUrl && bk.logo_path) candidateItems.push({ url: bk.logo_path, role: 'logo' });
        if (!options.productImageUrl && bk.product_image_path) candidateItems.push({ url: bk.product_image_path, role: 'product' });
      }
    } catch (e) {
      console.warn('[VideoGen] Brand kit çözümleme uyarısı:', e.message);
    }
  }

  // Dosyaların yazılacağı ortak dizin: Container ve host arasında paylaşılan /app/gateway/outputs
  const targetDir = fs.existsSync(OUTPUT_DIR) ? OUTPUT_DIR : (os.tmpdir ? os.tmpdir() : '/tmp');

  // 4. Dosyaları yerel dosya yoluna indir veya doğrula
  for (let idx = 0; idx < candidateItems.length; idx++) {
    const item = candidateItems[idx];
    try {
      if (item.b64) {
        const raw = item.b64.includes(',') ? item.b64.split(',')[1] : item.b64;
        const tmpPath = path.join(targetDir, `video_b64_${Date.now()}_${idx}.png`);
        fs.writeFileSync(tmpPath, Buffer.from(raw, 'base64'));
        files.push({ role: item.role, path: tmpPath, fileName: path.basename(tmpPath), toString() { return this.path; } });
      } else if (item.url) {
        let strUrl = item.url.trim();
        // Supabase relative storage path ise public URL'e çevir
        if (!strUrl.startsWith('http://') && !strUrl.startsWith('https://') && !strUrl.startsWith('/') && !strUrl.startsWith('.')) {
          strUrl = `https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/${strUrl}`;
        }

        if (strUrl.startsWith('http://') || strUrl.startsWith('https://')) {
          console.log(`[VideoGen] 🌐 Somut görsel indiriliyor (${item.role}): ${strUrl.slice(0, 70)}...`);
          const res = await fetch(strUrl, { signal: AbortSignal.timeout(12000) });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            const extMatch = strUrl.match(/\.(png|jpg|jpeg|webp)/i);
            const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
            const tmpPath = path.join(targetDir, `video_media_${Date.now()}_${idx}.${ext}`);
            fs.writeFileSync(tmpPath, buf);
            files.push({ role: item.role, path: tmpPath, fileName: path.basename(tmpPath), toString() { return this.path; } });
            console.log(`[VideoGen] 💾 Somut görsel diske yazıldı (${item.role}): ${tmpPath} (${buf.length} bytes)`);
          } else {
            console.warn(`[VideoGen] ⚠️ Görsel indirilemedi (${res.status} ${res.statusText}): ${strUrl}`);
            if (options.requireMedia === true) {
              throw new Error(`Zorunlu ${item.role} görseli indirilemedi: ${strUrl}`);
            }
          }
        } else {
          // Yerel dosya yolları
          const clean = strUrl.replace(/^\/outputs\//, '/app/gateway/outputs/');
          const localCandidates = [
            strUrl,
            clean,
            path.join('/app/gateway', strUrl),
            path.join('/app/gateway/outputs', path.basename(strUrl)),
            path.resolve(strUrl),
          ];
          let matched = false;
          for (const cand of localCandidates) {
            if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
              files.push({ role: item.role, path: cand, fileName: path.basename(cand), toString() { return this.path; } });
              console.log(`[VideoGen] 📁 Yerel somut dosya eşleşti (${item.role}): ${cand}`);
              matched = true;
              break;
            }
          }
          if (!matched && options.requireMedia === true) {
            throw new Error(`Zorunlu yerel ${item.role} dosyası bulunamadı: ${strUrl}`);
          }
        }
      }
    } catch (err) {
      console.warn(`[VideoGen] Görsel işleme hatası (${item.role}):`, err.message);
      if (options.requireMedia === true) throw err;
    }
  }

  // Tekil dosyaları filtrele (path bazında)
  const seenPaths = new Set();
  const uniqueFiles = [];
  for (const f of files) {
    const p = f.path || String(f);
    if (!seenPaths.has(p)) {
      seenPaths.add(p);
      uniqueFiles.push(f);
    }
  }
  console.log(`[VideoGen] 🎯 Toplam ${uniqueFiles.length} adet somut görsel dosyası hazırlandı.`);
  return uniqueFiles;
}

/**
 * Normal ChatGPT Web Servisine Girerek Otonom Video Promptu Üretir
 * OpenAI API anahtarı veya kredi KULLANMAZ, doğrudan Chrome sekmendeki ChatGPT oturumunu çalıştırır.
 */
async function generatePromptWithChatGptWeb(port, options = {}) {
  const { prompt, brandName, productName, customer, orgId, productImageUrl, logoUrl } = options;
  const brandKit = await getActiveBrandKit(orgId, brandName || customer);
  const company = customer || brandName || brandKit.organization_name || brandKit.brand_name || 'İşletme';
  const logoDesc = getLogoVisualDescription(company, brandKit.logo_path, brandKit.hasExplicitLogo);
  const colors = brandKit.colors || { primary: '#111827', accent: '#2563eb' };
  const savedChat = getCompanyChat(company, 'video');
  const targetUrl = savedChat?.chatUrl || 'https://chatgpt.com/';
  const isNewChat = !savedChat?.chatUrl;
  console.log(`[VideoGen -> ChatGPT Web] [Firma: ${company}] [Video Prompt] Hedef URL: ${targetUrl}...`);
  let createdTabId = null;
  let ws = null;
  try {
    // 1. Firma video sohbet sekmesini aç (Kayıtlı sohbet varsa doğrudan oraya girer, yoksa temiz açar)
    const newTabRes = await fetch(`http://127.0.0.1:${port}/json/new?${targetUrl}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(8000)
    });
    if (!newTabRes.ok) throw new Error('Yeni ChatGPT sekmesi açılamadı');
    const newTab = await newTabRes.json();
    createdTabId = newTab.id;

    ws = new WebSocket(newTab.webSocketDebuggerUrl);
    let idSeq = 1;
    function sendCmd(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = idSeq++;
        const handler = (e) => {
          const data = JSON.parse(e.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const brand = company;
    const product = productName || 'Ürün & Hizmet';
    const brief = prompt || '9:16 sinematik reklam videosu';
    const { detectSectorAndStyle } = require('./brand_resolver.js');
    const sectorInfo = detectSectorAndStyle(brand, product, brief);

    const gptAskPrompt = `Sen Cannes ve Kristal Elma ödüllü bir ticari reklam filmi yönetmeni ve Google Veo video prompt uzmanısın.
Görevin: Verilen işletme verilerini kullanarak Google Veo motoruna doğrudan iletilecek, TAM BİR TELEVİZYON / REELS REKLAM FİLMİ DİNAMİZMİNDE, her seferinde YARATICI VE ÖZGÜN tek bir 9:16 Dikey Reklam Filmi Promptu oluşturmak.

İŞLETME VE MARKA VERİLERİ:
- Sektör / Konsept: ${sectorInfo.sector} (${sectorInfo.sceneAtmosphere})
- Marka Adı: ${brand} (Videoda kurumsal logo ve fiziksel marka olarak yer alacaktır)
- Kurumsal Logo Tanımı: ${logoDesc}
- Ekli Medya ve Ürün/Logo Analizi: Firmanın orijinal kurumsal logosu (${logoDesc}) ve ürün görseli sana verilmiştir. Bu görselleri incele ve Veo promptunun içine logonun ve ürünün fiziksel görünümünü (renklerini, geometrisini, gövde yapısını) METİNSEL OLARAK DOĞRUDAN VE KUSURSUZCA YAZ.
  * EKLİ ÜRÜNÜN FİZİKSEL FORMUNU KESİNLİKLE KORU: Eğer ürün hava delikli killi blok tuğla ise (üstünde dikdörtgen delikler, yanlarında dikey oluklu çizgiler olan kırmızı kil blok), promptunda ASLA 'masif gövdeli pres tuğla' veya 'düzgün deliksiz dikdörtgen gövde' YAZMA. Birebir 'üst yüzeyinde hava delikleri ve yanlarında dikey oluk çizgileri olan fırınlanmış kırmızı kil blok tuğla (perforated hollow core clay brick)' olarak tam fiziksel detaylarıyla betimle. Veo difüzyon modelinin deliksiz düz taş üretmesini kesinlikle engelle.
  * EKLİ LOGO KİMLİĞİNİ HARFİYEN KORU: Şirketin kurumsal logosu (${logoDesc}) ve şirket adı ('${brand}') sahnedeki araç kapısı veya tabelada kusursuz, net ve okunaklı yer almalıdır. Uydurma geometrik şekiller, sarı üçgenler, yapay amblemler veya bozuk yazılar KESİNLİKLE EKLENMEYECEKTİR.
- KESİN UYARI (VEO'YA 'EKLİ DOSYA' YAZMA YASAĞI): Veo'ya iletilecek nihai prompt metninde KESİNLİKLE 'ekli görsel', 'ektedir', 'dosyadaki görsel', 'ekli logo' gibi ifadeler YAZMA! Veo difüzyon modeli bunu görünce 'Lütfen görsel yükleyin' diyerek videoyu başlatmaz. Bunun yerine ekteki görselin neye benzediğini Veo'ya doğrudan canlı dille betimle (Örn: '${logoDesc}'; üstünde hava delikleri ve yan olukları olan kırmızı pişmiş kil blok tuğlalar). Veo'nun doğrudan video üretmeye başlamasını sağla.
- Kurumsal Renk Paleti (KESİNLİKLE METİN OLARAK PROMPTA # HEX KODU YAZILMAYACAK): Koyu zümrüt yeşili, canlı parlak yeşil, beyaz ve siyah
- Öne Çıkan Ürün/Hizmet: ${product}
- Kampanya Brief'i: ${brief}

KRİTİK YÖNETMEN VE REKLAM STANDARTLARI (ÖNEMLİ):
1. SIFIR HEX KODU KURALI (NO HEX CODES ON PROMPTS):
   - Prompt metnine ASLA '#4caf50', '#1b5e20' gibi hex kodları YAZMA! Veo modeli bunları tabela metni sanıp plakete basar. Sadece 'koyu yeşil', 'parlak zümrüt yeşili' gibi doğal Türkçe renk isimleri kullan.

2. TEMİZ MİNİMALİST HARİTA & DİJİTAL ARAYÜZ KURALI (SIFIR SAHTE SOKAK YAZISI):
   - Laptop ekranında Google Haritalar gösterildiğinde 'Goaticlafa' gibi uydurma sokak, şehir veya mahalle isimleri KESİNLİKLE YAZDIRILMAYACAKTIR.
   - Harita SADECE temiz minimalist grafik topoğrafik yollardan, dairesel yeşil radar tarama dalgalarından ve parıldayan temiz yeşil konum pinlerinden oluşmalıdır (CLEAN MINIMALIST VECTOR MAP, NO STREET LABELS, NO GIBBERISH NAMES).
   - Küçük buton yazısı, sokak adı, arayüz etiketi veya okunması zor mikro metin YOKTUR; arayüz ikonlar, pinler ve renkli durum ışıklarıyla anlaşılır.

3. MARKA KİMLİĞİ VE YAZI KURALI (SIFIR GIBBERISH, SIFIR RASTGELE CTA LEVHASI):
   - Veo küçük yazılarda bozulduğu için küçük masa isimliği, elde taşınan mini tabela, arka plan raf etiketi, uzun slogan, bilgi kutusu ve CTA levhası KULLANMA.
   - 'ANINDA TEKLİF AL', 'SİPARİŞ VER', 'HEMEN ARA', 'WHATSAPP İLE İLETİŞİME GEÇİN' gibi CTA metinleri kullanıcı açıkça istemedikçe sahneye yazılmayacaktır; CTA seslendirmede söylenir.
   - Marka adı ('${brand}') ve varsa ekli gerçek logo yalnızca büyük, temiz, okunabilir fiziksel marka yüzeylerinde görünür: ürün gövdesi/ambalaj etiketi, iş önlüğü nakışı, araç gövde etiketi, dükkan/fabrika giriş tabelası veya ana hero ürün plakası.
   - Marka renk paleti ürün, kıyafet, mekan aksanı, ambalaj ve ışıkta kullanılmalıdır; renk kodları prompta yazılmayacaktır.

4. DOĞAL PRESTİJLİ REKLAM KAPANIŞI (SIFIR ABSÜRT DEV DUVAR TABELASI, SIFIR BOŞ KORİDOR):
   - KESİNLİKLE bomboş mermer duvara devasa altın kutu tabela veya absürt boş koridor/lobi SAHNELENMEYECEKTİR.
   - Kapanış sahnesi (Sahne 3) gerçek, canlı bir çalışma masası, modern teknoloji ofisi veya ürünün kullanıldığı doğal ortam olmalıdır.
   - Firma adı ve logosu küçük masa levhasında değil, ürün/araç/kıyafet/giriş tabelası gibi doğal marka yüzeylerinde yer alır.
   - Güven veren yönetici veya çalışan kameraya/ekrana bakar, arkada gün batımı ve canlı kurumsal ofis atmosferi görünür. TERTEMİZ DOĞAL REKLAM KAPANIŞI.

5. NATİF TÜRKÇE SPİKER SESLENDİRMESİ (%100 KURALLI TÜRKÇE — SIFIR DEVRİK CÜMLE):
   - KESİNLİKLE DEVRİK, KESİK VEYA FİİLSİZ CÜMLE KULLANILMAYACAKTIR.
   - YASAK YAPILAR (Devrik, çeviri kokan, fiilsiz veya parçalı yapılar):
     * "Yüksek mukavemetli tuğla, fabrikadan doğrudan; teklif alın." (YASAK! Yüklem yok, devrik, kesik)
    - KESİNLİKLE "detaylı bilgi için bize yazın", "detaylı bilgi almak için", "bizimle iletişime geçin" gibi soğuk, klişe, devlet dairesi veya robotik çağrılar KULLANILMAYACAKTIR.
    - ZORUNLU KURAL: Türkçenin doğal kurallı söz dizimine tam uygun (Özne + Nesne/Tümleç + Yüklem sonda), doğrudan ticari fayda (fiyat, sipariş, kampanya, teklif, hızlı teslimat) içeren enerjik reklam kapanışları yapılmalıdır.
    - DOĞRU VE CANLI REKLAM ÖRNEKLERİ:
      * "${brand} kalitesiyle inşaat ve yapı malzemelerinde şantiyenize doğrudan teslimat avantajını yaşayın. Projenize özel toptan fiyat teklifi için hemen WhatsApp ile yazın."
      * "${brand} güvencesiyle yüksek mukavemetli yapı ürünleri projelerinize değer katar. Avantajlı fabrika fiyatlarını öğrenmek için hemen mesaj atın."
      * "${brand} akülü sırt pompası ile bahçenizde ilaçlama yapmak artık çok daha zahmetsiz. Kampanyalı fiyattan yararlanmak için hemen sipariş verin."
      * "${brand} ile hasatta yüksek verimi ve konforu yakalayın. Sezon fırsatını kaçırmadan hemen WhatsApp'tan siparişinizi oluşturun."
    - Uzunluk: 12-16 kelime arasında, tek ana mesaj ve tek net çağrı içermelidir.
    - Format:
    AUDIO: Professional crystal-clear Turkish commercial voiceover spoken ONCE between 0.5s and 5.5s with zero repetition, zero looping, and zero echo: "[12-16 kelimelik %100 kurallı, yüklemi sonda, fayda odaklı akıcı Türkçe replik]". From 5.5s to 8.0s: subtle modern commercial rhythm and natural ambient foley carry the remaining seconds to a polished, confident conclusion with zero voice re-entry.

6. İNSAN, EL VE FİZİK TUTARLILIĞI (GENEL PROMPT 3 KURALLARI):
   - Her kişinin rolü (çalışan, usta veya alıcı) ve yaptığı iş net olmalıdır.
   - Yapay poz, abartılı gülümseme ve kameraya bakış KESİNLİKLE YOKTUR.
   - Eller nesneyi doğal tutmalı, parmaklar nesnenin içinden geçmemeli, ağırlık ve fiziksel temas gerçekçi olmalıdır.

7. KURGU VE PLAN AKIŞI (GENEL PROMPT 1 & 2 KURALLARI):
   - 0.0s - 2.0s: Ürün veya dokuyla ilişkili güçlü açılış (eylem hemen başlar).
   - 2.0s - 5.5s: Gerçek insan etkileşimi, kullanım veya doğrulanmış detay.
   - 5.5s - 8.0s: Marka adı ('${brand}') ve orijinal logo, katı fiziksel yüzeyde en az 2 saniye odakta ve okunur kapanış.

8. SIFIR UYDURMA LOGO & SIFIR TEKNİK JARGON:
   - Tabelaya veya sahneye ASLA 'ALL CAPS', 'TEXT CARD', 'FONT', 'LOGO' gibi teknik komutlar YAZILMAYACAKTIR.
   - Görünür marka yüzeyinde yalnızca firmanın kurumsal adı ('${brand}') ve ekli görseldeki orijinal kurumsal logosu yer alacaktır.
   - KESİNLİKLE uydurma geometrik şekil veya sahte sembol EKLENMEYECEKTİR.

9. ÇIKTI FORMATI:
   - SADECE doğrudan Google Veo'ya yapıştırılacak tek parça prompt metnini yaz. Başka açıklama, selamlama veya tırnak ekleme.

${require('./brand_learning_store.js').buildLearningPromptBlock(brand, product, brief)}`;

    return await new Promise((resolve) => {
      const timeoutTimer = setTimeout(() => {
        try { ws.close(); } catch(e){}
        resolve(null);
      }, 80000);

      ws.onopen = async () => {
        try {
          // Input alanını bekle
          let inputFound = false;
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 600));
            const check = await sendCmd("Runtime.evaluate", {
              expression: `!!(document.querySelector('#prompt-textarea') || document.querySelector('div[contenteditable="true"]'))`,
              returnByValue: true
            });
            if (check?.result?.value) {
              inputFound = true;
              break;
            }
          }

          if (!inputFound) {
            clearTimeout(timeoutTimer);
            ws.close();
            return resolve(null);
          }

          // Eğer firmanın Wizard'dan yüklenmiş kurumsal logosu veya ürün görseli varsa, doğrudan ChatGPT'ye dosya olarak yükle
          let uploadedFilesCount = 0;
          try {
            const filesToUpload = await resolveLocalMediaFiles({
              orgId,
              brandName: company,
              customer: company,
              brandKit,
              productImageUrl,
              logoUrl,
            });

            if (filesToUpload.length > 0) {
              await sendCmd("DOM.enable");
              const doc = await sendCmd("DOM.getDocument", { depth: -1 });
              const nodeRes = await sendCmd("DOM.querySelector", {
                nodeId: doc.root.nodeId,
                selector: 'input#upload-photos, input#upload-files, input[type="file"]'
              });
              if (nodeRes?.nodeId) {
                const filePathsToUpload = filesToUpload.map(f => typeof f === 'string' ? f : (f.path || f));
                console.log(`[VideoGen -> ChatGPT Web] 🖼️ Gerçek kurumsal logo/medya dosyaları yükleniyor:`, filePathsToUpload);
                await sendCmd("DOM.setFileInputFiles", {
                  nodeId: nodeRes.nodeId,
                  files: filePathsToUpload
                });
                uploadedFilesCount = filePathsToUpload.length;
                await new Promise(r => setTimeout(r, 2500));
              }
            }
          } catch (fileUploadErr) {
            console.warn('[VideoGen -> ChatGPT Web] Görsel yükleme hatası (metinle devam ediliyor):', fileUploadErr.message);
          }

          // Textarea'ya odaklan
          await sendCmd("Runtime.evaluate", {
            expression: `(() => {
              const ta = document.querySelector('#prompt-textarea') || document.querySelector('div[contenteditable="true"]');
              if (ta) ta.focus();
            })()`
          });
          await new Promise(r => setTimeout(r, 400));

          // CDP yerel metin enjeksiyonu
          await sendCmd("Input.insertText", { text: gptAskPrompt });
          await new Promise(r => setTimeout(r, 800));

          // Gönder butonunun koordinatlarını al
          const btnCoord = await sendCmd("Runtime.evaluate", {
            expression: `(() => {
              const btn = document.querySelector('button[data-testid="send-button"]') || 
                          document.querySelector('button[aria-label*="Send"]') ||
                          document.querySelector('button[aria-label*="Gönder"]');
              if (btn) {
                const r = btn.getBoundingClientRect();
                return { found: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
              }
              return { found: false };
            })()`,
            returnByValue: true
          });

          if (btnCoord?.result?.value?.found) {
            const { x, y } = btnCoord.result.value;
            console.log(`[VideoGen -> ChatGPT Web] Gönder butonuna tıklandı (${Math.round(x)}, ${Math.round(y)}). Yanıt bekleniyor...`);
            await sendCmd("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
            await sendCmd("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
          } else {
            console.log(`[VideoGen -> ChatGPT Web] Buton bulunamadı, Enter tuşu gönderiliyor...`);
            await sendCmd("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: 13, unmodifiedText: "\r", text: "\r" });
            await sendCmd("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 13 });
          }

          // ChatGPT yanıtını bekle (görsel analizi için yeterli süre tanı)
          let responseText = '';
          for (let i = 0; i < 50; i++) {
            await new Promise(r => setTimeout(r, 1500));
            const checkRes = await sendCmd("Runtime.evaluate", {
              expression: `(() => {
                const stopBtn = document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="durdur"]');
                const isThinking = !!document.querySelector('.result-thinking, [data-testid*="generating"], .streaming-animated-ellipsis');
                const isGenerating = !!stopBtn || isThinking;

                const articles = Array.from(document.querySelectorAll('[data-message-author-role="assistant"], div.markdown'));
                const lastMsg = articles.pop();
                const text = lastMsg ? (lastMsg.innerText || lastMsg.textContent || '').trim() : '';
                return { isGenerating, text };
              })()`,
              returnByValue: true
            });

            const val = checkRes?.result?.value;
            if (val?.text) {
              responseText = val.text;
            }
            if (val && !val.isGenerating && responseText.length > 80) {
              if (isNewChat) {
                try {
                  const urlEval = await sendCmd("Runtime.evaluate", { expression: "window.location.href", returnByValue: true });
                  const currentUrl = urlEval?.result?.value || '';
                  if (currentUrl.includes('/c/')) {
                    const pathParts = currentUrl.split('/');
                    const cIndex = pathParts.indexOf('c');
                    const convId = pathParts[cIndex + 1]?.split('?')[0];
                    const expectedTitle = getExpectedChatTitle(company, 'video');

                    await sendCmd("Runtime.evaluate", {
                      expression: `(async () => {
                        let token = '';
                        try {
                          const sessionRes = await fetch('/api/auth/session');
                          const session = await sessionRes.json();
                          token = session.accessToken;
                        } catch (e) {}
                        const headers = { 'Content-Type': 'application/json' };
                        if (token) headers['Authorization'] = 'Bearer ' + token;
                        const MESAJIFY_PROJECT_ID = 'g-p-6aaf94b0ae20819180ce47c040ff4a59';
                        await fetch('/backend-api/conversation/' + ${JSON.stringify(convId)}, {
                          method: 'PATCH',
                          headers,
                          body: JSON.stringify({
                            title: ${JSON.stringify(expectedTitle)},
                            gizmo_id: MESAJIFY_PROJECT_ID
                          })
                        });
                      })()`,
                      awaitPromise: true
                    });

                    setCompanyChat(company, 'video', currentUrl, expectedTitle);
                    console.log(`[VideoGen -> ChatGPT Web] [Firma: ${company}] Video chat kaydedildi: ${currentUrl}`);
                  }
                } catch (saveErr) {
                  console.warn('[VideoGen -> ChatGPT Web] Video sohbet kaydetme hatası:', saveErr.message);
                }
              }
              clearTimeout(timeoutTimer);
              ws.close();
              console.log(`[VideoGen -> ChatGPT Web] ✅ ChatGPT Web senaryoyu üretti (${responseText.length} karakter)!`);
              return resolve(responseText);
            }
          }

          clearTimeout(timeoutTimer);
          ws.close();
          resolve(responseText.length > 50 ? responseText : null);
        } catch (e) {
          clearTimeout(timeoutTimer);
          try { ws.close(); } catch(err){}
          resolve(null);
        }
      };

      ws.onerror = () => {
        clearTimeout(timeoutTimer);
        resolve(null);
      };
    });
  } catch (err) {
    console.warn(`[VideoGen -> ChatGPT Web] Hata:`, err.message);
    return null;
  } finally {
    if (createdTabId) {
      fetch(`http://127.0.0.1:${port}/json/close/${createdTabId}`).catch(() => {});
    }
  }
}

function attemptGenerateOnCdp(port, tab, options) {
  const {
    fullPrompt,
    brandName,
    subTitle,
    offerTitle,
    offerDetails,
    ctaText,
    primaryColor = '#026009',
    accentColor = '#acfe00',
    includeOverlay = false,
    includeLogo = false,
    includeBanner = false,
    includeCta = false
  } = options;

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let idSeq = 1;

  function sendCmd(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idSeq++;
      const handler = (e) => {
        const data = JSON.parse(e.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return new Promise((resolve, reject) => {
    ws.onopen = async () => {
      try {
        console.log("[VideoGen] Chrome CDP bağlantısı kuruldu.");
        await sendCmd("Page.bringToFront");

        // 1. Her video için kesinlikle YENİ ve TERTEMİZ bir Gemini oturumu aç (Eski video butonlarının karışmasını 100% engeller)
        console.log(`[VideoGen] '${brandName || 'Kampanya'}' için yeni ve bağımsız temiz sohbet başlatılıyor...`);
        await sendCmd("Page.navigate", { url: "https://gemini.google.com/videos" });
        await new Promise(r => setTimeout(r, 3500));

        // Sayfanın ve input kutusunun hazır olmasını bekle
        let inputReady = false;
        for (let i = 0; i < 15; i++) {
          const chk = await sendCmd("Runtime.evaluate", {
            expression: `!!(document.querySelector('div[contenteditable="true"]') || document.querySelector('rich-textarea p') || document.querySelector('textarea'))`,
            returnByValue: true
          });
          if (chk?.result?.value) {
            inputReady = true;
            break;
          }
          await new Promise(r => setTimeout(r, 1000));
        }

        if (!inputReady) {
          throw new Error("Gemini sohbet giriş kutusu yüklenemedi.");
        }

        // Kota / Hız Sınırı (Rate Limit) Kontrolü
        const quotaCheck = await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const text = document.body.innerText || '';
              if (text.includes('video üretme sınırına ulaştınız') || text.includes('video generation limit')) {
                const match = text.match(/(saat.*itibarıyla|Eylül.*itibarıyla|until.*)/i);
                return { isLimited: true, reason: match ? match[0].split('\\n')[0].slice(0, 100) : 'Video kota sınırına ulaşıldı' };
              }
              return { isLimited: false };
            })()
          `,
          returnByValue: true
        });

        if (quotaCheck?.result?.value?.isLimited) {
          ws.close();
          return resolve({
            isLimited: true,
            reason: quotaCheck.result.value.reason || 'Video kota sınırına ulaşıldı'
          });
        }

        // 2. En boy oranını Dikey (9:16) olarak ayarla
        try {
          const aspectRes = await sendCmd("Runtime.evaluate", {
            expression: `
              (function() {
                const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('16:9') || (b.innerText || '').includes('Yatay'));
                if (btn) {
                  const r = btn.getBoundingClientRect();
                  return { found: true, x: r.left + r.width/2, y: r.top + r.height/2 };
                }
                return { found: false };
              })()
            `,
            returnByValue: true
          });

          if (aspectRes?.result?.value?.found) {
            const { x, y } = aspectRes.result.value;
            await sendCmd("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
            await sendCmd("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
            await new Promise(r => setTimeout(r, 800));

            const dikeyCoord = await sendCmd("Runtime.evaluate", {
              expression: `
                (function() {
                  const els = Array.from(document.querySelectorAll('*'));
                  const target = els.find(el => el.children.length === 0 && (
                    (el.innerText || el.textContent || '').trim() === 'Dikey (9:16)' ||
                    (el.innerText || el.textContent || '').trim().includes('9:16') ||
                    (el.innerText || el.textContent || '').trim().toLowerCase().includes('portrait')
                  ));
                  if (target) {
                    const r = target.getBoundingClientRect();
                    return { found: true, x: r.left + r.width/2, y: r.top + r.height/2 };
                  }
                  return { found: false };
                })()
              `,
              returnByValue: true
            });

            if (dikeyCoord?.result?.value?.found) {
              const { x: dx, y: dy } = dikeyCoord.result.value;
              await sendCmd("Input.dispatchMouseEvent", { type: "mousePressed", x: dx, y: dy, button: "left", clickCount: 1 });
              await sendCmd("Input.dispatchMouseEvent", { type: "mouseReleased", x: dx, y: dy, button: "left", clickCount: 1 });
              console.log("[VideoGen] Aspect ratio 9:16 (Dikey) olarak seçildi.");
              await new Promise(r => setTimeout(r, 600));
            } else {
              await sendCmd("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: 27 });
              await sendCmd("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 27 });
            }
          }
        } catch (aspectErr) {
          console.warn("[VideoGen] Aspect ratio seçimi atlandı:", aspectErr.message);
        }

        // Başlangıçtaki indir buton sayısını kaydet (temiz sayfada 0 olmalı)
        const baselineRes = await sendCmd("Runtime.evaluate", {
          expression: `document.querySelectorAll('button[aria-label*="indir" i], button[aria-label*="download" i]').length`,
          returnByValue: true
        });
        const initialDlCount = Number(baselineRes?.result?.value) || 0;
        console.log(`[VideoGen] Sayfa hazır. Başlangıç video/indir butonu sayısı: ${initialDlCount}`);

        // 2.5. Eğer ürün veya logo görseli varsa Gemini inputuna fiziksel dosya olarak doğrudan yükle (Image-to-Video)
        try {
          const filesToUpload = await resolveLocalMediaFiles(options);
          if (filesToUpload.length > 0) {
            console.log(`[VideoGen -> Gemini] 🖼️ Gemini için ${filesToUpload.length} adet somut görsel dosyası hazırlanıyor:`, filesToUpload);

            // 1. input[name="Filedata"] var mı kontrol et
            const checkFiledata = await sendCmd("Runtime.evaluate", {
              expression: `(() => {
                const fd = document.querySelector('input[name="Filedata"]');
                return { hasFiledata: !!fd };
              })()`,
              returnByValue: true
            });

            // 2. Henüz DOM'da input[name="Filedata"] yoksa "+" menüsünü aç ve "Dosya yükleyin" seçeneğine tıkla
            if (!checkFiledata?.result?.value?.hasFiledata) {
              console.log('[VideoGen -> Gemini] 📂 "+" (Yükleme ve araçlar) menüsü açılıyor...');
              await sendCmd("Runtime.evaluate", {
                expression: `(() => {
                  const btn = document.querySelector('button[aria-label*="Yükleme ve araçlar" i]') ||
                              document.querySelector('button mat-icon[data-mat-icon-name="plus"]')?.parentElement ||
                              Array.from(document.querySelectorAll('button')).find(b => {
                                const l = (b.getAttribute('aria-label') || '').toLowerCase();
                                return l.includes('yükleme') || l.includes('araçlar');
                              });
                  if (btn) btn.click();
                })()`
              });
              await new Promise(r => setTimeout(r, 1000));

              console.log('[VideoGen -> Gemini] 📂 "Dosya yükleyin" seçeneği tıklanıyor...');
              await sendCmd("Runtime.evaluate", {
                expression: `(() => {
                  const uploadBtn = Array.from(document.querySelectorAll('button, [role="menuitem"]')).find(b => {
                    const t = (b.innerText || '').toLowerCase();
                    return t.includes('dosya yükle') || t.includes('görsel') || t.includes('resim') || t.includes('upload');
                  }) || document.querySelector('images-files-uploader button');
                  if (uploadBtn) uploadBtn.click();
                })()`
              });
              await new Promise(r => setTimeout(r, 1000));
            }

            // 3. CDP ile input[name="Filedata"] seç
            await sendCmd("DOM.enable");
            const doc = await sendCmd("DOM.getDocument", { depth: -1 });
            let fileInput = await sendCmd("DOM.querySelector", {
              nodeId: doc.root.nodeId,
              selector: 'input[name="Filedata"]'
            });

            if (!fileInput?.nodeId) {
              fileInput = await sendCmd("DOM.querySelector", {
                nodeId: doc.root.nodeId,
                selector: 'input.hidden-file-input, input[type="file"]'
              });
            }

            if (fileInput?.nodeId) {
              console.log(`[VideoGen -> Gemini] 🚀 Somut dosyalar Gemini inputuna aktarılıyor (nodeId: ${fileInput.nodeId})...`);
              await sendCmd("DOM.setFileInputFiles", {
                nodeId: fileInput.nodeId,
                files: filesToUpload
              });
              await sendCmd("Runtime.evaluate", {
                expression: `(() => {
                  const inputs = document.querySelectorAll('input[name="Filedata"], input[type="file"]');
                  inputs.forEach(i => {
                    i.dispatchEvent(new Event('change', { bubbles: true }));
                    i.dispatchEvent(new Event('input', { bubbles: true }));
                  });
                })()`
              });

              console.log(`[VideoGen -> Gemini] ✅ Görseller yüklendi, arayüze ve prompt kutusuna oturması bekleniyor (5sn)...`);
              await new Promise(r => setTimeout(r, 5000));

              // Doğrulama kontrolü: Arayüzde blob görsel önizlemesi oluştu mu?
              const verifyRes = await sendCmd("Runtime.evaluate", {
                expression: `(() => {
                  const img = document.querySelector('img[src^="blob:"], .gem-attachment-style-img, img[alt*="attachment"]');
                  return { attached: !!img, src: img ? img.src.slice(0, 80) : null };
                })()`,
                returnByValue: true
              });
              console.log(`[VideoGen -> Gemini] 📸 Görsel önizleme doğrulandı:`, verifyRes?.result?.value);
            } else {
              console.warn(`[VideoGen -> Gemini] ⚠️ Gemini sayfasında dosya input elementi bulunamadı.`);
            }
          }
        } catch (geminiUpErr) {
          console.warn('[VideoGen -> Gemini] Görsel yükleme uyarısı (metinle devam ediliyor):', geminiUpErr.message);
        }

        // Prompt kutusuna odaklan ve CDP native Input.insertText ile yaz
        await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const inputEl = document.querySelector('div[contenteditable="true"]') || 
                              document.querySelector('rich-textarea p') ||
                              document.querySelector('textarea');
              if (!inputEl) throw new Error("Input element bulunamadı");
              inputEl.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('delete', false, null);
            })()
          `
        });
        await new Promise(r => setTimeout(r, 400));
        await sendCmd("Input.insertText", { text: fullPrompt });
        await new Promise(r => setTimeout(r, 800));
        await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const inputEl = document.querySelector('div[contenteditable="true"]') || 
                              document.querySelector('rich-textarea p') ||
                              document.querySelector('textarea');
              if (inputEl) {
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
              }
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1000));

        // Gönder butonuna tıkla
        const btnRes = await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const btns = Array.from(document.querySelectorAll('button'));
              const sendBtn = btns.find(b => {
                const label = (b.getAttribute('aria-label') || '').toLowerCase();
                const isSend = label.includes('gönder') || label.includes('send') || b.querySelector('mat-icon[data-mat-icon-name="send"]');
                return isSend && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
              });
              if (sendBtn) {
                sendBtn.click();
                const rect = sendBtn.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, found: true, clicked: true };
              }
              return { found: false };
            })()
          `,
          returnByValue: true
        });

        if (btnRes?.result?.value?.found) {
          const { x, y } = btnRes.result.value;
          try {
            await sendCmd("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
            await sendCmd("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
          } catch(e) {}
        } else {
          await sendCmd("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: 13, unmodifiedText: "\\r", text: "\\r" });
          await sendCmd("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 13 });
        }
        console.log("[VideoGen] Full+Full Prompt gönderildi, Veo render bekleniyor...");

        // Video oluşana kadar bekle (max 5 dakika, minimum 25 saniye)
        const startTime = Date.now();
        let downloadReady = false;

        while (Date.now() - startTime < 300000) {
          await new Promise(r => setTimeout(r, 6000));
          const elapsed = Math.round((Date.now() - startTime) / 1000);

          const checkRes = await sendCmd("Runtime.evaluate", {
            expression: `
              (function() {
                const dlBtns = Array.from(document.querySelectorAll('button[aria-label*="indir" i], button[aria-label*="download" i]'));
                const isSpinnerActive = Array.from(document.querySelectorAll('mat-progress-spinner, mat-progress-bar, button[aria-label*="Durdur" i], button[aria-label*="Stop" i]')).length > 0;
                const videos = Array.from(document.querySelectorAll('video'));
                const hasVideo = videos.some(v => v.readyState >= 2 || v.duration > 0 || (v.src && v.src.startsWith('http')));
                const videoUrl = videos.find(v => v.src && v.src.startsWith('http'))?.src || null;
                return { dlCount: dlBtns.length, isSpinnerActive, hasVideo, videoUrl };
              })()
            `,
            returnByValue: true
          });

          const status = checkRes?.result?.value;
          // Veo render tamamlandı: Yeni indir butonu veya geçerli video elementi varsa ve aktif spinner yoksa
          if (status && (status.dlCount > initialDlCount || status.hasVideo) && (!status.isSpinnerActive || status.hasVideo) && elapsed >= 20) {
            console.log(`[VideoGen Port:${port}] Yeni video başarıyla render edildi (${elapsed}s)! İndirme tetikleniyor...`);
            downloadReady = true;
            break;
          }
          if (elapsed >= 12 && elapsed <= 36 && !status?.isSpinnerActive && !status?.hasVideo) {
            console.log(`[VideoGen Port:${port}] ⚠️ Spinner henüz başlamadı, Gönder butonu tekrar tetikleniyor (${elapsed}s)...`);
            try {
              await sendCmd("Runtime.evaluate", {
                expression: `(() => {
                  const btns = Array.from(document.querySelectorAll('button'));
                  const btn = btns.find(b => {
                    const a = (b.getAttribute('aria-label') || '').toLowerCase();
                    return a.includes('mesaj gönder') || a.includes('gönder') || a.includes('send') || b.querySelector('mat-icon[data-mat-icon-name="send"]');
                  }) || document.querySelector('.send-button-container button');
                  if (btn) btn.click();
                })()`
              });
              await sendCmd("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: 13, unmodifiedText: "\\r", text: "\\r" });
              await sendCmd("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 13 });
            } catch(e) {}
          }
          console.log(`[VideoGen Port:${port}] Veo render bekleniyor (${elapsed}s, yeni_buton: ${status?.dlCount ?? 0} > ${initialDlCount}, video_var: ${status?.hasVideo}, aktif_spinner: ${status?.isSpinnerActive})...`);
        }

        if (!downloadReady) {
          ws.close();
          throw new Error("Video üretimi zaman aşımına uğradı (5 dakika).");
        }

        // İndirme dizinini ayarla
        const tempDlDir = `/tmp/gemini_dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        fs.mkdirSync(tempDlDir, { recursive: true });

        await sendCmd("Page.setDownloadBehavior", {
          behavior: "allow",
          downloadPath: tempDlDir
        });

        // En son eklenen 'Videoyu indir' butonuna tıkla
        await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const btns = Array.from(document.querySelectorAll('button[aria-label*="indir" i], button[aria-label*="download" i]'));
              if (btns.length > 0) {
                btns[btns.length - 1].click();
                return true;
              }
              return false;
            })()
          `
        });

        // Dosyanın diske tam olarak inmesini bekle
        let downloadedFile = null;
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 1000));
          if (!fs.existsSync(tempDlDir)) continue;
          const files = fs.readdirSync(tempDlDir).filter(f => f.endsWith('.mp4') && !f.endsWith('.crdownload'));
          if (files.length > 0) {
            const candidate = path.join(tempDlDir, files[0]);
            const sz = fs.statSync(candidate).size;
            if (sz > 500000) { // En az 500 KB (tamamlanmış video dosyası)
              downloadedFile = candidate;
              break;
            }
          }
        }

        ws.close();

        if (!downloadedFile || !fs.existsSync(downloadedFile)) {
          throw new Error("İndirilen video dosyası bulunamadı.");
        }

        console.log(`[VideoGen] Ham video indi: ${downloadedFile} (${(fs.statSync(downloadedFile).size / 1024 / 1024).toFixed(2)} MB)`);

        const videoId = 'video_' + Date.now();
        const rawVideoTarget = path.join(OUTPUT_DIR, `${videoId}_raw.mp4`);
        if (fs.existsSync(downloadedFile)) {
          try {
            // WhatsApp ve mobil cihazlar için faststart (moov atom başta) standardı
            execSync(`ffmpeg -y -i "${downloadedFile}" -c copy -movflags +faststart "${rawVideoTarget}"`, { stdio: 'ignore' });
            if (fs.existsSync(rawVideoTarget)) {
              fs.unlinkSync(downloadedFile);
            } else {
              fs.renameSync(downloadedFile, rawVideoTarget);
            }
          } catch (_) {
            fs.renameSync(downloadedFile, rawVideoTarget);
          }
        }

        // Otonom CapCut Altyazı Giydirme (Gemini videoları)
        const shouldAddSubtitlesGemini = options.subtitles !== false;
        if (shouldAddSubtitlesGemini) {
          try {
            if (processVideoAudioAndSubtitles && fs.existsSync(rawVideoTarget)) {
              console.log(`[VideoGen] 🎬 Gemini videosuna CapCut dinamik altyazı işleniyor...`);
              await processVideoAudioAndSubtitles({
                videoPath: rawVideoTarget,
                engine: 'gemini',
                options: {
                  ...options,
                  brandName: options.brandName || options.customer,
                  productName: options.productName || options.product,
                  chatGptPrompt: options.chatGptPrompt || fullPrompt,
                  veoPrompt: fullPrompt
                }
              });
            }
          } catch (subErr) {
            console.warn('[VideoGen] Gemini altyazı giydirme hatası:', subErr.message);
          }
        } else {
          console.log('[VideoGen] 🚫 options.subtitles=false: Altyazı adımı atlandı (saf video korundu).');
        }

        // 2. Saf Veo Canlı Çekim Video
        const videoFileForThumb = rawVideoTarget;
        const thumbTarget = path.join(OUTPUT_DIR, `${videoId}_thumb.jpg`);
        let thumbUrl = null;
        try {
          execSync(`ffmpeg -y -ss 00:00:01 -i "${videoFileForThumb}" -vframes 1 -q:v 2 "${thumbTarget}"`);
          if (fs.existsSync(thumbTarget)) {
            thumbUrl = `http://${PUBLIC_HOST}:${PORT}/outputs/${videoId}_thumb.jpg`;
            console.log("[VideoGen] Saf Veo Kapak fotoğrafı (thumbnail) oluşturuldu:", thumbTarget);
          }
        } catch (thumbErr) {
          console.warn("[VideoGen] Thumbnail çıkartılırken hata:", thumbErr.message);
        }

        const rawVideoUrl = `http://${PUBLIC_HOST}:${PORT}/outputs/${videoId}_raw.mp4`;
        const capcutFinal = path.join(OUTPUT_DIR, `${videoId}_raw_capcut_final.mp4`);
        const finalUrl = fs.existsSync(capcutFinal)
          ? `http://${PUBLIC_HOST}:${PORT}/outputs/${videoId}_raw_capcut_final.mp4`
          : rawVideoUrl;

        // İsteğe bağlı olarak sadece includeOverlay true ise harici montaj üret (varsayılan: false)
        let campaignUrl = finalUrl;
        if (options.includeOverlay) {
          try {
            const campaignVideoTarget = path.join(OUTPUT_DIR, `${videoId}_campaign.mp4`);
            const brandKit = await getActiveBrandKit(options.orgId, options.brandName || options.customer);
            const brandUpper = (options.brandName || options.customer || brandKit?.organization_name || 'BOFE').toUpperCase();
            const accentColor = (options.accentColor || brandKit?.colors?.accent || '#acfe00').replace('#', '');
            const secondaryColor = (brandKit?.colors?.secondary || '#026009').replace('#', '');
            const fc = `drawbox=x=40:y=1085:w=600:h=75:color=0x25D366:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='WHATSAPP ILE ILETISIME GECIN':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=1108`;
            execSync(`ffmpeg -y -i "${rawVideoTarget}" -vf "${fc}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -movflags +faststart -c:a copy "${campaignVideoTarget}"`);
            if (fs.existsSync(campaignVideoTarget)) {
              campaignUrl = `http://${PUBLIC_HOST}:${PORT}/outputs/${videoId}_campaign.mp4`;
            }
          } catch (mErr) {}
        }

        // Meta JSON dosyasını kaydet (Kullanıcı mesajı, ChatGPT promptu, Veo promptu ve üretim detayları)
        try {
          const metaPath = path.join(OUTPUT_DIR, `${videoId}_meta.json`);
          const metaData = {
            id: videoId,
            filename: `${videoId}_raw.mp4`,
            brand: options.brandName || options.customer || 'Genel Reklam',
            sector: options.sector || 'Genel / Kurumsal',
            userPrompt: options.prompt || options.userPrompt || options.brief || 'İşletme için 9:16 dikey formatta reklam filmi talebi',
            chatGptPrompt: options.chatGptPrompt || fullPrompt,
            veoPrompt: fullPrompt,
            engine: 'Google Veo (Gemini Pro - Ücretsiz)',
            engineBadge: 'Gemini Veo PRO (0 Kredi)',
            creditsCost: 0,
            accountPort: port,
            aspectRatio: '9:16 (Dikey Reels / Story)',
            duration: 10,
            physicalAnchoring: options.anchoring || 'Fiziksel Yüzey Sabitleme (Rigid Surface Anchoring)',
            logoUrl: options.logoUrl || null,
            referenceImageUrl: options.referenceImageUrl || null,
            videoVisualValidation: options.hasVisionAnalysis ? 'analyzed' : 'not_checked',
            createdAt: new Date().toISOString()
          };
          fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));
        } catch (metaErr) {
          console.warn('[VideoGen] Meta json kaydetme hatası:', metaErr.message);
        }

        // /public/ dizinine de kopyala
        execSync(`cp -f ${OUTPUT_DIR}/*.mp4 ${OUTPUT_DIR}/*.jpg ${OUTPUT_DIR}/*.json /app/gateway/public/ 2>/dev/null || true`);

        try {
          recordSuccess(options.brandName || options.customer, {
            product: options.productName || options.product,
            videoId,
            resultNotes: 'Veo ile 9:16 saf canlı sinematik reklam videosu başarıyla üretildi'
          });
        } catch (recErr) {
          console.warn('[VideoGen] LearningStore kaydetme hatası:', recErr.message);
        }

        const cleanUrl = finalUrl.replace(/(_raw|_capcut_final|_final|_sub)?\.mp4$/, '_clean_nosub.mp4');
        resolve({
          success: true,
          isLimited: false,
          port,
          videoId,
          videoUrl: finalUrl,
          subtitledVideoUrl: finalUrl,
          cleanVideoUrl: cleanUrl,
          campaignVideoUrl: campaignUrl,
          thumbnailUrl: thumbUrl,
          duration: 10,
          aspect: "9:16",
          videoVisualValidation: options.hasVisionAnalysis ? 'analyzed' : 'not_checked',
          promptUsed: fullPrompt
        });

      } catch (err) {
        ws.close();
        reject(err);
      }
    };

    ws.onerror = (err) => reject(new Error(`Port ${port} WebSocket hatası: ` + err.message));
  });
}

async function checkPortLoggedIn(port, tab) {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      const timer = setTimeout(() => {
        try { ws.close(); } catch(e){}
        resolve(false);
      }, 2500);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          id: 999,
          method: 'Runtime.evaluate',
          params: {
            expression: `!!(document.querySelector('.user-profile-button, [aria-label*="Google Hesabı"], [aria-label*="Google Account"], [aria-label*="Google-Konto"]') || (!document.querySelector('a[href*="accounts.google.com/ServiceLogin"]') && (document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea'))))`,
            returnByValue: true
          }
        }));
      };

      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.id === 999) {
            clearTimeout(timer);
            resolve(!!d.result?.result?.value);
            ws.close();
          }
        } catch(err) {
          resolve(false);
        }
      };

      ws.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    } catch(err) {
      resolve(false);
    }
  });
}

/**
 * 4 Hesaplı Akıllı Havuz Yöneticisi (Multi-Account Rotation Pool)
 * 1. Hesabı dener; kota sınırındaysa anında 2. hesaba, sonra 3. ve 4. hesaba devreder.
 */
async function generateVideo(options) {
  // Eğer kullanıcı veya sistem doğrudan Google Flow (Veo 3.1) tercih ettiyse doğrudan Flow'u çalıştır!
  if (options.preferredEngine === 'flow' || options.engine === 'flow' || options.useFlow) {
    console.log(`[VideoGen] 🎯 Kullanıcı tercihi doğrultusunda Google Flow (Veo 3.1) motoru doğrudan seçildi.`);
    return await generateVideoOnFlow(options);
  }

  const now = Date.now();

  // Havuzdaki uygun portları seç veya belirtilen portu kullan
  const candidatePorts = options.port ? [Number(options.port)] : CDP_PORTS.filter(p => {
    const st = accountPool[p];
    return !st || !st.limitedUntil || st.limitedUntil <= now;
  }).sort((a, b) => (accountPool[a]?.lastUsed || 0) - (accountPool[b]?.lastUsed || 0));

  if (candidatePorts.length === 0) {
    console.log(`[VideoGen Pool] ⚠️ Bağlı olan tüm Google Gemini hesapları şu an kota sınırında. Otomatik olarak Google Flow (Veo 3.1) motoruna devrediliyor...`);
    return await generateVideoOnFlow(options);
  }

  let lastError = null;

  for (const port of candidatePorts) {
    console.log(`[VideoGen Pool] Port ${port} üzerinden video üretimi deneniyor...`);
    try {
      const listRes = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) });
      if (!listRes.ok) {
        console.warn(`[VideoGen Pool] Port ${port} HTTP yanıtı vermedi, geçiliyor.`);
        continue;
      }

      const targets = await listRes.json();
      const tab = targets.find(t => t.url && t.url.includes("gemini.google.com"));
      if (!tab) {
        console.warn(`[VideoGen Pool] Port ${port} üzerinde açık Gemini sekmesi bulunamadı, sonraki hesaba geçiliyor.`);
        continue;
      }

      // Google hesabı oturum kontrolü (Giriş yapılmamışsa beklemeden anında atla!)
      const isLoggedIn = await checkPortLoggedIn(port, tab);
      if (!isLoggedIn) {
        console.warn(`[VideoGen Pool] ⚠️ Port ${port} üzerinde Google Gemini oturumu AÇIK DEĞİL. Bu hesap atlanıyor.`);
        accountPool[port] = accountPool[port] || {};
        accountPool[port].notLoggedIn = true;
        continue;
      }

      accountPool[port] = accountPool[port] || {};
      accountPool[port].notLoggedIn = false;
      accountPool[port].lastUsed = Date.now();

      let fullPrompt = (options.fullPrompt || options.prompt || '').trim();
      if (!fullPrompt || fullPrompt.length < 30) {
        console.log(`[VideoGen Pool] 🤖 Port ${port} ChatGPT Web sekmesinden reklam promptu isteniyor...`);
        fullPrompt = await generatePromptWithChatGptWeb(port, options);
        if (!fullPrompt) {
          console.log(`[VideoGen Pool] ChatGPT Web promptu oluşturamadı, yerel sinematik şablon devrede.`);
          fullPrompt = await enhanceVideoPrompt(options);
        } else {
          console.log(`[VideoGen Pool] 🎯 ChatGPT Web promptu başarıyla alındı ve Gemini'ye iletiliyor!`);
        }
      } else {
        console.log(`[VideoGen Pool] 🎯 Panelden iletilen prompt doğrudan kullanılıyor (${fullPrompt.length} karakter).`);
      }

      const result = await attemptGenerateOnCdp(port, tab, { ...options, fullPrompt });

      if (result.isLimited) {
        const cooldownMs = 2 * 60 * 60 * 1000; // 2 saatlik bekleme penceresi
        accountPool[port].limitedUntil = Date.now() + cooldownMs;
        accountPool[port].limitReason = result.reason;
        console.warn(`[VideoGen Pool] ⚠️ Port ${port} kota sınırına ulaştı (${result.reason}). Havuzdaki sonraki hesaba otomatik geçiliyor...`);
        continue; // Sonraki hesaba geç!
      }

      // Başarılı!
      accountPool[port].limitedUntil = 0;
      accountPool[port].limitReason = null;
      console.log(`[VideoGen Pool] ✅ Video üretimi başarıyla tamamlandı (Hesap Portu: ${port})!`);
      return result;

    } catch (err) {
      console.error(`[VideoGen Pool] Port ${port} üzerinde hata:`, err.message);
      lastError = err;
    }
  }

  // Eğer tüm Gemini hesapları kota sınırına ulaştıysa veya hata verdiyse Google Flow (Veo 3.1) yedek motoruna otomatik geç!
  console.log(`[VideoGen Pool] 🎬 Gemini havuzu kotada veya yanıt vermedi. Google Flow (Veo 3.1) yüksek kapasiteli yedek motoruna devrediliyor...`);
  try {
    return await generateVideoOnFlow(options);
  } catch (flowErr) {
    console.error(`[VideoGen Pool] Google Flow hatası:`, flowErr.message);
    throw lastError || flowErr;
  }
}

async function saveFlowErrorSnapshot(send, tab, port, reason, diagnosticData = null) {
  try {
    const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 75 });
    const targetDir = fs.existsSync(OUTPUT_DIR) ? OUTPUT_DIR : '/tmp';
    const errImgPath = path.join(targetDir, 'flow_error_proof.jpg');
    fs.writeFileSync(errImgPath, Buffer.from(snap.data, 'base64'));
    console.log(`[Flow Video] 📸 Hata kanıt ekran görüntüsü kaydedildi: ${errImgPath}`);

    if (diagnosticData) {
      const errDiagPath = path.join(targetDir, 'flow_error_diag.json');
      fs.writeFileSync(errDiagPath, JSON.stringify({ reason, timestamp: new Date().toISOString(), data: diagnosticData }, null, 2));
      console.log(`[Flow Video] 📝 Hata tanılaması kaydedildi: ${errDiagPath}`);
    }
  } catch (e) {
    console.warn(`[Flow Video] Hata kanıtı kaydedilirken uyarı:`, e.message);
  }
}

/**
 * Google Flow (Veo 3.1) Video Üretim Motoru
 * Pro hesap ile kota engeline takılmadan aylık kredi havuzundan saf 9:16 ticari video üretir.
 */
async function generateVideoOnFlow(options = {}) {
  const requestStartedAt = Date.now();
  const port = options.port || 9222;
  const projectUrl = options.projectUrl || 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5';
  
  let prompt = (options.fullPrompt || options.prompt || '').trim();
  let dynamicVoiceScript = options.voiceoverText || null;

  if (!prompt || prompt.length < 30) {
    console.log(`[Flow Video] 🤖 Prompt bulunamadı, ChatGPT Web üzerinden reklam senaryosu hazırlanıyor...`);
    prompt = await generatePromptWithChatGptWeb(port, options);
    if (!prompt) {
      console.log(`[Flow Video] ⚠️ ChatGPT Web yanıt vermedi, yerel akıllı reklam motoru devrede.`);
      prompt = await enhanceVideoPrompt(options);
    }
  } else {
    console.log(`[Flow Video] 🎯 Panelden derlenmiş özgün reklam promptu doğrudan kullanılıyor (${prompt.length} karakter).`);
  }

  // ChatGPT çıktısından dinamik seslendirme repliğini çıkar
  const audioMatch = prompt.match(/AUDIO:.*?["“](.*?)["”]/s) ||
                     prompt.match(/SPİKER(?:İN\s+AYNEN\s+SÖYLEYECEĞİ)?.*?:\s*["“]?(.*?)(?:["”\n]|$)/i) ||
                     prompt.match(/SESLENDİRME.*?:\s*["“]?(.*?)(?:["”\n]|$)/i);
  if (audioMatch && audioMatch[1] && audioMatch[1].trim().length >= 10) {
    dynamicVoiceScript = audioMatch[1].replace(/["“”]/g, '').trim();
    console.log(`[Flow Video] 🎙️ ChatGPT'den özgün reklam spikeri repliği ayrıştırıldı: "${dynamicVoiceScript}"`);
  }

  const brand = (options.brandName || options.customer || 'Markamız')
    .replace(/\s*(brand\s*kit|marka\s*kiti|kampanya\s*kiti)\s*/gi, '')
    .trim() || 'Markamız';
  let voiceScript = options.voiceoverText || dynamicVoiceScript || options.script || options.brief || `${brand} ile projelerinize sağlam temel ve üstün dayanıklılık.`;
  voiceScript = voiceScript
    .replace(/\bbrand\s*kit\b/gi, '')
    .replace(/\bmarka\s*kiti\b/gi, '')
    .replace(/\bkampanya\s*kiti\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  options.dynamicVoiceover = voiceScript;
  options.voiceoverText = voiceScript;

  if (options.voiceoverText && prompt && prompt.includes('AUDIO:')) {
    prompt = prompt.replace(
      /AUDIO:\s*Professional crystal-clear Turkish commercial voiceover spoken ONCE between 0.5s and 5.5s with zero repetition, zero looping, and zero echo:\s*"[^"]*"/,
      `AUDIO: Professional crystal-clear Turkish commercial voiceover spoken ONCE between 0.5s and 5.5s with zero repetition, zero looping, and zero echo: "${voiceScript}"`
    );
  }

  if (!/(?:KONUŞMA DİLİ|SPİKERİN AYNEN|SES VE KONUŞMA|ZORUNLU SES DİLİ)/i.test(prompt)) {
    prompt = `KONUŞMA DİLİ TÜRKÇE (tr-TR). Bu üretim sessiz video değildir; aşağıda verilen Türkçe dış ses videoda duyulmalıdır.\n` +
      prompt +
      `\n\nZORUNLU SES DİLİ: TÜRKÇE (tr-TR).\n` +
      `Bu reklamın duyulan konuşması yalnızca Türkçe olsun. Profesyonel, doğal ve akıcı Türkçe konuşan bir reklam spikeri kullan. Aşağıdaki Türkçe metni İngilizceye veya başka bir dile çevirme; yeni cümle, İngilizce slogan, yabancı dilde giriş ya da kapanış ekleme.\n` +
      `SPİKERİN AYNEN SÖYLEYECEĞİ TÜRKÇE METİN: ${voiceScript}\n` +
      `Türkçe anlatım yaklaşık 0,4 saniyede başlasın ve son sözcüğü kesilmeden yaklaşık 7,3 saniyede tamamlansın.`;
  }

  console.log(`[Flow Video] 🎬 Google Flow (Veo 3.1) üzerinden video üretimi başlatılıyor...`);
  const newTabRes = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(projectUrl)}`, { method: 'PUT' });
  const tab = await newTabRes.json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  let msgId = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (m) => {
        const d = JSON.parse(m.toString());
        if (d.id === id) {
          ws.removeListener('message', handler);
          if (d.error) reject(d.error);
          else resolve(d.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sleep(6000);

  // İndirme dizinini yapılandır
  try {
    await send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: OUTPUT_DIR,
      eventsEnabled: true
    });
  } catch(e) {}
  try {
    await send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: OUTPUT_DIR
    });
  } catch(e) {}

  // 1. ProseMirror editörünü odakla
  const targetInfo = await send('Runtime.evaluate', {
    expression: `(() => {
      const pm = document.querySelector('flow-rich-text-editor div.ProseMirror') || document.querySelector('div.ProseMirror');
      if (!pm) return null;
      pm.focus();
      const r = pm.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`,
    returnByValue: true
  });

  if (!targetInfo?.result?.value) {
    ws.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`);
    throw new Error('Google Flow metin editörü (ProseMirror) bulunamadı.');
  }

  const { x, y } = targetInfo.result.value;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(500);

  // 1.2. Kurumsal logo ve ürün görseli varsa somut dosya olarak Flow'a yükle ve prompta çip olarak kilitle
  const filesToUpload = await resolveLocalMediaFiles(options);
  if (filesToUpload.length > 0) {
    console.log(`[Flow Video] 🖼️ Google Flow için ${filesToUpload.length} adet somut görsel hazırlanıyor:`, filesToUpload);

    await send('Page.enable');
    await send('DOM.enable');
    await send('Page.setInterceptFileChooserDialog', { enabled: true });

    let fileChooserResolved = false;
    let fileChooserError = null;

    const fileChooserHandler = async (m) => {
      try {
        const p = JSON.parse(m.toString());
        if (p.method === 'Page.fileChooserOpened') {
          const { backendNodeId, mode } = p.params;
          console.log(`[Flow Video] 📂 CDP FileChooser yakalandı! backendNodeId: ${backendNodeId}, mode: ${mode}`);
          if (!backendNodeId) {
            fileChooserError = new Error('Dosya inputunun backendNodeId degeri alinamadi.');
            return;
          }
          const filePaths = filesToUpload.map(f => f.path || String(f));
          console.log(`[Flow Video] 🚀 Dosyalar toplu olarak aktarılıyor (${filePaths.length} adet):`, filePaths);
          await send('DOM.setFileInputFiles', {
            backendNodeId,
            files: filePaths
          });
          fileChooserResolved = true;
        }
      } catch(fcErr) {
        fileChooserError = fcErr;
      }
    };
    ws.on('message', fileChooserHandler);

    // 0. Varsa önceki prompttan kalan eski çipleri temizle
    console.log(`[Flow Video] 🧹 Varsa önceki çipler temizleniyor...`);
    await send('Runtime.evaluate', {
      expression: `(() => {
        const removeButtons = Array.from(document.querySelectorAll('.prompt-ingredient-bar button, flow-ingredient-bar button, .prompt-top-row button'));
        for (const btn of removeButtons) {
          const t = (btn.innerText || '').toLowerCase();
          const al = (btn.getAttribute('aria-label') || '').toLowerCase();
          if (t.includes('cancel') || t.includes('close') || al.includes('remove') || al.includes('delete')) {
            btn.click();
          }
        }
      })()`
    });
    await sleep(500);

    // 1. '+' (Add ingredients) butonuna tıkla
    const addBtnCoords = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('button[aria-label="Add ingredients to the prompt box"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('add') || b.querySelector('mat-icon')?.innerText === 'add');
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
      })()`,
      returnByValue: true
    });

    if (addBtnCoords?.result?.value) {
      const { x: ax, y: ay } = addBtnCoords.result.value;
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: ax, y: ay, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ax, y: ay, button: 'left', clickCount: 1 });
      await sleep(1500);
    }

    // 2. Üst menüden veya modal içinden Upload seçeneğini tetikle
    await send('Runtime.evaluate', {
      expression: `(() => {
        const upBtn = document.querySelector('button[aria-label="Add media menu"]') || document.querySelector('.sidebar-upload-btn');
        if (upBtn) upBtn.click();
      })()`
    });
    await sleep(800);

    await send('Runtime.evaluate', {
      expression: `(() => {
        const items = Array.from(document.querySelectorAll('button, .mat-mdc-menu-item, [role="menuitem"], span'));
        const upItem = items.find(el => (el.innerText || '').trim() === 'Upload' || (el.innerText || '').toLowerCase().includes('upload media'));
        if (upItem) upItem.click();
      })()`
    });

    // 3. FileChooser olayını bekle
    const fcWaitStart = Date.now();
    while (!fileChooserResolved && Date.now() - fcWaitStart < 15000) {
      if (fileChooserError) throw fileChooserError;
      await sleep(500);
    }
    ws.removeListener('message', fileChooserHandler);

    if (fileChooserResolved) {
      console.log(`[Flow Video] ⏳ Dosyalar Flow'a yüklendi, işlenmesi ve kütüphaneye girmesi bekleniyor...`);
      await sleep(4000);
    }

    // 4. Kütüphanedeki 'Uploads' sekmesine git ve yüklenen görselleri PROMPTA ÇİP OLARAK İLİŞTİR!
    console.log(`[Flow Video] 📌 Yüklenen görseller prompt kutusuna çip (ingredient) olarak iliştiriliyor...`);
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
    await sleep(600);

    await send('Runtime.evaluate', {
      expression: `(() => {
        const navItems = Array.from(document.querySelectorAll('mat-list-item, button, span, div[role="button"]'));
        const uploadsBtn = navItems.find(el => {
          const t = (el.innerText || '').trim().toLowerCase();
          return t === 'uploads' || t.includes('yüklemeler') || t === 'upload';
        });
        if (uploadsBtn) uploadsBtn.click();
      })()`
    });
    await sleep(1500);

    const attachCount = Math.min(filesToUpload.length, 3);
    for (let ci = 0; ci < attachCount; ci++) {
      console.log(`[Flow Video] 📎 Görsel ${ci + 1}/${attachCount} prompt çipine bağlanıyor...`);
      // Varsa açık menüyü kapat
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
      await sleep(500);

      await send('Runtime.evaluate', {
        expression: `(async () => {
          const cards = Array.from(document.querySelectorAll('.tile-row.virtual-item-container, flow-media-tile, div[class*="tile"]'));
          const card = cards[${ci}];
          if (!card) return false;
          const moreBtn = card.querySelector('button[aria-label="More options"]') || card.querySelector('button');
          if (moreBtn) {
            moreBtn.click();
            await new Promise(r => setTimeout(r, 700));
            const items = Array.from(document.querySelectorAll('.mat-mdc-menu-item, [role="menuitem"], button'));
            const addItem = items.find(el => (el.innerText || '').toLowerCase().includes('add to prompt'));
            if (addItem) {
              addItem.click();
              await new Promise(r => setTimeout(r, 800));
              return true;
            }
          }
          return false;
        })()`,
        awaitPromise: true
      });
      await sleep(1200);
    }

    // 5. Çiplerin durumunu doğrula
    console.log(`[Flow Video] 🔍 Prompt çipleri doğrulanıyor...`);
    const checkChipsResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const chips = Array.from(document.querySelectorAll('.prompt-ingredient-bar flow-ingredient-chip, flow-ingredient-bar flow-ingredient-chip'));
        return {
          count: chips.length,
          images: chips.map(c => c.querySelector('img')?.src || '')
        };
      })()`,
      returnByValue: true
    });
    let attachedCount = checkChipsResult?.result?.value?.count || 0;
    console.log(`[Flow Video] 📊 Prompt kutusunda doğrulanan çip sayısı: ${attachedCount} (Beklenen: ${attachCount})`);

    if (attachedCount < attachCount) {
      console.warn(`[Flow Video] ⚠️ Çip sayısı beklenen (${attachCount}) altında kaldı (${attachedCount}), tek tek tekrar deneniyor...`);
      for (let ci = attachedCount; ci < attachCount; ci++) {
        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
        await sleep(500);

        await send('Runtime.evaluate', {
          expression: `(async () => {
            const cards = Array.from(document.querySelectorAll('.tile-row.virtual-item-container, flow-media-tile, div[class*="tile"]'));
            const card = cards[${ci}];
            if (!card) return false;
            const moreBtn = card.querySelector('button[aria-label="More options"]') || card.querySelector('button');
            if (moreBtn) {
              moreBtn.click();
              await new Promise(r => setTimeout(r, 700));
              const items = Array.from(document.querySelectorAll('.mat-mdc-menu-item, [role="menuitem"], button'));
              const addItem = items.find(el => (el.innerText || '').toLowerCase().includes('add to prompt'));
              if (addItem) {
                addItem.click();
                await new Promise(r => setTimeout(r, 800));
                return true;
              }
            }
            return false;
          })()`,
          awaitPromise: true
        });
        await sleep(1200);
      }

      const retryChipsCheck = await send('Runtime.evaluate', {
        expression: `(() => {
          const chips = Array.from(document.querySelectorAll('.prompt-ingredient-bar flow-ingredient-chip, flow-ingredient-bar flow-ingredient-chip'));
          return { count: chips.length };
        })()`,
        returnByValue: true
      });
      attachedCount = retryChipsCheck?.result?.value?.count || 0;
    }

    if (attachedCount === 0) {
      throw new Error(`[Flow Video] KRİTİK HATA: Flow prompt kutusuna hiçbir görsel çipi iliştirilemedi. Üretim görsel referansları olmadan başlatılamaz.`);
    } else if (attachedCount < attachCount) {
      console.warn(`[Flow Video] ⚠️ ${attachedCount}/${attachCount} görsel çipi iliştirildi. Model mevcut çip ile üretime devam ediyor.`);
    } else {
      console.log(`[Flow Video] ✅ ${attachedCount} görsel çipi prompt kutusuna %100 bağlandı.`);
    }
  }

  // 1.3. Açık kalmış olabilecek menü ve modalları kapat
  console.log(`[Flow Video] 🧹 Varsa açık menü veya modallar kapatılıyor...`);
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
  await sleep(600);

  const brandNameForDirective = options.brandName || options.customer || 'Marka';
  const prodNameForDirective = options.productName || options.product || '';
  let productShapeNote = '';
  if (options.productKeyFeature) {
    productShapeNote = ` KRİTİK AYIRT EDİCİ ÖZELLİK: ${options.productKeyFeature}. Bu detay videodaki tüm ürün çekimlerinde kesinlikle net biçimde korunacaktır; aksi formlar veya uydurma malzemeler KESİNLİKLE YASAKTIR.`;
  } else if (prodNameForDirective.toLowerCase().includes('tuğla') || prodNameForDirective.toLowerCase().includes('tugla')) {
    productShapeNote = ' İliştirilmiş tuğla fotoğrafındaki delikli killi blok tuğla formunu, hava deliklerini ve dikey yan oluklarını kesinlikle koru; deliksiz düz tuğlaya veya masif taşa dönüştürme.';
  }

  const hasDetailImage = filesToUpload.some(f => f.role === 'product_detail');
  let detailDirective = '';
  if (hasDetailImage) {
    detailDirective = `\n2. ÜRÜN DETAY AÇISI: İliştirilmiş ikinci ürün detay fotoğrafındaki karakteristik dokuyu, hava deliklerini, olukları ve teknik yüzeyi eksiksiz koru; kamera döndüğünde ürünün bu detaylarını asla kaybetme.`;
  }

  let logoShapeNote = '';
  try {
    const { getActiveBrandKit } = require('./brand_resolver.js');
    const bk = await getActiveBrandKit(options.orgId, brandNameForDirective);
    if (bk && bk.logo_visual_description) {
      logoShapeNote = ` Orijinal kurumsal amblem: ${bk.logo_visual_description}. Masadaki akrilik plaket veya duvardaki tabelada bu kırmızı çatı ve dikey ok amblemi kesinlikle en üstte çizilecektir; yalnızca yazı yazılıp amblem ASLA atlanmayacaktır.`;
    }
  } catch(_) {}

  const logoTargetSurface = options.logoPlacement === 'reception_plaque'
    ? 'ofis masa akrilik/metal isimliğinde'
    : 'tırın/kamyonun pürüzsüz düz beyaz kasa panelinde veya fabrikanın mimari kurumsal tabelasında';

  const mandatoryMediaDirective = `\n\nKESİN GÖRSEL VE MARKA TALİMATI:\n1. ÜRÜN ANA BİÇİMİ: İliştirilmiş ana ürün fotoğrafını ana ürünün görsel referansı olarak kullan. Ürünün fiziksel formunu, rengini ve ayırt edici geometrik yapısını koru.${productShapeNote}${detailDirective}\n${hasDetailImage ? '3' : '2'}. KURUMSAL LOGO: İliştirilmiş kurumsal logo dosyasını marka kimliği referansı olarak kullan. Logoyu yeniden tasarlama, sarı üçgen veya uydurma semboller ekleme.${logoShapeNote} Marka adı "${brandNameForDirective}" olarak doğru yazılsın.\n${hasDetailImage ? '4' : '3'}. SIFIR HATA DÜZ YÜZEY KURALI (ZERO-ERROR FLAT RIGID SURFACE): Model logoyu ASLA kavisli kaportaya, araç şoför kapısına (kulp ve cam eğimi logoyu bozar), araç ön panjuruna veya barete basmayacaktır. Logo yalnızca 1 kez, sıfır hata vereceği ${logoTargetSurface} yer alacaktır.`;

  let finalPrompt = prompt;
  if (!finalPrompt.includes('KESİN GÖRSEL VE MARKA TALİMATI') && filesToUpload.length > 0) {
    finalPrompt = finalPrompt + mandatoryMediaDirective;
  }

  // 1.5. ProseMirror editörünü odakla ve promptu güvenle enjekte et (Çipleri koruyarak)
  console.log(`[Flow Video] ✍️ Prompt editörü odaklanıyor ve metin güvenle yazılıyor...`);
  const writePromptResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const pm = document.querySelector('flow-rich-text-editor div.ProseMirror') || document.querySelector('div.ProseMirror');
      if (!pm) return { ok: false, error: 'ProseMirror editörü DOM içinde bulunamadı.' };
      pm.focus();

      // Ingredient çiplerini koruyarak imleci en sona taşı
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(pm);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);

      // Metni yapıştırma olayıyla enjekte et (ProseMirror ve Angular reaktivitesini tetikler)
      const dt = new DataTransfer();
      dt.setData('text/plain', ${JSON.stringify(finalPrompt)});
      const pasteEvt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      pm.dispatchEvent(pasteEvt);

      // Geri oku ve doğrula
      const currentText = (pm.innerText || '').trim();
      return {
        ok: currentText.length > 20,
        textLength: currentText.length,
        textSnippet: currentText.slice(0, 80)
      };
    })()`,
    returnByValue: true
  });

  if (!writePromptResult?.result?.value?.ok) {
    console.warn(`[Flow Video] Yapıştırma olayı yetersiz kaldı, execCommand ve Input.insertText deneniyor...`);
    await send('Runtime.evaluate', {
      expression: `(() => {
        const pm = document.querySelector('flow-rich-text-editor div.ProseMirror') || document.querySelector('div.ProseMirror');
        if (pm) {
          pm.focus();
          document.execCommand('insertText', false, ${JSON.stringify(finalPrompt)});
        }
      })()`
    });
    await sleep(500);
  }

  // 1.6. Başlangıçtaki mevcut tile'ların imza listesini kaydet (Eski videolarla karışmasını %100 engelle)
  const baselineTiles = await send('Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('.tile, flow-tile, flow-media-tile, div[class*="tile"], div[class*="virtual-item"]'));
      return {
        count: els.length,
        signatures: els.map((el, idx) => el.getAttribute('data-id') || el.id || el.querySelector('video')?.src || (el.innerText || '').slice(0, 40) || String(idx))
      };
    })()`,
    returnByValue: true
  });
  const baselineTileCount = Number(baselineTiles?.result?.value?.count) || 0;
  const initialSignaturesArray = baselineTiles?.result?.value?.signatures || [];

  // 1.7. Üretim öncesi çip ve prompt kanıt ekran görüntüsü al
  try {
    const pregenProof = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    if (pregenProof?.data) {
      const proofPath = path.join(OUTPUT_DIR, 'flow_pregeneration_proof.jpg');
      fs.writeFileSync(proofPath, Buffer.from(pregenProof.data, 'base64'));
      console.log(`[Flow Video] 📸 Üretim öncesi çip ve prompt kanıt ekran görüntüsü kaydedildi: ${proofPath}`);
    }
  } catch (snapErr) {
  }

  // 2. Durum tabanlı buton kontrolü ve bekleme (State Polling)
  console.log(`[Flow Video] 🔍 Üretim butonu ve arayüz durumu kontrol ediliyor...`);
  const inspectFlowStateFn = function () {
    function inspect(el) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const visible = r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const top = visible ? document.elementFromPoint(x, y) : null;
      return {
        tag: el.tagName,
        role: el.getAttribute('role'),
        text: (el.innerText || '').trim().slice(0, 100),
        ariaLabel: el.getAttribute('aria-label'),
        disabled: el.matches(':disabled') || Boolean(el.closest('[aria-disabled="true"], [inert]')),
        visible,
        rect: { x: Math.round(x), y: Math.round(y), w: Math.round(r.width), h: Math.round(r.height) },
        centerReceivesClick: Boolean(top && el.contains(top)),
        coveringElement: top ? { tag: top.tagName, role: top.getAttribute('role'), className: String(top.className).slice(0, 150) } : null
      };
    }
    const btn = document.querySelector('button[aria-label="Start generation"]') ||
                document.querySelector('flow-generate-icon-button button') ||
                Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('arrow_forward') || b.querySelector('mat-icon')?.innerText === 'arrow_forward');
    const pm = document.querySelector('flow-rich-text-editor div.ProseMirror') || document.querySelector('div.ProseMirror');
    const dialogs = [...document.querySelectorAll('[role="dialog"], [role="menu"], mat-dialog-container, .cdk-overlay-pane')].map(inspect).filter(d => d.visible);
    return {
      editorTextLength: pm ? (pm.innerText || '').trim().length : 0,
      button: btn ? inspect(btn) : null,
      openDialogs: dialogs
    };
  };

  let readyState = null;
  const pollStart = Date.now();
  while (Date.now() - pollStart < 15000) {
    const diag = await send('Runtime.evaluate', {
      expression: `(${inspectFlowStateFn.toString()})()`,
      returnByValue: true
    });
    readyState = diag?.result?.value;

    if (readyState?.button && !readyState.button.disabled && readyState.button.visible) {
      break;
    }

    // Açık engelleyici dialog/menu varsa Escape ile kapat
    if (readyState?.openDialogs && readyState.openDialogs.length > 0) {
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
    }

    await sleep(600);
  }

  // Hata durumlarını açık ve net olarak ayır
  if (!readyState?.button) {
    await saveFlowErrorSnapshot(send, tab, port, 'button_not_found', readyState);
    throw new Error('Google Flow video üretim başlatma butonu DOM içinde bulunamadı.');
  }
  if (!readyState.button.visible) {
    await saveFlowErrorSnapshot(send, tab, port, 'button_hidden', readyState);
    throw new Error('Google Flow video üretim butonu DOM içinde mevcut ancak görünür değil.');
  }
  if (readyState.button.disabled) {
    await saveFlowErrorSnapshot(send, tab, port, 'button_disabled', readyState);
    throw new Error(`Google Flow üretim butonu pasif (disabled: true). Editör metin uzunluğu: ${readyState.editorTextLength}. Lütfen promptun ve görsellerin işlenmesini kontrol edin.`);
  }

  // 2.9. Üretim öncesi mevcut medya durumunu kaydet (Eski videoyu yeni sanma hatasını %100 önler)
  const pregenMediaInfo = await send('Runtime.evaluate', {
    expression: `(() => {
      const v = document.querySelector('flow-preview-panel video') ||
                document.querySelector('flow-video-player video') ||
                document.querySelector('.player-container video') ||
                document.querySelector('video[src]') ||
                document.querySelector('video');
      const allVideos = Array.from(document.querySelectorAll('video')).map(el => el.currentSrc || el.src || '');
      return {
        currentSrc: v ? (v.currentSrc || v.src || '') : '',
        allSrcs: allVideos.filter(Boolean),
        tileCount: document.querySelectorAll('.tile, flow-tile, flow-media-tile, div[class*="tile"]').length
      };
    })()`,
    returnByValue: true
  });
  const initialVideoSrc = pregenMediaInfo?.result?.value?.currentSrc || '';
  const initialKnownSrcs = new Set(pregenMediaInfo?.result?.value?.allSrcs || []);
  const initialTileCount = pregenMediaInfo?.result?.value?.tileCount || 0;
  console.log(`[Flow Video] 🔎 Üretim öncesi mevcut video src: ${initialVideoSrc.slice(0, 60)}... (${initialKnownSrcs.size} bilinen video, ${initialTileCount} tile)`);

  // 3. Üretimi başlat butonuna tıkla (Hem DOM hem CDP)
  console.log(`[Flow Video] 🚀 Üretim başlatma butonuna tıklanıyor:`, readyState.button.rect);
  const { x: bx, y: by } = readyState.button.rect;

  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label="Start generation"]') ||
                  document.querySelector('flow-generate-icon-button button');
      if (btn) btn.click();
    })()`
  });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: bx, y: by, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bx, y: by, button: 'left', clickCount: 1 });
  console.log(`[Flow Video] Üretim başlatıldı! Onay ve render kontrolü yapılıyor...`);

  // 4. Onay penceresi çıkarsa otomatik onayla
  await sleep(4000);
  await send('Runtime.evaluate', {
    expression: `(() => {
      const allEls = Array.from(document.querySelectorAll('button, .action-button, [role="button"], span.option-label'));
      const app = allEls.find(el => (el.innerText || '').trim() === 'Always approve' || (el.innerText || '').trim() === 'Approve');
      if (app) app.click();
    })()`
  });

  // 5. Video renderını bekle (en fazla 260 saniye)
  let videoRenderDone = false;
  const startTime = Date.now();
  await sleep(15000); // İlk 15 saniye yeni render oturma payı

  while (Date.now() - startTime < 260000) {
    await sleep(6000);
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    const checkRender = await send('Runtime.evaluate', {
      expression: `(() => {
        const spinners = document.querySelectorAll('mat-spinner, [role="progressbar"], .loading, svg[class*="spin"], [aria-label*="generating" i]');
        const bodyText = (document.body.innerText || '').toLowerCase();
        const isGenerating = spinners.length > 0 || bodyText.includes('generating') || bodyText.includes('rendering');

        const v = document.querySelector('flow-preview-panel video') ||
                  document.querySelector('flow-video-player video') ||
                  document.querySelector('.player-container video') ||
                  document.querySelector('video[src]') ||
                  document.querySelector('video');
        const currentSrc = v ? (v.currentSrc || v.src || '') : '';
        const tiles = document.querySelectorAll('.tile, flow-tile, flow-media-tile, div[class*="tile"], div[class*="virtual-item"]');

        return {
          status: isGenerating ? 'rendering' : 'ready',
          elapsed: ${elapsed},
          isGenerating,
          currentSrc,
          tileCount: tiles.length
        };
      })()`,
      returnByValue: true
    });

    const res = checkRender?.result?.value;
    const isNewVideo = (res?.currentSrc && !initialKnownSrcs.has(res.currentSrc)) || (res?.tileCount > initialTileCount);

    if (res && !res.isGenerating && elapsed >= 35 && (isNewVideo || elapsed >= 90)) {
      videoRenderDone = true;
      console.log(`[Flow Video] 🎬 Video renderı başarıyla tamamlandı (${elapsed} sn)! İndirme aşamasına geçiliyor...`);
      await sleep(2500);
      break;
    } else {
      console.log(`[Flow Video] ⏳ Render devam ediyor (${elapsed} sn, aktif üretim: ${res?.isGenerating ?? true}, yeni video hazır mı: ${Boolean(isNewVideo)})...`);
    }
  }

  if (!videoRenderDone) {
    ws.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`);
    throw new Error('Google Flow video render işlemi zaman aşımına uğradı (260sn).');
  }

  // 5.5 Download davranışını ayarla (Dosyaların OUTPUT_DIR'e inmesini garantile)
  try {
    await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: OUTPUT_DIR });
  } catch(e) {}
  try {
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUTPUT_DIR, eventsEnabled: true });
  } catch(e) {}

  // 5.6 İndirme öncesi artık veya yarım dosyaları temizle
  try {
    const staleFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.crdownload') || f === 'download');
    for (const sf of staleFiles) {
      try { fs.unlinkSync(path.join(OUTPUT_DIR, sf)); } catch(_) {}
    }
  } catch(_) {}

  // 5.7 Yeni üretilen en son tile'ı seç (odakla)
  try {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const tiles = Array.from(document.querySelectorAll('.tile, flow-tile, flow-media-tile, div[class*="tile"], div[class*="virtual-item"]'));
        if (tiles.length > 0) {
          const lastTile = tiles[tiles.length - 1];
          lastTile.scrollIntoView({ behavior: 'instant', block: 'center' });
          lastTile.click();
          const videoEl = lastTile.querySelector('video');
          if (videoEl) videoEl.click();
        }
      })()`
    });
    await sleep(1200);
  } catch(_) {}

  // 8. Dosya ve thumbnail dosya yollarını hazırla
  const timestamp = Date.now();
  const videoId = options.videoId || options.id || `flow_${timestamp}`;
  const rawFileName = `video_${timestamp}_flow.mp4`;
  const thumbFileName = `video_${timestamp}_flow_thumb.jpg`;
  const rawPath = path.join(OUTPUT_DIR, rawFileName);
  const thumbPath = path.join(OUTPUT_DIR, thumbFileName);
  const jobDownloadDir = path.join(OUTPUT_DIR, `dl_${timestamp}_${videoId}`);

  // 5.8 DOĞRUDAN OYNATICIDAKİ AKTİF VİDEOYU YAKALA (Direct Video Element Stream / Blob)
  let capturedDirectly = false;
  try {
    console.log(`[Flow Video] 🎬 Flow oynatıcısındaki aktif video doğrudan yakalanıyor...`);
    const captureRes = await send('Runtime.evaluate', {
      expression: `(async () => {
        // En son üretilen video tile'ını bul ve oynatıcıya yükle
        const tiles = Array.from(document.querySelectorAll('.tile, flow-tile, flow-media-tile, div[class*="tile"], div[class*="virtual-item"]'));
        if (tiles.length > 0) {
          const lastTile = tiles[tiles.length - 1];
          lastTile.scrollIntoView({ behavior: 'instant', block: 'center' });
          lastTile.click();
          await new Promise(r => setTimeout(r, 800));
        }

        const v = document.querySelector('flow-preview-panel video') ||
                  document.querySelector('flow-video-player video') ||
                  document.querySelector('.player-container video') ||
                  document.querySelector('video[src]') ||
                  document.querySelector('video');
        if (!v) return { found: false, reason: 'video_element_not_found' };
        const src = v.currentSrc || v.src;
        if (!src) return { found: false, reason: 'no_src' };
        
        try {
          const res = await fetch(src);
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ found: true, size: blob.size, src, dataUrl: reader.result });
            reader.onerror = () => resolve({ found: false, reason: 'blob_read_error' });
            reader.readAsDataURL(blob);
          });
        } catch (fetchErr) {
          return { found: false, src, reason: fetchErr.message };
        }
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const capVal = captureRes?.result?.value;
    const isActuallyNew = capVal?.src && !initialKnownSrcs.has(capVal.src);
    if (capVal?.found && capVal.dataUrl && capVal.dataUrl.includes(',') && (isActuallyNew || initialKnownSrcs.size === 0)) {
      const base64Data = capVal.dataUrl.split(',')[1];
      const videoBuffer = Buffer.from(base64Data, 'base64');
      if (videoBuffer.length > 300000) {
        fs.writeFileSync(rawPath, videoBuffer);
        console.log(`[Flow Video] 🎯 EKRANDAKİ GERÇEK YENİ VİDEO DOĞRUDAN YAKALANDI VE YAZILDI (${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB)!`);
        capturedDirectly = true;
      }
    } else {
      console.log(`[Flow Video] Doğrudan video yakalama sonucu (yeni video mu: ${Boolean(isActuallyNew)}):`, capVal);
    }
  } catch (directCapErr) {
    console.warn(`[Flow Video] Doğrudan video yakalama uyarısı:`, directCapErr.message);
  }

  // 6. Download butonuna tıkla (Doğrudan yakalanamadıysa yedek yol)
  let downloadTriggered = false;
  if (!capturedDirectly) {
    // 6.1. Öncelikle en son üretilen videonun play butonuna/tile'ına tıkla ki medya görüntüleyici açılsın
    console.log(`[Flow Video] 🎬 En son üretilen video kartı açılıyor...`);
    try {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const playBadges = Array.from(document.querySelectorAll('.play-icon-badge, [class*="play-badge"]'));
          if (playBadges.length > 0) {
            playBadges[playBadges.length - 1].click();
            return { ok: true, type: 'playBadge' };
          }
          const tiles = Array.from(document.querySelectorAll('flow-media-tile, .tile-row.virtual-item-container, [class*="tile"]'));
          if (tiles.length > 0) {
            tiles[tiles.length - 1].click();
            return { ok: true, type: 'tile' };
          }
          return { ok: false };
        })()`,
        returnByValue: true
      });
      await sleep(1500);
    } catch (_) {}

    // 6.2. DOĞRUDAN STREAM İNDİRME: Video elementinden session çerezleriyle MP4'ü direkt çek
    try {
      const vidInfo = await send('Runtime.evaluate', {
        expression: `(() => {
          const v = document.querySelector('video');
          return v && v.currentSrc && v.currentSrc.startsWith('http') ? v.currentSrc : '';
        })()`,
        returnByValue: true
      });
      const streamUrl = vidInfo?.result?.value;
      if (streamUrl) {
        console.log(`[Flow Video] ⚡ Doğrudan video stream URL bulundu: ${streamUrl.slice(0, 80)}...`);
        const cookiesRes = await send('Network.getCookies', { urls: ['https://flow.google.com'] });
        const cookies = (cookiesRes?.cookies || []).map(c => `${c.name}=${c.value}`).join('; ');
        const fetchRes = await fetch(streamUrl, {
          headers: {
            'Cookie': cookies,
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'Referer': 'https://flow.google.com/'
          }
        });
        if (fetchRes.ok) {
          const streamBuf = Buffer.from(await fetchRes.arrayBuffer());
          if (streamBuf.length > 500000) {
            fs.writeFileSync(rawPath, streamBuf);
            console.log(`[Flow Video] 🎯 DOĞRUDAN STREAM İNDİRME BAŞARILI (${(streamBuf.length / (1024 * 1024)).toFixed(2)} MB) -> ${rawFileName}`);
            capturedDirectly = true;
          }
        }
      }
    } catch (streamErr) {
      console.warn('[Flow Video] Stream indirme uyarısı:', streamErr.message);
    }

    // 6.3. İZOLE VE GÜVENİLİR CDP İNDİRME BORU HATTI
    if (!fs.existsSync(jobDownloadDir)) {
      fs.mkdirSync(jobDownloadDir, { recursive: true });
    }

    let downloadGuid = null;
    let downloadState = null;
    let suggestedFilename = null;
    let totalBytes = 0;
    let receivedBytes = 0;

    const cdpDownloadHandler = (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'Browser.downloadWillBegin') {
          downloadGuid = msg.params.guid;
          suggestedFilename = msg.params.suggestedFilename;
          console.log(`[Flow Video] 📥 [CDP] downloadWillBegin: guid=${downloadGuid}, dosya=${suggestedFilename}`);
        } else if (msg.method === 'Browser.downloadProgress') {
          if (!downloadGuid || msg.params.guid === downloadGuid) {
            downloadState = msg.params.state;
            totalBytes = msg.params.totalBytes;
            receivedBytes = msg.params.receivedBytes;
            if (downloadState === 'completed') {
              console.log(`[Flow Video] ✅ [CDP] İndirme tamamlandı (${receivedBytes} bytes)`);
            }
          }
        }
      } catch (_) {}
    };
    ws.on('message', cdpDownloadHandler);

    try {
      await send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: jobDownloadDir,
        eventsEnabled: true
      });
    } catch (bhErr) {
      console.warn('[Flow Video] setDownloadBehavior uyarısı:', bhErr.message);
    }

    // YÖNTEM A: Sahne içi doğrudan "Download media" butonu (asla proje düzeyi export butonunu tıklama!)
    for (let b = 0; b < 6; b++) {
      const dlBtn = await send('Runtime.evaluate', {
        expression: `(() => {
          // Kesin kural: YALNIZCA sahne içi "Download media" butonunu hedefle (asla proje düzeyi export butonunu değil!)
          const btn = document.querySelector('button[aria-label="Download media"]') ||
                      Array.from(document.querySelectorAll('button')).find(b => {
                        const al = (b.getAttribute('aria-label') || '').toLowerCase();
                        const t = (b.innerText || '').trim().toLowerCase();
                        return (al === 'download media' || t === 'download media') && b.getBoundingClientRect().width > 0;
                      });
          if (btn) {
            const r = btn.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              return { x: r.left + r.width/2, y: r.top + r.height/2 };
            }
          }
          return null;
        })()`,
        returnByValue: true
      });

      if (dlBtn?.result?.value) {
        console.log(`[Flow Video] 📥 Sahne indirme butonu bulundu, tıklanıyor (${dlBtn.result.value.x}, ${dlBtn.result.value.y})...`);
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dlBtn.result.value.x, y: dlBtn.result.value.y, button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dlBtn.result.value.x, y: dlBtn.result.value.y, button: 'left', clickCount: 1 });
        await sleep(1200);

        // 720p veya Orijinal boyut seçeneğini tıkla
        const popupRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const items = Array.from(document.querySelectorAll('.mat-mdc-menu-item, [role="menuitem"], button'));
            const opt = items.find(e => {
              const label = e.querySelector('.label')?.innerText?.trim();
              const caption = e.querySelector('.caption')?.innerText?.toLowerCase();
              const text = (e.innerText || '').toLowerCase();
              return (label === '720p' || text.includes('720p') || caption?.includes('orijinal') || text.includes('orijinal boyut') || text.includes('original size')) && e.getBoundingClientRect().width > 0;
            });
            if (opt) {
              const r = opt.getBoundingClientRect();
              return { found: true, x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
            }
            return { found: false };
          })()`,
          returnByValue: true
        });

        if (popupRes?.result?.value?.found) {
          const { x, y } = popupRes.result.value;
          console.log(`[Flow Video] 📥 720p Orijinal boyut seçeneği tıklandı (${x}, ${y})...`);
          await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
          await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
          downloadTriggered = true;
          break;
        } else {
          await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 706, y: 141, button: 'left', clickCount: 1 });
          await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 706, y: 141, button: 'left', clickCount: 1 });
          downloadTriggered = true;
          break;
        }
      }
      await sleep(1000);
    }

    // YÖNTEM B: More options menüsünden İndir -> 720p Orijinal boyut (Tile üç nokta menüsü)
    if (!downloadTriggered) {
      console.log(`[Flow Video] 📥 Üst buton bulunamadı, More Options menüsü deneniyor...`);
      const moreRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button[aria-label="More options"], button[aria-label*="seçenek"], button[aria-label*="options"]'));
          const tileBtn = btns.find(b => {
            const r = b.getBoundingClientRect();
            return r.width > 15 && r.width < 50 && r.top > 0;
          });
          if (tileBtn) {
            tileBtn.click();
            return true;
          }
          return false;
        })()`,
        returnByValue: true
      });

      if (moreRes?.result?.value) {
        await sleep(1000);
        const menuRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const items = Array.from(document.querySelectorAll('.mat-mdc-menu-panel [role="menuitem"], .mat-mdc-menu-item, [role="menuitem"]'));
            const dl = items.find(i => {
              const t = (i.innerText || '').toLowerCase();
              return (t.includes('indir') || t.includes('download')) && i.getBoundingClientRect().width > 0;
            });
            if (dl) {
              const r = dl.getBoundingClientRect();
              return { found: true, x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
            }
            return { found: false };
          })()`,
          returnByValue: true
        });

        if (menuRes?.result?.value?.found) {
          const { x, y } = menuRes.result.value;
          console.log(`[Flow Video] 📥 'İndir' menü seçeneği bulundu (${x}, ${y}), açılıyor...`);
          await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
          await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
          await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
          await sleep(1000);

          const sub720Res = await send('Runtime.evaluate', {
            expression: `(() => {
              const items = Array.from(document.querySelectorAll('.mat-mdc-menu-panel [role="menuitem"], .mat-mdc-menu-item, [role="menuitem"]'));
              const btn = items.find(el => {
                const label = el.querySelector('.label')?.innerText?.trim();
                const caption = el.querySelector('.caption')?.innerText?.toLowerCase();
                const text = (el.innerText || '').toLowerCase();
                return (label === '720p' || text.includes('720p') || caption?.includes('orijinal') || text.includes('orijinal boyut') || text.includes('original size')) && el.getBoundingClientRect().width > 0;
              });
              if (btn) {
                const r = btn.getBoundingClientRect();
                return { found: true, x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
              }
              return { found: false };
            })()`,
            returnByValue: true
          });

          if (sub720Res?.result?.value?.found) {
            const { x: sx, y: sy } = sub720Res.result.value;
            console.log(`[Flow Video] 🎯 Submenu 720p Orijinal boyut butonuna tıklandı (${sx}, ${sy})!`);
            await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: sx, y: sy, button: 'left', clickCount: 1 });
            await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: sx, y: sy, button: 'left', clickCount: 1 });
            downloadTriggered = true;
          }
        }
      }
    }

    console.log(`[Flow Video] 📥 İndirme tetiklendi, CDP olayının tamamlanması bekleniyor...`);
    for (let w = 0; w < 40; w++) {
      await sleep(1000);
      if (downloadState === 'completed') {
        console.log(`[Flow Video] 🎯 CDP downloadState=completed (${w} sn)!`);
        break;
      }
      if (downloadState === 'canceled') {
        console.warn(`[Flow Video] ⚠️ CDP downloadState=canceled!`);
        break;
      }
      if (fs.existsSync(jobDownloadDir)) {
        const dlFiles = fs.readdirSync(jobDownloadDir).filter(f => !f.endsWith('.crdownload'));
        if (dlFiles.length > 0 && fs.statSync(path.join(jobDownloadDir, dlFiles[0])).size > 300000) {
          console.log(`[Flow Video] 🎯 jobDownloadDir dosya tespit edildi (${w} sn): ${dlFiles[0]}`);
          break;
        }
      }
    }
  }

  // İndirme bittikten sonra tab'ı kapat
  try { ws.close(); } catch(e){}
  try { await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`); } catch(e){}

  if (!capturedDirectly && fs.existsSync(jobDownloadDir)) {
    const downloadedFiles = fs.readdirSync(jobDownloadDir).filter(f => !f.endsWith('.crdownload'));
    for (const f of downloadedFiles) {
      const candidatePath = path.join(jobDownloadDir, f);
      const stat = fs.statSync(candidatePath);
      if (stat.size > 300000) {
        if (f.endsWith('.zip')) {
          console.log(`[Flow Video] 📦 Zip dosyası tespit edildi, tekil sahne MP4 ayıklanıyor...`);
          const extractDir = path.join(jobDownloadDir, 'extracted');
          fs.mkdirSync(extractDir, { recursive: true });
          try {
            const { execSync } = require('child_process');
            execSync(`python3 -c "import zipfile; zipfile.ZipFile('${candidatePath}').extractall('${extractDir}')" 2>/dev/null || unzip -o "${candidatePath}" -d "${extractDir}" 2>/dev/null`, { stdio: 'ignore' });
            const extractedMp4s = fs.readdirSync(extractDir).filter(x => x.toLowerCase().endsWith('.mp4'));
            if (extractedMp4s.length > 0) {
              const best = path.join(extractDir, extractedMp4s[0]);
              fs.copyFileSync(best, rawPath);
              capturedDirectly = true;
              console.log(`[Flow Video] 📦 Zip içinden video çıkarıldı -> ${rawFileName}`);
              break;
            }
          } catch (zErr) {
            console.warn('[Flow Video] Zip ayıklama hatası:', zErr.message);
          }
        } else {
          fs.copyFileSync(candidatePath, rawPath);
          capturedDirectly = true;
          console.log(`[Flow Video] 🎯 İndirilen video diske başarıyla yazıldı (${(stat.size / 1024 / 1024).toFixed(2)} MB) -> ${rawFileName}`);
          break;
        }
      }
    }
    try { fs.rmSync(jobDownloadDir, { recursive: true, force: true }); } catch (_) {}
  }

    // 🛡️ GÜVENLİK KONTROLÜ: rawPath diske yazılmadıysa extractDir veya outputs'tan en yeni MP4'ü bul
    if (!fs.existsSync(rawPath)) {
      const extractDir = path.join(OUTPUT_DIR, `unzip_${timestamp}`);
      if (fs.existsSync(extractDir)) {
        const fallbackCandidates = fs.readdirSync(extractDir)
          .filter(f => f.toLowerCase().endsWith('.mp4'))
          .map(f => path.join(extractDir, f))
          .filter(p => fs.statSync(p).size > 500000);
        if (fallbackCandidates.length > 0) {
          fallbackCandidates.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
          fs.copyFileSync(fallbackCandidates[0], rawPath);
          console.log(`[Flow Video] 🛡️ Emniyet Kopyası: Extract dizinindeki en büyük MP4 rawPath'e aktarıldı: ${fallbackCandidates[0]}`);
        }
      }
    }

    if (!fs.existsSync(rawPath)) {
      const allOutputsMp4 = fs.readdirSync(OUTPUT_DIR)
        .filter(f => f.toLowerCase().endsWith('.mp4') && f !== rawFileName && !f.startsWith('temp_'))
        .map(f => ({ path: path.join(OUTPUT_DIR, f), time: fs.statSync(path.join(OUTPUT_DIR, f)).mtimeMs, size: fs.statSync(path.join(OUTPUT_DIR, f)).size }))
        .filter(f => f.size > 500000)
        .sort((a, b) => b.time - a.time);
      const recentOutputs = allOutputsMp4.filter(f => f.time >= requestStartedAt);
      if (recentOutputs.length > 0) {
        fs.copyFileSync(recentOutputs[0].path, rawPath);
        console.log(`[Flow Video] 🛡️ Emniyet Kopyası: Bu üretim döngüsünde inen taze MP4 rawPath'e aktarıldı: ${recentOutputs[0].path}`);
      }
    }

    if (!fs.existsSync(rawPath)) {
      throw new Error(`Google Flow video dosyası diske yazılamadı (${rawFileName}). İndirme veya arşiv çıkarma başarısız.`);
    }

  // 8.1 Otonom Nöral Türkçe Seslendirme / Natif Veo Sesi + Milisaniyelik CapCut Altyazı
  const shouldAddSubtitlesFlow = options.subtitles !== false;
  if (shouldAddSubtitlesFlow) {
    try {
      if (processVideoAudioAndSubtitles && fs.existsSync(rawPath)) {
        console.log(`[Flow Video] 🎙️ Flow videosuna CapCut Senkron Altyazı işleniyor...`);
        await processVideoAudioAndSubtitles({
          videoPath: rawPath,
          engine: 'flow',
          options: {
            ...options,
            keepNativeAudio: options.keepNativeAudio !== false, // Varsayılan: Natif Veo spiker sesini koru!
            brandName: options.brandName || options.customer,
            productName: options.productName || options.product,
            chatGptPrompt: options.chatGptPrompt || prompt,
            veoPrompt: prompt
          }
        });
      }
    } catch (flowSubErr) {
      console.warn('[Flow Video] Flow altyazı/seslendirme giydirme hatası:', flowSubErr.message);
    }
  } else {
    console.log('[Flow Video] 🚫 options.subtitles=false: Altyazı adımı atlandı (saf video korundu).');
  }

  // 8.2 Marka Kiti, Logo ve CTA Overlay Giydirme
  // Saf Veo videosunun üzerine marka logosu, renk kiti ve WhatsApp CTA katmanı yerleştirilir.
  const cleanNosubPath = rawPath.replace(/(_capcut_final|_final|_sub)?\.mp4$/, '_clean_nosub.mp4');
  if (fs.existsSync(rawPath) && !fs.existsSync(cleanNosubPath)) {
    try { fs.copyFileSync(rawPath, cleanNosubPath); } catch(_) {}
  }

  if (options.includeOverlay === true && fs.existsSync(rawPath)) {
    try {
      const brandKit = await getActiveBrandKit(options.orgId, options.brandName || options.customer);
      const brandName = (options.brandName || options.customer || brandKit?.organization_name || 'İşletme').trim();
      const accentColor = (options.accentColor || brandKit?.colors?.accent || '#acfe00').replace('#', '');
      const secondaryColor = (options.primaryColor || brandKit?.colors?.secondary || brandKit?.colors?.primary || '#026009').replace('#', '');
      const ctaText = (options.ctaText || 'WHATSAPP İLE İLETİŞİME GEÇİN').toUpperCase().replace(/['"]/g, '');

      // Logo yolu çözümü
      let logoCandidate = options.logoUrl || brandKit?.logo_path;
      let localLogoPath = null;
      if (logoCandidate) {
        if (logoCandidate.startsWith('/')) {
          const testP = path.join(OUTPUT_DIR, path.basename(logoCandidate));
          if (fs.existsSync(testP)) localLogoPath = testP;
        } else if (fs.existsSync(path.join(OUTPUT_DIR, path.basename(logoCandidate)))) {
          localLogoPath = path.join(OUTPUT_DIR, path.basename(logoCandidate));
        }
      }
      if (!localLogoPath) {
        const bofeWhite = path.join(__dirname, 'bofe_logo_clean_white.png');
        const bofeStd = path.join(OUTPUT_DIR, 'bofe_logo.png');
        if (brandName.toLowerCase().includes('bofe')) {
          localLogoPath = fs.existsSync(bofeWhite) ? bofeWhite : (fs.existsSync(bofeStd) ? bofeStd : null);
        }
      }

      const tempOverlayOut = path.join(OUTPUT_DIR, `temp_overlay_${timestamp}.mp4`);
      let filterComplex = '';

      if (localLogoPath && fs.existsSync(localLogoPath)) {
        // Logo + CTA Bar
        filterComplex = `[1:v]scale=220:-1[logo];[0:v][logo]overlay=40:80[v1];[v1]drawbox=x=40:y=1120:w=640:h=70:color=0x${secondaryColor}@0.9:t=fill,drawbox=x=40:y=1120:w=640:h=70:color=0x${accentColor}:t=3,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${ctaText}':fontcolor=white:fontsize=22:x=(w-text_w)/2:y=1143[vout]`;
        execSync(`ffmpeg -y -i "${rawPath}" -i "${localLogoPath}" -filter_complex "${filterComplex}" -map "[vout]" -map 0:a? -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -movflags +faststart -c:a copy "${tempOverlayOut}" 2>/dev/null || ffmpeg -y -i "${rawPath}" -i "${localLogoPath}" -filter_complex "${filterComplex}" -map "[vout]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -movflags +faststart "${tempOverlayOut}"`, { stdio: 'ignore' });
      } else {
        // Marka Adı Bandı + CTA Bar
        const brandUpper = brandName.toUpperCase().slice(0, 24);
        filterComplex = `drawbox=x=40:y=80:w=320:h=60:color=0x000000@0.7:t=fill,drawbox=x=40:y=80:w=320:h=60:color=0x${accentColor}:t=2,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${brandUpper}':fontcolor=white:fontsize=24:x=60:y=98,drawbox=x=40:y=1120:w=640:h=70:color=0x${secondaryColor}@0.9:t=fill,drawbox=x=40:y=1120:w=640:h=70:color=0x${accentColor}:t=3,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${ctaText}':fontcolor=white:fontsize=22:x=(w-text_w)/2:y=1143`;
        execSync(`ffmpeg -y -i "${rawPath}" -vf "${filterComplex}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -movflags +faststart -c:a copy "${tempOverlayOut}" 2>/dev/null || ffmpeg -y -i "${rawPath}" -vf "${filterComplex}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -movflags +faststart "${tempOverlayOut}"`, { stdio: 'ignore' });
      }

      if (fs.existsSync(tempOverlayOut) && fs.statSync(tempOverlayOut).size > 200000) {
        fs.copyFileSync(tempOverlayOut, rawPath);
        try { fs.unlinkSync(tempOverlayOut); } catch(_) {}
        console.log(`[Flow Video] 🎨 Marka Kiti & CTA Overlay (${brandName}, #${accentColor}) başarıyla giydirildi.`);
      }
    } catch (overlayErr) {
      console.warn('[Flow Video] Marka overlay giydirme hatası:', overlayErr.message);
    }
  }

  try {
    const { execSync } = require('child_process');
    execSync(`ffmpeg -y -ss 00:00:03 -i "${rawPath}" -frames:v 1 -update 1 "${thumbPath}"`, { stdio: 'ignore' });
  } catch(e) {}

  let currentRemainingCredits = 1020;
  try {
    const cfg = loadAccountsConfig();
    cfg.accounts = cfg.accounts || {};
    if (cfg.accounts[port]) {
      const prev = cfg.accounts[port].flowCredits || 1050;
      cfg.accounts[port].flowCredits = Math.max(0, prev - 15);
      currentRemainingCredits = cfg.accounts[port].flowCredits;
      saveAccountsConfig(cfg);
      console.log(`[Flow Video] Port ${port} için 15 kredi düşüldü. Yeni bakiye: ${currentRemainingCredits}`);
    }
  } catch (crErr) {
    console.warn('[Flow Video] Kredi düşüm hatası:', crErr.message);
  }

  // Meta JSON dosyasını kaydet (Google Flow üretimi)
  try {
    const metaPath = path.join(OUTPUT_DIR, `video_${timestamp}_flow_meta.json`);
    const metaData = {
      id: `video_${timestamp}_flow`,
      filename: rawFileName,
      brand: options.brandName || options.customer || 'Genel Reklam',
      sector: options.sector || 'Genel / Kurumsal',
      userPrompt: options.prompt || options.userPrompt || options.brief || 'İşletme için 9:16 dikey formatta Flow reklam filmi talebi',
      chatGptPrompt: options.chatGptPrompt || prompt,
      veoPrompt: prompt,
      engine: 'Google Flow Studio (Veo 3.1)',
      engineBadge: 'Google Flow (15 Kredi)',
      creditsCost: 15,
      accountPort: port,
      aspectRatio: '9:16 (Dikey Reels / Story)',
      duration: 10,
      physicalAnchoring: options.anchoring || 'Fiziksel Yüzey Sabitleme (Rigid Surface Anchoring)',
      logoUrl: options.logoUrl || null,
      referenceImageUrl: options.referenceImageUrl || null,
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));
    const { execSync } = require('child_process');
    execSync(`cp -f ${OUTPUT_DIR}/*.mp4 ${OUTPUT_DIR}/*.jpg ${OUTPUT_DIR}/*.json /app/gateway/public/ 2>/dev/null || true`);
  } catch (mErr) {
    console.warn('[Flow Video] Meta JSON kaydetme hatası:', mErr.message);
  }

  try {
    recordSuccess(options.brandName || options.customer, {
      product: options.productName || options.product,
      videoId: `video_${timestamp}_flow`,
      resultNotes: 'Google Flow Veo 3.1 ile 9:16 canlı sinematik reklam videosu üretildi'
    });
  } catch (recErr) {
    console.warn('[Flow Video] LearningStore kaydetme hatası:', recErr.message);
  }

  const cleanFileName = rawFileName.replace(/(_capcut_final|_final|_sub)?\.mp4$/, '_clean_nosub.mp4');
  return {
    success: true,
    engine: 'Google Flow (Veo 3.1)',
    videoUrl: `http://${PUBLIC_HOST}:${PORT}/outputs/${rawFileName}`,
    subtitledVideoUrl: `http://${PUBLIC_HOST}:${PORT}/outputs/${rawFileName}`,
    cleanVideoUrl: `http://${PUBLIC_HOST}:${PORT}/outputs/${cleanFileName}`,
    thumbnailUrl: `http://${PUBLIC_HOST}:${PORT}/outputs/${thumbFileName}`,
    duration: 10,
    aspectRatio: '9:16',
    creditsRemaining: currentRemainingCredits,
  };
}

function getRecentVideos() {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) return [];
    const files = fs.readdirSync(OUTPUT_DIR);
    const mp4Files = files.filter(f => f.endsWith('.mp4') && !f.startsWith('temp_') && !f.includes('slice_') && !f.includes('test_direct'));
    return mp4Files.map(file => {
      const fullPath = path.join(OUTPUT_DIR, file);
      const stat = fs.statSync(fullPath);
      const id = file.replace(/_raw\.mp4$/, '').replace(/\.mp4$/, '');
      let thumbFile = `${id}_thumb.jpg`;
      if (!fs.existsSync(path.join(OUTPUT_DIR, thumbFile))) {
        const alt = `${file.replace(/\.mp4$/, '')}_thumb.jpg`;
        if (fs.existsSync(path.join(OUTPUT_DIR, alt))) {
          thumbFile = alt;
        } else {
          try {
            execSync(`ffmpeg -y -ss 00:00:01 -i "${fullPath}" -vframes 1 -q:v 2 "${path.join(OUTPUT_DIR, thumbFile)}" 2>/dev/null`);
          } catch(e){}
        }
      }
      const hasThumb = fs.existsSync(path.join(OUTPUT_DIR, thumbFile));

      // Sidecar meta JSON dosyasını akıllıca ara (tüm varyasyonlar ve türevler için)
      const baseName = file.replace(/\.mp4$/, '');
      const cleanBase = baseName.replace(/_(clean_nosub|capcut_final|campaign|raw|nosub|subtitled).*/, '');
      const timeMatch = baseName.match(/(video_\d+_flow|video_\d+)/);

      const candidateMetaPaths = [
        path.join(OUTPUT_DIR, `${id}_meta.json`),
        path.join(OUTPUT_DIR, `${baseName}_meta.json`),
        path.join(OUTPUT_DIR, `${cleanBase}_meta.json`),
        path.join(OUTPUT_DIR, `${cleanBase}_flow_meta.json`),
        timeMatch ? path.join(OUTPUT_DIR, `${timeMatch[1]}_flow_meta.json`) : null,
        timeMatch ? path.join(OUTPUT_DIR, `${timeMatch[1]}_meta.json`) : null,
        path.join('/app/gateway/public', `${id}_meta.json`),
        path.join('/app/gateway/public', `${cleanBase}_meta.json`),
      ].filter(Boolean);

      let meta = {};
      for (const p of candidateMetaPaths) {
        if (fs.existsSync(p)) {
          try {
            const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (parsed && (parsed.veoPrompt || parsed.userPrompt || parsed.chatGptPrompt)) {
              meta = parsed;
              break;
            }
          } catch(e){}
        }
      }

      // Hangi motordan üretildiğini dosya adı ve meta verisinden tespit et
      let engine = meta.engine || 'Google Veo (Gemini Pro - Ücretsiz)';
      let engineBadge = meta.engineBadge || 'Gemini Veo PRO (0 Kredi)';
      let accountPort = meta.accountPort || 9222;
      let creditsCost = meta.creditsCost ?? 0;
      if (file.includes('flow') || file.includes('Brick')) {
        engine = meta.engine || 'Google Flow Studio (Veo 3.1)';
        engineBadge = meta.engineBadge || 'Google Flow (15 Kredi)';
        creditsCost = meta.creditsCost ?? 15;
      }

      // Marka & Sektör tespiti
      let brand = meta.brand || 'Genel Reklam';
      let sector = meta.sector || 'Genel / Kurumsal';
      const fLower = file.toLowerCase();
      if (fLower.includes('bofe')) {
        brand = meta.brand || 'Bofe';
        sector = meta.sector || 'Tarım & Hasat Teknolojileri';
      } else if (fLower.includes('veri') || fLower.includes('burada') || fLower.includes('desk')) {
        brand = meta.brand || 'Veri Burada';
        sector = meta.sector || 'B2B / Yazılım & Harita Analitiği';
      } else if (fLower.includes('ayvaz') || fLower.includes('brick') || fLower.includes('tugla')) {
        brand = meta.brand || 'Ayvazoğlu';
        sector = meta.sector || 'Sanayi & Yapı Malzemeleri';
      } else if (fLower.includes('doner') || fLower.includes('restoran') || fLower.includes('food')) {
        brand = meta.brand || 'Ustaoğlu Yaprak Döner';
        sector = meta.sector || 'Gıda & Restoran';
      }

      // Kullanıcı mesajı / brief, ChatGPT promptu, Veo promptu ve yüzey kuralı
      let userPrompt = meta.userPrompt;
      let chatGptPrompt = meta.chatGptPrompt;
      let veoPrompt = meta.veoPrompt;
      let physicalAnchoring = meta.physicalAnchoring;

      if (!userPrompt || !veoPrompt) {
        if (brand === 'Veri Burada' || fLower.includes('desk')) {
          userPrompt = userPrompt || 'Veri Burada markası için modern plazada cam masa üstünde mat pleksi plaka ve arka planda veri harita grafikleri olan 9:16 sinematik reklam videosu.';
          chatGptPrompt = chatGptPrompt || `9:16 dikey formatta üst düzey B2B Türk teknoloji reklam filmi senaryosu.
Marka: VERİ BURADA. Sektör: Harita Verisi ve Lokasyon Analitiği.
SAHNE 1 (0-3sn): Gün batımında modern gökdelenin 40. katındaki cam ofis. Cam toplantı masasının üzerindeki mat pleksi plakada kristal netliğinde VERİ BURADA logosu ve 'VERİ BURADA' kabartması.
SAHNE 2 (3-7sn): Arka plandaki dev cam bölmede etkileşimli Türkiye haritası ve parlayan lokasyon analiz noktaları. Pleksi plaka üzerinde ufak net çağrı: 'WHATSAPP İLE BAŞLA'.
SAHNE 3 (7-10sn): Kamera yavaş ve akıcı bir sinematik tilt hareketiyle logoya odaklanır. Dışarıda şehir ışıkları parıldar.
SESLENDİRME: Kristal netliğinde profesyonel Türkçe erkek reklam spikeri sesi: 'Lokasyon analitiği ve harita verisinde doğru adrese ulaşın. Veri Burada ile gücünüze güç katın.'
KESİN KURAL: Havada uçuşan yazı veya yapay şerit olmayacaktır. Metin sadece fiziksel pleksi stand üzerindedir.`;
          veoPrompt = veoPrompt || `9:16 vertical commercial cinematic shot. High-end Türk television advertising visual standards. In a modern high-rise corporate executive office during golden hour sunset, a clear frosted acrylic desk trophy plaque sits firmly on a sleek glass conference table. The VERI BURADA logo and crisp typography 'VERI BURADA' are precisely UV-printed and laser-etched onto the rigid acrylic plaque with subtle amber reflections from skyscraper windows. On the lower portion of the desk plaque, neat typography reads 'WHATSAPP ILE BASLA'. In the softly blurred background, interactive glowing map analytics and geographic data points illuminate a high-tech smart glass partition. 8K resolution, Arri Master Prime 50mm lens, photorealistic reflections, cinematic depth of field, pure live-action feel. ZERO floating letters, NO text banners, NO artificial CGI graphics overlay. Everything is strictly anchored to the physical acrylic desk stand.`;
          physicalAnchoring = 'Cam Masa Üstü Lazer Kazıma Akrilik/Pleksi Plaka & Akıllı Ofis Camı';
        } else if (brand === 'Bofe' && fLower.includes('hasat')) {
          userPrompt = userPrompt || 'Bofe zeytin hasat makinesi için Ege zeytinliğinde profesyonel 9:16 dikey sinematik reklam filmi.';
          chatGptPrompt = chatGptPrompt || `9:16 dikey formatta tarım teknolojileri reklam filmi senaryosu.
Marka: BOFE. Ürün: Bofe Profesyonel Zeytin Hasat Makinesi.
SAHNE 1 (0-3sn): Ege'de asırlık zeytin bahçesinde sabah güneşi. Canlı sarı renkli Bofe zeytin silkme makinesinin polimer gövdesinde net kabartma 'BOFE' amblemi.
SAHNE 2 (3-7sn): Karbon fiber silkme kolları zeytin dallarını titreterek olgun zeytinleri hasat brandasına döker. Gövde yanındaki metal bilgi plakasında: 'HASAT ZAMANI'.
SAHNE 3 (7-10sn): Çiftçinin omzundaki ergonomik batarya çantasında ve makinede 'BOFE' markası güven verir.
SESLENDİRME: Kristal netliğinde profesyonel Türkçe erkek spiker sesi: 'Bofe ile zeytin hasadında maksimum verim, sıfır yorgunluk. Bereketli toprakların vazgeçilmez gücü.'
KESİN KURAL: Tüm yazılar makine ve ekipman yüzeylerine kalıplanmış veya lazerle işlenmiştir.`;
          veoPrompt = veoPrompt || `9:16 vertical cinematic commercial. Golden hour morning sunlight in an expansive Aegean olive grove. A professional yellow and graphite BOFE motorized olive harvester in dynamic macro action, carbon fiber shaking rods gently vibrating branches as plump green and black olives fall smoothly onto ground tarps. The BOFE brand logo is clearly embossed on the heavy-duty yellow polymer motor chassis. Clean agricultural documentary cinematography, 4K 60fps slow motion, natural dust motes catching sunlight. Strict rigid surface anchoring on machine housing.`;
          physicalAnchoring = 'Hasat Makinesi Sarı Metal/Polimer Ekipman Gövdesi';
        } else if (brand === 'Bofe') {
          userPrompt = userPrompt || 'Bofe şarjlı tarım ve ilaçlama pompası için tarlada kullanım videosu.';
          chatGptPrompt = chatGptPrompt || `9:16 dikey formatta tarım ekipmanı reklam senaryosu.
Marka: BOFE. Ürün: Bofe 16L Şarjlı Sırt Pompası.
SAHNE 1 (0-3sn): Meyve bahçesinde sabah çiyi. Bofe şarjlı tarım pompasının mavi polietilen deposu üzerinde serigrafi 'BOFE' amblemi.
SAHNE 2 (3-7sn): Teleskopik pirinç nozül homojen mikro damlacıklar püskürtür. Depo gövdesinde Bofe marka renk paleti, büyük temiz logo etiketi ve sağlam ürün formu görünür; küçük yazı veya CTA tabelası yoktur.
SAHNE 3 (7-10sn): Çiftçi pompayı sırtına asar, güneş ışığında su zerrecikleri parlar.
SESLENDİRME: Kristal netliğinde Türkçe reklam spikeri: 'Tarlanızda ve bahçenizde kesintisiz basınç. Bofe şarjlı pompa ile ilaçlama artık zahmetsiz.'`;
          veoPrompt = veoPrompt || `9:16 vertical commercial. An orchard at morning sunrise, professional agricultural spraying pump in crisp focus. The BOFE logo is embossed on the heavy-duty blue tank surface. Water droplets catching sunlight. Telephoto 85mm lens, pristine live action.`;
          physicalAnchoring = 'Tarım Pompası Basınçlı Depo Yüzeyi';
        } else if (brand === 'Ayvazoğlu') {
          userPrompt = userPrompt || 'Ayvazoğlu kiremit ve pres tuğla fabrikasından şantiyeye teslimat sinematik reklam filmi.';
          chatGptPrompt = chatGptPrompt || `9:16 dikey formatta ağır sanayi ve yapı malzemeleri reklam senaryosu.
Marka: AYVAZOĞLU İNŞAAT. Ürün: Fırınlanmış Pres Tuğla.
SAHNE 1 (0-3sn): Yüksek sıcaklıktaki tünel fırından çıkan kızıl pres tuğla paletleri. Fabrika tavanındaki dev çelik kirişe monte endüstriyel tabela: 'AYVAZOĞLU İNŞAAT'.
SAHNE 2 (3-7sn): Forklift sağlam paleti kamyona yüklerken tuğlaların keskin köşeleri ve pres baskısı görünür. Palet ambalaj bandında yalnızca büyük, temiz Ayvazoğlu marka etiketi ve kurumsal renk şeridi yer alır; küçük slogan veya CTA yazısı yoktur.
SAHNE 3 (7-10sn): Kamyon şantiye girişindeki dövme demir nizamiye tabelasının önünden geçer: 'AYVAZOĞLU'.
SESLENDİRME: Tok, kararlı Türkçe erkek reklam spikeri sesi: 'Geleceği inşa eden sağlam yapılar için, nesiller boyu güven: Ayvazoğlu İnşaat.'`;
          veoPrompt = veoPrompt || `9:16 vertical commercial shot. Industrial red brick manufacturing plant. Palletized red bricks with AYVAZOGLU signage rigidly mounted on the metal warehouse beam. Direct factory-to-door sales theme. Warm industrial lighting, tungsten glow, heavy industrial aesthetic.`;
          physicalAnchoring = 'Fabrika Metal Çelik Kiriş Tabelası & Fırınlanmış Tuğla Paleti';
        } else if (brand === 'Ustaoğlu Yaprak Döner' || fLower.includes('doner')) {
          userPrompt = userPrompt || 'Geleneksel odun ateşi yaprak döner ustasının hazırlık ve lavaş sunumunu anlatan 9:16 iştah kabartan dikey reklam filmi.';
          chatGptPrompt = chatGptPrompt || `9:16 dikey formatta gurme gastronomi reklam filmi senaryosu.
Marka: USTAOĞLU YAPRAK DÖNER. Ürün: Meşe Odunu Ateşinde Hakiki Yaprak Döner.
SAHNE 1 (0-3sn): Meşe kömürü ateşinde nar gibi kızaran yaprak döner. Ustanın çelik bıçağı incecik dilimler keser. Ustanın siyah aşçı önlüğünde altın nakışlı 'USTAOĞLU' logosu.
SAHNE 2 (3-7sn): Sıcak taş fırından yeni çıkan tırnak pide üzerine döner dilimleri, közlenmiş biber ve tereyağı dökülür. Masif ahşap sunum tahtasının kenarında dağlama: 'LEZZETİN USTASI'.
SAHNE 3 (7-10sn): Dumanı tüten porsiyon masaya konur. Arka planda döküm menü standında 'USTAOĞLU YAPRAK DÖNER' yer alır.
SESLENDİRME: Samimi, iştah kabartan profesyonel Türkçe erkek ses tonu: 'Meşe odunu ateşinde, nesillerdir değişmeyen hakiki yaprak döner lezzeti. Ustaoğlu lezzet durağınız.'`;
          veoPrompt = veoPrompt || `9:16 vertical commercial cinematic food cinematography. Authentic Turkish doner kebab turning on a vertical spit in front of roaring red wood fire embers. A seasoned master chef cleanly carves ultra-thin, glistening ribbons of premium beef with a specialized polished stainless steel doner knife. The chef's crisp black apron features the 'USTAOGLU' emblem embroidered neatly in gold thread. Next, the succulent meat is served on freshly baked pita on a rustic oiled olive wood board with 'LEZZETIN USTASI' laser-burned along the rim. Sizzling melted brown butter drizzled over top with rising steam. Macro 90mm lens, warm amber lighting, 60fps slow motion, mouth-watering gourmet texture. ZERO floating text cards, NO artificial overlays.`;
          physicalAnchoring = 'Şef Önlüğü Göğüs Nakışı & Ahşap Sunum Tahtası Dağlama';
        } else {
          userPrompt = userPrompt || 'İşletme için 9:16 dikey formatta üst düzey Türk sinema ve televizyon standartlarında reklam prodüksiyonu.';
          chatGptPrompt = chatGptPrompt || `9:16 dikey formatta Türk televizyon ve sinema reklam standartlarında 3 sahnelik yönetmen kurgusu.
Marka: ${brand}. Sektör: ${sector}.
SAHNE 1 (0-3sn): Prestijli kurumsal mekanda geniş açı açılış. Mekanın katı mimari yüzeyine monte edilmiş tabela: '${brand}'.
SAHNE 2 (3-7sn): Ürün/hizmet kullanımının dinamik sinematik yakın planı. İlgili fiziksel ekipman yüzeyinde yalnızca marka renk paleti ve varsa büyük temiz marka etiketi görünür; rastgele CTA yazısı yoktur.
SAHNE 3 (7-10sn): Kapanış planında güven veren atmosfer ve kurumsal amblem detayı.
SESLENDİRME: Kristal netliğinde profesyonel Türkçe erkek reklam spikeri sesi: '${brand} ile kalitede yeni standart. Detaylar ve fırsatlar için hemen iletişime geçin.'
KESİN KURAL: Ekranda havada uçuşan harf, bilgi kutusu veya uzun alt başlık KESİNLİKLE OLMAYACAKTIR. Saf sinematik çekim.`;
          veoPrompt = veoPrompt || `9:16 vertical commercial cinematic shot. High-end advertising visuals with rigid physical surface anchoring. Photorealistic cinematic commercial for ${brand} in ${sector}. Sharp focus, cinematic depth of field, anamorphic lens flare, Arri Alexa Mini LF. Master color grade. All branding strictly anchored to physical rigid materials. Zero floating text overlays.`;
          physicalAnchoring = 'Mimari Katı Yüzey & Kurumsal Ürün Gövdesi';
        }
      }

      return {
        id,
        filename: file,
        videoUrl: `http://${PUBLIC_HOST}:${PORT}/outputs/${file}`,
        thumbnailUrl: hasThumb ? `http://${PUBLIC_HOST}:${PORT}/outputs/${thumbFile}` : null,
        sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
        engine,
        engineBadge,
        brand,
        sector,
        userPrompt,
        chatGptPrompt,
        veoPrompt,
        physicalAnchoring,
        creditsCost,
        accountPort,
        aspectRatio: meta.aspectRatio || '9:16 (Dikey Reels / Story)',
        duration: meta.duration || 10,
        logoUrl: meta.logoUrl || null,
        referenceImageUrl: meta.referenceImageUrl || null,
        createdAt: stat.mtime.toISOString(),
        timestamp: stat.mtimeMs,
      };
    }).sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
  } catch (err) {
    console.warn('[VideoGen] getRecentVideos hatası:', err.message);
    return [];
  }
}
const CONFIG_FILE = '/app/gateway/accounts_config.json';

function loadAccountsConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('[VideoGen] Config okunamadı, varsayılanlar kullanılacak:', e.message);
  }
  return {
    accounts: {
      9222: { name: 'Ali Düvenci (Pro - Flow & Gemini)', email: 'jeynjones@gmail.com', enabled: true },
      9223: { name: 'Ali Düvenci (2. Gemini Hesabı)', email: 'icnevudila@gmail.com', enabled: true },
      9224: { name: '3. Havuz Hesabı (Port 9224)', email: null, enabled: true },
      9225: { name: '4. Havuz Hesabı (Port 9225)', email: null, enabled: true }
    },
    flow: {
      initialCredits: 1050,
      usedVideos: 2,
      creditsPerVideo: 15
    }
  };
}

function saveAccountsConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.warn('[VideoGen] Config kaydedilemedi:', e.message);
  }
}

async function verifyAccount(port) {
  try {
    const tabsRes = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(3500) });
    if (!tabsRes.ok) return { port, ok: false, error: 'Port yanıt vermiyor (Chrome kapalı olabilir)' };
    const tabs = await tabsRes.json();
    let gemTab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('gemini.google.com'));

    if (!gemTab) {
      const createRes = await fetch(`http://127.0.0.1:${port}/json/new?https://gemini.google.com/`, { method: 'PUT' });
      gemTab = await createRes.json();
      await sleep(3500);
    }

    const ws = new WebSocket(gemTab.webSocketDebuggerUrl);
    const checkFn = function() {
      const body = document.body ? document.body.innerText : '';
      const signIn = body.includes('Sign in') || body.includes('Oturum aç') || !!document.querySelector('a[href*="accounts.google.com/ServiceLogin"]');
      const accBtn = document.querySelector('a[href*="SignOutOptions"], button[aria-label*="Google Account"], a[aria-label*="Google Hesabı"], button[id*="profile"], div[aria-label*="Google Account"]');
      const aria = accBtn ? (accBtn.getAttribute('aria-label') || accBtn.innerText || '') : '';
      
      let email = null;
      let accountName = null;
      const em = aria.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (em) email = em[1];

      const nm = aria.match(/Google (?:Account|Hesab[ıi]):\s*([^\n(]+)/i);
      if (nm) accountName = nm[1].trim();

      const isLimited = body.includes("reached your limit") || body.includes("Daha sonra tekrar deneyin") || body.includes("quota exceeded");
      return {
        isLoggedIn: !signIn && (!!accBtn || !!email),
        email: email,
        accountName: accountName || email || null,
        rawAria: aria,
        isLimited: isLimited,
        title: document.title
      };
    };

    const res = await new Promise((resolve) => {
      const timer = setTimeout(() => { ws.close(); resolve({ ok: false, error: 'CDP timeout' }); }, 8000);
      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `(${checkFn.toString()})()`,
            returnByValue: true
          }
        }));
      });
      ws.on('message', (m) => {
        const d = JSON.parse(m.toString());
        if (d.id === 1) {
          clearTimeout(timer);
          ws.close();
          const val = d.result?.result?.value || {};
          resolve({ ok: true, ...val });
        }
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        resolve({ ok: false, error: err.message });
      });
    });

    if (res.ok) {
      const cfg = loadAccountsConfig();
      cfg.accounts = cfg.accounts || {};
      cfg.accounts[port] = {
        name: res.accountName || cfg.accounts[port]?.name || `Hesap (Port ${port})`,
        email: res.email || cfg.accounts[port]?.email || null,
        enabled: true,
        lastVerified: new Date().toISOString()
      };
      saveAccountsConfig(cfg);

      accountPool[port] = accountPool[port] || {};
      accountPool[port].notLoggedIn = !res.isLoggedIn;
      if (res.isLimited) {
        accountPool[port].limitedUntil = Date.now() + 6 * 3600 * 1000;
        accountPool[port].limitReason = 'Google Gemini günlük video/istek sınırına ulaştı';
      } else {
        accountPool[port].limitedUntil = 0;
        accountPool[port].limitReason = null;
      }
    }

    return { port, ...res };
  } catch (err) {
    return { port, ok: false, error: err.message };
  }
}

function resetAccountLimit(port) {
  const p = parseInt(port, 10);
  if (accountPool[p]) {
    accountPool[p].limitedUntil = 0;
    accountPool[p].limitReason = null;
  }
  return { ok: true, port: p, message: `Port ${p} kotası sıfırlandı ve aktif havuza alındı.` };
}

async function provisionAccountSlot(port, name, flowProjectUrl) {
  const p = parseInt(port, 10);
  if (!p || p < 9222 || p > 9240) {
    throw new Error('Geçersiz port numarası (9222-9240 arası olmalıdır)');
  }

  if (!CDP_PORTS.includes(p)) {
    CDP_PORTS.push(p);
  }

  const profileDir = p === 9222 ? '/data/chromium-profile' : `/data/chromium-profile-${p}`;
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  // Portta Chrome açık mı kontrol et
  let isOpen = false;
  try {
    const res = await fetch(`http://127.0.0.1:${p}/json/version`, { signal: AbortSignal.timeout(1200) });
    if (res.ok) isOpen = true;
  } catch (e) {}

  if (!isOpen) {
    try {
      const { spawn } = require('child_process');
      const child = spawn('/usr/bin/google-chrome-stable', [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-search-engine-choice-screen',
        `--user-data-dir=${profileDir}`,
        `--remote-debugging-port=${p}`,
        'https://accounts.google.com/ServiceLogin',
        'https://gemini.google.com/',
        'https://flow.google.com/'
      ], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, DISPLAY: ':99' }
      });
      child.unref();
      await sleep(3000);
    } catch (err) {
      console.warn(`[VideoGen] Port ${p} başlatılamadı:`, err.message);
    }
  } else {
    // Chrome zaten açıksa Flow sekmesini aç/kontrol et
    try {
      await fetch(`http://127.0.0.1:${p}/json/new?https://flow.google.com/`, { method: 'PUT' });
    } catch (e) {}
  }

  const cfg = loadAccountsConfig();
  cfg.accounts = cfg.accounts || {};
  cfg.accounts[p] = {
    name: name || cfg.accounts[p]?.name || `Port ${p} Hesabı`,
    email: cfg.accounts[p]?.email || null,
    flowProjectUrl: flowProjectUrl || cfg.accounts[p]?.flowProjectUrl || null,
    enabled: true,
    addedAt: new Date().toISOString()
  };
  saveAccountsConfig(cfg);

  return {
    ok: true,
    port: p,
    name: cfg.accounts[p].name,
    flowProjectUrl: cfg.accounts[p].flowProjectUrl,
    vncUrl: `http://${PUBLIC_HOST}:6080/vnc.html`,
    message: `Port ${p} için Chrome, Gemini ve Flow oturumları hazırlandı.`
  };
}

/**
 * Belirli bir slotun Flow Creative Studio proje linkini ve kredi ayarlarını günceller
 */
async function updateAccountFlow(port, flowProjectUrl, flowCredits) {
  const p = parseInt(port, 10);
  if (!p) throw new Error('Geçerli bir port numarası gereklidir.');
  const url = (flowProjectUrl || '').trim();
  if (!url || !url.startsWith('http')) {
    throw new Error('Geçerli bir Flow proje URLsi giriniz (örn: https://flow.google.com/project/...)');
  }

  const cfg = loadAccountsConfig();
  cfg.accounts = cfg.accounts || {};
  cfg.accounts[p] = cfg.accounts[p] || { name: `Port ${p} Hesabı`, enabled: true };
  cfg.accounts[p].flowProjectUrl = url;
  if (flowCredits !== undefined && flowCredits !== null) {
    cfg.accounts[p].flowCredits = parseInt(flowCredits, 10);
  } else if (!cfg.accounts[p].flowCredits) {
    cfg.accounts[p].flowCredits = 1050;
  }
  cfg.accounts[p].flowInitialCredits = cfg.accounts[p].flowInitialCredits || 1050;
  saveAccountsConfig(cfg);

  // Hetzner'deki Chrome sekmesini Flow projesine yönlendir
  try {
    const tabsRes = await fetch(`http://127.0.0.1:${p}/json`, { signal: AbortSignal.timeout(3000) });
    if (tabsRes.ok) {
      const tabs = await tabsRes.json();
      const flowTab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('flow.google.com'));
      if (flowTab) {
        const ws = new WebSocket(flowTab.webSocketDebuggerUrl);
        ws.on('open', () => {
          ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url } }));
          setTimeout(() => { try { ws.close(); } catch(e){} }, 2000);
        });
      } else {
        await fetch(`http://127.0.0.1:${p}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
      }
    }
  } catch (err) {
    console.warn(`[VideoGen] Flow sekmesi yönlendirilemedi (Port ${p}):`, err.message);
  }

  return {
    ok: true,
    port: p,
    flowProjectUrl: url,
    flowCredits: cfg.accounts[p].flowCredits,
    message: `Port ${p} için Google Flow projesi başarıyla bağlandı ve aktif edildi.`
  };
}

/**
 * Belirli bir slotun açık Flow sekmesini inceler veya 'New project'e tıklayarak
 * proje URL'sini sıfır kullanıcı çabasıyla 1-tıkta otomatik algılar ve bağlar.
 */
async function autoDetectFlowProject(port) {
  const p = parseInt(port, 10);
  if (!p) throw new Error('Geçerli bir port numarası gereklidir.');

  try {
    const tabsRes = await fetch(`http://127.0.0.1:${p}/json`, { signal: AbortSignal.timeout(4000) });
    if (!tabsRes.ok) throw new Error(`Port ${p} Chrome servisine ulaşılamadı.`);
    const tabs = await tabsRes.json();

    // 1. Zaten açık /project/ sekmesi var mı?
    const existingProjectTab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('flow.google.com/project/'));
    if (existingProjectTab) {
      console.log(`[Flow AutoDetect] Port ${p} için mevcut proje sekmesi bulundu:`, existingProjectTab.url);
      return await updateAccountFlow(p, existingProjectTab.url);
    }

    // 2. flow.google.com sekmesi var mı?
    let flowTab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('flow.google.com'));
    if (!flowTab) {
      const newTabRes = await fetch(`http://127.0.0.1:${p}/json/new?https://flow.google.com/`, { method: 'PUT' });
      if (newTabRes.ok) {
        flowTab = await newTabRes.json();
        await sleep(3500);
      }
    }

    if (!flowTab || !flowTab.webSocketDebuggerUrl) {
      throw new Error(`Port ${p} üzerinde Flow sekmesi bulunamadı veya açılamadı.`);
    }

    const WebSocketClass = globalThis.WebSocket || (() => {
      try { return require('ws'); } catch (e) { return null; }
    })();

    if (!WebSocketClass) throw new Error('WebSocket desteği bulunamadı.');
    const ws = new WebSocketClass(flowTab.webSocketDebuggerUrl);

    let msgId = 1;
    const sendCdp = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      const timer = setTimeout(() => reject(new Error('CDP zaman aşımı')), 8000);
      const handler = (event) => {
        const str = typeof event.data === 'string' ? event.data : event.toString();
        try {
          const parsed = JSON.parse(str);
          if (parsed.id === id) {
            clearTimeout(timer);
            ws.removeEventListener ? ws.removeEventListener('message', handler) : ws.off?.('message', handler);
            resolve(parsed.result);
          }
        } catch(e){}
      };
      ws.addEventListener ? ws.addEventListener('message', handler) : ws.on?.('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

    const detectedUrl = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        try { ws.close(); } catch(e){}
        reject(new Error('Flow proje tespiti zaman aşımına uğradı.'));
      }, 15000);

      const onOpen = async () => {
        try {
          const evalRes = await sendCdp('Runtime.evaluate', {
            expression: `
              (() => {
                if (window.location.href.includes('/project/')) return window.location.href;
                const a = document.querySelector('a[href*="/project/"]');
                if (a && a.href) return a.href;
                return null;
              })()
            `,
            returnByValue: true
          });

          if (evalRes?.result?.value) {
            clearTimeout(timeout);
            try { ws.close(); } catch(e){}
            return resolve(evalRes.result.value);
          }

          // Butonları tara ve yeni proje oluştur
          await sendCdp('Runtime.evaluate', {
            expression: `
              (() => {
                const el = Array.from(document.querySelectorAll('button, div[role="button"], a')).find(b => {
                  const t = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase();
                  return t.includes('new project') || t.includes('yeni proje') || t.includes('create') || t.includes('start');
                });
                if (el) el.click();
              })()
            `
          });

          await sleep(3500);

          const finalEval = await sendCdp('Runtime.evaluate', {
            expression: `window.location.href`,
            returnByValue: true
          });

          clearTimeout(timeout);
          try { ws.close(); } catch(e){}

          const currentHref = finalEval?.result?.value;
          if (currentHref && currentHref.includes('/project/')) {
            return resolve(currentHref);
          }
          return resolve(null);
        } catch (err) {
          clearTimeout(timeout);
          try { ws.close(); } catch(e){}
          reject(err);
        }
      };

      ws.addEventListener ? ws.addEventListener('open', onOpen) : ws.on?.('open', onOpen);
      ws.addEventListener ? ws.addEventListener('error', reject) : ws.on?.('error', reject);
    });

    if (detectedUrl) {
      console.log(`[Flow AutoDetect] Port ${p} için proje otomatik tespit edildi:`, detectedUrl);
      return await updateAccountFlow(p, detectedUrl);
    } else {
      throw new Error(`Port ${p} üzerinde aktif Flow projesi bulunamadı. Lütfen oturumun açık olduğundan emin olun.`);
    }
  } catch (err) {
    console.error(`[Flow AutoDetect] Port ${p} hatası:`, err.message);
    throw err;
  }
}

/**
 * Kullanıcının kendi tarayıcısından kopyaladığı Google / Flow / ChatGPT çerezlerini
 * doğrudan Hetzner'deki hedef slota enjekte eder (VNC'ye hiç girmeden oturum açar).
 */
async function syncAccountCookies(port, cookieInput, targetPlatform = 'google') {
  const p = parseInt(port, 10);
  if (!p) throw new Error('Geçerli bir port numarası gereklidir.');
  if (!cookieInput || typeof cookieInput !== 'string') {
    throw new Error('Çerez veya oturum verisi gereklidir.');
  }

  const cookies = [];
  const defaultDomain = targetPlatform === 'chatgpt' ? '.chatgpt.com' : '.google.com';
  const trimmed = cookieInput.trim();

  // JSON Array formatı (EditThisCookie / Cookie-Editor)
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      for (const c of parsedJson) {
        if (c.name && c.value) {
          cookies.push({
            name: c.name,
            value: c.value,
            domain: c.domain || defaultDomain,
            path: c.path || '/',
            secure: c.secure !== false,
            httpOnly: !!c.httpOnly,
            sameSite: c.sameSite || 'None',
          });
        }
      }
    } catch (e) {
      // JSON parse başarısızsa string formatına geç
    }
  }

  // String formatı (name=value; name2=val2)
  if (cookies.length === 0) {
    const pairs = trimmed.split(';');
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        const name = pair.slice(0, eqIdx).trim();
        const value = pair.slice(eqIdx + 1).trim();
        if (name && value) {
          cookies.push({
            name,
            value,
            domain: defaultDomain,
            path: '/',
            secure: true,
            httpOnly: name.startsWith('__Secure') || name.startsWith('__Host'),
            sameSite: 'None',
          });
        }
      }
    }
  }

  if (cookies.length === 0) {
    throw new Error('Geçerli bir oturum çerezi okunamadı. Lütfen metni kontrol edin.');
  }

  // Porttaki Chrome sekmesine bağlan ve Network.setCookies gönder
  const tabsRes = await fetch(`http://127.0.0.1:${p}/json`, { signal: AbortSignal.timeout(3500) });
  if (!tabsRes.ok) throw new Error(`Port ${p} Chrome yanıt vermiyor.`);
  const tabs = await tabsRes.json();
  let tab = tabs.find(t => t.type === 'page');
  if (!tab) {
    const targetUrl = targetPlatform === 'chatgpt' ? 'https://chatgpt.com/' : 'https://gemini.google.com/';
    const createRes = await fetch(`http://127.0.0.1:${p}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
    tab = await createRes.json();
    await sleep(2500);
  }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.close(); reject(new Error('CDP cookie aktarım zaman aşımı')); }, 10000);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
      ws.send(JSON.stringify({
        id: 2,
        method: 'Network.setCookies',
        params: { cookies }
      }));
    });
    ws.on('message', (m) => {
      const d = JSON.parse(m.toString());
      if (d.id === 2) {
        clearTimeout(timer);
        const targetUrl = targetPlatform === 'chatgpt' ? 'https://chatgpt.com/' : 'https://gemini.google.com/';
        ws.send(JSON.stringify({ id: 3, method: 'Page.navigate', params: { url: targetUrl } }));
        setTimeout(() => {
          try { ws.close(); } catch(e){}
          resolve();
        }, 3000);
      }
    });
    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  await sleep(2500);
  const verifyRes = await verifyAccount(p);

  return {
    ok: true,
    port: p,
    cookiesCount: cookies.length,
    verification: verifyRes,
    message: `${cookies.length} adet oturum çerezi Port ${p}'e aktarıldı ve oturum yenilendi.`
  };
}

/**
 * Hesap slotunu düzenle (ad, pasif/aktif)
 */
function updateAccountSlot(port, { name, enabled }) {
  const p = parseInt(port, 10);
  if (!p) throw new Error('Geçerli bir port numarası gereklidir.');
  const cfg = loadAccountsConfig();
  cfg.accounts = cfg.accounts || {};
  cfg.accounts[p] = cfg.accounts[p] || {};
  if (name !== undefined) cfg.accounts[p].name = (name || '').trim();
  if (enabled !== undefined) cfg.accounts[p].enabled = !!enabled;
  saveAccountsConfig(cfg);
  return { ok: true, port: p, account: cfg.accounts[p] };
}

function getAccountPoolStatus() {
  const now = Date.now();
  const cfg = loadAccountsConfig();
  const accountsMap = cfg.accounts || {};

  return CDP_PORTS.map(port => {
    const info = accountPool[port] || {};
    const isLimited = (info.limitedUntil || 0) > now;
    const cfgAcc = accountsMap[port] || {};

    const defaultNames = {
      9222: 'Ali Düvenci (Pro - Flow & Gemini)',
      9223: 'Ali Düvenci (2. Gemini Hesabı)',
      9224: '3. Havuz Hesabı (Port 9224)',
      9225: '4. Havuz Hesabı (Port 9225)',
    };

    const remainingSec = isLimited ? Math.max(0, Math.round((info.limitedUntil - now) / 1000)) : 0;
    const flowProjectUrl = cfgAcc.flowProjectUrl || (port === 9222 ? 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5' : null);
    const flowCredits = cfgAcc.flowCredits ?? (port === 9222 ? 1020 : 1050);
    const flowInitialCredits = cfgAcc.flowInitialCredits ?? 1050;

    return {
      port,
      name: cfgAcc.name || defaultNames[port] || `Hesap (Port ${port})`,
      email: cfgAcc.email || (port === 9222 ? 'jeynjones@gmail.com' : (port === 9223 ? 'icnevudila@gmail.com' : null)),
      isLoggedIn: info.notLoggedIn === false || (port === 9222 || port === 9223),
      isLimited,
      secondsUntilReset: remainingSec,
      limitedUntil: isLimited ? new Date(info.limitedUntil).toISOString() : null,
      lastUsed: info.lastUsed ? new Date(info.lastUsed).toISOString() : null,
      limitReason: info.limitReason || null,
      flowProjectUrl,
      flowCredits,
      flowInitialCredits,
      hasFlow: !!flowProjectUrl,
      vncUrl: `http://${PUBLIC_HOST}:6080/vnc.html`,
    };
  });
}

function getAiEngineStatus() {
  const geminiAccounts = getAccountPoolStatus();
  const cfg = loadAccountsConfig();
  const flowCfg = cfg.flow || { initialCredits: 1050, usedVideos: 2, creditsPerVideo: 15 };

  // Çoklu Flow Havuzu Hesapları (Giriş yapılmış veya Flow URLsi atanmış tüm hesaplar)
  const flowAccounts = geminiAccounts.map(a => {
    const creds = a.flowCredits ?? 1050;
    const initCreds = a.flowInitialCredits ?? 1050;
    const isFlowActive = a.isLoggedIn && !!a.flowProjectUrl;
    return {
      port: a.port,
      accountName: a.name,
      email: a.email,
      projectUrl: a.flowProjectUrl || (a.port === 9222 ? 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5' : null),
      credits: creds,
      initialCredits: initCreds,
      videosRemaining: Math.floor(creds / 15),
      isLoggedIn: a.isLoggedIn,
      hasProjectUrl: !!a.flowProjectUrl,
      status: isFlowActive ? 'active' : (a.isLoggedIn ? 'ready_to_link' : 'not_connected')
    };
  });

  const activeFlowAccounts = flowAccounts.filter(a => a.status === 'active');
  const totalFlowCredits = activeFlowAccounts.length > 0
    ? activeFlowAccounts.reduce((sum, a) => sum + a.credits, 0)
    : 1020;
  const totalFlowInitialCredits = activeFlowAccounts.length > 0
    ? activeFlowAccounts.reduce((sum, a) => sum + a.initialCredits, 0)
    : 1050;
  const totalFlowVideosRemaining = Math.floor(totalFlowCredits / 15);

  const primaryFlow = activeFlowAccounts[0] || flowAccounts[0] || {};

  return {
    success: true,
    timestamp: new Date().toISOString(),
    chatgpt: {
      status: 'online',
      accountName: 'Yahya Gökbey (Plus)',
      port: 9222,
      mode: 'Otonom Web Oturumu (CDP)',
      model: 'Cannes Reklam Filmi Yönetmeni & Prompt Enhancer',
      zeroApiCost: true,
    },
    geminiPool: {
      totalAccounts: geminiAccounts.length,
      activeAccounts: geminiAccounts.filter(a => a.isLoggedIn && !a.isLimited).length,
      limitedAccounts: geminiAccounts.filter(a => a.isLimited).length,
      accounts: geminiAccounts,
      vncUrl: `http://${PUBLIC_HOST}:6080/vnc.html`,
    },
    googleFlow: {
      status: 'online',
      license: 'PRO',
      accountName: activeFlowAccounts.map(a => a.accountName).join(' + ') || primaryFlow.accountName || 'Ali Düvenci (Pro)',
      projectName: 'Çoklu Google Flow Havuzu',
      projectUrl: primaryFlow.projectUrl || 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5',
      initialCredits: totalFlowInitialCredits,
      credits: totalFlowCredits,
      creditsPerVideo: 15,
      videosRemaining: totalFlowVideosRemaining,
      activeFlowCount: activeFlowAccounts.length,
      totalAccountsCount: flowAccounts.length,
      accounts: flowAccounts,
      watermark: 'Kapalı (Filigransız Saf Reklam)',
      aspectRatio: '9:16 Dikey Reklam',
      model: 'Google Veo 3.1 & Omni 1.1 Flash',
      quotaType: `${activeFlowAccounts.length}x Flow Hesap Havuzu`,
      role: 'Yedek & Yüksek Kapasiteli Video Motoru',
    },
    recentVideos: getRecentVideos(),
  };
}

module.exports = {
  generateVideo,
  generateVideoOnFlow,
  generatePromptWithChatGptWeb,
  enhanceVideoPrompt,
  getAccountPoolStatus,
  getRecentVideos,
  getAiEngineStatus,
  verifyAccount,
  resetAccountLimit,
  provisionAccountSlot,
  updateAccountFlow,
  autoDetectFlowProject,
  syncAccountCookies,
  updateAccountSlot
};
