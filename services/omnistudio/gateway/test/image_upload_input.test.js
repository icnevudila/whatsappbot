const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { findImageUploadInput } = require('../image_upload_input');

function choose(inputs, requiredCount = 2, hasComposer = true) {
  const composer = { contains: input => !!input.owned };
  const document = {
    querySelector: () => hasComposer ? { closest: () => composer } : null,
    querySelectorAll: () => inputs,
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
