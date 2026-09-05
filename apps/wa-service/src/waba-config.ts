/** WABA env kontrolu — logger/env import etmez (test-safe). */
export function isWabaConfigured(): boolean {
  return Boolean(
    process.env.WABA_ACCESS_TOKEN?.trim() && process.env.WABA_PHONE_NUMBER_ID?.trim(),
  )
}
