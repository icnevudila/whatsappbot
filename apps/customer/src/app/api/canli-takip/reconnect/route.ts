import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim. Lütfen giriş yapın.' },
        { status: 401 },
      )
    }

    const serviceClient = createSupabaseServiceClient()
    if (!serviceClient) {
      return NextResponse.json(
        { success: false, error: 'Veritabanı servisi yapılandırılmamış.' },
        { status: 500 },
      )
    }

    const body = (await req.json().catch(() => ({}))) as { accountId?: string; all?: boolean }

    if (body.accountId) {
      // Tek hat yeniden bağlan
      const { data: acc } = await serviceClient
        .from('accounts')
        .select('id, org_id')
        .eq('id', body.accountId)
        .maybeSingle()

      if (!acc) {
        return NextResponse.json({ success: false, error: 'Hat bulunamadı' }, { status: 404 })
      }

      const { error } = await serviceClient.from('jobs').insert({
        org_id: acc.org_id,
        account_id: acc.id,
        type: 'account.connect',
        payload: {},
        priority: 10,
      })

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, message: 'Hat bağlantı isteği kuyruğa alındı' })
    }

    // Tüm bağlı/etkin hatları yeniden bağla
    const { data: accounts } = await serviceClient
      .from('accounts')
      .select('id, org_id')
      .eq('enabled', true)

    if (accounts && accounts.length > 0) {
      for (const acc of accounts) {
        await serviceClient.from('jobs').insert({
          org_id: acc.org_id,
          account_id: acc.id,
          type: 'account.connect',
          payload: {},
          priority: 10,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${accounts?.length ?? 0} adet hat için yeniden bağlanma tetiklendi`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'İşlem başarısız' },
      { status: 500 },
    )
  }
}
