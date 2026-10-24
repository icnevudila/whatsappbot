// Runs in the provider page. Never select an unrelated single-file upload widget.
function findImageUploadInput(requiredCount) {
  const editor = document.querySelector('#prompt-textarea, [data-composer] [contenteditable="true"], form textarea, form [contenteditable="true"], .ProseMirror, [role="textbox"][contenteditable="true"]');
  const composer = editor?.closest('form, [data-composer], [data-testid="composer"], [class*="ComposerLayoutRoot"]');
  if (!composer) return null;
  const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
  const eligible = inputs.map((input, index) => ({ input, index }))
    .filter(({ input }) => !input.disabled && (requiredCount <= 1 || input.multiple)
      && /image\/|\.(png|jpe?g|webp|gif)(?:,|$)/i.test(input.accept || ''));
  const owned = eligible.filter(({ input }) => composer.contains(input));
  const candidates = owned.length ? owned : eligible;
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { index: candidates[0].index, multiple: !!candidates[0].input.multiple };

  // Filter out camera/capture inputs
  const nonCapture = candidates.filter(({ input }) => typeof input.getAttribute !== 'function' || !input.getAttribute('capture'));
  if (nonCapture.length === 1) {
    return { index: nonCapture[0].index, multiple: !!nonCapture[0].input.multiple };
  }

  // Prioritize dedicated photo-only input over mixed video/all-file inputs
  const photoOnly = (nonCapture.length ? nonCapture : candidates).filter(({ input }) =>
    /^(?:image\/\*|image\/(?:png|jpe?g|webp)(?:,\s*image\/(?:png|jpe?g|webp))*)$/i.test((input.accept || '').trim())
  );
  if (photoOnly.length === 1) {
    return { index: photoOnly[0].index, multiple: !!photoOnly[0].input.multiple };
  }

  // Multiple unowned portals outside composer that remain ambiguous: fail closed
  if (!owned.length) return null;

  return null;
}

module.exports = { findImageUploadInput };
