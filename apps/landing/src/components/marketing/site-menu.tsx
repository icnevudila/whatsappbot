'use client';
import {useEffect,useRef} from 'react';
import Link from 'next/link';
import {X} from 'lucide-react';
import {MesajifyMark} from '../brand/mesajify-mark';
import {AccountTrigger} from './account-modal';
import {BrandHomeLink} from './brand-home-link';
import './site-menu.css';
const productLinks=[['Ürünü keşfedin','/ozellikler'],['WhatsApp kampanyaları','/whatsapp-kampanyalari'],['Nasıl çalışır?','/nasil-calisir'],['Örnekler','/ornekler'],['Paketler','/paketler'],['Başlangıç rehberi','/baslangic-rehberi']];
const exploreLinks=[['Satış ekipleri','/cozumler/satis-ekipleri'],['Ajanslar','/cozumler/ajanslar'],['Yerel işletmeler','/cozumler/yerel-isletmeler'],['Rehberler','/rehberler'],['Sorular ve yanıtlar','/sik-sorulan-sorular'],['İletişim','/iletisim']];
export function SiteMenu({open,onDismiss}:{open:boolean;onDismiss:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),close=()=>dialog.current?.close();
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();if(!open&&dialog.current?.open)dialog.current.close()},[open]);
 return <dialog id="site-menu" ref={dialog} className="mx-menu-dialog" aria-label="Mesajify menüsü" onClose={onDismiss} onCancel={onDismiss} onClick={event=>{if(event.target===event.currentTarget)close()}}><div className="mx-menu-card"><header className="mx-menu-top"><BrandHomeLink onNavigate={close}><MesajifyMark variant="full" size="md"/></BrandHomeLink><button type="button" autoFocus aria-label="Menüyü kapat" onClick={close}><X size={24}/></button></header><nav className="mx-menu-columns" aria-label="Tüm sayfalar">{[{title:'ÜRÜNÜ TANIYIN',links:productLinks},{title:'İŞİNİZE GÖRE KEŞFEDİN',links:exploreLinks}].map(group=><div className="mx-menu-group" key={group.title}><span>{group.title}</span>{group.links.map(([label,href])=><Link key={href} href={href} onClick={close}>{label}</Link>)}</div>)}</nav><div className="mx-menu-account"><Link href="https://app.mesajify.com/giris" onClick={close}>Giriş yap</Link><AccountTrigger className="mx-menu-start" onBeforeOpen={close}>Kaydol</AccountTrigger></div></div></dialog>;
}
