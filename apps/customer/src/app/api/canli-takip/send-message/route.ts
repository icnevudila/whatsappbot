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
    const { accountId, phone, message, mediaUrl, mediaName, messageType } = body

    if (!accountId || !phone || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Hat seçimi, telefon numarası ve mesaj içeriği zorunludur.' },
        { status: 400 },
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      return NextResponse.json({ success: false, error: 'Yapılandırma eksik' }, { status: 500 })
    }

    const supabase = createClient(url, key)
    const { data, error } = await supabase.rpc('admin_send_message', {
      p_account_id: accountId,
      p_phone_e164: phone,
      p_body: message,
      p_media_url: mediaUrl || null,
      p_media_name: mediaName || null,
      p_message_type: messageType || null,
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
