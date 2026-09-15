'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useConfirm } from '@/components/confirm-dialog'
import { deleteBrandKit } from './actions'

export function DeleteBrandKitButton({ id, name }: { id: string; name: string }) {
  const confirm = useConfirm()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      className="wb-wa-text-btn is-danger"
      disabled={pending}
      onClick={() => {
        void (async () => {
          const ok = await confirm({
            title: 'Marka kitini sil',
            description: `“${name}” kalıcı olarak silinecek.`,
            confirmLabel: 'Sil',
            tone: 'danger',
          })
          if (!ok) return
          startTransition(() => {
            void deleteBrandKit(id).then((result) => {
              if (result?.error) return
              router.push('/ayarlar/marka')
              router.refresh()
            })
          })
        })()
      }}
    >
      {pending ? 'Siliniyor…' : 'Sil'}
    </button>
  )
}
