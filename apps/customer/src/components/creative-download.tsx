'use client'

import { useState } from 'react'
import { useToast } from './toast'
import { Icon } from './icon'

export function CreativeDownload({creativeId,className,onStarted,role}: {
  creativeId:string; className?:string; onStarted?:()=>void; role?:'menuitem'
}) {
  const [pending,setPending] = useState(false)
  const toast = useToast()
  const href = `/api/creatives/${encodeURIComponent(creativeId)}/download`
  return <button type="button" role={role} disabled={pending} className={className}
    onClick={async () => {
      if (pending) return
      setPending(true)
      try {
        // HEAD checks current authorization/existence without putting a video in browser memory.
        const response = await fetch(href,{method:'HEAD',cache:'no-store'})
        if (!response.ok) {
          const message = response.status === 401 ? 'İndirmek için yeniden giriş yapın.'
            : response.status === 404 ? 'Medya silinmiş, eksik veya bu işletmeye ait değil.'
              : response.status === 409 || response.status === 422 ? 'Medya henüz indirmeye hazır değil.' : 'Medya indirilemedi. Lütfen tekrar deneyin.'
          throw new Error(message)
        }
        const link = document.createElement('a')
        link.href = href; link.download = ''; link.hidden = true
        document.body.appendChild(link); link.click(); link.remove()
        onStarted?.()
      } catch (error) { toast(error instanceof Error ? error.message : 'İndirme başlatılamadı.','danger') }
      finally { setPending(false) }
    }}><Icon name="download" className="size-4 text-ink-muted" />{pending ? 'Hazırlanıyor…' : 'İndir'}</button>
}
