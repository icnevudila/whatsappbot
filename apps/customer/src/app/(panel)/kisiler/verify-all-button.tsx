'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSyncBusy } from '@/components/busy'
import { Icon } from '@/components/icon'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { waitForJob } from '@/lib/wait-for-job'
import { deleteContactsBySource, verifyAllContacts } from './actions'

function useVerifyAll() {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [needsLine, setNeedsLine] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  useSyncBusy(pending, 'Defter doğrulanıyor…', 'WhatsApp kayıt kontrolü')

  const run = () => {
    setError(null)
    setNeedsLine(false)
    setOk(null)
    startTransition(async () => {
      const result = await verifyAllContacts()
      if (result.error) {
        setError(result.error)
        toast(result.error, 'danger')
        const lower = result.error.toLocaleLowerCase('tr-TR')
        setNeedsLine(lower.includes('bağlı') || lower.includes('bagli'))
        return
      }

      setOk(result.ok ?? 'Doğrulama kuyruğa alındı…')
      toast('Doğrulama kuyruğa alındı…', 'accent')

      if (result.jobId) {
        const outcome = await waitForJob(result.jobId)
        if (outcome.status === 'done') {
          setOk('Doğrulama bitti. Sayılar ve liste güncellendi.')
          toast('Defter doğrulaması bitti.', 'success')
          router.refresh()
        } else if (outcome.status === 'timeout') {
          setOk(
            'Doğrulama hâlâ sürüyor olabilir. Biraz sonra sayfayı yenileyin; özet o zaman güncellenir.',
          )
          router.refresh()
        } else {
          setOk(null)
          setError(outcome.error)
          toast(outcome.error, 'danger')
          const lower = outcome.error.toLocaleLowerCase('tr-TR')
          setNeedsLine(lower.includes('bağlı') || lower.includes('bagli'))
        }
      } else {
        router.refresh()
      }
    })
  }

  return { pending, error, needsLine, ok, run }
}

export function ContactsHeaderMenu({
  disabled = false,
  whatsappCount = 0,
}: {
  disabled?: boolean
  whatsappCount?: number
}) {
  const { pending, run } = useVerifyAll()
  const confirm = useConfirm()
  const toast = useToast()
  const router = useRouter()
  const [deleting, startDelete] = useTransition()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const busy = pending || deleting
  useSyncBusy(deleting, 'WhatsApp kişileri siliniyor…')

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent | TouchEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-label="Kişi işlemleri"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
        className="wb-wa-icon-btn"
      >
        <Icon name="ellipsis" className="size-5" />
      </button>
      {open ? (
        <div role="menu" className="wb-wa-menu">
          <button
            type="button"
            role="menuitem"
            disabled={pending || disabled}
            title="Bağlı hat gerekir; kontrol edilmemiş ve bayat numaralar ✓ / × ile işaretlenir"
            className="wb-wa-menu-item"
            onClick={() => {
              setOpen(false)
              run()
            }}
          >
            <Icon name="check" className="size-4 text-ink-muted" />
            {pending ? 'Doğrulanıyor…' : 'WhatsApp doğrula'}
          </button>
          {whatsappCount > 0 ? (
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              className="wb-wa-menu-item is-danger"
              onClick={() => {
                setOpen(false)
                void (async () => {
                  const okDelete = await confirm({
                    title: 'WhatsApp rehber kişileri silinsin mi?',
                    description: `${whatsappCount.toLocaleString('tr-TR')} kayıt kişilerden silinir.`,
                    confirmLabel: 'Sil',
                    cancelLabel: 'Vazgeç',
                    tone: 'danger',
                  })
                  if (!okDelete) return
                  startDelete(async () => {
                    const result = await deleteContactsBySource('whatsapp')
                    if (result.error) toast(result.error, 'danger')
                    else {
                      toast(result.ok ?? 'Silindi.', 'success')
                      router.refresh()
                    }
                  })
                })()
              }}
            >
              <Icon name="trash" className="size-4" />
              {deleting ? 'Siliniyor…' : `WhatsApp kişilerini sil (${whatsappCount.toLocaleString('tr-TR')})`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function VerifyAllButton({
  total = 0,
  validCount = 0,
  invalidCount = 0,
  unknownCount = 0,
  currentStatus = 'tum',
  searchQuery = '',
}: {
  total?: number
  validCount?: number
  invalidCount?: number
  unknownCount?: number
  currentStatus?: string
  searchQuery?: string
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const filtered = currentStatus !== 'tum'

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent | TouchEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const filterHref = (status: string) => {
    const params = new URLSearchParams()
    params.set('gorunum', 'defter')
    if (status !== 'tum') params.set('durum', status)
    if (searchQuery) params.set('ara', searchQuery)
    const qs = params.toString()
    return qs ? `/kisiler?${qs}` : '/kisiler'
  }

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-label="Filtre"
        aria-expanded={open}
        title="Filtre"
        onClick={() => setOpen((value) => !value)}
        className="wb-wa-icon-btn relative"
      >
        <Icon name="filter" className="size-5" />
        {filtered ? (
          <span className="wb-wa-icon-dot" aria-hidden />
        ) : null}
      </button>
      {open ? (
        <div role="menu" className="wb-wa-menu">
          <Link
            href={filterHref('tum')}
            role="menuitem"
            className={`wb-wa-menu-item${currentStatus === 'tum' ? ' font-semibold' : ''}`}
          >
            Tümü ({total})
          </Link>
          <Link
            href={filterHref('var')}
            role="menuitem"
            className={`wb-wa-menu-item${currentStatus === 'var' ? ' font-semibold' : ''}`}
            title="WhatsApp hesabı olan numaralar"
          >
            WhatsApp’ta ({validCount})
          </Link>
          <Link
            href={filterHref('yok')}
            role="menuitem"
            className={`wb-wa-menu-item${currentStatus === 'yok' ? ' font-semibold' : ''}`}
            title="WhatsApp hesabı olmayan numaralar"
          >
            Yok ({invalidCount})
          </Link>
          {unknownCount > 0 ? (
            <Link
              href={filterHref('bekleyen')}
              role="menuitem"
              className={`wb-wa-menu-item${currentStatus === 'bekleyen' ? ' font-semibold' : ''}`}
              title="Henüz kontrol edilmemiş numaralar"
            >
              Bekleyen ({unknownCount})
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

