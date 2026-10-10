'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { navigateToChat } = require('../chat_navigation');

function connection(value) {
  let calls = 0;
  return { send: async (method) => {
    calls++;
    if (method === 'Page.navigate' || calls === 1) return {};
    return { result: { value } };
  }};
}

test('matching replaced document with composer completes', async () => {
  await navigateToChat(connection({target:true, ready:true, newDocument:true}),
    'https://chatgpt.com/c/test-conversation', 100);
});

test('wrong target remains blocked and diagnostics contain no conversation data', async () => {
  await assert.rejects(navigateToChat(connection({target:false, ready:true, newDocument:true}),
    'https://chatgpt.com/c/private-conversation', 30,
    () => new Promise(resolve => setTimeout(resolve, 35))), error => {
      assert.match(error.message, /"targetMatched":false/);
      assert.match(error.message, /"composerReady":true/);
      assert.doesNotMatch(error.message, /private-conversation|https:/);
      return true;
    });
});

test('matching URL without composer remains blocked', async () => {
  await assert.rejects(navigateToChat(connection({target:true, ready:false, newDocument:true}),
    'https://chatgpt.com/c/test-conversation', 30,
    () => new Promise(resolve => setTimeout(resolve, 35))), /"composerReady":false/);
});

test('closed transport exits immediately instead of polling stale target state', async () => {
  let observations = 0;
  const cdp = {send: async (method) => {
    if (method === 'Page.navigate') return {};
    if (++observations === 1) return {};
    throw new Error('[CDP Error] WebSocket not open (readyState:3)');
  }};
  await assert.rejects(navigateToChat(cdp,'https://chatgpt.com/c/private',40000),/CHAT_NAVIGATION_TRANSPORT_LOST/);
  assert.equal(observations,2);
});
