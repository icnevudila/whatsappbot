'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight,Check,FileSpreadsheet,MapPin,Smartphone} from 'lucide-react';
import './audience-paths.css';
import {Film} from './site';

const paths=[
 {id:'excel',icon:FileSpreadsheet,label:'Excel listem',title:'Elinizdeki listeyle başlayın.',text:'Kişilerinizi Excel’den aktarın. Grubunuzu düzenleyin, kampanyanızın alıcılarını seçin.',steps:['Excel dosyanızı aktarın','Kişi grubunuzu düzenleyin','Kampanyada grubunuzu seçin'],visual:'Müşteri listeniz',rows:['Deniz A.','Ece B.','Mert C.'],status:'Kişi grubunuz'},
 {id:'rehber',icon:Smartphone,label:'WhatsApp rehberim',title:'Bağlı hattınızdaki kişileri alın.',text:'WhatsApp hattınızı bağlayın. Rehberdeki kişi ve sohbet numaralarını panelinize aktarın.',steps:['WhatsApp hattınızı bağlayın','Rehberden çek seçeneğini açın','Aktarılan kişileri inceleyin'],visual:'WhatsApp rehberi',rows:['Kişiler','Sohbet numaraları','Kişi grubunuz'],status:'Bağlı hat gerekir'},
 {id:'talep',icon:MapPin,label:'İşletme listesi talebi',title:'Bölgenizi seçin. Listenizi talep edin.',text:'Kategori ve il-ilçe seçin veya adres ve mesafeyi belirleyin. Talebinizin hazırlık durumunu izleyin.',steps:['Kategori ve konumu belirleyin','Liste talebinizi gönderin','Hazırlanan listeyi inceleyin'],visual:'Yeni liste talep',rows:['Kategori · Ev ürünleri','Konum · Bursa / Nilüfer','Durum · Hazırlanıyor'],status:'Talep takibi'},
];

export function AudiencePaths(){
 const [active,setActive]=useState(0),item=paths[active];
 return <div className="ap-root"><div className="ap-choices" role="group" aria-label="Listenizi nasıl hazırlamak istersiniz?">{paths.map((path,index)=>{const ChoiceIcon=path.icon;return <button key={path.id} type="button" aria-pressed={active===index} aria-controls="audience-path-detail" onClick={()=>setActive(index)}><ChoiceIcon size={19}/><span>{path.label}</span><ArrowRight size={17}/></button>})}</div><div id="audience-path-detail" className="ap-detail" aria-live="polite"><div className="ap-copy"><span className="ap-kicker">SİZİN BAŞLANGIÇ NOKTANIZ</span><h3><span className="ap-desktop-title">{item.title}</span><span className="ap-mobile-title">{["Listenizle başlayın.","Rehberinizi aktarın.","Yeni işletmeleri bulun."][active]}</span></h3><p>{item.text}</p><ol>{item.steps.map(step=><li key={step}><Check size={14}/>{step}</li>)}</ol><Link className="hv-link" href={active===0?'/excel-aktarimi':active===1?'/whatsapp-rehberi':'/isletme-listeleri'}>Akışı yakından incele<ArrowRight size={17}/></Link></div><div className="ap-motion"><Film key={item.id} name={active===0?'import':active===1?'contacts':'discovery'}/></div></div></div>
}
