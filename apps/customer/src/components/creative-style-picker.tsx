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
  const [imageLoaded, setImageLoaded] = useState<boolean>(false)

  const handleOpenPreview = (e: React.MouseEvent, mode: StyleModeItem) => {
    e.stopPropagation()
    e.preventDefault()
    setImageLoaded(false)
    setActivePreviewMode(mode)
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
              className={`group min-h-[82px] rounded-xl border p-3 text-left transition-all flex flex-col justify-between relative cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[#008069] ${
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

                  {/* Eye preview icon button */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenPreview(e, mode)}
                    title={`${mode.label} örneğini incele`}
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
            </div>
          )
        })}
      </div>

      {/* Simple, Clean Image Preview Modal */}
      {activePreviewMode && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={handleClosePreview}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-hairline w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Minimal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-[#fbfcfc]">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[#111b21]">
                  {activePreviewMode.label}
                </span>
                {activePreviewMode.badge && (
                  <span className="rounded-full bg-[#008069] px-2 py-0.5 text-[9.5px] font-bold text-white tracking-wide">
                    {activePreviewMode.badge}
                  </span>
                )}
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

            {/* Direct Image Stage */}
            <div className="relative aspect-square w-full bg-[#0b0f17] flex items-center justify-center overflow-hidden">
              {!imageLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-2">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-[#008069] rounded-full animate-spin" />
                  <span className="text-[12px]">Görsel yükleniyor...</span>
                </div>
              )}
              <img
                src={activePreviewMode.previewUrl}
                alt={`${activePreviewMode.label} Örneği`}
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            </div>

            {/* Minimal Footer */}
            <div className="px-4 py-2.5 bg-[#fbfcfc] border-t border-hairline flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClosePreview}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-[#667781] hover:text-[#111b21] hover:bg-black/5 transition-colors"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(activePreviewMode.id)
                  handleClosePreview()
                }}
                className="bg-[#008069] hover:bg-[#00705a] text-white text-[12px] font-bold px-4 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                Bu Modu Seç
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
