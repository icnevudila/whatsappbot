'use client'

import { STYLE_MODES, type CreativeStyleMode } from '@/lib/creative/style-mode'

export function CreativeStylePicker({
  value,
  onChange,
}: {
  value: CreativeStyleMode
  onChange: (mode: CreativeStyleMode) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      {STYLE_MODES.map((mode) => {
        const isSelected = value === mode.id
        const badge = (mode as any).badge
        return (
          <button
            key={mode.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(mode.id)}
            className={`min-h-[76px] rounded-xl border p-3 text-left transition-all flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-[#008069] relative ${
              isSelected
                ? 'border-[#008069] bg-[#e7f8f2]/70 ring-2 ring-[#008069]/30 shadow-xs'
                : 'border-[#e9edef] hover:border-[#008069]/40 hover:bg-[#fbfcfc] bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5 w-full">
              <span className={`text-[13px] font-bold leading-tight ${isSelected ? 'text-[#008069]' : 'text-[#111b21]'}`}>
                {mode.label}
              </span>
              {badge && (
                <span className="rounded-full bg-[#008069] px-2 py-0.5 text-[9.5px] font-bold text-white shrink-0 tracking-wide">
                  {badge}
                </span>
              )}
            </div>
            <span className="mt-1.5 block text-[11.5px] leading-snug text-[#667781]">
              {mode.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}
