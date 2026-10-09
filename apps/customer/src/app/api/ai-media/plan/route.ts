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

    const productId = typeof body.productId === 'string' ? body.productId.trim() : ''
    if (!productId) return NextResponse.json({error:'Ürünü katalogdan seçin.'},{status:400})
    const [{data:product,error:productError},{data:kit,error:kitError}] = await Promise.all([
      supabase.from('org_products').select('name, description').eq('org_id',org.id).eq('id',productId).maybeSingle(),
      supabase.from('brand_kits').select('tone').eq('org_id',org.id).order('is_default',{ascending:false}).limit(1).maybeSingle(),
    ])
    if (productError || kitError) return NextResponse.json({error:'Ürün ve marka bilgileri doğrulanamadı.'},{status:503})
    if (!product) return NextResponse.json({error:'Ürün bu işletmeye ait değil.'},{status:400})
    const brandName = org.name
    const productName = product.name
    const productDescription = product.description || ''
    const objective = (body.objective || 'PRODUCT_INTRO') as CampaignObjective
    const stylePreset = (body.stylePreset || 'AUTO') as CreativeStylePreset
    const mediaType = (body.mediaType || 'IMAGE') as MediaType
    const campaignDetail = String(body.campaignDetail || '').trim()
    const campaignCopy = body.campaignCopy || {}

    if (!productName) {
      return NextResponse.json({ error: 'Ürün adı zorunludur.' }, { status: 400 })
    }

    const plan = await generateCreativePlan({
      tenantId: org.id,
      brandName,
      brandTone: kit?.tone || null,
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
