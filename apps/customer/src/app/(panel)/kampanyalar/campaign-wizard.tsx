'use client'

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSyncBusy } from '@/components/busy'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { Button, Card, Field, Input, Notice, Textarea } from '@/components/ui'
import { Icon } from '@/components/icon'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { countUniqueRecipients, createCampaign, duplicateCampaign, updateCampaign, type CampaignState } from './actions'
import {
  AiRewriteBar,
  AiWriteModal,
  AudiencePicker,
  MediaPicker,
  PublishCards,
  SenderPicker,
  SummaryPills,
  WaPreview,
  WizardStepper,
} from './campaign-wizard-ui'
import {
  WIZARD_STEPS,
  formatCount,
  parseWizardStep,
  toDatetimeLocal,
  defaultScheduleLocal,
  type WizardCampaign,
  type WizardSharedProps,
  type WizardStepId,
} from './campaign-wizard-types'

const DRAFT_PREFIX = 'wa.customer.campaign-wizard.v1'

type DraftShape = {
  step?: string
  name: string
  body: string
  mediaUrl: string
  messageType: string
  lists: string[]
  accounts: string[]
  startMode: 'draft' | 'schedule' | 'now'
  scheduledAt: string
}

function draftKey(orgId: string) {
  return `${DRAFT_PREFIX}.${orgId}`
}

function readDraft(orgId: string) {
  try {
    const raw =
      localStorage.getItem(draftKey(orgId)) ?? localStorage.getItem(DRAFT_PREFIX)
    if (!raw) return null
    return JSON.parse(raw) as DraftShape
  } catch {
    return null
  }
}

function typeFromMime(mime: string): 'image' | 'video' | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return null
}

