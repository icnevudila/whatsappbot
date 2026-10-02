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
  const allowedPaths = /^\/g\/g-p-[^/]+/.test(targetPath) 
    ? [targetPath, targetPath+'/project', targetPath.split('/c/')[0]] 
    : [targetPath];
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const state = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const curPath = location.pathname.replace(/\\/$/,'');
        const isTarget = location.origin === ${JSON.stringify(target.origin)} && (
          ${JSON.stringify(allowedPaths)}.some(p => curPath.startsWith(p) || p.startsWith(curPath)) ||
          curPath.startsWith('/g/g-p-') || curPath.startsWith('/c/') || curPath === '' || curPath === '/'
        );
        const hasComposer = !!document.querySelector('#prompt-textarea, [data-composer] [contenteditable="true"], form [contenteditable="true"], form textarea');
        return {
          newDocument: window.__mesajifyOldDocument !== ${JSON.stringify(marker)},
          target: isTarget,
          ready: document.readyState !== 'loading' && hasComposer
        };
      })()`, returnByValue: true,
    }, 5000).catch(() => ({}));
    const value = state.result?.value;
    if (value?.newDocument && value.target && value.ready) return;
    await pause(200);
  }
  throw new Error('CHAT_NAVIGATION_FAILED: target conversation was not ready');
}

module.exports = { navigateToChat };
