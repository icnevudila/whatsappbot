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
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Özellikler</a></li>
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Entegrasyonlar</a></li>
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Fiyatlandırma</a></li>
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Değişiklikler</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-[#090B0A] mb-4">Çözümler</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">E-ticaret</a></li>
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Perakende</a></li>
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Ajanslar</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-[#090B0A] mb-4">Kaynaklar</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Blog</a></li>
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Rehberler</a></li>
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Yardım Merkezi</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-[#090B0A] mb-4">Şirket</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Hakkımızda</a></li>
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">İletişim</a></li>
            </ul>
            <h4 className="font-medium text-[#090B0A] mb-4 mt-8">Yasal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Gizlilik</a></li>
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">Kullanım Koşulları</a></li>
              <li><a href="#" className="text-sm text-gray-500 hover:text-[#090B0A]">KVKK</a></li>
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