export function CampaignWizard({
  mode,
  campaign,
  initialStep,
  initialMediaUrl,
  ...shared
}: WizardSharedProps & {
  mode: 'create' | 'edit'
  campaign?: WizardCampaign
  initialStep?: string
  initialMediaUrl?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()
  const confirm = useConfirm()
  const action = mode === 'create' ? createCampaign : updateCampaign
  const [state, formAction, pending] = useActionState<CampaignState, FormData>(action, null)
  const [step, setStep] = useState<WizardStepId>(() => parseWizardStep(initialStep ?? searchParams.get('adim')))
  const [name, setName] = useState(campaign?.name ?? '')
  const [body, setBody] = useState(campaign?.body ?? '')
  const [mediaUrl, setMediaUrl] = useState(campaign?.media_url ?? initialMediaUrl ?? '')
  const [messageType, setMessageType] = useState(
    campaign?.message_type || (initialMediaUrl ? 'image' : 'text'),
  )
  const [selectedLists, setSelectedLists] = useState<string[]>(campaign?.source_list_ids ?? [])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(campaign?.account_ids ?? [])
  const [startMode, setStartMode] = useState<'draft' | 'schedule' | 'now'>(
    campaign?.status === 'scheduled' ? 'schedule' : 'draft',
  )
  const [scheduledAt, setScheduledAt] = useState(
    () => toDatetimeLocal(campaign?.scheduled_at) || defaultScheduleLocal(),
  )
  const [hint, setHint] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uniqueCount, setUniqueCount] = useState<number | null>(null)
  const [counting, setCounting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [ready, setReady] = useState(mode !== 'create')
  const formRef = useRef<HTMLFormElement>(null)
  const sendArmedRef = useRef(false)
  const allowSubmitRef = useRef(false)
  const restored = useRef(false)
  const [countPending, startCount] = useTransition()

  const structureLocked = campaign?.status === 'running'
  const readOnly = campaign ? !['draft', 'paused', 'scheduled', 'running', 'stopped'].includes(campaign.status) : false
  const stepIndex = WIZARD_STEPS.findIndex((item) => item.id === step)
  const enabledAccounts = useMemo(
    () => shared.accounts.filter((item) => !item.disabled),
    [shared.accounts],
  )
  const submitListIds = useMemo(
    () => selectedLists.filter((id) => shared.lists.some((list) => list.id === id)),
    [selectedLists, shared.lists],
  )
  const submitAccountIds = useMemo(
    () =>
      enabledAccounts.length === 1
        ? [enabledAccounts[0].id]
        : selectedAccounts.filter((id) => enabledAccounts.some((account) => account.id === id)),
    [enabledAccounts, selectedAccounts],
  )

  useSyncBusy(pending, 'Kampanya kaydediliyor…')
  useSyncBusy(uploading, 'Görsel yükleniyor…')

  useEffect(() => {
    if (mode !== 'create' || restored.current) return
    restored.current = true
    const urlStep = searchParams.get('adim')
    try {
      const saved = readDraft(shared.orgId)
      if (saved) {
        setName(saved.name ?? '')
        setBody(saved.body ?? '')
        if (initialMediaUrl) {
          setMediaUrl(initialMediaUrl)
          setMessageType('image')
        } else {
          setMediaUrl(saved.mediaUrl ?? '')
          setMessageType(saved.messageType || 'text')
        }
        setSelectedLists(
          (Array.isArray(saved.lists) ? saved.lists : []).filter((id) =>
            shared.lists.some((list) => list.id === id),
          ),
        )
        setSelectedAccounts(
          (Array.isArray(saved.accounts) ? saved.accounts : []).filter((id) =>
            shared.accounts.some((account) => account.id === id && !account.disabled),
          ),
        )
        setStartMode(saved.startMode ?? 'draft')
        setScheduledAt(saved.scheduledAt || defaultScheduleLocal())
      }
      const fromUrl = urlStep ? parseWizardStep(urlStep) : null
      const fromInitial = initialStep && initialStep !== 'kampanya' ? parseWizardStep(initialStep) : null
      const fromSaved = saved?.step ? parseWizardStep(saved.step) : null
      const next = fromUrl || fromInitial || fromSaved || 'kampanya'
      setStep(next)
      if (!urlStep && next !== 'kampanya') {
        const params = new URLSearchParams(searchParams.toString())
        params.set('adim', next)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      }
    } catch {
      /* ignore */
    }
    setReady(true)
  }, [mode, initialMediaUrl, initialStep, pathname, router, searchParams, shared.orgId, shared.lists, shared.accounts])

  useEffect(() => {
    if (mode === 'create' && !ready) return
    const validLists = new Set(shared.lists.map((list) => list.id))
    setSelectedLists((current) => {
      const next = current.filter((id) => validLists.has(id))
      return next.length === current.length ? current : next
    })
    const validAccounts = new Set(enabledAccounts.map((account) => account.id))
    setSelectedAccounts((current) => {
      const next = current.filter((id) => validAccounts.has(id))
      return next.length === current.length ? current : next
    })
  }, [mode, ready, shared.lists, enabledAccounts])

  useEffect(() => {
    if (mode !== 'create' || !ready) return
    const payload: DraftShape = {
      step,
      name,
      body,
      mediaUrl,
      messageType,
      lists: selectedLists,
      accounts: selectedAccounts,
      startMode,
      scheduledAt,
    }
    localStorage.setItem(draftKey(shared.orgId), JSON.stringify(payload))
  }, [mode, ready, step, name, body, mediaUrl, messageType, selectedLists, selectedAccounts, startMode, scheduledAt, shared.orgId])

  useEffect(() => {
    if (mode === 'create' && !ready) return
    if (enabledAccounts.length !== 1) return
    const only = enabledAccounts[0].id
    setSelectedAccounts((current) => (current.length === 1 && current[0] === only ? current : [only]))
  }, [enabledAccounts, mode, ready])

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty || pending) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty, pending])

  useEffect(() => {
    if (state?.error) {
      setFormError(state.error)
      toast(state.error, 'danger')
    }
    if (state?.ok) {
      toast(state.ok, 'success')
      setDirty(false)
      if (mode === 'create') localStorage.removeItem(draftKey(shared.orgId))
    }
  }, [state?.error, state?.ok, toast, mode, shared.orgId])

  useEffect(() => {
    const fromUrl = searchParams.get('adim')
    if (fromUrl) setStep(parseWizardStep(fromUrl))
  }, [searchParams])

  const go = (next: WizardStepId) => {
    setHint(null)
    setFormError(null)
    setStep(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set('adim', next)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (selectedLists.length === 0) {
      setUniqueCount(0)
      return
    }
    const handle = window.setTimeout(() => {
      startCount(async () => {
        setCounting(true)
        const result = await countUniqueRecipients(selectedLists)
        setUniqueCount(result.count)
        setCounting(false)
      })
    }, 250)
    return () => window.clearTimeout(handle)
  }, [selectedLists])

  const mark = () => setDirty(true)

  const validateStep = (id: WizardStepId): string | null => {
    if (id === 'kampanya' && !name.trim()) return 'Kampanyaya bir ad verin.'
    if (id === 'alicilar') {
      if (shared.lists.length === 0) return 'Önce Kişiler’den bir grup oluşturun.'
      if (submitListIds.length === 0) return 'En az bir kişi grubu seçin.'
    }
    if (id === 'mesaj' && !body.trim() && !mediaUrl) return 'Mesaj yazın veya görsel ekleyin.'
    if (id === 'gonderen') {
      if (enabledAccounts.length === 0 && submitAccountIds.length === 0) {
        return 'Önce Hatlar’dan bir hat bağlayın.'
      }
      if (submitAccountIds.length === 0) return 'En az bir WhatsApp hattı seçin.'
    }
    if (id === 'yayinla' && startMode === 'schedule' && !scheduledAt) return 'Planlamak için tarih ve saat seçin.'
    return null
  }

  const goNext = () => {
    const error = validateStep(step)
    if (error) {
      setHint(error)
      return
    }
    allowSubmitRef.current = false
    const next = WIZARD_STEPS[Math.min(WIZARD_STEPS.length - 1, stepIndex + 1)]
    if (next) go(next.id)
  }

  const goBack = () => {
    const prev = WIZARD_STEPS[Math.max(0, stepIndex - 1)]
    if (prev) go(prev.id)
  }

  const upload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    const detected = typeFromMime(file.type)
    if (detected !== 'image') {
      setUploading(false)
      setUploadError('PNG, JPG veya WEBP yükleyin.')
      return
    }
    try {
      const supabase = getSupabaseBrowserClient()
      const extension = file.name.split('.').pop() ?? 'jpg'
      const path = `${shared.orgId}/${crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage.from('creatives').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (error) throw error
      const { data } = supabase.storage.from('creatives').getPublicUrl(path)
      setMediaUrl(data.publicUrl)
      setMessageType('image')
      mark()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('creatives').insert({
          org_id: shared.orgId,
          created_by: user.id,
          title: file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Kampanya görseli',
          source: 'upload',
          generation_type: 'upload',
          template: 'upload',
          format: 'feed',
          status: 'ready',
          public_url: data.publicUrl,
          storage_path: path,
          payload: { source: 'campaign-upload' },
        })
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Dosya yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  const selectedListNames = shared.lists
    .filter((item) => selectedLists.includes(item.id))
    .map((item) => item.label)
  const submitLabel = useMemo(() => {
    if (pending) return 'Kaydediliyor…'
    if (mode === 'edit' && campaign?.status === 'running') return 'Kalan gönderimler için kaydet'
    if (startMode === 'now') return 'Hemen Gönder'
    if (startMode === 'schedule') return 'Planla'
    return 'Taslağı Kaydet'
  }, [pending, mode, campaign?.status, startMode, uniqueCount])

  const [copyPending, startCopy] = useTransition()

  if (readOnly && campaign) {
    return (
      <Card>
        <div className="space-y-3 p-5">
          <h1 className="text-[22px] font-semibold tracking-[-0.03em]">Bu kampanya tamamlandı</h1>
          <p className="text-[13.5px] text-ink-muted">
            Gönderilmiş kampanya değiştirilmez. Aynı içeriği yeni bir taslak olarak kopyalayabilirsiniz.
          </p>
          <WaPreview body={campaign.body ?? ''} mediaUrl={campaign.media_url} />
          <Button
            type="button"
            variant="accent"
            disabled={copyPending}
            onClick={() => {
              startCopy(async () => {
                const result = await duplicateCampaign(campaign.id)
                if (result.error) {
                  toast(result.error, 'danger')
                  return
                }
                if (result.id) router.push(`/kampanyalar/${result.id}/duzenle`)
              })
            }}
          >
            {copyPending ? 'Kopyalanıyor…' : 'Kopyala ve Yeni Kampanya Oluştur'}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="wb-wa-wizard overflow-visible">
      {mode === 'edit' && structureLocked ? (
        <div className="px-4 pt-4 sm:px-5">
          <Notice tone="warn">
            Bu kampanya şu anda gönderiliyor. Değişiklikler yalnızca henüz mesaj gitmemiş kişilere uygulanır.
          </Notice>
        </div>
      ) : null}

      <WizardStepper current={step} onJump={go} />

      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col"
        onSubmit={(event) => {
          if (step !== 'yayinla' || !allowSubmitRef.current) {
            event.preventDefault()
            if (step !== 'yayinla') goNext()
            return
          }
          const error =
            validateStep('yayinla') ||
            validateStep('kampanya') ||
            validateStep('alicilar') ||
            validateStep('mesaj') ||
            validateStep('gonderen')
          if (error) {
            event.preventDefault()
            setHint(error)
            return
          }
          if (mode === 'create') localStorage.removeItem(draftKey(shared.orgId))
          setDirty(false)
          if (startMode === 'now' && !sendArmedRef.current) {
            event.preventDefault()
            allowSubmitRef.current = false
            void confirm({
              title: uniqueCount
                ? `Bu kampanya ${formatCount(uniqueCount)} müşteriye gönderilmeye başlanacak.`
                : 'Gönderim şimdi başlayacak.',
              description: `${selectedAccounts.length} WhatsApp hattı kullanılacak. Bu işlem geri alınamaz; duraklatabilirsiniz.`,
              confirmLabel: uniqueCount
                ? `${formatCount(uniqueCount)} kişiye gönderimi başlat`
                : 'Gönderimi başlat',
              tone: 'accent',
            }).then((ok) => {
              if (!ok) return
              sendArmedRef.current = true
              allowSubmitRef.current = true
              formRef.current?.requestSubmit()
            })
          }
        }}
      >
        {campaign ? <input type="hidden" name="campaign_id" value={campaign.id} /> : null}
        <input type="hidden" name="media_url" value={mediaUrl} />
        <input type="hidden" name="message_type" value={mediaUrl ? messageType : 'text'} />
        <input type="hidden" name="min_delay" value={campaign?.min_delay_seconds ?? 8} />
        <input type="hidden" name="max_delay" value={campaign?.max_delay_seconds ?? 25} />
        <input type="hidden" name="daily_cap" value={campaign?.daily_cap_per_account ?? 100} />
        <input type="hidden" name="ab_percent" value={campaign?.ab_percent ?? 0} />
        <input type="hidden" name="body_b" value={campaign?.body_b ?? ''} />
        <input type="hidden" name="start_mode" value={startMode} />
        <input type="hidden" name="scheduled_at" value={scheduledAt || defaultScheduleLocal()} />
        {submitListIds.map((id) => (
          <input key={`list-${id}`} type="hidden" name="lists" value={id} />
        ))}
        {submitAccountIds.map((id) => (
          <input key={`acc-${id}`} type="hidden" name="accounts" value={id} />
        ))}
        {campaign?.status === 'paused' || campaign?.status === 'stopped' ? (
          <input type="hidden" name="resume_after" value="0" />
        ) : null}

        <div className="space-y-4 p-4 sm:p-5">
          {step === 'kampanya' ? (
            <Field
              label="Kampanya adı"
              hint="Müşterilere gösterilmez. Siz bulmak için kullanırsınız."
            >
              <div className="relative">
                <Input
                  name="name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    mark()
                  }}
                  placeholder="Eylül Ayı %20 İndirim Kampanyası"
                  required
                  autoComplete="off"
                  className={name ? 'pr-10' : undefined}
                />
                {name ? (
                  <button
                    type="button"
                    aria-label="Temizle"
                    className="absolute right-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint hover:bg-surface-raised hover:text-ink"
                    onClick={() => {
                      setName('')
                      mark()
                    }}
                  >
                    <Icon name="close" className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </Field>
          ) : (
            <input type="hidden" name="name" value={name} />
          )}

          {step === 'alicilar' ? (
            <AudiencePicker
              lists={shared.lists}
              selected={selectedLists}
              uniqueCount={uniqueCount}
              counting={counting || countPending}
              locked={structureLocked}
              onToggle={(id) => {
                setSelectedLists((current) =>
                  current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                )
                mark()
              }}
            />
          ) : null}

          {step === 'gorsel' ? (
            <div className="space-y-3">
              <MediaPicker
                orgId={shared.orgId}
                mediaUrl={mediaUrl}
                creatives={shared.creatives}
                imageAiEnabled={shared.imageAiEnabled}
                brandName={shared.brandName}
                brandKits={shared.brandKits}
                uploading={uploading}
                onUpload={(file) => void upload(file)}
                onSelect={(url) => {
                  setMediaUrl(url)
                  setMessageType('image')
                  mark()
                }}
                onClear={() => {
                  setMediaUrl('')
                  setMessageType('text')
                  mark()
                }}
              />
              {uploadError ? <Notice tone="danger">{uploadError}</Notice> : null}
            </div>
          ) : null}

          {step === 'mesaj' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink-muted">
                  Mesaj
                  <span className="ml-2 font-normal tabular text-ink-faint">
                    {body.length} / 4096
                  </span>
                </p>
                {shared.aiEnabled ? (
                  <Button type="button" variant="accent" onClick={() => setAiOpen(true)}>
                    <Icon name="wand" className="size-3.5" />
                    AI ile Yaz
                  </Button>
                ) : null}
              </div>
              <Textarea
                name="body"
                rows={8}
                value={body}
                onChange={(event) => {
                  setBody(event.target.value)
                  mark()
                }}
                placeholder="Merhaba {{ad}}, bu ay mağazamızda özel bir indirim var."
              />
              {body.trim() && shared.aiEnabled ? (
                <AiRewriteBar
                  currentMessage={body}
                  onApply={(text) => {
                    setBody(text)
                    mark()
                  }}
                />
              ) : null}
            </div>
          ) : (
            <input type="hidden" name="body" value={body} />
          )}

          {step === 'gonderen' ? (
            <SenderPicker
              accounts={shared.accounts}
              selected={selectedAccounts}
              locked={structureLocked}
              onToggle={(id) => {
                if (enabledAccounts.length === 1 && enabledAccounts[0].id === id) return
                setSelectedAccounts((current) =>
                  current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                )
                mark()
              }}
            />
          ) : null}

          {step === 'onizleme' ? (
            <div className="space-y-4">
              <SummaryPills
                items={[
                  { label: 'Kampanya', value: name || 'Adsız', onEdit: () => go('kampanya') },
                  {
                    label: 'Alıcılar',
                    value: uniqueCount
                      ? `${formatCount(uniqueCount)} müşteri`
                      : `${selectedLists.length} grup`,
                    onEdit: () => go('alicilar'),
                  },
                  {
                    label: 'Gruplar',
                    value: selectedListNames.join(', ') || 'Seçilmedi',
                    onEdit: () => go('alicilar'),
                  },
                  {
                    label: 'Gönderen',
                    value:
                      enabledAccounts.length === 1
                        ? enabledAccounts[0].label
                        : `${selectedAccounts.length} WhatsApp hattı`,
                    onEdit: () => go('gonderen'),
                  },
                  {
                    label: 'Görsel',
                    value: mediaUrl ? 'Eklendi' : 'Yok',
                    onEdit: () => go('gorsel'),
                  },
                  {
                    label: 'Mesaj',
                    value: body.trim() ? 'Yazıldı' : 'Yazılmadı',
                    onEdit: () => go('mesaj'),
                  },
                ]}
              />
              <div className="flex justify-center">
                <WaPreview body={body} mediaUrl={mediaUrl || null} />
              </div>
            </div>
          ) : null}

          {step === 'yayinla' ? (
            structureLocked ? (
              <Notice tone="warn">
                Gönderim sürüyor. Kaydettiğiniz mesaj ve görsel yalnızca kalan kişilere gider.
              </Notice>
            ) : (
              <PublishCards
                mode={mode}
                selected={startMode}
                onSelect={(value) => {
                  setStartMode(value)
                  if (value === 'schedule' && !scheduledAt) setScheduledAt(defaultScheduleLocal())
                  sendArmedRef.current = false
                  mark()
                }}
                scheduledAt={scheduledAt}
                onSchedule={(value) => {
                  setScheduledAt(value)
                  mark()
                }}
                uniqueCount={uniqueCount ?? 0}
                accountCount={selectedAccounts.length}
              />
            )
          ) : null}
        </div>

        <div className="wb-wa-wizard-foot sticky bottom-0 z-[1] space-y-2.5 px-4 py-3 sm:px-5">
          {formError ? <Notice tone="danger">{formError}</Notice> : null}
          {hint ? <Notice tone="warn">{hint}</Notice> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" className="wb-wa-text-btn" disabled={pending || stepIndex === 0} onClick={goBack}>
              <Icon name="back" className="size-4 shrink-0" />
              Geri
            </Button>
            {step !== 'yayinla' ? (
              <Button type="button" className="wb-wa-submit" disabled={pending} onClick={goNext}>
                İleri
                <Icon name="back" className="size-4 shrink-0 rotate-180" />
              </Button>
            ) : (
              <Button
                type="button"
                className={startMode === 'now' && !structureLocked ? 'wb-wa-submit is-danger' : 'wb-wa-submit'}
                disabled={pending}
                onClick={() => {
                  allowSubmitRef.current = true
                  formRef.current?.requestSubmit()
                }}
              >
                {submitLabel}
              </Button>
            )}
          </div>
        </div>
      </form>

      <AiWriteModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        defaultTone={shared.brandTone}
        initialBrief={body}
        onApply={(text) => {
          setBody(text)
          mark()
        }}
      />
    </Card>
  )
}
