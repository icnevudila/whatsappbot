'use strict';
// Read remote refs; git merge-tree writes Git objects, never active working files.
const {execFileSync, spawnSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'docs/integration-readiness/evidence');
fs.mkdirSync(output, {recursive: true});
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', maxBuffer: 30e6}).trim();
const refs = {main:'origin/main', master:'origin/feat/codex-wizard-real-e2e-v2', sales:'origin/codex/sales-readiness', research:'origin/feature/creative-dna-research-validation'};
const snapshots = Object.fromEntries(Object.entries(refs).map(([key, ref]) => [key, {
  ref, sha:git('rev-parse', ref), subject:git('log','-1','--format=%s',ref)
}]));
const existingFile = path.join(output,'snapshot.json');
if (fs.existsSync(existingFile)) {
  const previous = JSON.parse(fs.readFileSync(existingFile));
  const drift = Object.entries(snapshots).filter(([k,v]) => previous.branches[k]?.sha !== v.sha);
  if (drift.length) { console.error('SNAPSHOT_DRIFT: use a new audit directory; frozen evidence must not be overwritten.'); process.exit(2); }
  console.log('Snapshot unchanged; preserving original capture and merge evidence.');
  process.exit(0);
}
const changed = {};
for (const key of ['master','sales','research']) changed[key] = git('diff','--name-only',`${snapshots.main.sha}...${snapshots[key].sha}`).split('\n').filter(Boolean);
const pairs = [];
for (const [a,b] of [['master','sales'],['master','research'],['sales','research']]) {
  const result = spawnSync('git',['merge-tree','--write-tree','--name-only',snapshots[a].sha,snapshots[b].sha],{cwd:root,encoding:'utf8',maxBuffer:30e6});
  if (![0,1].includes(result.status)) throw new Error(`merge-tree failed: ${result.stderr}`);
  const lines = result.stdout.trim().split('\n');
  const conflicts = lines.slice(1).filter(Boolean).filter(x => !x.startsWith('Auto-merging') && !x.startsWith('CONFLICT') && !x.includes(': '));
  pairs.push({a,b,status:result.status===0?'CLEAN_TEXT_MERGE':'CONFLICT',tree:lines[0],overlap:changed[a].filter(x=>changed[b].includes(x)),conflicts,raw:result.stdout});
}
fs.writeFileSync(existingFile,JSON.stringify({capturedAt:new Date().toISOString(),branches:snapshots,changed,pairs},null,2)+'\n');
console.log(JSON.stringify({branches:snapshots,pairs:pairs.map(({a,b,status,overlap,conflicts})=>({a,b,status,overlapCount:overlap.length,conflicts}))},null,2));
