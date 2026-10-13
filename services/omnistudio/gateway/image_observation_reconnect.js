const { isChatGPTPage } = require('./chatgpt_tab_scope.js');

function isImageObservationContextLost(error) {
  const message = String(error?.message || error || '');
  return /WebSocket not open|Target closed|Connection closed|Cannot find default execution context|Cannot find context with specified id|Execution context was destroyed/i.test(message);
}

async function reconnectImageObservation({ targetId, listTargets, connect }) {
  const targets = await listTargets();
  const target = Array.isArray(targets) && targets.find(item => item.id === targetId);
  if (!target || !isChatGPTPage(target) || !target.webSocketDebuggerUrl) {
    throw new Error('IMAGE_OBSERVATION_TARGET_LOST');
  }
  // This operation has no navigation, attachment or prompt submission capability.
  return connect(target.webSocketDebuggerUrl);
}

module.exports = { reconnectImageObservation, isImageObservationContextLost };
