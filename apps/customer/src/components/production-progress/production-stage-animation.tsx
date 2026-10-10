'use client'

import { useState, useEffect, type ComponentType } from 'react'
import type { ProductionStageKey } from '@/lib/creative/production-progress/progress-types'
import { StudioStageVisual } from './studio-stage-visual'

export interface StageAnimationProps {
  stageKey?: ProductionStageKey
  stageIndex?: number
  kind?: 'video' | 'image'
  lottieSrc?: string | null
  className?: string
}

/** Stage-driven SVG motion; explicit legacy Lottie previews retain their player. */
export function ProductionStageAnimation({ stageKey, stageIndex = 1, kind = 'video', lottieSrc, className = '' }: StageAnimationProps) {
  const [Player, setPlayer] = useState<ComponentType<any> | null>(null)
  const [reducedMotion, setReducedMotion] = useState(true)
  const [instance, setInstance] = useState<any>(null)
  const [lottieError, setLottieError] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update(); query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (reducedMotion || !lottieSrc) return
    let mounted = true
    import('@lottiefiles/dotlottie-react').then(module => {
      module.setWasmUrl('/animations/runtime/dotlottie-player.wasm')
      if (mounted) setPlayer(() => module.DotLottieReact)
    }).catch(() => { if (mounted) setLottieError(true) })
    return () => { mounted = false }
  }, [reducedMotion, lottieSrc])
  useEffect(() => { setLottieError(false) }, [lottieSrc])
  useEffect(() => {
    if (!instance) return
    const fail = () => setLottieError(true)
    instance.addEventListener('loadError', fail)
    return () => instance.removeEventListener('loadError', fail)
  }, [instance])
  if (lottieSrc && Player && !reducedMotion && !lottieError) {
    return <div className={`mesajify-prod-visual-host ${className}`} aria-hidden="true"><div className="mesajify-prod-visual-wrapper"><Player key={lottieSrc} src={lottieSrc} loop autoplay dotLottieRefCallback={setInstance} style={{ width: '100%', height: '100%' }} /></div></div>
  }
  return <StudioStageVisual stageKey={stageKey} stageIndex={stageIndex} kind={kind} className={className} />
}
