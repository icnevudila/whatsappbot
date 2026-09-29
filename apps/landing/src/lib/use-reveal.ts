'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Adds '.visible' class when element enters viewport.
 * Pair with `.reveal` CSS class in globals.css.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
  once = true
): RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          if (once) observer.unobserve(el)
        } else if (!once) {
          el.classList.remove('visible')
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, once])

  return ref
}
