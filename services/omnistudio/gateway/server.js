/**
 * OmniStudio Central API Gateway (Gelişmiş Versiyon)
 * Port: 3456
 * 
 * Yeni Özellikler:
 * 1. Resim üzerinden yeni görsel (Image-to-Image / Edits): POST /v1/images/edits
 * 2. Marka Kiti & Referans Görsel Desteği: images[] (URL veya Base64)
 * 3. Otomatik Prompt Optimizasyonu (Prompt Enhancer): Kısa/ham promptları DALL-E 3 / Imagen 3 kalitesine genişletir.
 * 4. Akıllı Sıra & İlerleme Takibi: GET /v1/images/status/:id (Kuyruk sırası, % ilerleme)
 * 5. Çift Yönlü Mutex (ChatGPT & Gemini paralel çalışma)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT || '3456', 10);
const OUTPUT_DIR = path.resolve(__dirname, 'outputs');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Otomatik Prompt Genişletici (Prompt Enhancer)
function enhancePrompt(rawPrompt, options = {}) {
  let prompt = rawPrompt.trim();
  const { style, brandKit, aspect = '1:1' } = options;

  // Marka kiti bilgisi varsa ekle
  if (brandKit) {
    if (brandKit.name) prompt += `. Brand: ${brandKit.name}`;
    if (brandKit.colors) prompt += `. Brand Colors: ${JSON.stringify(brandKit.colors)}`;
    if (brandKit.tone) prompt += `. Tone: ${brandKit.tone}`;
  }

  // Kalite artırıcı optimize anahtar kelimeler (eğer kullanıcı çok kısa yazdıysa)
  if (prompt.length < 120 && !prompt.toLowerCase().includes('lighting') && !prompt.toLowerCase().includes('quality')) {
    prompt += `, ultra-high resolution, commercial marketing photography, professional lighting, cinematic composition, sharp focus, 8k, award winning advertising aesthetic`;
  }

  return prompt;
}

// Gelişmiş Kuyruk Yöneticisi
class AdvancedJobQueue {
  constructor() {
    this.jobs = new Map();
    this.pendingQueue = [];
    this.activeWorkers = {
      chatgpt: null,
      gemini: null,
    };
    this.waiters = new Map();
  }

  createJob({
    prompt,
    size = '1024x1024',
    platform = 'auto',
    response_format = 'url',
    workspace = 'WhatsApp Botu',
    referenceImages = [], // URL veya Base64 dizisi (Ürün, Logo, Önceki Görsel)
    brandKit = null,
    optimizePrompt = true,
  }) {
    const id = 'job_' + crypto.randomBytes(8).toString('hex');
    const finalPrompt = optimizePrompt ? enhancePrompt(prompt, { brandKit, size }) : prompt;

    const job = {
      id,
      originalPrompt: prompt,
      prompt: finalPrompt,
      size,
      platform: platform.toLowerCase(),
      response_format,
      workspace,
      referenceImages, // Referans görseller (Image-to-Image için)
      brandKit,
      status: 'pending', // 'pending' | 'processing' | 'completed' | 'failed'
      progress: 0,
      queuePosition: this.pendingQueue.length + 1,
      resultUrl: null,
      resultB64: null,
      error: null,
      assignedTo: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    };

    this.jobs.set(id, job);
    this.pendingQueue.push(id);
    this.recalculatePositions();
    return job;
  }

  recalculatePositions() {
    this.pendingQueue.forEach((jobId, index) => {
      const j = this.jobs.get(jobId);
      if (j) j.queuePosition = index + 1;
    });
  }

  getNextJob(workerPlatform) {
    const p = workerPlatform.toLowerCase();
    if (this.activeWorkers[p]) return null;

    const jobIndex = this.pendingQueue.findIndex(jobId => {
      const job = this.jobs.get(jobId);
      if (!job || job.status !== 'pending') return false;
      if (job.platform === 'auto' || job.platform === p) return true;
      return false;
    });

    if (jobIndex === -1) return null;

    const [jobId] = this.pendingQueue.splice(jobIndex, 1);
    this.recalculatePositions();

    const job = this.jobs.get(jobId);
    job.status = 'processing';
    job.assignedTo = p;
    job.progress = 25;
    job.startedAt = Date.now();
    this.activeWorkers[p] = jobId;

    return job;
  }

  updateProgress(jobId, progressPercent) {
    const job = this.jobs.get(jobId);
    if (job) job.progress = progressPercent;
  }

  releaseLock(jobId, error = null) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (job.assignedTo && this.activeWorkers[job.assignedTo] === jobId) {
      this.activeWorkers[job.assignedTo] = null;
    }

    if (error) {
      job.status = 'failed';
      job.error = error;
      job.completedAt = Date.now();
      this.notifyWaiters(jobId, job);
    } else if (job.status === 'processing') {
      job.status = 'pending';
      job.assignedTo = null;
      job.progress = 0;
      job.startedAt = null;
      this.pendingQueue.unshift(jobId);
      this.recalculatePositions();
    }
  }

  completeJob(jobId, filename, buffer) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const publicUrl = `http://localhost:${PORT}/outputs/${filename}`;
    job.status = 'completed';
    job.progress = 100;
    job.resultUrl = publicUrl;
    job.resultB64 = buffer.toString('base64');
    job.completedAt = Date.now();

    if (job.assignedTo && this.activeWorkers[job.assignedTo] === jobId) {
      this.activeWorkers[job.assignedTo] = null;
    }

    this.notifyWaiters(jobId, job);
    return job;
  }

  waitForJob(jobId, timeoutMs = 120000) {
    return new Promise((resolve) => {
      const job = this.jobs.get(jobId);
      if (!job) return resolve({ error: 'Job not found' });
      if (job.status === 'completed' || job.status === 'failed') {
        return resolve(job);
      }

      if (!this.waiters.has(jobId)) {
        this.waiters.set(jobId, []);
      }
      const list = this.waiters.get(jobId);
      const timer = setTimeout(() => {
        resolve({ ...job, status: 'failed', error: 'Tarayıcı işçisi zaman aşımına uğradı (120s)' });
      }, timeoutMs);

      list.push((updated) => {
        clearTimeout(timer);
        resolve(updated);
      });
    });
  }

  notifyWaiters(jobId, job) {
    const list = this.waiters.get(jobId);
    if (list && list.length > 0) {
      list.forEach(fn => fn(job));
      this.waiters.delete(jobId);
    }
  }

  getStats() {
    return {
      pending: this.pendingQueue.length,
      total: this.jobs.size,
      activeWorkers: this.activeWorkers,
      recent: Array.from(this.jobs.values()).slice(-20).reverse(),
    };
  }
}

const queue = new AdvancedJobQueue();

// Periyodik zombi iş temizleme (200s)
setInterval(() => {
  const now = Date.now();
  for (const [platform, jobId] of Object.entries(queue.activeWorkers)) {
    if (jobId) {
      const job = queue.jobs.get(jobId);
      if (job && now - job.startedAt > 200000) {
        console.warn(`[Gateway] Zaman aşımı: ${platform} üzerindeki ${jobId} işi serbest bırakılıyor.`);
        queue.releaseLock(jobId, 'Browser worker timeout (200s)');
      }
    }
  }
}, 5000);

// Yardımcılar
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  });
  res.end(JSON.stringify(payload));
}

// HTTP Sunucusu
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    });
    return res.end();
  }

  try {
    // 1. Standart Görsel Üretimi VEYA Edits: POST /v1/images/generations & /v1/images/edits
    if (method === 'POST' && (
      pathname === '/v1/images/generations' ||
      pathname === '/images/generations' ||
      pathname === '/v1/images/edits' ||
      pathname === '/images/edits'
    )) {
      const body = await parseJsonBody(req);
      const prompt = body.prompt;

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return sendJson(res, 400, {
          error: { message: 'Prompt alanı zorunludur.', type: 'invalid_request_error' },
        });
      }

      const platform = body.platform || 'auto';
      const size = body.size || '1024x1024';
      const response_format = body.response_format || 'url';
      const workspace = body.workspace || 'WhatsApp Botu';
      const referenceImages = body.referenceImages || body.images || (body.image ? [body.image] : []);
      const brandKit = body.brandKit || null;
      const asyncMode = body.async === true || parsedUrl.searchParams.get('async') === 'true';

      console.log(`[Gateway] Yeni iş alındı: "${prompt.slice(0, 50)}..." [RefGörsel: ${referenceImages.length}, Kit: ${brandKit ? 'Var' : 'Yok'}]`);

      const job = queue.createJob({
        prompt,
        size,
        platform,
        response_format,
        workspace,
        referenceImages,
        brandKit,
        optimizePrompt: body.optimize !== false,
      });

      // Eğer async istenmişse anında job_id dön (WhatsApp botu polling yapacaksa)
      if (asyncMode) {
        return sendJson(res, 202, {
          job_id: job.id,
          status: 'pending',
          queue_position: job.queuePosition,
          status_url: `http://localhost:${PORT}/v1/images/status/${job.id}`,
        });
      }

      // Senkron bekleme modu (OpenAI SDK ile birebir uyumlu, ChatGPT 2dk çizim payı)
      const finishedJob = await queue.waitForJob(job.id, 180000);

      if (finishedJob.status === 'completed') {
        const item = {};
        if (response_format === 'b64_json') {
          item.b64_json = finishedJob.resultB64;
        } else {
          item.url = finishedJob.resultUrl;
        }

        return sendJson(res, 200, {
          created: Math.floor(finishedJob.completedAt / 1000),
          data: [item],
          job_id: finishedJob.id,
          platform: finishedJob.assignedTo,
        });
      } else {
        return sendJson(res, 502, {
          error: {
            message: finishedJob.error || 'Görsel üretilemedi.',
            type: 'server_error',
            job_id: finishedJob.id,
          },
        });
      }
    }

    // 2. Durum ve İlerleme Sorgulama: GET /v1/images/status/:id
    if (method === 'GET' && pathname.startsWith('/v1/images/status/')) {
      const jobId = pathname.replace('/v1/images/status/', '');
      const job = queue.jobs.get(jobId);
      if (!job) {
        return sendJson(res, 404, { error: 'Job not found' });
      }
      return sendJson(res, 200, {
        id: job.id,
        status: job.status,
        progress: job.progress,
        queue_position: job.status === 'pending' ? job.queuePosition : 0,
        result_url: job.resultUrl,
        error: job.error,
      });
    }

    // 3. Worker: Boştaki İşi Çek (GET /job/next?platform=chatgpt)
    if (method === 'GET' && pathname === '/job/next') {
      const platform = parsedUrl.searchParams.get('platform') || 'chatgpt';
      const job = queue.getNextJob(platform);
      return sendJson(res, 200, { job });
    }

    // 4. Worker: İlerleme Bildir (POST /job/progress)
    if (method === 'POST' && pathname === '/job/progress') {
      const body = await parseJsonBody(req);
      if (body.jobId && typeof body.progress === 'number') {
        queue.updateProgress(body.jobId, body.progress);
      }
      return sendJson(res, 200, { ok: true });
    }

    // 5. Worker: Kilidi Serbest Bırak / Hata Bildir (POST /job/release)
    if (method === 'POST' && pathname === '/job/release') {
      const body = await parseJsonBody(req);
      const { jobId, error } = body;
      if (jobId) {
        queue.releaseLock(jobId, error);
      }
      return sendJson(res, 200, { ok: true });
    }

    // 6. Worker: Görsel Yükle (POST /upload?jobId=...&filename=...)
    if (method === 'POST' && pathname === '/upload') {
      const jobId = parsedUrl.searchParams.get('jobId') || req.headers['x-job-id'];
      let filename = parsedUrl.searchParams.get('filename') || req.headers['x-filename'];

      if (!filename) {
        filename = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.png`;
      }
      if (!filename.endsWith('.png') && !filename.endsWith('.jpg') && !filename.endsWith('.webp')) {
        filename += '.png';
      }

      const buffer = await parseRawBody(req);
      if (!buffer || buffer.length === 0) {
        return sendJson(res, 400, { error: 'Empty payload' });
      }

      const filePath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filePath, buffer);
      console.log(`[Gateway] Görsel diske yazıldı (${(buffer.length / 1024).toFixed(1)} KB): ${filename}`);

      if (jobId) {
        const completed = queue.completeJob(jobId, filename, buffer);
        return sendJson(res, 200, { ok: true, filename, url: completed?.resultUrl });
      }

      return sendJson(res, 200, { ok: true, filename, url: `http://localhost:${PORT}/outputs/${filename}` });
    }

    // 7. Statik Görsel Sunumu: GET /outputs/:filename
    if (method === 'GET' && pathname.startsWith('/outputs/')) {
      const filename = path.basename(pathname.replace('/outputs/', ''));
      const filePath = path.join(OUTPUT_DIR, filename);

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('File not found');
      }

      const ext = path.extname(filePath).toLowerCase();
      let mime = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
      if (ext === '.webp') mime = 'image/webp';

      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    // 8. Sistem Durumu: GET /health veya GET /stats
    if (method === 'GET' && (pathname === '/health' || pathname === '/stats' || pathname === '/')) {
      return sendJson(res, 200, {
        service: 'OmniStudio AI Visual Gateway',
        status: 'online',
        port: PORT,
        ...queue.getStats(),
      });
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (err) {
    console.error('[Gateway Hata]', err);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 OmniStudio AI Visual Gateway (V2 Gelişmiş) Çalışıyor!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🎨 Generations: http://localhost:${PORT}/v1/images/generations`);
  console.log(`🖼️ Edits/Varyasyon: http://localhost:${PORT}/v1/images/edits`);
  console.log(`📂 Outputs: ${OUTPUT_DIR}`);
  console.log(`====================================================`);
});
