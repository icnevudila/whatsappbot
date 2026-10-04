'use strict';
function isChatGPTPage(tab) {
  if (!tab || (tab.type && tab.type !== 'page')) return false;
  try {
    const url = new URL(tab.url);
    return url.protocol === 'https:' && url.hostname === 'chatgpt.com';
  } catch { return false; }
}
module.exports = { isChatGPTPage };
