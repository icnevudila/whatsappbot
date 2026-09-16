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
    const { action, phone, reason, id, orgId } = body

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      return NextResponse.json({ success: false, error: 'Yapılandırma eksik' }, { status: 500 })
    }

    const supabase = createClient(url, key)

    if (action === 'add') {
      if (!phone) {
        return NextResponse.json(
          { success: false, error: 'Telefon numarası zorunludur.' },
          { status: 400 },
        )
      }
      const { data, error } = await supabase.rpc('admin_add_blacklist', {
        p_phone_e164: phone,
        p_reason: reason || 'Admin panelinden engellendi',
        p_org_id: orgId || null,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      return NextResponse.json(data)
    }

    if (action === 'remove') {
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Kayıt ID zorunludur.' },
          { status: 400 },
        )
      }
      const { data, error } = await supabase.rpc('admin_remove_blacklist', {
        p_id: id,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      return NextResponse.json(data)
    }

    return NextResponse.json({ success: false, error: 'Geçersiz eylem' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'İşlem başarısız' },
      { status: 500 },
    )
  }
}
