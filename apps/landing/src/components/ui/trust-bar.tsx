import React from 'react'

export function TrustBar() {
  return (
    <div className="w-full border-b border-slate-100 bg-slate-50 py-5 sm:py-6 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 text-[13px] sm:text-[15px] font-medium text-slate-600">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span>Kurulum gerektirmez</span>
          </div>
          
          <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
          
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span>Teknik bilgi gerekmez</span>
          </div>
          
          <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
          
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span>Otomatik liste doğrulama</span>
          </div>
        </div>
      </div>
    </div>
  )
}
