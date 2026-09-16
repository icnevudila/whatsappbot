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
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ success: false, error: 'campaignId parametresi gereklidir.' }, { status: 400 })
    }

    const status = searchParams.get('status') || null
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
    const { data, error } = await supabase.rpc('admin_get_campaign_targets', {
      p_campaign_id: campaignId,
      p_status: status,
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    if (format === 'csv') {
      const targets = (data as { targets: Array<{ phone_e164: string; contact_name: string | null; status: string; attempts: number; sent_at: string | null; error: string | null }> }).targets || []
      const header = 'Telefon,Isim,Durum,Deneme,GonderimZamani,Hata\n'
      const rows = targets.map(t => `"${t.phone_e164}","${t.contact_name || ''}","${t.status}","${t.attempts}","${t.sent_at || ''}","${(t.error || '').replace(/"/g, '""')}"`).join('\n')
      return new Response(header + rows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="campaign-targets-${campaignId}.csv"`,
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
