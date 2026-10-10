'use strict';
// Runs in the provider document. Empty composer/Stop alone cannot identify our submission.
function observePromptAcceptance(prompt, baseline) {
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const expected = normalize(prompt);
  const before = new Map();
  for (const key of baseline?.userKeys || []) before.set(key, (before.get(key) || 0) + 1);
  const selector = '[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"], [class*="group/user-message"]';
  const users = Array.from(document.querySelectorAll(selector)).filter(u => !u.parentElement?.closest(selector));
  const userKey = u => u.getAttribute('data-message-id') || u.getAttribute('data-chatgpt-search-message-ids') || u.getAttribute('data-chatgpt-search-unit-key') || u.id || u.innerText;
  const seen = new Map();
  return !!expected && users.some(u => {
    const key = userKey(u); const occurrence = (seen.get(key) || 0) + 1; seen.set(key, occurrence);
    return occurrence > (before.get(key) || 0) && normalize(u.innerText).includes(expected);
  });
}
async function waitForPromptAcceptance(observe, { timeoutMs = 12000, intervalMs = 250, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const deadline = now() + timeoutMs;
  do {
    if (await observe()) return true;
    await sleep(intervalMs);
  } while (now() < deadline);
  return false;
}
module.exports = { observePromptAcceptance, waitForPromptAcceptance };
