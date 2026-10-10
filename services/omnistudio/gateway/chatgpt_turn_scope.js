'use strict';

// These functions also run verbatim in the provider page. Keep them self-contained.
function captureTurnBaseline() {
  const users = Array.from(document.querySelectorAll(
    '[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"], [class*="group/user-message"], [data-testid^="conversation-turn-"] [data-message-author-role="user"]'
  ));
  const userKey = u => u.getAttribute('data-message-id') || u.getAttribute('data-chatgpt-search-message-ids') || u.getAttribute('data-chatgpt-search-unit-key') || u.getAttribute('data-testid') || u.id || u.innerText;
  return { userKeys: users.map(userKey) };
}

function readCurrentTurn(prompt, baseline) {
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const rawExpected = normalize(prompt);
  // Match prefix or distinctive substring if prompt is long
  const expectedPrefix = rawExpected.slice(0, 60);
  const before = new Set(baseline?.userKeys || []);
  const users = Array.from(document.querySelectorAll(
    '[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"], [class*="group/user-message"], [data-testid^="conversation-turn-"] [data-message-author-role="user"]'
  ));
  const userKey = u => u.getAttribute('data-message-id') || u.getAttribute('data-chatgpt-search-message-ids') || u.getAttribute('data-chatgpt-search-unit-key') || u.getAttribute('data-testid') || u.id || u.innerText;

  // 1. Locate user turn: prioritize prompt matching, then latest user message after baseline
  let user = users.filter(u => !before.has(userKey(u)) && expectedPrefix && normalize(u.innerText).includes(expectedPrefix)).pop();
  if (!user) {
    user = users.filter(u => !before.has(userKey(u))).pop();
  }
  // If baseline is empty or all matched, fallback to latest user message
  if (!user && users.length > 0) {
    user = users.at(-1);
  }

  // 2. Locate assistant turn
  let assistants = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
  if (!assistants.length) assistants = Array.from(document.querySelectorAll('[data-chatgpt-search-unit-key$=":assistant"]'));
  if (!assistants.length) {
    assistants = Array.from(document.querySelectorAll('[data-conversation-role="assistant"]')).map(h => {
      return h.closest('[class*="block-"]') || h.closest('[data-testid^="conversation-turn-"]') || h.parentElement?.parentElement || h.parentElement || h;
    });
  }
  if (!assistants.length) {
    assistants = Array.from(document.querySelectorAll('[class*="agent-turn"], div[data-testid^="conversation-turn-"]:has([data-conversation-role="assistant"])'));
  }

  let assistant = null;
  if (user) {
    const nextUser = users.find(u => !!(user.compareDocumentPosition(u) & 4));
    assistant = assistants.find(a => (user.compareDocumentPosition(a) & 4) && (!nextUser || (a.compareDocumentPosition(nextUser) & 4)));
  }
  if (!assistant && assistants.length > 0) {
    assistant = assistants.at(-1);
  }

  if (!assistant && !user) {
    return { ready: false, candidateCount: 0, hasNewMsg: false, text: '', foundImgSrc: null, isGenerating: true };
  }

  // 3. Check generating state
  const stop = document.querySelector('button[data-testid*="stop"], button[aria-label*="Stop"], button[aria-label*="durdur"], button[aria-label*="Durdur"], [data-testid="stop-button"]');
  const isGenerating = !!stop || !!assistant?.querySelector('[data-is-streaming="true"], .streaming-animation, .result-thinking, [data-testid*="generating"], svg.animate-spin');

  // 4. Inspect generated images
  const searchRoot = assistant || document.body;
  const images = Array.from(searchRoot.querySelectorAll('img')).filter(img => {
    const alt = String(img.alt || '').toLowerCase();
    const src = img.currentSrc || img.src || '';
    if (!src || !img.complete || img.naturalWidth < 200 || img.naturalHeight < 200) return false;
    if (alt.includes('user attachment') || img.closest('[data-message-author-role="user"], [class*="group/user-message"], form')) return false;

    const isGeneratedByMarker = alt.includes('generated') || alt.includes('dall-e') || alt.includes('üretilen') || alt.includes('görsel') || !!img.closest('[data-testid="generated-image-gallery"]');
    const isGeneratedBySrc = src.includes('backend-api/estuary') || src.includes('files.oaiusercontent.com') || (src.startsWith('blob:https://chatgpt.com/') && img.naturalWidth >= 400 && img.naturalHeight >= 400);
    const isLargeAssistantImage = img.naturalWidth >= 500 && img.naturalHeight >= 500 && !alt.includes('avatar') && !alt.includes('profil');

    return isGeneratedByMarker || isGeneratedBySrc || isLargeAssistantImage;
  });

  const text = (assistant?.innerText || '').replace(/^(?:ChatGPT said:|ChatGPT söylüyor:|ChatGPT:)\s*/i, '').trim();

  return {
    ready: !isGenerating && images.length > 0,
    candidateCount: images.length,
    hasNewMsg: !!assistant,
    text,
    foundImgSrc: images.at(-1)?.currentSrc || images.at(-1)?.src || null,
    isGenerating,
    userKey: user ? userKey(user) : null,
  };
}

module.exports = { captureTurnBaseline, readCurrentTurn };
