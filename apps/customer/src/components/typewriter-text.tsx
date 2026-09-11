'use client'

import { useEffect, useState } from 'react'

export function TypewriterText({
  text,
  speed = 35,
  className,
}: {
  text: string
  speed?: number
  className?: string
}) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timer)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return (
    <span className={className}>
      {displayed}
      <span className="inline-block w-1 h-3.5 ml-0.5 bg-current align-middle animate-pulse opacity-60" />
    </span>
  )
}
