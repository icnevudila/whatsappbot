'use strict';

// These functions also run verbatim in the provider page. Keep them self-contained.
function captureTurnBaseline() {
  const users = Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"]'));
  return { userKeys: users.map(u => u.getAttribute('data-message-id') || u.getAttribute('data-chatgpt-search-message-ids') || u.getAttribute('data-chatgpt-search-unit-key') || u.id || u.innerText) };
}

function readCurrentTurn(prompt, baseline) {
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const expected = normalize(prompt);
  const before = new Set(baseline?.userKeys || []);
  const users = Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"]'));
  const userKey = u => u.getAttribute('data-message-id') || u.getAttribute('data-chatgpt-search-message-ids') || u.getAttribute('data-chatgpt-search-unit-key') || u.id || u.innerText;
  const expectedPrefix = expected ? expected.slice(0, 60) : '';
  const user = users.filter(u => !before.has(userKey(u)) && (!expectedPrefix || normalize(u.innerText).includes(expectedPrefix))).pop();
  if (!user) return { ready: false, candidateCount: 0, hasNewMsg: false, text: '', foundImgSrc: null, isGenerating: true };
  let assistants = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
  if (!assistants.length) assistants = Array.from(document.querySelectorAll('[data-chatgpt-search-unit-key$=":assistant"]'));
  if (!assistants.length) assistants = Array.from(document.querySelectorAll('[data-conversation-role="assistant"]')).map(h => h.parentElement || h);
  const nextUser = users.find(u => !!(user.compareDocumentPosition(u) & 4));
  const assistant = assistants.find(a => (user.compareDocumentPosition(a) & 4) && (!nextUser || (a.compareDocumentPosition(nextUser) & 4)));
  if (!assistant) return { ready: false, candidateCount: 0, hasNewMsg: false, text: '', foundImgSrc: null, isGenerating: true };
  const stop = document.querySelector('button[data-testid*="stop"], button[aria-label*="Stop"], button[aria-label*="durdur"], button[aria-label*="Durdur"]');
  const isGenerating = !!stop || !!assistant.querySelector('[data-is-streaming="true"], .streaming-animation, .result-thinking, [data-testid*="generating"]');
  const images = Array.from(assistant.querySelectorAll('img')).filter(img => {
    const alt = String(img.alt || '').toLowerCase();
    const src = img.currentSrc || img.src || '';
    if (!src || !img.complete || img.naturalWidth < 200 || img.naturalHeight < 200) return false;
    if (alt.includes('user attachment') || img.closest('[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"], form')) return false;
    return alt.includes('generated') || alt.includes('dall-e') || alt.includes('üretilen') || !!img.closest('[data-testid="generated-image-gallery"]') || src.includes('backend-api/estuary') || src.includes('files.oaiusercontent.com');
  });
  return { ready: !isGenerating && images.length > 0, candidateCount: images.length, hasNewMsg: true, text: (assistant.innerText || '').replace(/^(ChatGPT said:|ChatGPT söylüyor:)\s*/i, '').trim(), foundImgSrc: images.at(-1)?.currentSrc || images.at(-1)?.src || null, isGenerating, userKey: userKey(user) };
}

module.exports = { captureTurnBaseline, readCurrentTurn };
