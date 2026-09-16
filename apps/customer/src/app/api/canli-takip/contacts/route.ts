import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim.' },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(req.url)
    const listId = searchParams.get('listId') || null
    const search = searchParams.get('search') || null
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const format = searchParams.get('format') || 'json'

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      return NextResponse.json({ success: false, error: 'Yapılandırma eksik' }, { status: 500 })
    }

    const supabase = createClient(url, key)
    const { data, error } = await supabase.rpc('admin_get_contacts', {
      p_list_id: listId,
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    if (format === 'csv') {
      const contacts = (data as { contacts: Array<{ phone_e164: string; name: string | null; source: string | null; wa_status: string | null; created_at: string }> }).contacts || []
      const header = 'Telefon,Isim,Kaynak,WhatsApp Durumu,Tarih\n'
      const rows = contacts.map(c => `"${c.phone_e164}","${c.name || ''}","${c.source || ''}","${c.wa_status || ''}","${c.created_at}"`).join('\n')
      return new Response(header + rows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="contacts-${listId || 'all'}.csv"`,
        },
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'İşlem başarısız' },
      { status: 500 },
    )
  }
}
