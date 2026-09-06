/** Pazarlama ve erişim sayfalarında kullanılan iletişim adresi. */
export const CONTACT_EMAIL = 'destek@filo.app'

export function contactMailto(subject = 'Filo erişim talebi'): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
}
