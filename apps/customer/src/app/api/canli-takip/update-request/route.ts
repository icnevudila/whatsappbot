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
    const { requestId, status, contactCount } = body

    if (!requestId || !status) {
      return NextResponse.json(
        { success: false, error: 'Talep ID ve durum zorunludur.' },
        { status: 400 },
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      return NextResponse.json({ success: false, error: 'Yapılandırma eksik' }, { status: 500 })
    }

    const supabase = createClient(url, key)
    const { data, error } = await supabase.rpc('admin_update_list_request_status', {
      p_request_id: requestId,
      p_status: status,
      p_contact_count: contactCount !== undefined && contactCount !== null ? Number(contactCount) : null,
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
