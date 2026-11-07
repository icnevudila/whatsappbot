import Link from 'next/link';
import {ArrowUpRight,Check,MessageCircle,CalendarDays,Users} from 'lucide-react';
import {Shell,Film} from './site';
import type {FilmName} from './content';
import {CampaignClosing} from './campaign-closing';
import {resources} from './resource-content';
import './resource-pages.css';
const guideFilms:Record<string,FilmName>={'rehberler/excel-listesi-hazirlama':'import','rehberler/planli-whatsapp-kampanyasi':'campaign','rehberler/gelen-yanitlari-yonetme':'inbox'};
export function ResourcePage({path}:{path:string}){const page=resources.find(r=>r.path===path)!,film=guideFilms[path];return <Shell><main id="icerik" className="rs-main"><section className="rs-intro ms-container"><Link className="rs-back" href={path.startsWith('rehberler/')?'/rehberler':'/'}>Mesajify / {path.startsWith('rehberler/')?'Rehberler':'Keşfedin'}</Link><h1>{page.title}</h1><p>{page.description}</p></section>{film?<section className="rs-topic-film ms-container"><Film name={film} priority/></section>:<section className="rs-flow ms-container" aria-label="Kampanya akışı"><div><Users/><span>Listeniz</span><Check/></div><i/><div><CalendarDays/><span>Kampanyanız</span><Check/></div><i/><div><MessageCircle/><span>Konuşmanız</span><Check/></div></section>}<div className="rs-sections ms-container">{page.sections.map((s,i)=><article key={s.title}><span className="rs-number">{String(i+1).padStart(2,'0')}</span><div><h2>{s.title}</h2><p>{s.text}</p><Link href={s.href}>{s.href.startsWith('mailto:')?'E-posta gönder':s.href.startsWith('https:')?'Paneli aç':'Yakından incele'}<ArrowUpRight size={18}/></Link></div></article>)}</div><CampaignClosing/></main></Shell>}
