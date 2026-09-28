const WebSocket = (() => {
  try { return require('ws'); } catch { return globalThis.WebSocket; }
})();

const FLOW_URL = 'https://flow.google.com/';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isExpectedFlowAccount(observedEmail, expectedEmail) {
  const observed = normalizeEmail(observedEmail);
  const expected = normalizeEmail(expectedEmail);
  return Boolean(observed && expected && observed === expected);
}

function normalizeCreditInteger(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseFlowCredits(texts) {
  const candidates = Array.isArray(texts) ? texts : [texts];
  const patterns = [
    /(\d[\d.,\s\u00a0]*)\s*(?:google\s+flow\s+)?(?:kredisi|kredi|credits?|cr[eé]ditos?)(?:\s+(?:de\s+)?google\s+flow)?/i,
    /(?:google\s+flow)\s+(\d[\d.,\s\u00a0]*)\s*(?:kredisi|kredi|credits?|cr[eé]ditos?)/i,
  ];

  for (const candidate of candidates) {
    const text = String(candidate || '').replace(/\s+/g, ' ').trim();
    if (!text || !/google\s+flow/i.test(text)) continue;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) continue;
      const value = normalizeCreditInteger(match[1]);
      if (value != null) return value;
    }
  }
  return null;
}

function parseEmail(texts) {
  // Parent menu nodes may concatenate name + email + adjacent labels without
  // whitespace. Prefer the smallest matching leaf text, which is normally the
  // dedicated email element, instead of joining every DOM candidate together.
  const candidates = (Array.isArray(texts) ? texts : [texts])
    .map(value => String(value || '').trim())
    .filter(value => value.includes('@'))
    .sort((left, right) => left.length - right.length);
  for (const candidate of candidates) {
    const match = candidate.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (match) return match[1].toLowerCase().trim();
  }
  return null;
}

function cdpRequest(ws, id, method, params = {}, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`CDP ${method} zaman aşımı`));
    }, timeoutMs);
    const onMessage = event => {
      const raw = typeof event?.data === 'string' ? event.data : (event?.data || event).toString();
      try {
        const message = JSON.parse(raw);
        if (message.id !== id) return;
        cleanup();
        if (message.error) reject(new Error(message.error.message || `CDP ${method} hatası`));
        else resolve(message.result || {});
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    const onError = error => {
      cleanup();
      reject(error instanceof Error ? error : new Error('CDP WebSocket hatası'));
    };
    const cleanup = () => {
      clearTimeout(timer);
      if (typeof ws.off === 'function') {
        ws.off('message', onMessage);
        ws.off('error', onError);
      } else {
        ws.removeEventListener?.('message', onMessage);
        ws.removeEventListener?.('error', onError);
      }
    };
    if (typeof ws.on === 'function') {
      ws.on('message', onMessage);
      ws.on('error', onError);
    } else {
      ws.addEventListener('message', onMessage);
      ws.addEventListener('error', onError);
    }
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function connectWebSocket(url, timeoutMs = 8_000) {
  if (!WebSocket) throw new Error('WebSocket desteği bulunamadı');
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CDP bağlantı zaman aşımı')), timeoutMs);
    const onOpen = () => {
      clearTimeout(timer);
      resolve();
    };
    const onError = error => {
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error('CDP bağlantı hatası'));
    };
    if (typeof ws.once === 'function') {
      ws.once('open', onOpen);
      ws.once('error', onError);
    } else {
      ws.addEventListener('open', onOpen, { once: true });
      ws.addEventListener('error', onError, { once: true });
    }
  });
  return ws;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function listTabs(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error(`Port ${port} Chrome HTTP ${response.status}`);
  return response.json();
}

