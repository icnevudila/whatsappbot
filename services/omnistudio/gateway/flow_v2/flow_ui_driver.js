/**
 * Google Flow UI Sürücüsü (Minimalist & Savunmacı)
 * 
 * Upstream Kaynakları:
 * - DiegoLopez0208/google-flow-skill/flow_provider/ (Commit: ccd24a316b37ea43b208dc5fb72d3dc47c7dd6cc)
 *   (configure.py, canvas.py, wait.py - 16 Eylül 2026 Angular Material eşlemesi)
 * - swissmarley/gflow-cli/src/flow/ui.ts (Commit: 1e5d357f9b57c68f4341f4c7248db70eda2991a6)
 *   (data-gflow-pick işaretleme ve dismissOpenLayers)
 * - miyakejima/google-flow-mcp/src/flow-adapter.ts (Commit: 6826452a4a2e93bf7313d1be1626a9034fd7dc27)
 * 
 * Temel İlkeler:
 * - Arayüzle MINIMUM temas: Yalnızca generation ve çip iliştirme için kullanılır.
 * - Merkezi engel yönetimi (handleKnownObstructions).
 * - Bilinmeyen overlay durumunda ASLA kör tıklama yapma -> FLOW_UI_CHANGED üret, snapshot kaydet.
 */

