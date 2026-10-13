'use client'

import { STYLE_MODES, type CreativeStyleMode } from '@/lib/creative/style-mode'

export function CreativeStylePicker({ value, onChange }: {
  value: CreativeStyleMode
  onChange: (mode: CreativeStyleMode) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {STYLE_MODES.map(mode => (
        <button key={mode.id} type="button" aria-pressed={value === mode.id} onClick={() => onChange(mode.id)}
          className={`min-h-[72px] rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#008069] ${value === mode.id ? 'border-[#008069] bg-[#e7f8f2] ring-1 ring-[#008069]' : 'border-[#e9edef] bg-white'}`}>
          <span className="block text-[12px] font-bold text-[#111b21]">{mode.label}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-[#667781]">{mode.description}</span>
        </button>
      ))}
    </div>
  )
}
