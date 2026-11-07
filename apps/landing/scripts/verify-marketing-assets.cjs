const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const app = path.resolve(__dirname, '..');
const root = path.join(app, 'public');
const media = '/landing/studio/';
const files = new Set(['/brand/mesajify-logo-full.png', '/brand/mesajify-symbol.png', '/og-image.png', media + 'scene.html', media + 'scene.css', media + 'scene.js', media + 'istanbul-map.webp']);
for (const file of ['motion-film.html','motion-film.css','motion-film.js','scene-mobile-refinement.css','film-system.css','liora-source.webp','liora-campaign.webp']) files.add(media+file);
files.add(media+'mori-craft-v3.webp');
for(const name of ['line-seed-latin-400.woff2','line-seed-latin-ext-400.woff2','line-seed-latin-700.woff2','line-seed-latin-ext-700.woff2','LINE-SEED-OFL.txt','INTER-LICENSE.txt','inter-latin.woff2','inter-turkish.woff2','inter-latin-ext.woff2']) files.add('/fonts/'+name);
for(const name of fs.readdirSync(path.join(root,'landing/brands'))) files.add('/landing/brands/'+name);
for (const brand of ['mori', 'novi', 'rota']) for (const role of ['source', 'campaign']) files.add(`${media}${brand}-${role}.webp`);
for (const mode of ['discovery', 'creative', 'campaign', 'inbox', 'showcase', 'launch', 'import', 'contacts']) for (const suffix of ['', '-mobile']) {
  files.add(`${media}${mode}${suffix}.mp4`);
  files.add(`${media}${mode}${suffix}-poster.jpg`);
}
const scene = fs.readFileSync(path.join(root, media, 'scene.html'), 'utf8');
for (const [, ref] of scene.matchAll(/<img[^>]+src="([^"]+)"/g)) files.add(ref.startsWith('/') ? ref : media + ref);
const rows = [];
for (const file of files) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) throw Error('Missing active marketing asset: ' + file);
  const bytes = fs.readFileSync(absolute);
  if (!bytes.length) throw Error('Empty asset: ' + file);
  const row = { file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  if (process.argv.includes('--metadata') && file.endsWith('.mp4')) {
    row.probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate:format=duration', '-of', 'json', absolute], { encoding: 'utf8' }));
    const stream = row.probe.streams?.find(s => s.codec_name === 'h264');
    const mobile = file.includes('-mobile');
    const launch=file.includes('/launch');
    const mode=path.basename(file).replace('-mobile','').replace('.mp4','');
    const mobileHeight=({launch:720,import:900,contacts:900,discovery:900,inbox:920,showcase:920,creative:1080,campaign:1080})[mode];
    if (!stream || stream.width !== (mobile ? 900 : launch ? 1000 : 1400) || stream.height !== (mobile ? mobileHeight : launch ? 720 : 700)) throw Error('Unexpected video encoding: ' + file);
    const expectedDuration=launch?26:20;
    if (Math.abs(Number(row.probe.format?.duration)-expectedDuration)>.15) throw Error('Incomplete video duration: '+file);
    execFileSync('ffmpeg', ['-v', 'error', '-i', absolute, '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
  }
  rows.push(row);
}
if (process.argv.includes('--metadata')) {
  const target = path.join(app, 'docs/MARKETING-ASSET-VERIFICATION.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify({ date: new Date().toISOString(), scope: 'Current marketing home and detail pages', pending: [], assets: rows }, null, 2));
}
console.log(`${rows.length} current marketing assets verified; 0 pending media slots.`);
