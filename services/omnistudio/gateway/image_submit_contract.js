'use strict';
// Pure predicate, also serialized into the same browser evaluation as Send.click().
function validateImageSubmit(gate, actual, attachments, composerText, prompt) {
  if (!gate?.scope?.jobId || !gate.scope.targetId || actual?.jobId !== gate.scope.jobId ||
      actual?.href !== gate.scope.href || actual?.userCount !== 0) return 'CDP_CONVERSATION_SCOPE_MISMATCH';
  if (!Number.isSafeInteger(gate.expectedReferences) || gate.expectedReferences < 1 ||
      attachments?.count !== gate.expectedReferences || attachments?.ready !== true) return 'REFERENCE_ATTACHMENT_FAILED';
  // Contenteditable paragraphs render additional line breaks; compare content,
  // not HTML layout whitespace. The approved prompt itself is never rewritten.
  const normalized = text => String(text || '').replace(/\s+/gu, ' ').trim();
  if (!prompt || normalized(composerText) !== normalized(prompt)) return 'IMAGE_PROMPT_MISMATCH';
  return null;
}
module.exports = { validateImageSubmit };
