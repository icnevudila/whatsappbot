const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { TabRegistry } = require('../orphan_tab_reaper.js');
const { BrowserWorkerSupervisor } = require('../browser_worker_supervisor.js');

test('supervisor cleanup preserves another process active image target even under force cap', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'supervisor-active-image-'));
  try {
    const producingWorkerRegistry = new TabRegistry(dir);
    producingWorkerRegistry.setTabJob('image-target', 'submitted-image-job');
    const supervisor = Object.create(BrowserWorkerSupervisor.prototype);
    supervisor.tabRegistry = new TabRegistry(dir);
    supervisor.absoluteTabCap = 2;
    supervisor.preferredWorkingTabs = 1;
    supervisor._listTabs = async () => [{ id: 'canonical' }, { id: 'image-target' }, { id: 'orphan' }];
    const closed = [];
    supervisor._closeTab = async (_worker, id) => { closed.push(id); return true; };
    await supervisor.cleanupOrphans({ canonicalTabId: 'canonical', tabOwnership: new Map(), phase: 'IDLE' }, { forceCap: true });
    assert.deepEqual(closed, ['orphan']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
