const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeCreditInteger,
  parseEmail,
  parseFlowCredits,
} = require('../flow_account_inspector.js');

test('parses Turkish Google Flow credit labels with grouping separators', () => {
  assert.equal(parseFlowCredits(['1.050 Google Flow kredisi']), 1050);
  assert.equal(parseFlowCredits(['1.020 Google Flow kredisi']), 1020);
});

test('parses English and Spanish Flow credit labels', () => {
  assert.equal(parseFlowCredits(['1,050 Google Flow credits']), 1050);
  assert.equal(parseFlowCredits(['7 créditos de Google Flow']), 7);
});

test('does not infer a balance from unrelated numbers', () => {
  assert.equal(parseFlowCredits(['Veo 3.1', '50 daily requests']), null);
  assert.equal(normalizeCreditInteger('1 050'), 1050);
});

test('extracts the authenticated email from account menu text', () => {
  assert.equal(parseEmail(['Alo Düvenci', 'mesajify1@gmail.com']), 'mesajify1@gmail.com');
});

test('prefers the leaf email when a parent menu node concatenates labels', () => {
  assert.equal(
    parseEmail(['Alo Düvencimesajify1@gmail.comGoogle Flow', 'mesajify1@gmail.com']),
    'mesajify1@gmail.com',
  );
});
