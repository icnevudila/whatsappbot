import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

export async function POST(req: Request) {
  try {
    const auth = await requireActiveOrg()
    if (!auth?.org) {
      return NextResponse.json(
        { success: false, error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' },
        { status: 401 },
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
        { success: false, error: 'Dosya boyutu 50 MB sınırını aşamaz.' },
        { status: 400 },
      )
    }

    const supabase = createSupabaseServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Depolama servisi yapılandırılamadı (service role eksik).' },
        { status: 500 },
      )
    }

    const originalName = file.name || 'dosya'
    const cleanName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const ext = cleanName.includes('.') ? cleanName.split('.').pop()?.toLowerCase() : ''
    
    let messageType: 'image' | 'video' | 'audio' | 'document' = 'document'
    if (file.type.startsWith('image/')) {
      messageType = 'image'
    } else if (file.type.startsWith('video/')) {
      messageType = 'video'
    } else if (
      file.type.startsWith('audio/') ||
      ['mp3', 'ogg', 'wav', 'm4a', 'opus', 'webm', 'aac'].includes(ext || '')
    ) {
      messageType = 'audio'
    } else {
      messageType = 'document'
    }

    const path = `chat/${Date.now()}_${cleanName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const contentType = file.type || (
      messageType === 'audio' ? 'audio/ogg' :
      messageType === 'image' ? 'image/jpeg' :
      messageType === 'video' ? 'video/mp4' :
      ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'
    )

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(path, buffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: 'Dosya yükleme hatası: ' + uploadError.message },
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
      mimeType: contentType,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Yükleme işlemi sırasında beklenmeyen bir hata oluştu.',
      },
      { status: 500 },
    )
  }
}
