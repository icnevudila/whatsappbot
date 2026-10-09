// Runs in the provider page. Never select an unrelated single-file upload widget.
function findImageUploadInput(requiredCount) {
  const editor = document.querySelector('#prompt-textarea, [data-composer] [contenteditable="true"], form textarea, form [contenteditable="true"], .ProseMirror, [role="textbox"][contenteditable="true"]');
  const composer = editor?.closest('form, [data-composer], [data-testid="composer"], [class*="ComposerLayoutRoot"]');
  if (!composer) return null;
  const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
  const eligible = inputs.map((input, index) => ({ input, index }))
    .filter(({ input }) => !input.disabled
      && !input.hasAttribute('capture')
      && (requiredCount <= 1 || input.multiple)
      && /image\/|\.(png|jpe?g|webp|gif)(?:,|$)/i.test(input.accept || ''));
  const owned = eligible.filter(({ input }) => composer.contains(input));

  // If none are owned by composer, accept only an unambiguous single external portal chooser.
  if (!owned.length) {
    if (eligible.length !== 1) return null;
    return { index: eligible[0].index, multiple: !!eligible[0].input.multiple };
  }

  // When multiple composer-owned choosers exist (e.g. ChatGPT has both 'Attach photos'
  // accept="image/*" and 'Attach photos or videos' accept="image/*,video/*"):
  // Rank them: exact image-only accept first, then 'photo' aria-label, then index.
  const candidates = [...owned];
  candidates.sort((a, b) => {
    const aAccept = a.input.accept || '';
    const bAccept = b.input.accept || '';
    const aExact = aAccept === 'image/*' || /^image\/(png|jpe?g|webp)$/i.test(aAccept);
    const bExact = bAccept === 'image/*' || /^image\/(png|jpe?g|webp)$/i.test(bAccept);
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    const aLabel = (typeof a.input.getAttribute === 'function' ? a.input.getAttribute('aria-label') || '' : a.input['aria-label'] || '').toLowerCase();
    const bLabel = (typeof b.input.getAttribute === 'function' ? b.input.getAttribute('aria-label') || '' : b.input['aria-label'] || '').toLowerCase();
    const aPhoto = aLabel.includes('photo') || aLabel.includes('image');
    const bPhoto = bLabel.includes('photo') || bLabel.includes('image');
    if (aPhoto && !bPhoto) return -1;
    if (!aPhoto && bPhoto) return 1;
    return 0;
  });

  return { index: candidates[0].index, multiple: !!candidates[0].input.multiple };
}

module.exports = { findImageUploadInput };
