'use strict';

// These functions also run verbatim in the provider page. Keep them self-contained.
function captureTurnBaseline() {
  let users = Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"], [class*="user-message"]'));
  users = users.filter(node => !users.some(parent => parent !== node && parent.contains(node)));
  return { userKeys: users.map(u => u.getAttribute('data-message-id') || u.getAttribute('data-chatgpt-search-message-ids') || u.getAttribute('data-chatgpt-search-unit-key') || u.id || u.innerText) };
}

function readCurrentTurn(prompt, baseline) {
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const expected = normalize(prompt);
  const expectedClean = expected.replace(/\.{3,}$/, '').trim();
  const expectedPrefix = expected.slice(0, 60);
  const before = new Set(baseline?.userKeys || []);
  let users = Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"], [class*="user-message"]'));
  users = users.filter(node => !users.some(parent => parent !== node && parent.contains(node)));
  const userKey = u => u.getAttribute('data-message-id') || u.getAttribute('data-chatgpt-search-message-ids') || u.getAttribute('data-chatgpt-search-unit-key') || u.id || u.innerText;
  const newUsers = users.filter(u => !before.has(userKey(u)));
  let user = newUsers.filter(u => {
    const text = normalize(u.innerText);
    return (expected && text.includes(expected)) ||
           (expectedClean && text.includes(expectedClean)) ||
           (expectedPrefix && text.includes(expectedPrefix));
  }).pop();
  if (!user && newUsers.length > 0) {
    user = newUsers.at(-1);
  }
  if (!user) return { ready: false, candidateCount: 0, hasNewMsg: false, text: '', foundImgSrc: null, isGenerating: true };
  let assistants = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
  if (!assistants.length) assistants = Array.from(document.querySelectorAll('[data-chatgpt-search-unit-key$=":assistant"]'));
  if (!assistants.length) assistants = Array.from(document.querySelectorAll('[data-conversation-role="assistant"]')).map(h => h.parentElement || h);
  const nextUser = users.find(u => !!(user.compareDocumentPosition(u) & 4));
  // A provider turn may have separate thinking, image and text messages. The
  // first assistant message is not necessarily the one containing the output.
  const turnAssistants = assistants.filter(a => (user.compareDocumentPosition(a) & 4) && (!nextUser || (a.compareDocumentPosition(nextUser) & 4)));
  if (!turnAssistants.length) return { ready: false, candidateCount: 0, hasNewMsg: false, text: '', foundImgSrc: null, isGenerating: true };
  const assistant = turnAssistants.at(-1);
  const stop = document.querySelector('button[data-testid*="stop"], button[aria-label*="Stop"], button[aria-label*="durdur"], button[aria-label*="Durdur"]');
  const isGenerating = !!stop || turnAssistants.some(node => !!node.querySelector('[data-is-streaming="true"], .streaming-animation, .result-thinking, [data-testid*="generating"]'));
  const images = [...new Set(turnAssistants.flatMap(node => Array.from(node.querySelectorAll('img'))))].filter(img => {
    const alt = String(img.alt || '').toLowerCase();
    const src = img.currentSrc || img.src || '';
    if (!src || !img.complete || img.naturalWidth < 200 || img.naturalHeight < 200) return false;
    if (alt.includes('user attachment') || img.closest('[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"], form')) return false;
    return alt.includes('generated') || alt.includes('dall-e') || alt.includes('üretilen') || alt.includes('oluşturulan') || !!img.closest('[data-testid="generated-image-gallery"]') || src.includes('backend-api/estuary') || src.includes('files.oaiusercontent.com');
  });
  // Writing-block headers and suggested-followup buttons are provider UI, not
  // generated copy. The content marker is also used by ChatGPT's copy action.
  const writingContents = Array.from(assistant.querySelectorAll('[data-markdown-copy-content="true"]'))
    .filter(node => !node.closest('[hidden], [aria-hidden="true"]'));
  const outerContents = writingContents.filter(node => !writingContents.some(parent => parent !== node && parent.contains(node)));
  const contentTexts = [...new Set(outerContents.map(node => (node.innerText || '').trim()).filter(Boolean))];
  const responseText = contentTexts.length
    ? contentTexts.join('\n\n')
    : assistant.innerText || '';
  return { ready: !isGenerating && images.length > 0, candidateCount: images.length, hasNewMsg: true, text: responseText.replace(/^(ChatGPT said:|ChatGPT söylüyor:)\s*/i, '').trim(), foundImgSrc: images.at(-1)?.currentSrc || images.at(-1)?.src || null, isGenerating, userKey: userKey(user) };
}

module.exports = { captureTurnBaseline, readCurrentTurn };
