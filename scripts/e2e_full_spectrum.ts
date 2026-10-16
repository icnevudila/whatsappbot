import { chromium, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const BASE_URL = 'http://localhost:3003';
const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'audit', 'evidence', 'real_customer_e2e');
const OUTPUTS_DIR = path.join(process.cwd(), 'docs', 'audit', 'evidence', 'real_customer_e2e', 'outputs');

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

interface FlowResult {
  runId: string;
  brand: string;
  mode: string;
  creativeId: string;
  outputFile: string;
  sha256: string;
  bytes: number;
  durationSeconds: number;
  screenshots: string[];
}

const auditResults: FlowResult[] = [];

async function login(page: Page) {
  console.log('Logging in via /giris...');
  await page.goto(`${BASE_URL}/giris`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', 'test@filo.dev');
  await page.fill('input[name="password"]', 'TestPass123!');
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/giris'), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  console.log('✓ Logged in successfully. Current URL:', page.url());
}

async function setOrg(context: BrowserContext, orgId: string) {
  await context.addCookies([{
    name: 'wb_active_org',
    value: orgId,
    url: BASE_URL,
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);
}

async function runWizardImageCreation(
  page: Page,
  context: BrowserContext,
  runKey: string,
  brandName: string,
  modeName: 'Akıllı Kampanya' | 'Gösterişli Kampanya' | 'Gerçek Kullanım' | 'Premium Vitrin',
  productNameSubstring?: string,
  customPrompt?: string
): Promise<FlowResult> {
  const t0 = Date.now();
  const runScreenshots: string[] = [];
  console.log(`\n======================================================`);
  console.log(`[FLOW ${runKey}] ${brandName} - Mode: ${modeName}`);
  console.log(`======================================================`);

  // Step 1: /icerik/yeni
  await page.goto(`${BASE_URL}/icerik/yeni`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // If specific product substring is requested (e.g. "Delta 10L" or "Bofe 16L")
  if (productNameSubstring) {
    const isDelta = /delta/i.test(productNameSubstring);
    const is16L = /16l/i.test(productNameSubstring);
    const selector = isDelta
      ? '[data-product-name*="Delta" i], [data-testid*="20cec3de-b581-4e7e-a3fa-4ac5c2835226"], button:has-text("Delta"), button:has-text("10lt")'
      : is16L
      ? '[data-product-name*="16" i], [data-testid*="b359ccd3-1616-4000-8000-000000000016"], button:has-text("16")'
      : `button:has-text("${productNameSubstring}"), img[alt*="${productNameSubstring}"]`;
    const productBtn = page.locator(selector).first();
    await productBtn.waitFor({ state: 'visible', timeout: 10000 });
    await productBtn.click();
    console.log(`✓ Explicitly selected product matching "${productNameSubstring}" (selector: ${selector})`);
    await page.waitForTimeout(1000);
  }

  const ssStep1 = path.join(EVIDENCE_DIR, `${runKey}_01_step1.png`);
  await page.screenshot({ path: ssStep1 });
  runScreenshots.push(ssStep1);

  // Click Step 1 -> Step 2
  const step1NextBtn = page.locator('button:has-text("Devam Et (Görsel ve Metin)")').first();
  await step1NextBtn.waitFor({ state: 'visible', timeout: 15000 });
  await step1NextBtn.click();
  await page.waitForTimeout(2000);

  // Step 2: Creative Direction
  const ssStep2 = path.join(EVIDENCE_DIR, `${runKey}_02_step2.png`);
  await page.screenshot({ path: ssStep2 });
  runScreenshots.push(ssStep2);

  // Select Mode
  const modeBtn = page.locator(`button:has-text("${modeName}")`).first();
  await modeBtn.waitFor({ state: 'visible', timeout: 10000 });
  await modeBtn.click();
  console.log(`✓ Clicked mode: ${modeName}`);
  await page.waitForTimeout(1500);

  if (customPrompt) {
    const promptArea = page.locator('textarea[placeholder*="Örn:"]').first();
    if (await promptArea.isVisible()) {
      await promptArea.fill(customPrompt);
      console.log(`✓ Entered custom scene prompt: ${customPrompt}`);
      await page.waitForTimeout(1000);
    }
  }

  // Click Step 2 -> Step 3
  const step2NextBtn = page.locator('button:has-text("Son Kontrol →")').first();
  await step2NextBtn.waitFor({ state: 'visible', timeout: 15000 });
  await step2NextBtn.click();
  await page.waitForTimeout(2000);

  // Step 3: Review & Generate
  const ssStep3 = path.join(EVIDENCE_DIR, `${runKey}_03_step3.png`);
  await page.screenshot({ path: ssStep3 });
  runScreenshots.push(ssStep3);

  // Click submit
  const submitBtn = page.locator('.wb-wa-submit:has-text("Reklam Görselimi Oluştur")').first();
  await submitBtn.waitFor({ state: 'visible', timeout: 15000 });
  console.log(`Submitting generation via UI...`);
  await submitBtn.click();

  // Wait for redirect to /icerik/[id]
  await page.waitForURL(/\/icerik\/[0-9a-fA-F-]{36}/, { timeout: 45000 });
  const creativeId = page.url().split('/icerik/')[1]?.split('?')[0];
  console.log(`✓ Reached Detail View: ${creativeId}`);

  // In detail view: poll for completion
  const ssProgress = path.join(EVIDENCE_DIR, `${runKey}_04_detail_progress.png`);
  await page.screenshot({ path: ssProgress });
  runScreenshots.push(ssProgress);

  console.log(`Waiting for creative to render in UI...`);
  let isReady = false;
  for (let poll = 0; poll < 90; poll++) {
    await page.waitForTimeout(4000);
    const downloadBtn = page.locator('button:has-text("İndir"), a:has-text("İndir")').first();
    const fullSizeBtn = page.locator('button[aria-label="Görseli tam boyutta aç"]').first();
    if (await downloadBtn.isVisible() || await fullSizeBtn.isVisible()) {
      isReady = true;
      console.log(`✓ Output is READY in customer UI after ${(poll + 1) * 4}s!`);
      break;
    }
    const retryBtn = page.locator('button:has-text("Tekrar Dene")').first();
    if (await retryBtn.isVisible()) {
      console.log(`Retry button visible, clicking Tekrar Dene...`);
      await retryBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  const ssReady = path.join(EVIDENCE_DIR, `${runKey}_05_detail_ready.png`);
  await page.screenshot({ path: ssReady });
  runScreenshots.push(ssReady);

  // Download directly via download endpoint
  let bytes = 0;
  let hash = '';
  const outFileName = `${runKey}_${brandName.toLowerCase().replace(/\s+/g, '_')}_${modeName.toLowerCase().replace(/\s+/g, '_')}.png`;
  const outFilePath = path.join(OUTPUTS_DIR, outFileName);

  const cookies = await context.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const dlRes = await fetch(`${BASE_URL}/api/creatives/${creativeId}/download`, {
    headers: { Cookie: cookieHeader }
  });

  if (dlRes.ok) {
    const buf = Buffer.from(await dlRes.arrayBuffer());
    bytes = buf.length;
    hash = crypto.createHash('sha256').update(buf).digest('hex');
    fs.writeFileSync(outFilePath, buf);
    console.log(`✓ Successfully downloaded: ${outFileName} (${bytes} bytes, SHA256: ${hash})`);
  } else {
    console.error(`Failed to download via UI endpoint: ${dlRes.status}`);
  }

  const durationSeconds = Math.round((Date.now() - t0) / 1000);
  const result: FlowResult = {
    runId: runKey,
    brand: brandName,
    mode: modeName,
    creativeId,
    outputFile: outFilePath,
    sha256: hash,
    bytes,
    durationSeconds,
    screenshots: runScreenshots,
  };
  auditResults.push(result);
  return result;
}

async function runVariationFlow(
  page: Page,
  context: BrowserContext,
  baseCreativeId: string,
  runKey: string,
  brandName: string
): Promise<FlowResult> {
  const t0 = Date.now();
  const runScreenshots: string[] = [];
  console.log(`\n======================================================`);
  console.log(`[VARIATION FLOW ${runKey}] ${brandName} from Base: ${baseCreativeId}`);
  console.log(`======================================================`);

  await page.goto(`${BASE_URL}/icerik/${baseCreativeId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const ssBase = path.join(EVIDENCE_DIR, `${runKey}_01_base_detail.png`);
  await page.screenshot({ path: ssBase });
  runScreenshots.push(ssBase);

  // Click "Başka Tasarım Dene"
  const variationBtn = page.locator('button:has-text("Başka Tasarım Dene"), a:has-text("Başka Tasarım Dene")').first();
  await variationBtn.waitFor({ state: 'visible', timeout: 15000 });
  console.log(`Clicking "Başka Tasarım Dene"...`);
  await variationBtn.click();

  // Wait for redirect to /icerik/[newId]
  await page.waitForURL((url) => url.pathname.startsWith('/icerik/') && !url.pathname.includes(baseCreativeId), { timeout: 45000 });
  const newCreativeId = page.url().split('/icerik/')[1]?.split('?')[0];
  console.log(`✓ Created Variation Creative: ${newCreativeId}`);

  // Wait for rendering
  for (let poll = 0; poll < 90; poll++) {
    await page.waitForTimeout(4000);
    const downloadBtn = page.locator('button:has-text("İndir"), a:has-text("İndir")').first();
    const fullSizeBtn = page.locator('button[aria-label="Görseli tam boyutta aç"]').first();
    if (await downloadBtn.isVisible() || await fullSizeBtn.isVisible()) {
      console.log(`✓ Variation output is READY in UI after ${(poll + 1) * 4}s!`);
      break;
    }
  }

  const ssReady = path.join(EVIDENCE_DIR, `${runKey}_02_variation_ready.png`);
  await page.screenshot({ path: ssReady });
  runScreenshots.push(ssReady);

  // Download
  let bytes = 0;
  let hash = '';
  const outFileName = `${runKey}_${brandName.toLowerCase().replace(/\s+/g, '_')}_variation.png`;
  const outFilePath = path.join(OUTPUTS_DIR, outFileName);

  const cookies = await context.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const dlRes = await fetch(`${BASE_URL}/api/creatives/${newCreativeId}/download`, {
    headers: { Cookie: cookieHeader }
  });

  if (dlRes.ok) {
    const buf = Buffer.from(await dlRes.arrayBuffer());
    bytes = buf.length;
    hash = crypto.createHash('sha256').update(buf).digest('hex');
    fs.writeFileSync(outFilePath, buf);
    console.log(`✓ Successfully downloaded variation: ${outFileName} (${bytes} bytes, SHA256: ${hash})`);
  }

  const durationSeconds = Math.round((Date.now() - t0) / 1000);
  const result: FlowResult = {
    runId: runKey,
    brand: brandName,
    mode: 'Varyasyon (Başka Tasarım Dene)',
    creativeId: newCreativeId,
    outputFile: outFilePath,
    sha256: hash,
    bytes,
    durationSeconds,
    screenshots: runScreenshots,
  };
  auditResults.push(result);
  return result;
}

async function runRevisionFlow(
  page: Page,
  context: BrowserContext,
  baseCreativeId: string,
  runKey: string,
  brandName: string,
  newHeadline: string
): Promise<FlowResult> {
  const t0 = Date.now();
  const runScreenshots: string[] = [];
  console.log(`\n======================================================`);
  console.log(`[CONTROLLED REVISION FLOW ${runKey}] ${brandName} from Base: ${baseCreativeId}`);
  console.log(`======================================================`);

  await page.goto(`${BASE_URL}/icerik/${baseCreativeId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click "AI ile revize et"
  const reviseBtn = page.locator('button:has-text("AI ile revize et")').first();
  await reviseBtn.waitFor({ state: 'visible', timeout: 15000 });
  console.log(`Opening "AI ile revize et" modal...`);
  await reviseBtn.click();
  await page.waitForTimeout(1500);

  // 1. Fill instruction
  const instructionArea = page.locator('textarea[placeholder*="Başlığı kısalt"]').first();
  if (await instructionArea.isVisible()) {
    await instructionArea.fill('Başlığı değiştir; insanı, ağaçları, Delta 10L ürününü ve kompozisyonu birebir koru.');
    console.log(`✓ Entered revision instruction`);
  }

  // 2. Click "🔒 Sahneyi Koru"
  const keepSceneBtn = page.locator('button:has-text("🔒 Sahneyi Koru")').first();
  if (await keepSceneBtn.isVisible()) {
    await keepSceneBtn.click();
    console.log(`✓ Enabled "🔒 Sahneyi Koru"`);
  }

  // 3. Open details for direct copy change
  const copyDetails = page.locator('summary:has-text("Reklam metinlerini doğrudan değiştir")').first();
  if (await copyDetails.isVisible()) {
    await copyDetails.click();
    await page.waitForTimeout(500);
    const headlineInput = page.locator('input[maxlength="180"]').first();
    if (await headlineInput.isVisible()) {
      await headlineInput.fill(newHeadline);
      console.log(`✓ Entered deterministic headline: "${newHeadline}"`);
    }
  }

  const ssModal = path.join(EVIDENCE_DIR, `${runKey}_01_revision_modal.png`);
  await page.screenshot({ path: ssModal });
  runScreenshots.push(ssModal);

  // 4. Click Submit Revision
  const submitRevisionBtn = page.locator('button.wb-wa-submit, button[type="submit"]:has-text("Revizyon")').first();
  console.log(`Submitting controlled revision via modal...`);
  await submitRevisionBtn.click();

  // Wait for redirect to /icerik/[newId]
  await page.waitForURL((url) => url.pathname.startsWith('/icerik/') && !url.pathname.includes(baseCreativeId), { timeout: 45000 });
  const newCreativeId = page.url().split('/icerik/')[1]?.split('?')[0];
  console.log(`✓ Created Revision Creative: ${newCreativeId}`);

  // Wait for rendering
  for (let poll = 0; poll < 90; poll++) {
    await page.waitForTimeout(4000);
    const downloadBtn = page.locator('button:has-text("İndir"), a:has-text("İndir")').first();
    const fullSizeBtn = page.locator('button[aria-label="Görseli tam boyutta aç"]').first();
    if (await downloadBtn.isVisible() || await fullSizeBtn.isVisible()) {
      console.log(`✓ Revision output is READY in UI after ${(poll + 1) * 4}s!`);
      break;
    }
  }

  const ssReady = path.join(EVIDENCE_DIR, `${runKey}_02_revision_ready.png`);
  await page.screenshot({ path: ssReady });
  runScreenshots.push(ssReady);

  // Download
  let bytes = 0;
  let hash = '';
  const outFileName = `${runKey}_${brandName.toLowerCase().replace(/\s+/g, '_')}_revision.png`;
  const outFilePath = path.join(OUTPUTS_DIR, outFileName);

  const cookies = await context.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const dlRes = await fetch(`${BASE_URL}/api/creatives/${newCreativeId}/download`, {
    headers: { Cookie: cookieHeader }
  });

  if (dlRes.ok) {
    const buf = Buffer.from(await dlRes.arrayBuffer());
    bytes = buf.length;
    hash = crypto.createHash('sha256').update(buf).digest('hex');
    fs.writeFileSync(outFilePath, buf);
    console.log(`✓ Successfully downloaded revision: ${outFileName} (${bytes} bytes, SHA256: ${hash})`);
  }

  const durationSeconds = Math.round((Date.now() - t0) / 1000);
  const result: FlowResult = {
    runId: runKey,
    brand: brandName,
    mode: 'Kontrollü Revizyon (Başlık Değişimi)',
    creativeId: newCreativeId,
    outputFile: outFilePath,
    sha256: hash,
    bytes,
    durationSeconds,
    screenshots: runScreenshots,
  };
  auditResults.push(result);
  return result;
}

async function runWizardVideoCreation(
  page: Page,
  context: BrowserContext,
  runKey: string,
  brandName: string,
  productSubstring?: string,
  customVoiceover?: string
): Promise<FlowResult> {
  const t0 = Date.now();
  const runScreenshots: string[] = [];
  console.log(`\n======================================================`);
  console.log(`[VIDEO FLOW ${runKey}] ${brandName} - 9:16 Video`);
  console.log(`======================================================`);

  await page.goto(`${BASE_URL}/icerik/yeni?format=video`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Toggle Video format if needed
  const videoToggleBtn = page.locator('button:has-text("Video Reklam"), button:has-text("9:16 Video")').first();
  if (await videoToggleBtn.isVisible()) {
    await videoToggleBtn.click();
    console.log(`✓ Confirmed Video Reklam format selected`);
    await page.waitForTimeout(1000);
  }

  // Select Product
  if (productSubstring) {
    const isDelta = /delta/i.test(productSubstring);
    const is16L = /16l/i.test(productSubstring);
    const selector = isDelta
      ? '[data-product-name*="Delta" i], [data-testid*="20cec3de-b581-4e7e-a3fa-4ac5c2835226"], button:has-text("Delta"), button:has-text("10lt")'
      : is16L
      ? '[data-product-name*="16" i], [data-testid*="b359ccd3-1616-4000-8000-000000000016"], button:has-text("16")'
      : `button:has-text("${productSubstring}"), img[alt*="${productSubstring}"]`;
    const productBtn = page.locator(selector).first();
    await productBtn.waitFor({ state: 'visible', timeout: 10000 });
    await productBtn.click();
    console.log(`✓ Explicitly selected product: ${productSubstring} (selector: ${selector})`);
    await page.waitForTimeout(1000);
  }

  const ssStep1 = path.join(EVIDENCE_DIR, `${runKey}_01_step1_video.png`);
  await page.screenshot({ path: ssStep1 });
  runScreenshots.push(ssStep1);

  // Click Step 1 -> Step 2
  const step1NextBtn = page.locator('button:has-text("Devam Et (Görsel ve Metin)")').first();
  await step1NextBtn.waitFor({ state: 'visible', timeout: 15000 });
  await step1NextBtn.click();
  await page.waitForTimeout(2000);

  // Fill voiceover if provided
  if (customVoiceover) {
    const voArea = page.locator('textarea[placeholder*="Türkçe seslendirme"], textarea').first();
    if (await voArea.isVisible()) {
      await voArea.fill(customVoiceover);
      console.log(`✓ Entered custom voiceover: "${customVoiceover}"`);
      await page.waitForTimeout(1000);
    }
  }

  const ssStep2 = path.join(EVIDENCE_DIR, `${runKey}_02_step2_video.png`);
  await page.screenshot({ path: ssStep2 });
  runScreenshots.push(ssStep2);

  // Click Step 2 -> Step 3
  const step2NextBtn = page.locator('button:has-text("Son Kontrol →")').first();
  await step2NextBtn.waitFor({ state: 'visible', timeout: 15000 });
  await step2NextBtn.click();
  await page.waitForTimeout(2000);

  const ssStep3 = path.join(EVIDENCE_DIR, `${runKey}_03_step3_video.png`);
  await page.screenshot({ path: ssStep3 });
  runScreenshots.push(ssStep3);

  // Click "Reklam Videomu Oluştur"
  const submitBtn = page.locator('.wb-wa-submit:has-text("Reklam Videomu Oluştur")').first();
  await submitBtn.waitFor({ state: 'visible', timeout: 15000 });
  console.log(`Submitting video generation via UI...`);
  await submitBtn.click();

  // Wait for redirect to /icerik/[id]
  await page.waitForURL(/\/icerik\/[0-9a-fA-F-]{36}/, { timeout: 45000 });
  const creativeId = page.url().split('/icerik/')[1]?.split('?')[0];
  console.log(`✓ Reached Video Detail View: ${creativeId}`);

  // In detail view: observe video production progress
  await page.waitForTimeout(3000);
  const ssProgress = path.join(EVIDENCE_DIR, `${runKey}_04_video_progress.png`);
  await page.screenshot({ path: ssProgress });
  runScreenshots.push(ssProgress);

  // Download video if completed or capture progress
  let bytes = 0;
  let hash = '';
  const outFileName = `${runKey}_${brandName.toLowerCase().replace(/\s+/g, '_')}.mp4`;
  const outFilePath = path.join(OUTPUTS_DIR, outFileName);

  const cookies = await context.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const dlRes = await fetch(`${BASE_URL}/api/creatives/${creativeId}/download`, {
    headers: { Cookie: cookieHeader }
  });

  if (dlRes.ok) {
    const buf = Buffer.from(await dlRes.arrayBuffer());
    bytes = buf.length;
    hash = crypto.createHash('sha256').update(buf).digest('hex');
    fs.writeFileSync(outFilePath, buf);
    console.log(`✓ Downloaded video: ${outFileName} (${bytes} bytes, SHA256: ${hash})`);
  } else {
    console.log(`Video download endpoint returned status ${dlRes.status} (generation queued/in progress)`);
  }

  const durationSeconds = Math.round((Date.now() - t0) / 1000);
  const result: FlowResult = {
    runId: runKey,
    brand: brandName,
    mode: '9:16 Sinematik Video',
    creativeId,
    outputFile: bytes > 0 ? outFilePath : '',
    sha256: hash,
    bytes,
    durationSeconds,
    screenshots: runScreenshots,
  };
  auditResults.push(result);
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await login(page);

    if (process.argv.includes('--video-only')) {
      await setOrg(context, 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0');
      await runWizardVideoCreation(
        page,
        context,
        'bofe_07_video',
        'Bofe Tarım',
        'Delta 10L',
        'Bofe Tarım Delta 10L ile bahçenizde yüksek verim ve pratik ilaçlama kolaylığı.'
      );
      return;
    }
    await setOrg(context, '2881f690-6853-4064-8768-307463ae6255');
    await runWizardImageCreation(page, context, 'mesajify_02', 'Mesajify', 'Gösterişli Kampanya');

    // ==========================================
    // 2. BOFE TARIM RUNS (Switch Org: b359ccd3-3ec8-40fd-928e-bc6dbbd489c0)
    // ==========================================
    await setOrg(context, 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0');

    // Bofe Run 1: Smart Campaign (Bofe 16L)
    await runWizardImageCreation(
      page,
      context,
      'bofe_01',
      'Bofe Tarım',
      'Akıllı Kampanya',
      '16L'
    );

    // Bofe Run 2: Showstopper Campaign (Delta 10L)
    await runWizardImageCreation(
      page,
      context,
      'bofe_02',
      'Bofe Tarım',
      'Gösterişli Kampanya',
      'Delta 10L'
    );

    // Bofe Run 3: Real Life Campaign (Delta 10L in Garden/Orchard)
    const bofe3 = await runWizardImageCreation(
      page,
      context,
      'bofe_03',
      'Bofe Tarım',
      'Gerçek Kullanım',
      'Delta 10L',
      'Meyve bahçesinde ağaçların arasında Delta 10L ilaçlama pompası ile ilaçlama yapan çiftçi, gerçekçi gün ışığı ve canlı renkler'
    );

    // Bofe Run 4: Premium Showcase (Bofe 16L)
    await runWizardImageCreation(
      page,
      context,
      'bofe_04',
      'Bofe Tarım',
      'Premium Vitrin',
      '16L'
    );

    // Bofe Run 5: UI Variation ("Başka Tasarım Dene") from Bofe Run 3
    if (bofe3?.creativeId) {
      await runVariationFlow(page, context, bofe3.creativeId, 'bofe_05_variation', 'Bofe Tarım');
    }

    // Bofe Run 6: UI Controlled Revision (Revise headline only) from Bofe Run 3
    if (bofe3?.creativeId) {
      await runRevisionFlow(
        page,
        context,
        bofe3.creativeId,
        'bofe_06_revision',
        'Bofe Tarım',
        'YENİ SEZONDA BAHÇENİ KORU: DELTA 10L İLE TAM VERİM'
      );
    }

    // ==========================================
    // 3. VIDEO RUN VIA UI (Bofe Tarım)
    // ==========================================
    await runWizardVideoCreation(
      page,
      context,
      'bofe_07_video',
      'Bofe Tarım',
      'Delta 10L',
      'Bofe Tarım Delta 10L ile bahçenizde yüksek verim ve pratik ilaçlama kolaylığı.'
    );

    console.log('\n======================================================');
    console.log('SPECTACULAR FULL-SPECTRUM RUN FINISHED!');
    console.log(JSON.stringify(auditResults, null, 2));
    console.log('======================================================');

    fs.writeFileSync(
      path.join(process.cwd(), 'docs', 'audit', 'full_spectrum_ui_results.json'),
      JSON.stringify(auditResults, null, 2)
    );
  } catch (err) {
    console.error('Fatal execution error:', err);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
