'use client'

import { useState } from 'react'
import { STYLE_MODES, type CreativeStyleMode, type StyleModeItem } from '@/lib/creative/style-mode'

export function CreativeStylePicker({
  value,
  onChange,
}: {
  value: CreativeStyleMode
  onChange: (mode: CreativeStyleMode) => void
}) {
  const [activePreviewMode, setActivePreviewMode] = useState<StyleModeItem | null>(null)
  const [selectedExampleIdx, setSelectedExampleIdx] = useState<number>(0)

  const handleOpenPreview = (e: React.MouseEvent, mode: StyleModeItem) => {
    e.stopPropagation()
    e.preventDefault()
    setActivePreviewMode(mode)
    setSelectedExampleIdx(0)
  }

  const handleClosePreview = () => {
    setActivePreviewMode(null)
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {STYLE_MODES.map((mode) => {
          const isSelected = value === mode.id
          const badge = mode.badge

          return (
            <div
              key={mode.id}
              onClick={() => onChange(mode.id)}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChange(mode.id)
                }
              }}
              className={`group min-h-[96px] rounded-xl border p-3 text-left transition-all flex flex-col justify-between relative cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[#008069] ${
                isSelected
                  ? 'border-[#008069] bg-[#e7f8f2]/70 ring-2 ring-[#008069]/30 shadow-xs'
                  : 'border-[#e9edef] hover:border-[#008069]/40 hover:bg-[#fbfcfc] bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[13px] font-bold leading-tight truncate ${isSelected ? 'text-[#008069]' : 'text-[#111b21]'}`}>
                      {mode.label}
                    </span>
                    {badge && (
                      <span className="rounded-full bg-[#008069] px-2 py-0.5 text-[9.5px] font-bold text-white shrink-0 tracking-wide">
                        {badge}
                      </span>
                    )}
                  </div>

                  {/* Eye preview button */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenPreview(e, mode)}
                    title={`${mode.label} örneklerini incele`}
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-[#54656f] hover:text-[#008069] hover:bg-[#008069]/10 transition-colors shrink-0 -mr-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                      <path
                        fillRule="evenodd"
                        d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                <span className="mt-1.5 block text-[11.5px] leading-snug text-[#667781]">
                  {mode.description}
                </span>
              </div>

              {/* Quick visual preview indicator / helper */}
              <div className="mt-2.5 pt-2 border-t border-black/[0.04] flex items-center justify-between text-[11px] text-[#008069] font-medium">
                <span className="flex items-center gap-1 group-hover:underline">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-80">
                    <path d="M8 2a6 6 0 100 12A6 6 0 008 2zM7.25 4.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 6.75a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                  </svg>
                  Örnek Görselleri Gör
                </span>
                <span className="text-[10px] text-[#8696a0] font-normal">3 Sektör</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Style Mode Example Preview Modal */}
      {activePreviewMode && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={handleClosePreview}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-hairline w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-hairline bg-[#f0f2f5]/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e7f8f2] flex items-center justify-center text-[#008069]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909-3.97-3.97a.75.75 0 00-1.06 0L2.5 11.06zm10.75-4.31a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#111b21] flex items-center gap-2">
                    {activePreviewMode.label}
                    {activePreviewMode.badge && (
                      <span className="rounded-full bg-[#008069] px-2 py-0.5 text-[9.5px] font-bold text-white tracking-wide">
                        {activePreviewMode.badge}
                      </span>
                    )}
                  </h3>
                  <p className="text-[12px] text-[#667781]">{activePreviewMode.description}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClosePreview}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#667781] hover:bg-black/5 hover:text-[#111b21] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Sector selector tabs */}
              <div className="flex gap-2 p-1 bg-[#f0f2f5] rounded-xl border border-hairline">
                {activePreviewMode.examples.map((ex, idx) => {
                  const isActive = idx === selectedExampleIdx
                  return (
                    <button
                      key={ex.company}
                      type="button"
                      onClick={() => setSelectedExampleIdx(idx)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-[12px] font-semibold transition-all text-center flex items-center justify-center gap-1.5 ${
                        isActive
                          ? 'bg-white text-[#008069] shadow-xs'
                          : 'text-[#667781] hover:text-[#111b21]'
                      }`}
                    >
                      <span>{ex.company}</span>
                      <span className="text-[10px] text-[#8696a0] font-normal hidden sm:inline">({ex.sector})</span>
                    </button>
                  )
                })}
              </div>

              {/* Large Image Preview Card */}
              {activePreviewMode.examples[selectedExampleIdx] && (
                <div className="rounded-xl overflow-hidden border border-hairline bg-[#111b21] shadow-inner relative group">
                  <div className="aspect-square w-full max-h-[380px] flex items-center justify-center overflow-hidden bg-black/40">
                    <img
                      src={activePreviewMode.examples[selectedExampleIdx].image}
                      alt={`${activePreviewMode.examples[selectedExampleIdx].company} - ${activePreviewMode.label}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                  </div>

                  {/* Caption overlay on image bottom */}
                  <div className="p-3 bg-white/95 backdrop-blur-xs border-t border-hairline flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-bold text-[#111b21]">
                        {activePreviewMode.examples[selectedExampleIdx].company} — {activePreviewMode.examples[selectedExampleIdx].sector}
                      </div>
                      <div className="text-[11.5px] text-[#54656f] mt-0.5">
                        {activePreviewMode.examples[selectedExampleIdx].highlight}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onChange(activePreviewMode.id)
                        handleClosePreview()
                      }}
                      className="shrink-0 bg-[#008069] hover:bg-[#00705a] text-white text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                    >
                      Bu Modu Seç
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Mode Characteristics Bullet Points */}
              <div className="bg-[#f0f2f5]/50 rounded-xl p-3.5 border border-hairline">
                <div className="text-[11.5px] font-bold text-[#111b21] uppercase tracking-wide mb-1.5">
                  Bu Modun Temel Özellikleri
                </div>
                <ul className="space-y-1 text-[11.5px] text-[#54656f]">
                  {activePreviewMode.characteristics.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-[#008069] font-bold">✓</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-hairline bg-[#f0f2f5]/40 flex items-center justify-between">
              <span className="text-[11.5px] text-[#667781]">
                Şu anki seçim: <strong>{STYLE_MODES.find(m => m.id === value)?.label}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#667781] hover:text-[#111b21] hover:bg-black/5 transition-colors"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(activePreviewMode.id)
                    handleClosePreview()
                  }}
                  className="bg-[#008069] hover:bg-[#00705a] text-white text-[12px] font-bold px-4 py-1.5 rounded-lg transition-colors shadow-xs"
                >
                  {activePreviewMode.label} ile Devam Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
