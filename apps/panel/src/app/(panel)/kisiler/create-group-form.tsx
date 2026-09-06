'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Field, Input, Notice } from '@/components/ui'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { createEmptyList } from './actions'

export function CreateGroupForm() {
  const router = useRouter()
  const toast = useToast()
  const [name, setName] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  useSyncBusy(pending, 'Grup oluşturuluyor…')

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await createEmptyList(name)
      if (result.error) {
        setError(result.error)
        toast(result.error, 'danger')
        return
      }
      toast(result.ok ?? 'Grup oluşturuldu.', 'success')
      setName('')
      if (result.listId) router.push(`/kisiler/${result.listId}`)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <Field label="Boş grup adı" hint="Sonra soldaki defterden kişi seçip ekleyebilirsin.">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Örn. Mahalle müşterileri"
          maxLength={120}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
        />
      </Field>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="button" variant="accent" disabled={pending || name.trim().length < 2} onClick={submit}>
        {pending ? 'Oluşturuluyor…' : 'Boş grup oluştur'}
      </Button>
    </div>
  )
}
