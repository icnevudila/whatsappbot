const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('elapsed time cannot select a synthetic production stage', () => {
  const hook = fs.readFileSync('apps/customer/src/lib/creative/use-creative-progress.ts', 'utf8');
  const detail = fs.readFileSync('apps/customer/src/app/(panel)/icerik/detail-view.tsx', 'utf8');
  assert.doesNotMatch(hook, /elapsed\s*>=\s*stages|currentStage|targetDuration/);
  assert.doesNotMatch(detail, /tick\s*>=\s*stages|targetDuration/);
  assert.match(hook, /Geçen süre/);
  assert.match(detail, /stageLabel = serverProgress\.stageLabel/);
});
test('server status refresh cannot cancel the single image recovery poll', () => {
  const detail = fs.readFileSync('apps/customer/src/app/(panel)/icerik/detail-view.tsx', 'utf8');
  assert.doesNotMatch(detail, /\[canManage, creative\.id, creative\.status, router\]/);
  assert.match(detail, /\[canManage, creative\.id, router\]/);
});
