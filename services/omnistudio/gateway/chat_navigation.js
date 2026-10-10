'use strict';

async function navigateToChat(cdp, url, maxWaitMs = 40000, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  const marker = 'navigation-' + Date.now() + '-' + Math.random();
  // Page.navigate acknowledges a request BEFORE replacing the previous document.
  // A composer in that previous document is never evidence for the target tenant.
  await cdp.send('Runtime.evaluate', { expression: `window.__mesajifyOldDocument = ${JSON.stringify(marker)}` });
  const navigation = await cdp.send('Page.navigate', { url });
  if (navigation.errorText) throw new Error('CHAT_NAVIGATION_FAILED: '+navigation.errorText);
  const target = new URL(url);
  const targetPath = target.pathname.replace(/\/$/,'');
  const isGptPath = /^\/g\/g-p-[^/]+/.test(targetPath);
  const allowedPaths = isGptPath
    ? [targetPath, targetPath+'/project']
    : [targetPath];
  const startTime = Date.now();
  const deadline = startTime + maxWaitMs;
  let lastState = null;
  let observationFailures = 0;
  while (Date.now() < deadline) {
    const state = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const curPath = location.pathname.replace(/\\/$/,'');
        const isTarget = location.origin === ${JSON.stringify(target.origin)} && (
          ${JSON.stringify(allowedPaths)}.includes(curPath) ||
          (${isGptPath} && curPath.startsWith(${JSON.stringify(targetPath)}))
        );
        const hasComposer = !!document.querySelector('#prompt-textarea, [data-composer] [contenteditable="true"], form [contenteditable="true"], form textarea');
        return {
          newDocument: window.__mesajifyOldDocument !== ${JSON.stringify(marker)},
          target: isTarget,
          ready: document.readyState !== 'loading' && hasComposer
        };
      })()`, returnByValue: true,
    }, 5000).catch(() => { observationFailures++; return {}; });
    const value = state.result?.value;
    if (value) lastState = value;
    if (value?.target && value.ready && (value.newDocument || (Date.now() - startTime > 1500))) return;
    await pause(200);
  }
  // Boolean diagnostics distinguish redirects, loading and missing composer
  // without exposing conversation URLs, tenant data or page contents.
  const diagnostics = {
    observed: !!lastState,
    targetMatched: lastState?.target === true,
    composerReady: lastState?.ready === true,
    documentReplaced: lastState?.newDocument === true,
    observationFailures,
  };
  throw new Error('CHAT_NAVIGATION_FAILED: target conversation was not ready; ' + JSON.stringify(diagnostics));
}

module.exports = { navigateToChat };
