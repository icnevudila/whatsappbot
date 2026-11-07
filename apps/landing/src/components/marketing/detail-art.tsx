import Image from 'next/image';
import {CalendarDays,Check,MessageCircle,Send,Users} from 'lucide-react';
import type {FilmName} from './content';
import {CampaignPlanArtwork} from './campaign-plan-art';
import {InboxArtwork} from './inbox-art';

export function DetailArtwork({kind}:{kind:FilmName}){
 if(kind==='campaign')return <CampaignPlanArtwork/>;
 if(kind==='inbox')return <InboxArtwork/>;
 if(kind==='discovery')return <div className="dv-art dv-map"><Image src="/landing/studio/istanbul-map.webp" alt="Temsili konum seçimi için İstanbul haritası" width={1000} height={1000} unoptimized/><div className="dv-map-search"><span>Liste talebi</span><b>Ev ürünleri</b><small>Beyoğlu, İstanbul</small></div><div className="dv-map-result"><Users size={20}/><div><b>Listenizi talep edin.</b><span>Hazırlandığında kişi gruplarınızda.</span></div></div><small>© OpenStreetMap katkıcıları · Temsili konum</small></div>;
 const creative=kind==='creative',inbox=false;
 const brand=creative?'Mori Atölye':inbox?'Rota Adım':'Novi Ev';
 const file=creative?'mori-craft-v3.webp':inbox?'rota-campaign-v2.webp':'novi-campaign-v2.webp';
 return <div className={`dv-art ${creative?'dv-creative':inbox?'dv-inbox':'dv-campaign'}`}><div className="dv-art-label">{creative?'Kreatif Stüdyo':inbox?'Mesajlar':'WhatsApp kampanyaları'}<span>Temsili örnek</span></div><Image className="dv-poster" src={`/landing/studio/${file}`} alt={`${brand} kurgusal reklam görseli`} width={1400} height={1750} unoptimized priority/>{creative?<div className="dv-source"><Image src="/landing/studio/mori-source.webp" alt="Sade kaynak kupa fotoğrafı" width={240} height={300} unoptimized/><span>Kaynak fotoğraf</span></div>:inbox?<div className="dv-message"><MessageCircle size={20}/><span>Merhaba, bu modelin<br/>38 numarası var mı?</span><small>Konuşma Mesajlar ekranınızda.</small></div>:<div className="dv-plan"><CalendarDays size={22}/><div><span>Gönderim zamanı</span><b>12 Kasım · 10:00</b></div><Check size={17}/></div>}<div className="dv-art-footer">{creative?<><Check size={14}/>Markanız ve ürününüzle hazırlayın.</>:inbox?<><MessageCircle size={14}/>Yanıtları aynı panelde karşılayın.</>:<><Send size={14}/>Hazırlayın, önizleyin ve planlayın.</>}</div></div>
}
