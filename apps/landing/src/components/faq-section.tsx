'use client';
import { useState } from 'react';

const FAQS = [
  {
    q: 'Kendi WhatsApp hattımı kullanabilir miyim?',
    a: "Evet. Desteklenen bağlantı akışında işletme hattınızı QR kod ile Mesajify'a bağlayabilirsiniz."
  },
  {
    q: 'Birden fazla hat bağlayabilir miyim?',
    a: 'Evet. Birden fazla işletme hattını tek panelden yönetebilirsiniz.'
  },
  {
    q: 'Video hazırlamak için teknik bilgi gerekir mi?',
    a: 'Hayır. Ürününüzün fotoğrafını yükleyin veya kampanyanızı kısaca anlatın.'
  },
  {
    q: 'Kendi logomu videolarda kullanabilir miyim?',
    a: 'Evet. Marka kitinizi yükleyerek videolarda logonuzu kullanabilirsiniz.'
  },
  {
    q: 'Excel veya CSV listemi yükleyebilir miyim?',
    a: 'Evet. Excel (.xlsx) ve CSV dosyalarınızı doğrudan yükleyebilirsiniz.'
  },
  {
    q: 'Müşteri yanıtlarını nereden görebilirim?',
    a: "Tüm yanıtlar Mesajify Gelen Kutusu'nda toplanır."
  },
  {
    q: 'İletişim almak istemeyen kişiler ne olur?',
    a: 'Otomatik olarak sonraki kampanyalardan hariç tutulurlar.'
  },
  {
    q: 'WhatsApp hesabımın kapanmayacağı garanti edilebilir mi?',
    a: 'Hayır. Hiçbir üçüncü taraf yazılım WhatsApp hesabınızın hiçbir koşulda kısıtlanmayacağını garanti edemez. Mesajify kampanya ve hat yönetimini kontrollü yürütmenize, gönderim durumlarını izlemenize ve iletişim almak istemeyen kişileri sonraki kampanyalardan çıkarmanıza yardımcı olur.'
  }
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl font-medium tracking-tight mb-12 text-center text-[#090B0A]">
          Sıkça Sorulan Sorular
        </h2>
        
        <div className="divide-y divide-[rgba(10,20,15,0.08)]">
          {FAQS.map((faq, i) => (
            <div key={i} className="py-6">
              <button 
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between text-left group"
              >
                <span className="text-lg font-medium text-[#090B0A] group-hover:text-[#22c55e] transition-colors pr-8">
                  {faq.q}
                </span>
                <span className={`flex-shrink-0 transition-transform duration-300 text-gray-400 ${openIdx === i ? 'rotate-180' : ''}`}>
                  ↓
                </span>
              </button>
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIdx === i ? 'max-h-48 opacity-100 mt-4' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-gray-500">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
