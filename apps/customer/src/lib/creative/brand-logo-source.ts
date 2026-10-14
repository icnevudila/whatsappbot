type LogoRecord = { logo_path: string | null }
type LogoLookup = {
  kit: (tenantId: string, kitId: string) => Promise<LogoRecord | null>
  organization: (tenantId: string) => Promise<LogoRecord | null>
}

/** A saved creative's logo URL may predate a Storage move. Keep kit identity,
 * but resolve its current owned asset; never replace an explicit custom logo. */
export async function resolveOwnedLogoPath(input: {
  tenantId: string; kitId?: string | null; customLogoUrl?: string | null
}, lookup: LogoLookup): Promise<string | null> {
  if (input.customLogoUrl) return input.customLogoUrl
  if (input.kitId) {
    const kit = await lookup.kit(input.tenantId, input.kitId)
    if (!kit) throw new Error('BRAND_KIT_NOT_OWNED: Marka kiti bu işletmeye ait değil veya artık erişilemiyor.')
    if (kit.logo_path) return kit.logo_path
  }
  return (await lookup.organization(input.tenantId))?.logo_path || null
}
