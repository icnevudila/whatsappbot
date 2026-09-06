'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AccentLink,
  Button,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Notice,
  Pagination,
  QuietLink,
  SplitPane,
  Textarea,
} from '@/components/ui'
import { Icon } from '@/components/icon'
import { useConfirm } from '@/components/confirm-dialog'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { useT } from '@/lib/i18n/provider'
import { PAGE_SIZES, clampPage, totalPages } from '@/lib/pagination'
import { addToBlacklist, removeFromBlacklist, type BlacklistState } from './actions'

export type BlacklistRow = {
  id: string
  phone_e164: string
  reason: string | null
  created_at: string
}

export function BlacklistBoard({ initial }: { initial: BlacklistRow[] }) {
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()
  const t = useT()
  const formRef = useRef<HTMLFormElement>(null)
  const [rows, setRows] = useState(initial)
  const [formKey, setFormKey] = useState(0)
  const [state, formAction, pending] = useActionState<BlacklistState, FormData>(
    addToBlacklist,
    null,
  )
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [, startTransition] = useTransition()
  useSyncBusy(pending, 'Kara listeye ekleniyor…')
  useSyncBusy(busyId != null, 'Kara listeden kaldırılıyor…')

  useEffect(() => {
    setRows(initial)
  }, [initial])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
      setFormKey((key) => key + 1)
      setError(null)
      toast(state.ok, 'success')
      router.refresh()
    }
  }, [state?.ok, router, toast])

  const visible = rows.filter((row) =>
    `${row.phone_e164} ${row.reason ?? ''}`
      .toLocaleLowerCase('tr-TR')
      .includes(search.toLocaleLowerCase('tr-TR')),
  )

  const pageSize = PAGE_SIZES.blacklist
  const pages = totalPages(visible.length, pageSize)
  const safePage = clampPage(page, pages)
  const pageRows = visible.slice((safePage - 1) * pageSize, safePage * pageSize)

  const remove = (id: string, phone: string) => {
    void (async () => {
      const ok = await confirm({
        title: t('confirm.unblacklistTitle'),
        description: t('confirm.unblacklistBody', { phone }),
        confirmLabel: t('confirm.unblacklistConfirm'),
        cancelLabel: t('common.cancel'),
        tone: 'danger',
      })
      if (!ok) return

      setError(null)
      setBusyId(id)
      startTransition(async () => {
        const result = await removeFromBlacklist(id)
        if (result.error) {
          setError(result.error)
          toast(result.error, 'danger')
        } else {
          setRows((current) => current.filter((row) => row.id !== id))
          toast('Kara listeden kaldırıldı.', 'success')
        }
        setBusyId(null)
      })
    })()
  }

  return (
    <SplitPane
      list={
        <div className="flex min-h-0 flex-col">
          <CardHeader
            title="Engellenen numaralar"
            subtitle={
              rows.length === 0
                ? 'Kampanya ve hızlı gönderim bu numaraları atlar'
                : `${rows.length} numara · kampanya ve hızlı gönderimde atlanır`
            }
          />
          {rows.length > 0 ? (
            <div className="border-b border-hairline px-3 py-2">
              <Input
                aria-label="Kara listede ara"
                type="search"
                placeholder="Numara veya sebep ara…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          ) : null}

          {rows.length === 0 ? (
            <EmptyState
              tone="shield"
              title="Kara liste boş"
              description="Çıkmak isteyen veya engellemek istediğiniz numaraları sağdan ekleyin."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <AccentLink href="/gelenler">Gelenlere bak</AccentLink>
                  <QuietLink href="/kisiler">Kişilere git</QuietLink>
                </div>
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState
              tone="shield"
              title="Sonuç yok"
              description="Başka bir numara veya sebep deneyin."
            />
          ) : (
            <>
            <ul className="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto">
              {pageRows.map((row, index) => (
                <li
                  key={row.id}
                  className="wb-list-row wb-row-enter flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5"
                  style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-danger/25 bg-[#fff5f4] text-danger"
                      aria-hidden
                    >
                      <Icon name="shield" className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] tabular">{row.phone_e164}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-faint">
                        {row.reason?.trim() ? row.reason.trim() : 'Sebep belirtilmedi'} ·{' '}
                        {new Date(row.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    disabled={busyId === row.id}
                    onClick={() => remove(row.id, row.phone_e164)}
                    title="Engeli kaldır — tekrar mesaj alabilir"
                  >
                    {busyId === row.id ? 'Kaldırılıyor…' : 'Kaldır'}
                  </Button>
                </li>
              ))}
            </ul>
            <Pagination
              page={safePage}
              totalPages={pages}
              label={`${visible.length} numara`}
              onPageChange={setPage}
            />
            </>
          )}

          {error ? (
            <div className="border-t border-hairline p-3">
              <Notice tone="danger">{error}</Notice>
            </div>
          ) : null}
        </div>
      }
      detail={
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <CardHeader
            title="Numara ekle"
            subtitle="Bir veya birden fazla satır yapıştırın. Sebep isteğe bağlıdır."
          />
          <form key={formKey} ref={formRef} action={formAction} className="space-y-2.5 p-3.5">
            <Field
              label="Numaralar"
              hint="Her satıra bir numara. Ülke kodu yoksa Türkiye (+90) kabul edilir."
            >
              <Textarea
                name="numbers"
                rows={6}
                required
                placeholder={'0532 123 45 67\n+90 533 234 56 78'}
              />
            </Field>
            <Field label="Sebep" hint="İsteğe bağlı — çıkış, şikayet veya dahili not.">
              <Input name="reason" placeholder="Çıkmak istedi / şikayet" />
            </Field>

            {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
            {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

            <Button type="submit" variant="accent" disabled={pending} className="w-full">
              {pending ? 'Ekleniyor…' : 'Kara listeye ekle'}
            </Button>

            {!state?.error && !state?.ok ? (
              <p className="text-[11.5px] leading-snug text-ink-faint">
                Aynı numara yeniden eklenirse sebep güncellenir.
              </p>
            ) : null}
          </form>
        </div>
      }
    />
  )
}
