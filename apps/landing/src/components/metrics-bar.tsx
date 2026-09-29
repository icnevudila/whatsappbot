export function MetricsBar() {
  return (
    <section className="py-12 bg-[#F7F9F8] border-y border-[rgba(10,20,15,0.08)]">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-200">
          <div className="text-center px-4">
            <div className="text-3xl md:text-4xl font-semibold text-[#090B0A] mb-2 font-[family-name:var(--font-jetbrains)]">100+</div>
            <div className="text-sm text-gray-500">Sektör</div>
          </div>
          <div className="text-center px-4">
            <div className="text-3xl md:text-4xl font-semibold text-[#090B0A] mb-2 font-[family-name:var(--font-jetbrains)]">1.000</div>
            <div className="text-sm text-gray-500">Hazır senaryo</div>
          </div>
          <div className="text-center px-4">
            <div className="text-3xl md:text-4xl font-semibold text-[#090B0A] mb-2 font-[family-name:var(--font-jetbrains)]">8–16 sn</div>
            <div className="text-sm text-gray-500">Reklam formatı</div>
          </div>
          <div className="text-center px-4">
            <div className="text-3xl md:text-4xl font-semibold text-[#090B0A] mb-2 font-[family-name:var(--font-jetbrains)]">9:16</div>
            <div className="text-sm text-gray-500">Dikey video</div>
          </div>
        </div>
      </div>
    </section>
  );
}
