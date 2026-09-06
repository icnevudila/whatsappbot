'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type BusyEntry = {
  id: number
  label: string
  detail?: string
}

type BusyApi = {
  /** İşlem sürerken altta progress pill gösterir. Dönüş: bitince clearBusy(id). */
  setBusy: (label: string, detail?: string) => number
  clearBusy: (id?: number) => void
  /** Async işi busy ile sarar. */
  runBusy: <T>(label: string, task: () => Promise<T>, detail?: string) => Promise<T>
  busy: BusyEntry | null
}

const BusyContext = createContext<BusyApi | null>(null)

export function useBusy(): BusyApi {
  const api = useContext(BusyContext)
  if (!api) {
    throw new Error('useBusy yalnızca FeedbackProviders içinde kullanılabilir.')
  }
  return api
}

/** useActionState / useTransition pending ile senkron progress. */
export function useSyncBusy(active: boolean, label: string, detail?: string) {
  const { setBusy, clearBusy } = useBusy()
  const idRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      if (idRef.current != null) {
        clearBusy(idRef.current)
        idRef.current = null
      }
      return
    }

    if (idRef.current != null) clearBusy(idRef.current)
    idRef.current = setBusy(label, detail)

    return () => {
      if (idRef.current != null) {
        clearBusy(idRef.current)
        idRef.current = null
      }
    }
  }, [active, label, detail, setBusy, clearBusy])
}

export function BusyProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<BusyEntry[]>([])
  const seq = useRef(0)

  const setBusy = useCallback((label: string, detail?: string) => {
    const id = ++seq.current
    setStack((current) => [...current, { id, label, detail }])
    return id
  }, [])

  const clearBusy = useCallback((id?: number) => {
    setStack((current) => {
      if (id == null) return []
      return current.filter((entry) => entry.id !== id)
    })
  }, [])

  const runBusy = useCallback(
    async <T,>(label: string, task: () => Promise<T>, detail?: string) => {
      const id = setBusy(label, detail)
      try {
        return await task()
      } finally {
        clearBusy(id)
      }
    },
    [setBusy, clearBusy],
  )

  const busy = stack.length > 0 ? stack[stack.length - 1]! : null

  return (
    <BusyContext.Provider value={{ setBusy, clearBusy, runBusy, busy }}>
      {children}
      <BusyPill busy={busy} depth={stack.length} />
    </BusyContext.Provider>
  )
}

function BusyPill({ busy, depth }: { busy: BusyEntry | null; depth: number }) {
  const labelId = useId()
  if (!busy) return null

  return (
    <div
      className="wb-busy-pill"
      role="status"
      aria-live="polite"
      aria-labelledby={labelId}
      data-depth={depth}
    >
      <div className="wb-busy-track" aria-hidden>
        <span className="wb-busy-bar" />
      </div>
      <div className="wb-busy-copy">
        <p id={labelId} className="wb-busy-label">
          <span className="wb-busy-dot" aria-hidden />
          {busy.label}
        </p>
        {busy.detail ? <p className="wb-busy-detail">{busy.detail}</p> : null}
      </div>
    </div>
  )
}
