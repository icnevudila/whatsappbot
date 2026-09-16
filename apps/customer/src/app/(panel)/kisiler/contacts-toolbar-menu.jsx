'use client'

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icon'
import { useConfirm } from '@/components/confirm-dialog'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { waitForJob } from '@/lib/wait-for-job'
import { AddPersonModal } from './add-person-modal'
import { ListRequestModal } from './list-request-modal'
import { NewGroupModal } from './new-group-form'
import { deleteContactsBySource, verifyAllContacts } from './actions'

export function ContactsToolbarMenu({
  groups,
  contactsTab = false,
  contactsDisabled = false,
  whatsappCount = 0,
}) {
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const [personOpen, setPersonOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [listRequestOpen, setListRequestOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [deleting, startDelete] = useTransition()
  const wrapRef = useRef(null)
  const panelRef = useRef(null)
  const buttonRef = useRef(null)
  const busy = pending || deleting
  useSyncBusy(pending, 'Defter doğrulanıyor…', 'WhatsApp kayıt kontrolü')
  useSyncBusy(deleting, 'WhatsApp kişileri siliniyor…')

  useLayoutEffect(() => {
    if (!menuOpen || !buttonRef.current) {
      setMenuPos(null)
      return
    }
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPos({
        top: rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (event) => {
      if (!(event.target instanceof Node)) return
      if (wrapRef.current?.contains(event.target)) return
      if (panelRef.current?.contains(event.target)) return
      setMenuOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const runVerify = () => {
    startTransition(async () => {
      const result = await verifyAllContacts()
      if (result.error) {
        toast(result.error, 'danger')
        return
      }
      toast('Doğrulama kuyruğa alındı…', 'accent')
      if (result.jobId) {
        const outcome = await waitForJob(result.jobId)
        if (outcome.status === 'done') {
          toast('Defter doğrulaması bitti.', 'success')
          router.refresh()
        } else if (outcome.status === 'timeout') {
          router.refresh()
        } else {
          toast(outcome.error, 'danger')
        }
      } else {
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="relative shrink-0" ref={wrapRef}>
        <button
          ref={buttonRef}
          type="button"
          aria-label="Diğer"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Diğer"
          className="wb-wa-icon-btn"
          disabled={busy}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <Icon name="ellipsis" className="size-5" />
        </button>
      </div>

      {menuOpen && menuPos
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              className="wb-wa-menu wb-wa-menu--fixed"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <button
                type="button"
                role="menuitem"
                className="wb-wa-menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  setListRequestOpen(true)
                }}
              >
                <Icon name="search" className="size-4 text-ink-muted" />
                Liste talep
              </button>
              <button
                type="button"
                role="menuitem"
                className="wb-wa-menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  setPersonOpen(true)
                }}
              >
                <Icon name="plus" className="size-4 text-ink-muted" />
                Kişi Ekle
              </button>
              <button
                type="button"
                role="menuitem"
                className="wb-wa-menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  setGroupOpen(true)
                }}
              >
                <Icon name="people" className="size-4 text-ink-muted" />
                Grup Ekle
              </button>
              {contactsTab ? (
                <>
                  <div className="wb-wa-menu-sep" role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending || contactsDisabled}
                    title="Bağlı hat gerekir; kontrol edilmemiş ve bayat numaralar ✓ / × ile işaretlenir"
                    className="wb-wa-menu-item"
                    onClick={() => {
                      setMenuOpen(false)
                      runVerify()
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
                        setMenuOpen(false)
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
                      {deleting
                        ? 'Siliniyor…'
                        : `WhatsApp kişilerini sil (${whatsappCount.toLocaleString('tr-TR')})`}
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {listRequestOpen ? <ListRequestModal onClose={() => setListRequestOpen(false)} /> : null}
      {personOpen ? (
        <AddPersonModal groups={groups} onClose={() => setPersonOpen(false)} />
      ) : null}
      {groupOpen ? <NewGroupModal onClose={() => setGroupOpen(false)} /> : null}
    </>
  )
}
