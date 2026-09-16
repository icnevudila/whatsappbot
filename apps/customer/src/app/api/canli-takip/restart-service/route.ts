import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function POST() {
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

    // İlk geçerli organizasyonu bul
    const { data: orgs } = await serviceClient
      .from('organizations')
      .select('id')
      .limit(1)

    const orgId = orgs?.[0]?.id
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organizasyon bulunamadı' },
        { status: 400 },
      )
    }

    // Baileys yeniden başlatma işi ekle
    const { error } = await serviceClient.from('jobs').insert({
      org_id: orgId,
      type: 'service.restart',
      payload: {},
      priority: 1, // En yüksek öncelik
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Baileys servisini yeniden başlatma sinyali gönderildi. Servis birkaç saniye içinde yeniden başlayacak.',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'İşlem başarısız' },
      { status: 500 },
    )
  }
}
