'use strict';
// Runs in the provider document. Empty composer/Stop alone cannot identify our submission.
function observePromptAcceptance(prompt, baseline) {
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const expected = normalize(prompt);
  const before = new Set(baseline?.userKeys || []);
  const users = Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"], [class*="group/user-message"]'));
  const userKey = u => u.getAttribute('data-message-id') || u.getAttribute('data-chatgpt-search-message-ids') || u.getAttribute('data-chatgpt-search-unit-key') || u.id || u.innerText;
  return !!expected && users.some(u => !before.has(userKey(u)) && normalize(u.innerText).includes(expected));
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
