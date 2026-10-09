const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { findImageUploadInput } = require('../image_upload_input');

function choose(inputs, requiredCount = 2, hasComposer = true) {
  const composer = { contains: input => !!input.owned };
  const document = {
    querySelector: () => hasComposer ? { closest: () => composer } : null,
    querySelectorAll: () => inputs.map(inp => ({
      ...inp,
      hasAttribute: (attr) => attr in inp,
      getAttribute: (attr) => inp[attr] || null,
    })),
  };
  return vm.runInNewContext(`(${findImageUploadInput.toString()})(${requiredCount})`, { document });
}

test('two references skip an unrelated first chooser and single-file image widget', () => {
  const result = choose([
    { accept: 'application/pdf', multiple: true },
    { accept: 'image/*', multiple: false, owned: true },
    { accept: 'image/*', multiple: true, owned: true },
  ]);
  assert.equal(result.index, 2);
});

test('composer-owned chooser wins over another image-upload feature', () => {
  assert.equal(choose([
    { accept: 'image/*', multiple: true },
    { accept: 'image/*', multiple: true, owned: true },
  ]).index, 1);
});

test('real ChatGPT DOM with camera capture, photos/videos, and photos choosers selects Attach photos', () => {
  assert.equal(choose([
    { accept: 'image/*', multiple: false, capture: 'environment', owned: true, 'aria-label': 'Take a photo' },
    { accept: 'image/*,video/*', multiple: true, owned: true, 'aria-label': 'Attach photos or videos' },
    { accept: 'image/*', multiple: true, owned: true, 'aria-label': 'Attach photos' },
    { accept: '', multiple: true, owned: true, 'aria-label': 'Attach files' },
  ]).index, 2);
});

test('ambiguous portals, disabled chooser and absent composer fail closed', () => {
  const image = { accept: 'image/*', multiple: true };
  assert.equal(choose([image, { ...image }]), null);
  assert.equal(choose([{ ...image, disabled: true }]), null);
  assert.equal(choose([image], 2, false), null);
  assert.equal(choose([{ accept: 'image/*', multiple: false }]), null);
});

test('one unambiguous portal image chooser remains supported', () => {
  assert.equal(choose([{ accept: '.png,.jpg,.webp', multiple: true }]).index, 0);
});
