import { CREATIVE_FORMATS, VIDEO_CREATIVE_FORMAT, type ProductFieldKey } from '@/lib/creative/types'

export type LibraryOption = {
  id: string
  title: string | null
  publicUrl: string | null
  status: string
  createdAt: string
}

export type BrandKitCard = {
  id: string
  name: string
  tone: string | null
  colors: Record<string, string>
  fonts: Record<string, string>
  samplePreview: string | null
  isDefault: boolean
}

export type ProductCard = {
  id: string
  name: string
  description: string | null
  boxContents: string | null
  images: { id: string; url: string }[]
}

export type PhoneOption = {
  id: string
  label: string
  phone: string
}

export type SocialOption = {
  id: string
  platform: string
  label: string | null
  url: string
}

export type OrgBits = {
  id: string
  name: string
  address: string | null
  about: string | null
  websiteHint: string | null
  logoPreview: string | null
  monthlyVideoQuota?: number
  monthlyVideoUsed?: number
}

export type WizardBootstrap = {
  org: OrgBits
  kits: BrandKitCard[]
  products: ProductCard[]
  phones: PhoneOption[]
  socials: SocialOption[]
  library: LibraryOption[]
  imageAiEnabled: boolean
  canManage: boolean
  suggestedVideoChips?: Array<{ label: string; text: string }>
}

export function formatFromId(formatId: string): (typeof CREATIVE_FORMATS)[number] | typeof VIDEO_CREATIVE_FORMAT {
  if (formatId === 'reels_video') return VIDEO_CREATIVE_FORMAT
  return CREATIVE_FORMATS.find((row) => row.id === formatId) ?? CREATIVE_FORMATS[0]
}

export const DEFAULT_INCLUDE: Record<ProductFieldKey, boolean> = {
  name: true,
  image: true,
  description: true,
  boxContents: true,
  price: true,
  promo: true,
}

export function emptyProductInclude(): Record<ProductFieldKey, boolean> {
  return { ...DEFAULT_INCLUDE }
}
