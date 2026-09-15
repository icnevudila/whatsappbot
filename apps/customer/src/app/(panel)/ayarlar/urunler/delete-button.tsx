'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useConfirm } from '@/components/confirm-dialog'
import { deleteProduct } from './actions'

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
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
            title: 'Ürünü sil',
            description: `“${name}” ve görselleri kalıcı olarak silinecek.`,
            confirmLabel: 'Sil',
            tone: 'danger',
          })
          if (!ok) return
          startTransition(() => {
            void deleteProduct(id).then((result) => {
              if (result?.error) return
              router.push('/ayarlar/urunler')
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
