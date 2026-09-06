/** Kampanya / hızlı gönderim mesajlarına eklenecek standart çıkış satırı. */
export const OPT_OUT_FOOTER =
  'Mesaj almak istemiyorsanız YAZMAYIN yazın.'

export function appendOptOutFooter(body: string): string {
  const trimmed = body.trimEnd()
  if (!trimmed) return OPT_OUT_FOOTER
  if (/yazmay[ıi]n/i.test(trimmed) || /istemiyorsan[ıi]z/i.test(trimmed)) {
    return trimmed
  }
  return `${trimmed}\n\n${OPT_OUT_FOOTER}`
}
