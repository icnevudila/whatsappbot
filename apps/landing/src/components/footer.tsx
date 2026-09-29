import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-white border-t border-[rgba(10,20,15,0.08)] py-16">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
          <div className="col-span-2 md:col-span-2">
            <Image 
              src="/logos/mesajify-logo.png"
              alt="Mesajify"
              width={140}
              height={40}
              className="mb-4"
            />
            <p className="text-gray-500 max-w-xs text-sm">
              WhatsApp Kampanya Platformu
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-[#090B0A] mb-4">Ürün</h4>
            <ul className="space-y-3">
              <li><a href="#urun" className="text-sm text-gray-500 hover:text-[#090B0A]">Mesajify Panel</a></li>
              <li><a href="#nasil-calisir" className="text-sm text-gray-500 hover:text-[#090B0A]">AI Kreatif Stüdyosu</a></li>
              <li><a href="#fiyatlandirma" className="text-sm text-gray-500 hover:text-[#090B0A]">Sıkça Sorulan Sorular</a></li>
              <li><a href="https://app.mesajify.com/giris" className="text-sm text-gray-500 hover:text-[#090B0A]">Giriş Yap</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-[#090B0A] mb-4">Sektörler</h4>
            <ul className="space-y-3">
              <li><a href="#cozumler" className="text-sm text-gray-500 hover:text-[#090B0A]">E-Ticaret & Ürün</a></li>
              <li><a href="#cozumler" className="text-sm text-gray-500 hover:text-[#090B0A]">Restoran & Fırın</a></li>
              <li><a href="#cozumler" className="text-sm text-gray-500 hover:text-[#090B0A]">Otomotiv & Servis</a></li>
              <li><a href="#cozumler" className="text-sm text-gray-500 hover:text-[#090B0A]">Emlak & Portföy</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-[#090B0A] mb-4">Özellikler</h4>
            <ul className="space-y-3">
              <li><a href="#urun" className="text-sm text-gray-500 hover:text-[#090B0A]">Çoklu WhatsApp Havuzu</a></li>
              <li><a href="#nasil-calisir" className="text-sm text-gray-500 hover:text-[#090B0A]">9:16 Video Üretimi</a></li>
              <li><a href="#urun" className="text-sm text-gray-500 hover:text-[#090B0A]">Akıllı Hat Rotasyonu</a></li>
              <li><a href="#urun" className="text-sm text-gray-500 hover:text-[#090B0A]">Merkezi Gelen Kutusu</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-[#090B0A] mb-4">Yasal</h4>
            <ul className="space-y-3">
              <li><a href="https://app.mesajify.com/giris" className="text-sm text-gray-500 hover:text-[#090B0A]">Gizlilik Politikası</a></li>
              <li><a href="https://app.mesajify.com/giris" className="text-sm text-gray-500 hover:text-[#090B0A]">Kullanım Koşulları</a></li>
              <li><a href="https://app.mesajify.com/giris" className="text-sm text-gray-500 hover:text-[#090B0A]">KVKK Aydınlatma</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-[rgba(10,20,15,0.08)] flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
          <p>© 2026 Mesajify. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}
