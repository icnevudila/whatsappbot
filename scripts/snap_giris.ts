import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  // Mobile
  const mobileCtx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mPage = await mobileCtx.newPage();
  await mPage.goto('http://localhost:3003/giris', { waitUntil: 'networkidle' });
  await mPage.screenshot({
    path: 'C:/Users/TP2/.gemini/antigravity/brain/37d1d899-fae3-4899-bdfd-673b445e75b8/giris_current_mobile.png'
  });

  // Desktop
  const deskCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const dPage = await deskCtx.newPage();
  await dPage.goto('http://localhost:3003/giris', { waitUntil: 'networkidle' });
  await dPage.screenshot({
    path: 'C:/Users/TP2/.gemini/antigravity/brain/37d1d899-fae3-4899-bdfd-673b445e75b8/giris_current_desktop.png'
  });

  await browser.close();
  console.log('OK_SNAPSHOTS_DONE');
}

main().catch((err) => {
  console.error('ERROR_SNAP:', err);
  process.exit(1);
});
