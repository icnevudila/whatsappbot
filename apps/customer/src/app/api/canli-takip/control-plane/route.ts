import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { getControlPlaneSnapshot } from '@/lib/control-plane/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await checkIsAuthenticated())) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 })
  }

  try {
    const snapshot = await getControlPlaneSnapshot()
    return NextResponse.json({ success: true, ...snapshot }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Operasyon verileri alınamadı',
    }, { status: 500 })
  }
}
