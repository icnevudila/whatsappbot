/** Preserve the visual director's historical output. Replace only its audio
 * paragraph and attach the mandatory pair's handles; never fall back to a
 * SIMPLE_V5 or canned brand-specific visual prompt. */
export function finalizeHistoricalProviderPrompt(rewritten: string, approvedDialogue: string): string {
  let body = rewritten.trim().replace(/^```(?:text)?\s*\n?/i,'').replace(/\n?```$/,'')
  body = body.replace(/(^|\n)KONUŞMA DİLİ[^\n]*\n?/gi,'$1')
  body = body.replace(/(?:^|\n+)AUDIO:[\s\S]*?(?=\n[A-Z0-9_ -]+:|\n\n|$)/gi,'')
  body = body.replace(/(?:^|\n+)(?:ZORUNLU SES DİLİ|SPİKERİN AYNEN SÖYLEYECEĞİ)[\s\S]*?(?=\n[A-Z0-9_ -]+:|\n\n|$)/gi,'')
  if (/\bAUDIO\s*:|SPİKERİN AYNEN|ZORUNLU SES DİLİ/i.test(body) || body.includes(approvedDialogue)) throw new Error('HISTORICAL_DIRECTOR_AMBIGUOUS_AUDIO')
  if (!/three_cut|three\s+distinct|cut\s+transitions|continuous\s+take|unbroken|kesintisiz/i.test(body)) throw new Error('HISTORICAL_DIRECTOR_CAMERA_MODE_MISSING')
  body = body.replace(/@HeroProduct/g,'canonical hero product').replace(/@BrandLogo/g,'canonical brand logo')
  return `${body.trim()}\n\nAUDIO: Native Turkish commercial narration EXACTLY ONCE: ${JSON.stringify(approvedDialogue)}. No speech before 0.5s. Voiceover starts at 0.5s, targets completion at 5.25s, and the last word finishes strictly before 5.5s. No English, translation, paraphrase, extra words, repetition, looping, echo or narration re-entry. After speech, the original scene's commercial music, ambient sound and natural foley continue to 8.0s.\n\nCANONICAL REFERENCES: @HeroProduct is the one canonical product; @BrandLogo is the one canonical logo. Preserve existing printed product branding AS-IS. Do not redraw or reconstruct the logo, add invented symbols, or paint new physical branding onto the casing. Canonical logo fidelity is guaranteed by deterministic finishing; keep the historical product hero close.`
}
