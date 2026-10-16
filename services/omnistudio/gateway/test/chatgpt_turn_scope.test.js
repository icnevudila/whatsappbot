'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { captureTurnBaseline, readCurrentTurn } = require(process.env.CHATGPT_TURN_SCOPE_TEST_MODULE || '../chatgpt_turn_scope.js');

function createMockElement(tag, attrs = {}, children = [], text = '') {
  const el = {
    tagName: tag.toUpperCase(),
    attributes: { ...attrs },
    children: [...children],
    innerText: text,
    get alt() { return this.attributes.alt || ''; },
    get src() { return this.attributes.src || ''; },
    get currentSrc() { return this.attributes.src || ''; },
    getAttribute(name) { return this.attributes[name] || null; },
    setAttribute(name, val) { this.attributes[name] = val; },
    hasAttribute(name) { return name in this.attributes; },
    contains(other) {
      return other === this || this.children.some(child => child.contains(other));
    },
    closest(selector) {
      let cur = this.parentElement;
      while (cur) {
        if (matches(cur, selector)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
    compareDocumentPosition(other) {
      // Return 4 if other is after this in doc order
      return this._order < other._order ? 4 : 2;
    },
    querySelectorAll(selector) {
      const results = [];
      function traverse(node) {
        for (const child of node.children) {
          if (matches(child, selector)) results.push(child);
          traverse(child);
        }
      }
      traverse(this);
      return results;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
  };
  for (const child of children) {
    child.parentElement = el;
  }
  return el;
}

function matches(el, selector) {
  if (!el) return false;
  if (selector === '[data-talvt-turn-state]') return 'data-talvt-turn-state' in el.attributes;
  if (selector === '[hidden], [aria-hidden="true"]') return 'hidden' in el.attributes || el.attributes['aria-hidden'] === 'true';
  if (selector === '[data-markdown-copy-content="true"]') return el.attributes['data-markdown-copy-content'] === 'true';
  const classes = (el.attributes.class || '').split(/\s+/);
  if (selector.startsWith('.')) {
    return classes.includes(selector.slice(1));
  }
  if (selector.includes('[class*="')) {
    const part = selector.match(/\[class\*="([^"]+)"\]/)[1];
    return (el.attributes.class || '').includes(part);
  }
  if (selector.includes('[data-conversation-role="assistant"]')) {
    return el.attributes['data-conversation-role'] === 'assistant';
  }
  if (selector.includes('[data-message-author-role="user"]')) {
    return el.attributes['data-message-author-role'] === 'user';
  }
  if (selector.includes('[data-message-author-role="assistant"]')) {
    return el.attributes['data-message-author-role'] === 'assistant';
  }
  if (selector.includes('[data-testid*="stop"]')) {
    return (el.attributes['data-testid'] || '').includes('stop');
  }
  if (selector === 'img') {
    return el.tagName === 'IMG';
  }
  return false;
}

test('chatgpt_turn_scope: detects modern ChatGPT layout with block- assistant and blob image', () => {
  let order = 1;
  const userMsg = createMockElement('div', { class: 'group/user-message', 'data-message-id': 'user-1' }, [], 'Create ONE professional commercial campaign creative for WhatsApp');
  userMsg._order = order++;

  const img = createMockElement('img', { alt: 'Generated image 1', src: 'blob:https://chatgpt.com/b5c1687c-30b0-4b3d' });
  img._order = order++;
  img.naturalWidth = 1254;
  img.naturalHeight = 1254;
  img.complete = true;

  const btn = createMockElement('button', { class: 'shrink-0 cursor-interaction' }, [img]);
  btn._order = order++;

  const h4 = createMockElement('h4', { 'data-conversation-role': 'assistant' }, [], 'ChatGPT said:');
  h4._order = order++;

  const assistantMsg = createMockElement('div', { class: 'block-BQZwFn' }, [h4, btn]);
  assistantMsg._order = order++;

  const root = createMockElement('div', { id: 'root' }, [userMsg, assistantMsg]);
  root._order = 0;

  global.document = {
    querySelectorAll(selector) {
      const parts = selector.split(',').map(s => s.trim());
      const set = new Set();
      for (const p of parts) {
        for (const el of root.querySelectorAll(p)) set.add(el);
      }
      return Array.from(set);
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    body: root,
  };

  const result = readCurrentTurn('Create ONE professional commercial campaign creative for WhatsApp...', { userKeys: [] });
  assert.equal(result.ready, true);
  assert.equal(result.isGenerating, false);
  assert.equal(result.candidateCount, 1);
  assert.equal(result.foundImgSrc, 'blob:https://chatgpt.com/b5c1687c-30b0-4b3d');
});

test('chatgpt_turn_scope: detects stop button as generating', () => {
  let order = 1;
  const userMsg = createMockElement('div', { class: 'group/user-message', 'data-message-id': 'user-1' }, [], 'Prompt');
  userMsg._order = order++;

  const stopBtn = createMockElement('button', { 'data-testid': 'stop-button' }, [], 'Stop');
  stopBtn._order = order++;

  const assistantMsg = createMockElement('div', { class: 'block-BQZwFn' }, [stopBtn]);
  assistantMsg._order = order++;

  const root = createMockElement('div', { id: 'root' }, [userMsg, assistantMsg]);

  global.document = {
    querySelectorAll(selector) {
      const parts = selector.split(',').map(s => s.trim());
      const set = new Set();
      for (const p of parts) {
        for (const el of root.querySelectorAll(p)) set.add(el);
      }
      return Array.from(set);
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    body: root,
  };

  const result = readCurrentTurn('Prompt', { userKeys: [] });
  assert.equal(result.ready, false);
  assert.equal(result.isGenerating, true);
});

function mountMessages(children) {
  global.window = {};
  let order = 0;
  function assign(node) { node._order = order++; node.children.forEach(assign); }
  const root = createMockElement('div', {}, children);
  assign(root);
  global.document = {
    querySelectorAll(selector) {
      const found = new Set();
      for (const part of selector.split(',').map(s => s.trim())) {
        root.querySelectorAll(part).forEach(node => found.add(node));
      }
      return [...found].sort((a,b) => a._order - b._order);
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
  };
}

test('nested user wrappers are one turn and do not hide its fresh assistant', () => {
  const inner = createMockElement('div', { class: 'user-message' }, [], 'Yeni istek');
  const user = createMockElement('div', { 'data-message-author-role': 'user', 'data-message-id': 'new-user' }, [inner], 'Yeni istek');
  const assistant = createMockElement('div', { 'data-message-author-role': 'assistant' }, [], 'Yeni yanıt');
  mountMessages([user, assistant]);
  assert.deepEqual(captureTurnBaseline().userKeys, ['new-user']);
  const result = readCurrentTurn('Yeni istek', { userKeys: [] });
  assert.equal(result.hasNewMsg, true);
  assert.equal(result.text, 'Yeni yanıt');
});

test('an old matching prompt and its answer cannot satisfy a new request', () => {
  const user = createMockElement('div', { 'data-message-author-role': 'user', 'data-message-id': 'old-user' }, [], 'Aynı istek');
  const assistant = createMockElement('div', { 'data-message-author-role': 'assistant' }, [], 'Eski yanıt');
  mountMessages([user,assistant]);
  const result = readCurrentTurn('Aynı istek', captureTurnBaseline());
  assert.equal(result.hasNewMsg,false);
  assert.equal(result.text,'');
});

test('writing-block copy excludes email controls, title and suggested followups', () => {
  const user = createMockElement('div', { 'data-message-author-role': 'user', 'data-message-id': 'user' }, [], 'Kurumsal yanıt');
  const body = 'Merhaba,\n\nTalebiniz incelemeye alınmıştır.\n\nSaygılarımızla';
  const content = createMockElement('div', {'data-markdown-copy-content':'true'}, [], body);
  const assistant = createMockElement('div', {'data-message-author-role':'assistant'}, [content], 'ChatGPT said:\nEmail\nSend\nRecipients\n'+body+'\nE-postayı daha kısa yap');
  mountMessages([user,assistant]);
  assert.equal(readCurrentTurn('Kurumsal yanıt',{userKeys:[]}).text,body);
});

test('modern writing-block copy excludes nested wrapper duplicates and followup controls', () => {
  const body = 'WhatsApp iletişiminizi tek merkezden yönetin.\n\nMesajify ile mesajlarınızı yönetin.\n\nBilgi Al';
  const user = createMockElement('div', {class:'user-message','data-message-id':'campaign-user'}, [], 'Kampanya mesajı yaz');
  const content = createMockElement('div', {'data-markdown-copy-content':'true'}, [], body);
  const nested = createMockElement('div', {class:'nested-block'}, [content], body);
  const heading = createMockElement('h4', {'data-conversation-role':'assistant'}, [], 'ChatGPT said:');
  const assistant = createMockElement('div', {class:'block-BQZwFn'}, [heading,nested], 'Mesajı daha özgün ve ikna edici yaz\nMesajify WhatsApp Kampanya Mesajı\n'+body+'\n'+body);
  const turn = createMockElement('div', {'data-talvt-turn-state':'complete'}, [user,assistant], 'Kampanya mesajı yaz\n'+assistant.innerText);
  mountMessages([turn]);
  assert.equal(readCurrentTurn('Kampanya mesajı yaz',{userKeys:[],imageUrls:[]}).text,body);
});

test('writing-block duplicated copy mirrors are returned once', () => {
  const body = 'Mesajify ile mesajlarınızı tek panelden yönetin.\n\nBilgi Al';
  const user = createMockElement('div', {'data-message-author-role':'user','data-message-id':'new'}, [], 'Kampanya mesajı yaz');
  const copies = [1,2].map(() => createMockElement('div', {'data-markdown-copy-content':'true'}, [], body));
  const assistant = createMockElement('div', {'data-message-author-role':'assistant'}, copies, body+'\n'+body);
  mountMessages([user,assistant]);
  assert.equal(readCurrentTurn('Kampanya mesajı yaz',{userKeys:[],imageUrls:[]}).text,body);
});

test('writing-block hidden copy mirrors cannot add stale text', () => {
  const user = createMockElement('div', {'data-message-author-role':'user','data-message-id':'new'}, [], 'Yeni kampanya');
  const visible = createMockElement('div', {'data-markdown-copy-content':'true'}, [], 'Güncel Mesajify kampanyası');
  const stale = createMockElement('div', {'data-markdown-copy-content':'true'}, [], 'Eski kampanya metni');
  const hidden = createMockElement('div', {'aria-hidden':'true'}, [stale], stale.innerText);
  const assistant = createMockElement('div', {'data-message-author-role':'assistant'}, [visible,hidden], visible.innerText+'\n'+stale.innerText);
  mountMessages([user,assistant]);
  assert.equal(readCurrentTurn('Yeni kampanya',{userKeys:[],imageUrls:[]}).text,visible.innerText);
});
