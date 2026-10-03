import { NextRequest, NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import { generateCreativePlan } from '@/lib/creative/v2/ai-planner'
import type { CampaignObjective, CreativeStylePreset, MediaType } from '@/lib/creative/v2/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { org, supabase } = await requireActiveOrg()
    const body = await req.json()

    const brandName = String(body.brandName || org.name || 'İşletmemiz').trim()
    const productName = String(body.productName || '').trim()
    const productDescription = String(body.productDescription || '').trim()
    const objective = (body.objective || 'PRODUCT_INTRO') as CampaignObjective
    const stylePreset = (body.stylePreset || 'AUTO') as CreativeStylePreset
    const mediaType = (body.mediaType || 'IMAGE') as MediaType
    const campaignDetail = String(body.campaignDetail || '').trim()
    const campaignCopy = body.campaignCopy || {}

    if (!productName) {
      return NextResponse.json({ error: 'Ürün adı zorunludur.' }, { status: 400 })
    }

    const plan = await generateCreativePlan({
      brandName,
      brandTone: body.brandTone || null,
      productName,
      productDescription,
      objective,
      stylePreset,
      mediaType,
      campaignDetail,
      campaignCopy,
    })

    return NextResponse.json({ ok: true, plan })
  } catch (error: any) {
    console.error('[/api/ai-media/plan] Error generating plan:', error)
    return NextResponse.json(
      { error: error?.message || 'Kreatif plan oluşturulamadı.' },
      { status: 500 },
    )
  }
}
