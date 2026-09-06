/**
 * Gelen metinde opt-out anahtari var mi?
 * JS \\b Unicode harflerde (ç/ı/ş…) kirilir; bu yuzden \\p{L} siniri kullanilir.
 */
const OPT_OUT =
  /(?<![\p{L}\p{N}_])(dur|yazma|yazmayın|yazmayin|çıkar|cikar|çıkarın|cikarin|stop|unsubscribe|iptal)(?![\p{L}\p{N}_])/iu

export function isOptOutMessage(body: string | null | undefined): boolean {
  if (!body) return false
  return OPT_OUT.test(body)
}
