import { MesajifyMark } from './brand/mesajify-mark';

export function Footer() {
  return <footer className="bg-white border-t border-hairline py-16">
    <div className="max-w-[1240px] mx-auto px-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-8 mb-12">
        <div className="col-span-2"><MesajifyMark variant="full" size="sm"/><p className="text-ink-muted max-w-xs text-sm leading-relaxed mt-5">İşletmenizi WhatsApp’tan tanıtın. Mesajlarınız ve müşteri yanıtları tek panelde.</p></div>
        <div><h4 className="font-medium mb-4">Ürün</h4><ul className="space-y-3 text-sm text-ink-muted"><li><a href="#urun">Mesajify Panel</a></li><li><a href="#kreatif">Kreatif Stüdyosu</a></li><li><a href="#gelen-kutusu">Ortak Gelen Kutusu</a></li></ul></div>
        <div><h4 className="font-medium mb-4">Çözümler</h4><ul className="space-y-3 text-sm text-ink-muted"><li><a href="#cozumler">E-Ticaret</a></li><li><a href="#cozumler">Restoran</a></li><li><a href="#cozumler">Otomotiv</a></li><li><a href="#cozumler">Emlak, Klinik ve Hizmet</a></li></ul></div>
        <div><h4 className="font-medium mb-4">Kaynaklar</h4><ul className="space-y-3 text-sm text-ink-muted"><li><a href="#nasil-calisir">Nasıl Çalışır</a></li><li><a href="#fiyatlandirma">Sıkça Sorulan Sorular</a></li></ul></div>
        <div><h4 className="font-medium mb-4">Şirket</h4><ul className="space-y-3 text-sm text-ink-muted"><li>Mesajify</li><li><a href="https://app.mesajify.com/giris">Giriş Yap</a></li></ul></div>
        <div><h4 className="font-medium mb-4">Yasal</h4><ul className="space-y-3 text-sm text-ink-muted"><li>Gizlilik</li><li>Kullanım Koşulları</li><li>KVKK</li></ul></div>
      </div>
      <div className="pt-8 border-t border-hairline text-sm text-ink-muted">© 2026 Mesajify</div>
    </div>
  </footer>;
}
