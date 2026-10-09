// Executed in the provider page; conversation history is never an upload receipt.
function readComposerAttachments() {
  const input = document.querySelector('#prompt-textarea, [data-composer] [contenteditable="true"], form textarea, form [contenteditable="true"], .ProseMirror, [role="textbox"][contenteditable="true"]');
  const composer = input?.closest('form, [data-composer], [data-testid="composer"], [class*="ComposerLayoutRoot"]');
  if (!composer) return { count: 0, ready: false };
  const images = Array.from(composer.querySelectorAll('img')).filter(img =>
    /^(blob:|data:)|oaiusercontent|\/files\/|estuary/i.test(img.src || '') &&
    img.complete && img.naturalWidth > 0);
  const busy = Array.from(composer.querySelectorAll('[role="progressbar"], [aria-busy="true"], [data-testid*="attachment-loading"], [data-testid*="file-uploading"], .animate-spin'))
    .some(el => el.offsetParent !== null || (window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden'));
  return { count: images.length, ready: !busy };
}

module.exports = { readComposerAttachments };
