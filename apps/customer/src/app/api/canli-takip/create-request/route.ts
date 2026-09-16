import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const category = String(body.category ?? '').trim()
    const address = String(body.address ?? '').trim()
    const radiusKm = Number(body.radiusKm ?? 10)
    const kind = String(body.kind ?? 'province_district')
    const locations = Array.isArray(body.locations) ? body.locations : []
    const orgId = body.orgId ? String(body.orgId) : null

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Lütfen sektör / kategori belirtin (Örn: Eczane, Toptancı vb.)' },
        { status: 400 },
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      return NextResponse.json({ success: false, error: 'Yapılandırma eksik' }, { status: 500 })
    }

    const supabase = createClient(url, key)
    const { data, error } = await supabase.rpc('create_admin_list_request', {
      p_category: category,
      p_address: address || null,
      p_radius_km: radiusKm,
      p_kind: kind,
      p_locations: locations,
      p_org_id: orgId,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'İşlem başarısız' },
      { status: 500 },
    )
  }
}
