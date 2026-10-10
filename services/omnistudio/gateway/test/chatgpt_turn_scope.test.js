'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { captureTurnBaseline, readCurrentTurn } = require('../chatgpt_turn_scope.js');

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
