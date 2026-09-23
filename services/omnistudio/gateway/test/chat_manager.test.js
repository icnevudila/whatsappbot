'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omnistudio-chat-test-'));
process.env.CHATS_FILE = path.join(tempDir, 'company_chats.json');
const chatManager = require('../chat_manager.js');

test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
test.beforeEach(() => {
  chatManager.clearChatCache();
  fs.rmSync(process.env.CHATS_FILE, { force: true });
});

test('same display customer in different tenants has isolated cached sessions', () => {
  const tenantA = { tenantId: 'tenant-a', conversationId: 'conv-a', customer: 'Ahmet' };
  const tenantB = { tenantId: 'tenant-b', conversationId: 'conv-b', customer: 'Ahmet' };
  chatManager.setCompanyChat(tenantA, 'chat', 'https://chatgpt.com/c/a');
  chatManager.setCompanyChat(tenantB, 'chat', 'https://chatgpt.com/c/b');
  assert.equal(chatManager.getCompanyChat(tenantA, 'chat').chatUrl, 'https://chatgpt.com/c/a');
  assert.equal(chatManager.getCompanyChat(tenantB, 'chat').chatUrl, 'https://chatgpt.com/c/b');
});

test('legacy display-name keys remain readable and cache avoids repeat disk reads', () => {
  chatManager.setCompanyChat('Ahmet', 'chat', 'https://chatgpt.com/c/legacy');
  chatManager.clearChatCache();
  assert.equal(chatManager.getCompanyChat('Ahmet', 'chat').chatUrl, 'https://chatgpt.com/c/legacy');
  const before = chatManager.getChatCacheMetrics().hit;
  chatManager.getCompanyChat('Ahmet', 'chat');
  assert.equal(chatManager.getChatCacheMetrics().hit, before + 1);
});
