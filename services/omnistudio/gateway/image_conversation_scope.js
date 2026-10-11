'use strict';
function assertImageScope(expected, actual) {
  if (!expected?.jobId || !expected?.targetId || actual?.jobId !== expected.jobId ||
      actual?.targetId !== expected.targetId || actual?.href !== expected.href ||
      !/^https:\/\/chatgpt\.com\/?(?:\?.*)?$/.test(actual.href || '') || actual.userCount !== 0) {
    throw new Error('CDP_CONVERSATION_SCOPE_MISMATCH');
  }
  return true;
}
function readImageScope() {
  return { jobId: window.__mesajifyImageOwnerJobId || null, href: window.location.href,
    userCount: document.querySelectorAll('[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"]').length };
}
module.exports = { assertImageScope, readImageScope };
