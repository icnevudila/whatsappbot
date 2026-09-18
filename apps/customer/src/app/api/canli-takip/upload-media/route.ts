import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 30 * 1024 * 1024 // 30 MB

export async function POST(req: Request) {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim. Lütfen şifre ile giriş yapın.' },
        { status: 401 },
      )
    }

    const supabase = createSupabaseServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Sunucu yapılandırma hatası: Supabase service role eksik.' },
        { status: 500 },
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Yüklenecek dosya seçilmedi.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Dosya boyutu 30 MB sınırını aşamaz.' },
        { status: 400 },
      )
    }

    const originalName = file.name || 'dosya'
    const cleanName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const ext = cleanName.includes('.') ? cleanName.split('.').pop()?.toLowerCase() : ''
    const isPdf = ext === 'pdf' || file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    const messageType = isPdf ? 'document' : isImage ? 'image' : 'document'

    const path = 'chat/' + Date.now() + '_' + cleanName
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(path, buffer, {
        contentType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: 'Dosya depolamaya yüklenemedi: ' + uploadError.message },
        { status: 500 },
      )
    }

    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName: originalName,
      fileSize: file.size,
      messageType,
      mimeType: file.type,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Yükleme başarısız' },
      { status: 500 },
    )
  }
}
