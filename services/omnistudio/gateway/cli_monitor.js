/**
 * OmniStudio Live CLI Terminal Monitor
 * Connects to Gateway SSE (/events) and prints formatted activity logs to console.
 * Zero CPU overhead.
 * 
 * Usage: node cli_monitor.js [http://localhost:3456]
 */

const http = require('http');
const { URL } = require('url');

const GATEWAY = process.argv[2] || process.env.GATEWAY_URL || 'http://127.0.0.1:3456';
const url = new URL('/events', GATEWAY);

// ANSI Renkleri
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function timeStr() {
  return new Date().toTimeString().split(' ')[0];
}

console.log(`${C.bold}${C.cyan}====================================================${C.reset}`);
console.log(`${C.bold}${C.cyan}  OmniStudio Canli Terminal Izleme (CLI Monitor)${C.reset}`);
console.log(`${C.dim}  Hedef: ${url.href}${C.reset}`);
console.log(`${C.bold}${C.cyan}====================================================${C.reset}\n`);

function connect() {
  const req = http.get(url, (res) => {
    if (res.statusCode !== 200) {
      console.error(`${C.red}[${timeStr()}] [BAGLANTI HATASI] HTTP ${res.statusCode}${C.reset}`);
      setTimeout(connect, 3000);
      return;
    }

    console.log(`${C.green}[${timeStr()}] [BAGLANDI] Gateway olay akisi baslatildi.${C.reset}\n`);

    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop(); // son tam olmayan satırı sakla

      let currentEvent = 'message';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            handleEvent(currentEvent, json);
          } catch (e) {}
        }
      }
    });

    res.on('end', () => {
      console.warn(`${C.yellow}[${timeStr()}] [KOPTU] Sunucu baglantisi kapandi. Yeniden baglaniliyor...${C.reset}`);
      setTimeout(connect, 2500);
    });
  });

  req.on('error', (err) => {
    console.error(`${C.red}[${timeStr()}] [HATA] ${err.message}. 3s sonra tekrar denenecek...${C.reset}`);
    setTimeout(connect, 3000);
  });
}

function handleEvent(event, payload) {
  const data = payload.data || payload;
  const t = timeStr();

  switch (event) {
    case 'init':
      const stats = data.stats || {};
      console.log(`${C.dim}[${t}] [BILGI] Sistem hazir | Bekleyen: ${stats.pending || 0} | Aktif Worker: ${stats.activeCount || 0}${C.reset}`);
      break;

    case 'job_created':
      console.log(
        `${C.blue}${C.bold}[${t}] [YENI ISTEK]${C.reset} ` +
        `Musteri: ${C.bold}${data.customer || 'Panel'}${C.reset} ` +
        `| ID: ${data.id} ` +
        `| Prompt: "${(data.promptPreview || data.originalPrompt || '').slice(0, 60)}..." ` +
        `${data.referenceImagesCount ? `[${data.referenceImagesCount} Ref Gorsel]` : ''}`
      );
      break;

    case 'job_assigned':
      console.log(
        `${C.magenta}${C.bold}[${t}] [ISCIYE ATANDI]${C.reset} ` +
        `Gorev: ${data.id} -> ${C.bold}${C.cyan}${data.assignedTo}${C.reset} iscisine verildi.`
      );
      break;

    case 'job_progress':
      process.stdout.write(
        `\r${C.yellow}[${t}] [ILERLEME] Gorev: ${data.id} [%${data.progress}] ${data.statusText || ''} (${data.elapsedSeconds || 0}s)${C.reset} `
      );
      break;

    case 'job_completed':
      console.log(
        `\n${C.green}${C.bold}[${t}] [TAMAMLANDI]${C.reset} ` +
        `Gorev: ${data.id} ` +
        `| Sure: ${Math.round((data.durationMs || 0) / 1000)}s ` +
        `| Gorsel: ${C.bold}${data.resultUrl || 'hazir'}${C.reset}`
      );
      break;

    case 'job_failed':
      console.log(
        `\n${C.red}${C.bold}[${t}] [HATA]${C.reset} ` +
        `Gorev: ${data.id} | Hata: ${data.error || 'Bilinmeyen'}`
      );
      break;
  }
}

connect();
