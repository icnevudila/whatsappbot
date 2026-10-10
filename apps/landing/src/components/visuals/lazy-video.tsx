'use client'

import { useEffect, useRef, useState, memo } from 'react'

export interface LazyVideoProps {
  src: string
  poster?: string
  alt?: string
  className?: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  playsInline?: boolean
  preload?: 'none' | 'metadata' | 'auto'
  rootMargin?: string
  priority?: boolean
  onEnded?: () => void
  onLoadedData?: () => void
  aspectRatio?: string
  style?: React.CSSProperties
}

export const LazyVideo = memo(function LazyVideo({
  src,
  poster,
  alt = 'Video',
  className = '',
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  preload = 'none',
  rootMargin = '250px',
  priority = false,
  onEnded,
  onLoadedData,
  aspectRatio,
  style,
}: LazyVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isInView, setIsInView] = useState(priority)
  const [isLoaded, setIsLoaded] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isSaveData, setIsSaveData] = useState(false)

  // Detect Data Saver and prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(motionQuery.matches)
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    motionQuery.addEventListener('change', handleMotionChange)

    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (conn?.saveData) {
      setIsSaveData(true)
    }

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange)
    }
  }, [])

  // Viewport intersection detection
  useEffect(() => {
    if (priority) {
      setIsInView(true)
      return
    }

    const target = containerRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          if (videoRef.current && autoPlay && !reducedMotion && !isSaveData) {
            videoRef.current.play().catch(() => {})
          }
        } else {
          // Pause when out of view to save battery, CPU and GPU decoders
          if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause()
          }
        }
      },
      { rootMargin, threshold: 0.05 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [priority, rootMargin, autoPlay, reducedMotion, isSaveData])

  // Playback control when visible
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isInView) return

    if (autoPlay && !reducedMotion && !isSaveData) {
      video.defaultMuted = true
      video.muted = true
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {})
      }
    }
  }, [isInView, autoPlay, reducedMotion, isSaveData, src])

  const handleVideoLoaded = () => {
    setIsLoaded(true)
    if (onLoadedData) onLoadedData()
  }

  const combinedStyle: React.CSSProperties = {
    ...style,
    ...(aspectRatio ? { aspectRatio } : {}),
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={combinedStyle}
    >
      {/* High-fidelity poster placeholder always visible initially */}
      {poster && (
        <img
          src={poster}
          alt={alt}
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out pointer-events-none ${
            isLoaded ? 'opacity-0 z-0' : 'opacity-100 z-10'
          }`}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      )}

      {/* Video tag attaches source only when approaching viewport */}
      {isInView && !reducedMotion && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay={autoPlay && !isSaveData}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          preload={priority ? 'auto' : isSaveData ? 'none' : preload}
          onLoadedData={handleVideoLoaded}
          onEnded={onEnded}
          aria-label={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
            isLoaded ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        />
      )}
    </div>
  )
})