async function ensureFlowTab(port) {
  let tabs = await listTabs(port);
  let tab = tabs.find(item => item.type === 'page' && /^https:\/\/flow\.google\.com(?:\/|$)/.test(String(item.url || '')));
  // When Google redirects a Flow session to an account chooser/login page, the
  // same CDP target no longer has a flow.google.com URL. Reuse that target so
  // the recovery routine can select the verified account instead of opening an
  // unrelated second tab and losing the auth context.
  if (!tab) {
    tab = tabs.find(item => item.type === 'page' && /accounts\.google\.com/i.test(String(item.url || '')));
  }
  if (!tab) {
    const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(FLOW_URL)}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Port ${port} Flow sekmesi açılamadı`);
    tab = await response.json();
  }
  if (!tab?.webSocketDebuggerUrl) throw new Error(`Port ${port} Flow CDP sekmesi bulunamadı`);
  return tab;
}

async function inspectFlowAccount(port, options = {}) {
  const expectedEmail = normalizeEmail(options.expectedEmail);
  const tab = await ensureFlowTab(port);
  const ws = await connectWebSocket(tab.webSocketDebuggerUrl);
  let nextId = 1;
  const send = (method, params, timeoutMs) => cdpRequest(ws, nextId++, method, params, timeoutMs);

  try {
    await send('Runtime.enable');
    await send('Page.enable');
    const current = await send('Runtime.evaluate', {
      expression: 'window.location.href',
      returnByValue: true,
    });
    if (!String(current?.result?.value || '').includes('flow.google.com') &&
        !String(current?.result?.value || '').includes('accounts.google.com')) {
      await send('Page.navigate', { url: FLOW_URL });
    }
    await wait(3_500);

    const inspectExpression = (expectedEmail = null) => `(() => {
        const bodyText = document.body ? document.body.innerText : '';
        const currentHref = String(location.href || '');
        const onGoogleAuth = /accounts\\.google\\.com/i.test(currentHref);
        const chooserVisible = onGoogleAuth && /choose an account|hesap seç|bir hesap seç/i.test(bodyText);
        let accountChooserClicked = false;
        const expectedEmail = ${JSON.stringify(normalizeEmail(expectedEmail))};
        if (chooserVisible && expectedEmail) {
          const candidate = Array.from(document.querySelectorAll('a,button,[role="link"],[role="button"],div'))
            .find(node => String(node.innerText || node.getAttribute('aria-label') || '').toLowerCase().includes(expectedEmail));
          if (candidate) {
            candidate.click();
            accountChooserClicked = true;
          }
        }
        const signIn = onGoogleAuth || /sign in|oturum aç|iniciar sesión/i.test(bodyText) ||
          !!document.querySelector('a[href*="accounts.google.com/ServiceLogin"]');
        const projectLink = Array.from(document.querySelectorAll('a[href*="/project/"]'))
          .map(a => a.href).find(Boolean) ||
          (location.href.includes('/project/') ? location.href : null);
        const selectors = [
          'flow-user-tier-chip',
          'div[aria-label*="Account details"]',
          'div[aria-label*="Detalles de la cuenta"]',
          'div[aria-label*="Hesap ayrıntıları"]',
          'button[aria-label*="Google Account"]',
          'button[aria-label*="Google Hesabı"]',
          'a[aria-label*="Google Account"]',
          'a[href*="SignOutOptions"]'
        ];
        let accountControl = null;
        for (const selector of selectors) {
          const found = document.querySelector(selector);
          if (found) { accountControl = found; break; }
        }
        if (accountControl) accountControl.click();
        return {
          signIn,
          chooserVisible,
          accountChooserClicked,
          projectLink,
          href: currentHref,
          title: document.title,
          controlFound: !!accountControl,
          controlLabel: accountControl ? (accountControl.getAttribute('aria-label') || accountControl.innerText || '') : ''
        };
      })()`;

    let result = await send('Runtime.evaluate', {
      expression: inspectExpression(expectedEmail),
      returnByValue: true,
    });
    let pageState = result?.result?.value || {};
    if (pageState.accountChooserClicked) {
      await wait(4_000);
      result = await send('Runtime.evaluate', {
        expression: inspectExpression(expectedEmail),
        returnByValue: true,
      });
      pageState = result?.result?.value || {};
    }

    // Flow can keep the browser on a valid page while its Google account menu
    // points at another signed-in identity. Select the canonical email when it
    // is already present in the menu; never guess from account order.
    if (expectedEmail && pageState.signIn !== true) {
      const selectResult = await send('Runtime.evaluate', {
        expression: `(() => {
          const expected = ${JSON.stringify(expectedEmail)};
          const candidate = Array.from(document.querySelectorAll('a,button,[role="menuitem"],[role="option"],div'))
            .find(node => {
              const text = String(node.innerText || node.getAttribute('aria-label') || '').toLowerCase().trim();
              return text.includes(expected) && text.length <= 180;
            });
          if (!candidate) return { clicked: false };
          candidate.click();
          return { clicked: true };
        })()`,
        returnByValue: true,
      });
      if (selectResult?.result?.value?.clicked) {
        await wait(4_000);
        result = await send('Runtime.evaluate', {
          expression: inspectExpression(expectedEmail),
          returnByValue: true,
        });
        pageState = result?.result?.value || {};
      }
    }
    await wait(pageState.controlFound ? 2_000 : 500);

    const menuResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const texts = [];
        for (const element of document.querySelectorAll('*')) {
          const text = (element.innerText || '').replace(/\\s+/g, ' ').trim();
          if (!text || text.length > 160 || element.children.length > 5) continue;
          if (/google\\s+flow|kredi|credit|cr[eé]dito|@/i.test(text)) texts.push(text);
        }
        return [...new Set(texts)].slice(0, 120);
      })()`,
      returnByValue: true,
    });
    const texts = Array.isArray(menuResult?.result?.value) ? menuResult.result.value : [];
    const email = parseEmail([pageState.controlLabel, ...texts]);
    const credits = parseFlowCredits(texts);
    const accountMatch = !expectedEmail || isExpectedFlowAccount(email, expectedEmail);
    const authenticated = pageState.signIn !== true && Boolean(email || pageState.controlFound) &&
      accountMatch && (!expectedEmail || Boolean(email));

    return {
      ok: authenticated,
      authenticated,
      expectedEmail: expectedEmail || null,
      accountMatch,
      port: Number(port),
      email,
      credits,
      creditSource: credits == null ? 'unavailable' : 'flow_account_menu',
      projectUrl: pageState.projectLink || (String(pageState.href || '').includes('/project/') ? pageState.href : null),
      checkedAt: new Date().toISOString(),
      title: pageState.title || null,
      error: authenticated
        ? (credits == null ? 'Flow oturumu açık ancak kredi değeri okunamadı' : null)
        : (expectedEmail && email && !accountMatch
          ? `FLOW_ACCOUNT_MISMATCH: expected ${expectedEmail}, observed ${email}`
          : 'Flow oturumu doğrulanamadı'),
    };
  } finally {
    try { ws.close(); } catch {}
  }
}

module.exports = {
  inspectFlowAccount,
  normalizeEmail,
  isExpectedFlowAccount,
  normalizeCreditInteger,
  parseEmail,
  parseFlowCredits,
};
