import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim.' },
        { status: 401 },
      )
    }

    const body = await req.json()
    const { orgId, plan, accountsQuota, monthlyQuota, videoQuota, suspended } = body

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'İşletme / Firma ID zorunludur.' },
        { status: 400 },
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      return NextResponse.json({ success: false, error: 'Yapılandırma eksik' }, { status: 500 })
    }

    const supabase = createClient(url, key)
    const { data, error } = await supabase.rpc('canli_takip_update_org', {
      p_org_id: orgId,
      p_plan: plan || null,
      p_accounts_quota: accountsQuota !== undefined ? parseInt(accountsQuota, 10) : null,
      p_monthly_quota: monthlyQuota !== undefined ? parseInt(monthlyQuota, 10) : null,
      p_monthly_video_quota: videoQuota !== undefined ? parseInt(videoQuota, 10) : null,
      p_suspended: suspended !== undefined ? Boolean(suspended) : null,
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
