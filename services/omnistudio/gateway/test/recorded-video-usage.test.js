'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the actual production read model against a filesystem fixture;
// do not boot a browser or generate any new media.
const source = fs.readFileSync(path.join(__dirname, '../generate_video.js'), 'utf8');
const start = source.indexOf('function getRecentVideos()');
const body = source.slice(start, source.indexOf('\n}', start) + 2);
function readModel(meta) {
  return vm.runInNewContext(body + '\ngetRecentVideos()', {
    OUTPUT_DIR: '/fixture', PUBLIC_HOST: 'fixture.invalid', PORT: 3456, path: path.posix,
    console: { warn() {} },
    execSync() { throw new Error('must not invoke ffmpeg'); },
    fs: {
      existsSync(name) { return name === '/fixture' || name.endsWith('_thumb.jpg') || (meta && name === '/fixture/bofe_hasat_meta.json'); },
      readdirSync() { return ['bofe_hasat.mp4']; },
      statSync() { return { size: 1000000, mtime: new Date('2026-10-14T00:00:00Z'), mtimeMs: 1000 }; },
      readFileSync() { return JSON.stringify(meta); },
    },
  })[0];
}
test('missing cost or prompt metadata cannot be presented as zero credits or fabricated production prompts', () => {
  const result = readModel(null);
  assert.equal(result.creditsCost, null);
  assert.equal(result.creditsCostStatus, 'unknown');
  assert.equal(result.userPrompt, undefined);
  assert.equal(result.veoPrompt, undefined);
  assert.equal(result.chatGptPrompt, undefined);
  assert.doesNotMatch(result.engineBadge, /0 Kredi/);
});
test('recorded zero remains zero, unknown/invalid costs remain unknown, exact prompts remain intact', () => {
  for (const creditsCost of [0, 10, null, -1, '10']) {
    const result = readModel({ userPrompt: 'Exact owned brief', veoPrompt: 'Exact provider prompt', creditsCost });
    assert.equal(result.userPrompt, 'Exact owned brief');
    assert.equal(result.veoPrompt, 'Exact provider prompt');
    assert.equal(result.creditsCost, [0,10].includes(creditsCost) ? creditsCost : null);
    assert.equal(result.creditsCostStatus, result.creditsCost === null ? 'unknown' : 'recorded_unverified');
  }
});
