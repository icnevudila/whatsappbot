const { isChatGPTPage } = require('./chatgpt_tab_scope.js');

async function reconnectImageObservation({ targetId, listTargets, connect }) {
  const targets = await listTargets();
  const target = Array.isArray(targets) && targets.find(item => item.id === targetId);
  if (!target || !isChatGPTPage(target) || !target.webSocketDebuggerUrl) {
    throw new Error('IMAGE_OBSERVATION_TARGET_LOST');
  }
  // This operation has no navigation, attachment or prompt submission capability.
  return connect(target.webSocketDebuggerUrl);
}

module.exports = { reconnectImageObservation };
