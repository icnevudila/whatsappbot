'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ArrowRight, ArrowLeftRight, MessageCircle } from 'lucide-react';

const examples = [
  { id: 'bofe', label: 'Bahçe ekipmanı', brand: 'Bofe', source: 'bofe-source.webp', result: 'bofe-campaign-v2.webp',
    message: 'Bahçeniz için ilaçlama pompası mı arıyorsunuz?\n\nBofe ürününü yakından inceleyin; ürün detaylarını birlikte konuşalım.\n\nBilgi almak için bu mesajı yanıtlayabilirsiniz.' },
  { id: 'ayvaz', label: 'Yapı malzemesi', brand: 'Ayvazoğlu İnşaat', source: 'brick-source.jpg', result: 'ayvaz-campaign-v2.webp',
    message: 'Tuğlanız fabrikadan kapınıza.\n\nAyvazoğlu İnşaat’ta toptan ve perakende tuğla seçenekleri, kapıya teslim imkânıyla.\n\nİhtiyacınız olan miktarı yazın, sipariş ayrıntılarını konuşalım.' },
];
const media='/landing/crafted/';

export function CampaignComparison() {
  const [selected,setSelected]=useState(0);
  const [position,setPosition]=useState(60);
  const example=examples[selected];
  return <section className="cf-comparison cf-section cf-wrap" id="once-sonra" aria-labelledby="cf-comparison-heading">
    <div className="cf-comparison-copy"><h2 id="cf-comparison-heading">Ürününüz var.<br />Şimdi kampanyanız olsun.</h2><p>Bir ürün fotoğrafından, markanızı anlatan reklama.<br />Karşılaştırmayı kaydırın, farkı kendiniz görün.</p>
      <div className="cf-comparison-examples" role="group" aria-label="Örnek ürün seçimi">{examples.map((item,index)=><button key={item.id} type="button" aria-pressed={selected===index} onClick={()=>{setSelected(index);setPosition(60);}}>{item.label}<ArrowRight /></button>)}</div>
      <div className="cf-paired-message"><header><MessageCircle /><span>Görselinizin yanında, mesajınız.</span></header><p>{example.message}</p><small>{example.brand} · Yeni hazırlanmış örnek içerik</small></div>
      <a className="cf-text-link" href="https://app.mesajify.com/giris">Kendi kampanyamı hazırla <ArrowRight /></a>
    </div>
    <div className="cf-comparison-view"><div className="cf-comparison-art" role="group" aria-label={`${example.brand}: ürün fotoğrafından yeni kampanya görseline karşılaştırma`}>
      <Image src={media+example.source} width={1120} height={1400} alt={`${example.brand} için kullanılan kaynak ürün fotoğrafı`} unoptimized />
      <div className="cf-comparison-after" style={{clipPath:`inset(0 ${100-position}% 0 0)`}}><Image src={media+example.result} width={1120} height={1400} alt={`${example.brand} için yeni hazırlanan kampanya görseli`} unoptimized /></div>
      {position>15 && <span className="cf-compare-label cf-compare-label-after" aria-hidden="true">Kampanya görseli</span>}{position<85 && <span className="cf-compare-label cf-compare-label-before" aria-hidden="true">Ürün fotoğrafı</span>}
      <div className="cf-comparison-divider" style={{left:`${position}%`}} aria-hidden="true"><span><ArrowLeftRight /></span></div>
      <input type="range" min="0" max="100" step="1" value={position} aria-label="Önce ve sonra karşılaştırmasını kaydırın" aria-valuetext={`Kampanya görseli yüzde ${position}, ürün fotoğrafı yüzde ${100-position}`} onChange={event=>setPosition(Number(event.target.value))} />
    </div><div className="cf-comparison-controls"><button type="button" onClick={()=>setPosition(0)}>Ürün fotoğrafı</button><span>Kaydırarak karşılaştırın <ArrowLeftRight /></span><button type="button" onClick={()=>setPosition(100)}>Kampanya görseli</button></div></div>
  </section>;
}
