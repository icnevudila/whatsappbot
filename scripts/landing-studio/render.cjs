const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require('C:/Users/TP2/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../../apps/landing/public');
const output = path.join(root, 'landing/studio');
const port = process.argv.includes('--posters-only') ? 4192 : 4191;
const evidence = path.resolve(__dirname, '../../artifacts/landing-studio-2026-11-06');
fs.mkdirSync(evidence, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const selected = process.argv.filter(arg => ['discovery', 'creative', 'campaign', 'inbox', 'overview', 'hero', 'showcase', 'launch', 'import', 'contacts'].includes(arg));
  const modes = selected.length ? selected : ['discovery', 'creative', 'campaign', 'inbox', 'overview'];
  try {
    for (const mobile of (process.argv.includes('--mobile-only') ? [true] : [false, true])) {
      for (const mode of modes) {
        const suffix = mobile ? '-mobile' : '';
        const page = await browser.newPage({ viewport: mobile ? { width: 900, height: ({launch:720,import:900,contacts:900,discovery:900,inbox:920,showcase:920,creative:1080})[mode] || 1080 } : mode === 'hero' ? { width: 900, height: 540 } : mode === 'launch' ? {width:1000,height:720} : { width: 1400, height: 700 }, deviceScaleFactor: mobile || mode === 'hero' || mode === 'launch' ? 1 : 1920 / 1400 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${port}/landing/studio/${mode === 'launch' ? 'hero-clarity.html' : ['import','contacts','inbox','showcase','creative','discovery'].includes(mode) ? 'motion-film.html' : 'scene.html'}?mode=${mode}${mobile ? '&mobile' : ''}`);
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
        if(mode==='launch'){
          const geometry=[];
          for(const time of [2,5,8,12,15,18,22.8,26,30.5]){
            await page.evaluate(t=>seek(t),time);
            geometry.push(await page.evaluate(()=>{const r=document.querySelector('.workspace').getBoundingClientRect();return {time:document.body.dataset.time,beat:document.body.dataset.beat,window:[r.x,r.y,r.width,r.height],visiblePanels:[...document.querySelectorAll('[data-panel]')].filter(n=>getComputedStyle(n).display!=='none').length,heading:document.querySelector('h1')?.textContent}}));
          }
          if(geometry.some(g=>g.visiblePanels!==1||!g.heading||JSON.stringify(g.window)!==JSON.stringify(geometry[0].window)))throw Error('Hero workspace changed geometry or lost its active panel');
          fs.writeFileSync(path.join(evidence,'launch'+suffix+'-geometry.json'),JSON.stringify(geometry,null,2));
          const clicks=[[1.25,'[data-sync]'],[5.45,'.group'],[6.85,'.action'],[8.35,'[data-media-state]'],[9.85,'.action'],[10.35,'.textarea'],[13.85,'.action'],[14.9,'.line-card'],[16.85,'.action'],[19.85,'.action'],[21.25,'.time-fields>div:first-child'],[21.8,'.time-fields>div:last-child'],[22.45,'[data-plan]'],[30.45,'.composer']];
          const cursorAudit=[];
          for(const [time,selector] of clicks){await page.evaluate(t=>seek(t),time);cursorAudit.push(await page.evaluate(selector=>{const panel=[...document.querySelectorAll('[data-panel]')].find(n=>getComputedStyle(n).display!=='none'),target=panel.querySelector(selector).getBoundingClientRect(),cursor=document.querySelector('.pointer').getBoundingClientRect();return {time:document.body.dataset.time,selector,inside:cursor.x+4>=target.left&&cursor.x+4<=target.right&&cursor.y+4>=target.top&&cursor.y+4<=target.bottom}},selector));}
          if(cursorAudit.some(click=>!click.inside))throw Error('Hero cursor missed an actionable target: '+JSON.stringify(cursorAudit.filter(click=>!click.inside)));
          fs.writeFileSync(path.join(evidence,'launch'+suffix+'-cursor-audit.json'),JSON.stringify(cursorAudit,null,2));

        }
        await page.evaluate(t => seek(t), mode === 'overview' ? 12 : mode === 'launch' ? 30.5 : 15);
        await page.screenshot({ path: path.join(output, mode + suffix + '-poster.jpg'), type: 'jpeg', quality: 95 });
        for (const second of (mode === 'launch' ? [2,5,8,12,15,18,22.8,26,30.5] : [2,7,12,17])) {
          await page.evaluate(t => seek(t), second);
          await page.screenshot({ path: path.join(evidence, `${mode}${suffix}-${second}s.jpg`), type: 'jpeg', quality: 93 });
        }
        if (errors.length) throw Error(errors.join('\n'));
        console.log(mode + suffix, 'poster and keyframes ready');
        if (!process.argv.includes('--posters-only')) {
          const target = path.join(output, mode + suffix + '.mp4');
          const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-vcodec', 'mjpeg', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target], { stdio: ['pipe', 'ignore', 'pipe'] });
          let ffErrors = ''; ff.stderr.on('data', data => ffErrors += data);
          const completion = once(ff, 'close');
          const cdp = await page.context().newCDPSession(page);
          const frames = (mode === 'overview' ? 28 : mode === 'launch' ? 34 : 20) * 30;
          for (let index = 0; index < frames; index++) {
            await page.evaluate(t => seek(t), index / 30);
            const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94 });
            if (!ff.stdin.write(Buffer.from(shot.data, 'base64'))) await once(ff.stdin, 'drain');
            if (index % 150 === 0) console.log(mode + suffix, `${index}/${frames}`);
          }
          ff.stdin.end(); const [code] = await completion;
          if (code) throw Error(ffErrors);
          console.log(mode + suffix, 'MP4 complete', fs.statSync(target).size);
        }
        await page.close();
      }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
