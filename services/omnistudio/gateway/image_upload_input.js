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
  // Some providers mount the chooser outside the form; accept only an unambiguous image chooser.
  const candidates = owned.length ? owned : eligible;
  if (candidates.length !== 1) return null;
  return { index: candidates[0].index, multiple: !!candidates[0].input.multiple };
}

module.exports = { findImageUploadInput };
