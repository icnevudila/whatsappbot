import 'server-only'

import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { hasImageProvider } from '@/lib/ai/image'
import { DEFAULT_COLORS } from '@/lib/creative-templates'
import {
  type BrandKitCard,
  type WizardBootstrap,
} from './wizard-types'
import { buildSmartBusinessVideoIdeas } from '@/lib/creative/video-scenario'
import { getSafeMediaUrl } from '@/lib/media-url'

export type {
  BrandKitCard,
  LibraryOption,
  OrgBits,
  PhoneOption,
  ProductCard,
  SocialOption,
  WizardBootstrap,
} from './wizard-types'

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

export async function loadCreativeWizardData(): Promise<WizardBootstrap> {
  const { org, supabase } = await requireActiveOrg()
  const canManage = isOrgAdminRole(org.role)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [kitsRes, productsRes, imagesRes, accountsRes, socialsRes, libraryRes, orgRes, videoUsedRes] =
    await Promise.all([
      supabase
        .from('brand_kits')
        .select('id, name, tone, colors, fonts, logo_path, is_default')
        .eq('org_id', org.id)
        .order('is_default', { ascending: false }),
      supabase
        .from('org_products')
        .select('id, name, description, box_contents')
        .eq('org_id', org.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('org_product_images')
        .select('id, product_id, public_url, sort_order')
        .eq('org_id', org.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('accounts')
        .select('id, label, phone_e164')
        .eq('org_id', org.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('org_social_accounts')
        .select('id, platform, label, url')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('creatives')
        .select('id, title, public_url, status, created_at')
        .eq('org_id', org.id)
        .eq('status', 'ready')
        .not('public_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(40),
      supabase.from('organizations').select('name, address, about, logo_path, monthly_video_quota').eq('id', org.id).maybeSingle(),
      supabase
        .from('creatives')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('format', 'video')
        .in('status', ['ready', 'processing', 'pending'])
        .gte('created_at', startOfMonth.toISOString()),
    ])

  const imagesByProduct = new Map<string, { id: string; url: string }[]>()
  for (const row of imagesRes.data ?? []) {
    const list = imagesByProduct.get(row.product_id) ?? []
    const safeUrl = getSafeMediaUrl(row.public_url) ?? row.public_url
    list.push({ id: row.id, url: safeUrl })
    imagesByProduct.set(row.product_id, list)
  }

  const kits: BrandKitCard[] = []
  for (const kit of kitsRes.data ?? []) {
    let samplePreview: string | null = null
    if (kit.logo_path?.startsWith('http')) samplePreview = getSafeMediaUrl(kit.logo_path) ?? kit.logo_path
    else if (kit.logo_path) {
      const { data } = await supabase.storage.from('brand-assets').createSignedUrl(kit.logo_path, 3600)
      samplePreview = data?.signedUrl ?? null
    }
    kits.push({
      id: kit.id,
      name: kit.name,
      tone: kit.tone,
      colors: { ...DEFAULT_COLORS, ...asRecord(kit.colors) },
      fonts: asRecord(kit.fonts),
      samplePreview,
      isDefault: kit.is_default,
    })
  }

  const website =
    (socialsRes.data ?? []).find((row) => row.platform === 'website')?.url ?? null

  let logoPreview: string | null = null
  if (orgRes.data?.logo_path?.startsWith('http')) logoPreview = getSafeMediaUrl(orgRes.data.logo_path) ?? orgRes.data.logo_path
  else if (orgRes.data?.logo_path) {
    const { data } = await supabase.storage
      .from('brand-assets')
      .createSignedUrl(orgRes.data.logo_path, 3600)
    logoPreview = data?.signedUrl ?? null
  }
  const mappedProducts = (productsRes.data ?? []).map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      boxContents: product.box_contents,
      images: imagesByProduct.get(product.id) ?? [],
    }))

    const suggestedVideoChips = buildSmartBusinessVideoIdeas(
      { name: orgRes.data?.name, about: orgRes.data?.about },
      mappedProducts,
    )

    return {
      org: {
        name: orgRes.data?.name ?? 'İşletmem',
        address: orgRes.data?.address ?? null,
        about: orgRes.data?.about ?? null,
        websiteHint: website,
        logoPreview,
        monthlyVideoQuota: orgRes.data?.monthly_video_quota ?? 3,
        monthlyVideoUsed: videoUsedRes.count ?? 0,
      },
      kits,
      products: mappedProducts,
      phones: (accountsRes.data ?? [])
        .filter((row) => row.phone_e164)
        .map((row) => ({
          id: row.id,
          label: row.label,
          phone: row.phone_e164 as string,
        })),
      socials: (socialsRes.data ?? []).map((row) => ({
        id: row.id,
        platform: row.platform,
        label: row.label,
        url: row.url,
      })),
      library: (libraryRes.data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        publicUrl: getSafeMediaUrl(row.public_url) ?? row.public_url,
        status: row.status,
        createdAt: row.created_at,
      })),
      imageAiEnabled: hasImageProvider(),
      canManage,
      suggestedVideoChips,
    }
  }