const fs = require('fs');
const path = require('path');
const {
  FlowUiChangedError,
  FlowUsageLimitReachedError
} = require('./flow_errors.js');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class FlowUiDriver {
  /**
   * Bilinen engelleri (çerez onayı, gizlilik uyarısı, kapatılmamış menüler) temizler.
   * Eğer bilinmeyen bir engelleyici overlay tespit edilirse TAHMİNİ TIKLAMA YAPMAZ,
   * ekran görüntüsü ve DOM dökümü alarak FLOW_UI_CHANGED ile fail eder.
   */
  static async handleKnownObstructions(cdpSend, diagnostic = {}) {
    // 1. Bilinen diyalogları ve onay butonlarını kontrol et
    const checkRes = await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        // Bilinen onay ve kapatma butonları
        const knownButtons = [
          'button[aria-label*="cookie" i]',
          'button[aria-label*="çerez" i]',
          'button[aria-label*="close" i]',
          'button[aria-label*="kapat" i]',
          'button[aria-label*="dismiss" i]'
        ];

        let clickedKnown = false;
        for (const sel of knownButtons) {
          const btn = document.querySelector(sel);
          if (btn && btn.offsetParent !== null) {
            btn.click();
            clickedKnown = true;
            break;
          }
        }

        // Açık dialog/modal var mı?
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"], .cdk-overlay-pane:not(:empty)'));
        const visibleDialogs = dialogs.filter(d => {
          const rect = d.getBoundingClientRect();
          return rect.width > 200 && rect.height > 150 && window.getComputedStyle(d).visibility !== 'hidden';
        });

        // Bilinen diyalog metinleri (Örn: Terms, Privacy, Welcome)
        let unknownObstruction = null;
        for (const d of visibleDialogs) {
          const text = (d.innerText || '').toLowerCase();
          if (text.includes('welcome') || text.includes('hoş geldiniz') || text.includes('terms') || text.includes('şartlar') || text.includes('privacy')) {
            const okBtn = Array.from(d.querySelectorAll('button')).find(b => {
              const t = (b.innerText || '').toLowerCase();
              return t.includes('accept') || t.includes('kabul') || t.includes('anladım') || t.includes('got it') || t.includes('continue');
            });
            if (okBtn) {
              okBtn.click();
              clickedKnown = true;
              continue;
            }
          }
          // Bilinmeyen overlay
          unknownObstruction = {
            tagName: d.tagName,
            className: d.className,
            textSnippet: (d.innerText || '').slice(0, 300)
          };
        }

        return {
          clickedKnown,
          unknownObstruction
        };
      })()`,
      returnByValue: true
    });

    const result = checkRes?.result?.value;
    if (result?.clickedKnown) {
      await sleep(600);
    }

    // 2. Eğer tanınmayan bir engel varsa kanıt topla ve fail et
    if (result?.unknownObstruction) {
      let screenshotB64 = null;
      try {
        const snap = await cdpSend('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
        screenshotB64 = snap?.data;
      } catch (_) {}

      let htmlDump = '';
      try {
        const htmlRes = await cdpSend('Runtime.evaluate', { expression: 'document.documentElement.outerHTML' });
        htmlDump = htmlRes?.result?.value || '';
      } catch (_) {}

      // Snapshot'ı diske yaz
      const diagDir = diagnostic.diagnosticDir || '/app/gateway/outputs/diagnostics';
      try {
        if (!fs.existsSync(diagDir)) fs.mkdirSync(diagDir, { recursive: true });
        const ts = Date.now();
        if (screenshotB64) {
          fs.writeFileSync(path.join(diagDir, `ui_obstruction_${ts}.jpg`), Buffer.from(screenshotB64, 'base64'));
        }
        if (htmlDump) {
          fs.writeFileSync(path.join(diagDir, `ui_obstruction_${ts}.html`), htmlDump, 'utf8');
        }
      } catch (_) {}

      throw new FlowUiChangedError(
        `Bilinmeyen engelleyici arayüz elemanı: ${result.unknownObstruction.textSnippet}`,
        {
          obstruction: result.unknownObstruction,
          diagnosticDir: diagDir,
          ...diagnostic
        }
      );
    }

    // 3. Açık kalmış olabilecek menü/dropdown katmanlarını Escape ile kapat
    await this.dismissOpenLayers(cdpSend);
  }

  /**
   * Açık kalmış Radix / Angular menülerini (.cdk-overlay-pane) güvenli biçimde kapatır.
   */
  static async dismissOpenLayers(cdpSend) {
    for (let i = 0; i < 3; i++) {
      const check = await cdpSend('Runtime.evaluate', {
        expression: `(() => {
          const panes = Array.from(document.querySelectorAll('.cdk-overlay-pane, [data-radix-popper-content-wrapper]'));
          return panes.some(p => p.offsetParent !== null && p.getBoundingClientRect().height > 10);
        })()`,
        returnByValue: true
      });

      if (!check?.result?.value) break;

      await cdpSend('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
      await cdpSend('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
      await sleep(300);
    }
  }

  /**
   * Angular Material ayar paneli üzerinden video modunu, 9:16 oranını ve Veo modelini seçer.
   * Upstream referans: flow_provider/configure.py (icon-based language independent matching).
   */
  static async configureSettings(cdpSend, options = {}) {
    const targetModel = options.model || 'Veo 3.1 - Fast'; // Default Fast
    const targetAspect = options.aspectRatio || '9:16';
    const targetDuration = options.duration || 8;

    // 1. Prompt kutusundaki Ayarlar butonunu aç
    const openRes = await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('flow-base-prompt-box button[aria-label*="onfiguraci"]') ||
                    document.querySelector('flow-base-prompt-box button[aria-label*="settings" i]') ||
                    document.querySelector('flow-base-prompt-box button[aria-label*="ayar" i]') ||
                    document.querySelector('button[aria-label*="Tune" i]');
        if (!btn) return false;
        btn.click();
        return true;
      })()`,
      returnByValue: true
    });

    if (!openRes?.result?.value) {
      throw new FlowUiChangedError('Prompt barındaki Ayarlar (Tune/Settings) butonu bulunamadı.');
    }
    await sleep(800);

    // 2. Video Modunu seç (videocam ikonu)
    await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        const radios = Array.from(document.querySelectorAll('[role="radio"]'));
        const vid = radios.find(r => (r.innerText || '').includes('videocam') || (r.innerText || '').toLowerCase().includes('video'));
        if (vid) vid.click();
      })()`
    });
    await sleep(500);

    // 3. Oranı seç (crop_9_16 ikonu)
    if (targetAspect === '9:16') {
      await cdpSend('Runtime.evaluate', {
        expression: `(() => {
          const radios = Array.from(document.querySelectorAll('[role="radio"]'));
          const r916 = radios.find(r => (r.innerText || '').includes('crop_9_16') || (r.innerText || '').includes('9:16'));
          if (r916) r916.click();
        })()`
      });
      await sleep(400);
    }

    // 4. Model Ailesi seçimi (Veo 3.1)
    await cdpSend('Runtime.evaluate', {
      expression: `(async () => {
        const modelBtn = document.querySelector('button[aria-label*="familia de modelos"]') ||
                         document.querySelector('button[aria-label*="model" i]') ||
                         Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('Veo') || (b.innerText || '').includes('Nano'));
        if (modelBtn) {
          modelBtn.click();
          await new Promise(r => setTimeout(r, 600));
          const items = Array.from(document.querySelectorAll('[role="menuitem"], button'));
          const target = items.find(el => (el.innerText || '').includes('${targetModel}')) ||
                         items.find(el => (el.innerText || '').includes('Fast'));
          if (target) target.click();
        }
      })()`,
      awaitPromise: true
    });
    await sleep(500);

    // 5. Planlanan Kredi Maliyetini Oku (flow-credit-cost-label)
    const costRes = await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        const label = document.querySelector('flow-credit-cost-label');
        if (!label) return null;
        const m = (label.innerText || '').match(/([0-9]+)/);
        return m ? parseInt(m[1], 10) : null;
      })()`,
      returnByValue: true
    });
    const plannedCost = costRes?.result?.value;

    // Ayar panelini kapat
    await this.dismissOpenLayers(cdpSend);
    return {
      configured: true,
      model: targetModel,
      aspectRatio: targetAspect,
      plannedCost
    };
  }

  /**
   * Çipleri prompt kutusuna bağlar ve doğrular.
   * Upstream referans: flow_provider/canvas.py (button[aria-label*="ingredientes al cuadro"]).
   */
  static async attachIngredients(cdpSend, localMediaFiles = []) {
    if (!localMediaFiles || localMediaFiles.length === 0) return { attachedCount: 0 };

    // Varsa önceki çipleri temizle
    await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        const removeBtns = Array.from(document.querySelectorAll('.prompt-ingredient-bar button, flow-ingredient-bar button'));
        for (const btn of removeBtns) {
          const al = (btn.getAttribute('aria-label') || '').toLowerCase();
          if (al.includes('remove') || al.includes('kaldır') || al.includes('delete') || al.includes('sil') || al.includes('close')) {
            btn.click();
          }
        }
      })()`
    });
    await sleep(400);

    // CDP FileChooser dinleyicisini aktifleştir
    await cdpSend('Page.setInterceptFileChooserDialog', { enabled: true });
    let fileChooserReceived = false;

    // Dosyaları yükle
    const filePaths = localMediaFiles.map(f => f.path || String(f));
    
    // Açık menüden Cargar / Upload seç
    await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        const plusBtn = document.querySelector('button[aria-label*="ingredientes al cuadro"]') ||
                        document.querySelector('button[aria-label*="Add ingredients" i]') ||
                        document.querySelector('.prompt-ingredient-bar button');
        if (plusBtn) plusBtn.click();
      })()`
    });
    await sleep(1000);

    // Uploads sekmesine tıkla
    await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        const items = Array.from(document.querySelectorAll('mat-list-item, button, span'));
        const up = items.find(i => {
          const t = (i.innerText || '').trim().toLowerCase();
          return t === 'uploads' || t.includes('yüklemeler') || t === 'upload';
        });
        if (up) up.click();
      })()`
    });
    await sleep(1000);

    // Kartlardan prompt çipine ekle
    await cdpSend('Runtime.evaluate', {
      expression: `(async () => {
        const cards = Array.from(document.querySelectorAll('flow-grid-tile-container, flow-media-tile, div[class*="tile"]'));
        for (let i = 0; i < Math.min(cards.length, ${localMediaFiles.length}); i++) {
          const card = cards[i];
          const moreBtn = card.querySelector('button[aria-label*="More options" i]') || card.querySelector('button');
          if (moreBtn) {
            moreBtn.click();
            await new Promise(r => setTimeout(r, 500));
            const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], button'));
            const addBtn = menuItems.find(el => {
              const t = (el.innerText || '').toLowerCase();
              return t.includes('add to prompt') || t.includes('instrucci') || t.includes('ekle');
            });
            if (addBtn) {
              addBtn.click();
              await new Promise(r => setTimeout(r, 600));
            }
          }
        }
      })()`,
      awaitPromise: true
    });
    await sleep(1000);

    await this.dismissOpenLayers(cdpSend);

    // Kaç çip bağlandığını doğrula
    const checkRes = await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        const chips = document.querySelectorAll('flow-ingredient-chip, .prompt-ingredient-bar flow-ingredient-chip, .ingredient-chip');
        return chips.length;
      })()`,
      returnByValue: true
    });

    const count = checkRes?.result?.value || 0;
    return { attachedCount: count };
  }

  /**
   * Metni ProseMirror editörüne güvenle yazar ve üretim butonuna tıklar.
   */
  static async submitPrompt(cdpSend, promptText) {
    // 1. ProseMirror odaklan
    await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        const pm = document.querySelector('flow-rich-text-editor div.ProseMirror') || document.querySelector('div.ProseMirror');
        if (pm) {
          pm.focus();
          pm.innerText = '';
        }
      })()`
    });
    await sleep(300);

    // 2. Metni güvenle yaz
    await cdpSend('Input.insertText', { text: promptText });
    await sleep(800);

    // 3. Üretim butonuna tıkla (arrow_forward)
    const clickRes = await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        const submitBtn = document.querySelector('button[aria-label*="Generate" i]') ||
                          document.querySelector('button[aria-label*="üret" i]') ||
                          document.querySelector('button[aria-label*="Generar" i]') ||
                          Array.from(document.querySelectorAll('button')).find(b => {
                            const t = (b.innerText || '').trim();
                            return t === 'arrow_forward' || t === 'Generar' || t === 'Generate';
                          });
        if (submitBtn) {
          submitBtn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true
    });

    if (!clickRes?.result?.value) {
      throw new FlowUiChangedError('Prompt gönderme (Generate / arrow_forward) butonu bulunamadı.');
    }
  }

  /**
   * Üretim sürecini izler.
   * Upstream referans: flow_provider/wait.py (anlık limit tespiti + yüzde ilerleme).
   */
  static async pollGeneration(cdpSend, options = {}) {
    const timeoutMs = options.timeoutMs || 300000; // 5 dk
    const pollIntervalMs = 2500;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const stateRes = await cdpSend('Runtime.evaluate', {
        expression: `(() => {
          const bodyText = (document.body.innerText || '').toLowerCase();
          
          // Anlık kullanım kotası (UsageLimitReached) tespiti
          if (bodyText.includes('alcanzaste tu l') || bodyText.includes('limite de uso') || bodyText.includes('usage limit') || bodyText.includes('rate limit')) {
            return { limitReached: true };
          }

          // Hata tespiti
          if (bodyText.includes('no se pudo generar') || bodyText.includes('could not generate') || bodyText.includes('error al generar')) {
            return { errorDetected: true };
          }

          // Tile'lar ve ilerleme
          const tiles = Array.from(document.querySelectorAll('flow-tile-container'));
          let runningCount = 0;
          let highestProgress = 0;

          for (const t of tiles) {
            const txt = t.innerText || '';
            const m = txt.match(/([0-9]{1,3})%/);
            if (m) {
              runningCount++;
              highestProgress = Math.max(highestProgress, parseInt(m[1], 10));
            }
          }

          return {
            tilesCount: tiles.length,
            runningCount,
            highestProgress,
            hasVideoElement: !!document.querySelector('video[src], flow-video-tile video')
          };
        })()`,
        returnByValue: true
      });

      const state = stateRes?.result?.value;
      if (state?.limitReached) {
        throw new FlowUsageLimitReachedError(options.model || 'Veo', options.accountId || 'default');
      }

      if (state?.errorDetected) {
        throw new FlowUiChangedError('Google Flow arayüzünde model üretim hatası bildirdi (Could not generate).');
      }

      // Eğer çalışan tile yoksa ve en az 15 saniye geçtiyse üretim tamamlanmıştır
      const elapsed = Date.now() - startTime;
      if (elapsed > 12000 && state?.runningCount === 0) {
        return {
          completed: true,
          elapsedSeconds: Math.round(elapsed / 1000)
        };
      }

      await sleep(pollIntervalMs);
    }

    throw new FlowUiChangedError(`Video üretimi ${Math.round(timeoutMs / 1000)} saniye içerisinde tamamlanamadı (Zaman Aşımı).`);
  }
}

module.exports = FlowUiDriver;
