'use client'

export function Stepper({
  steps,
  current,
  onJump,
  label,
  className,
}: {
  steps: { id: string; label: string }[]
  current: string
  onJump?: (id: string) => void
  label: string
  className?: string
}) {
  const currentIndex = steps.findIndex((step) => step.id === current)

  return (
    <nav aria-label={label} className={['wb-steps', className].filter(Boolean).join(' ')}>
      <ol className="wb-steps-list">
        {steps.map((step, index) => {
          const active = step.id === current
          const done = index < currentIndex
          const state = active ? 'is-active' : done ? 'is-done' : 'is-pending'
          return (
            <li key={step.id} className={`wb-steps-item ${state}`}>
              <button
                type="button"
                disabled={index > currentIndex}
                aria-current={active ? 'step' : undefined}
                onClick={() => {
                  if (index < currentIndex) onJump?.(step.id)
                }}
                className="wb-steps-btn"
              >
                <span className="wb-steps-dot">{index + 1}</span>
                <span className="wb-steps-label">{step.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
