/**
 * Gelen metinde opt-out anahtari var mi?
 * JS \\b Unicode harflerde (ç/ı/ş…) kirilir; bu yuzden \\p{L} siniri kullanilir.
 *
 * Eslesen yanitlar otomatik kara listeye yazilir; sonraki kampanya/hizli gonderim atlar.
 */
const OPT_OUT =
  /(?<![\p{L}\p{N}_])(dur|yazma|yazmayın|yazmayin|çıkar|cikar|çıkarın|cikarin|istemiyorum|istemem|stop|unsubscribe|iptal|abonelikten)(?![\p{L}\p{N}_])/iu

export function isOptOutMessage(body: string | null | undefined): boolean {
  if (!body) return false
  return OPT_OUT.test(body)
}
