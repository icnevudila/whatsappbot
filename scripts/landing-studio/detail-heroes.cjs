const fs=require('node:fs'),file='apps/landing/src/components/marketing/site.tsx';let s=fs.readFileSync(file,'utf8');
s=s.replace("import './site.css';","import './site.css';\nimport { DetailArtwork } from './detail-art';\nimport './refinement.css';");
const index=s.indexOf('export function FeaturePage');const start=s.indexOf('<section className="ms-detail-hero ms-container">',index),end=s.indexOf('</section>',start)+10;
if(start<index||end<start)throw Error('Feature hero boundary missing');
const replacement='<section className={`dv-hero dv-${f.film}`}><div className="ms-container dv-hero-grid"><div className="dv-copy"><Link href="/" className="ms-breadcrumb">Mesajify <ChevronRight size={14}/>{f.label}</Link><span className="ms-eyebrow">{f.eyebrow}</span><h1>{f.title}</h1><p>{f.description}</p><Action>{f.label} ile başla</Action></div><DetailArtwork kind={f.film}/></div></section><section className="ms-container dv-film-section"><div><h2>Akışı yakından görün.</h2><p>Uygulamadaki adımların temsili anlatımı.</p></div><Film name={f.film}/></section>';
s=s.slice(0,start)+replacement+s.slice(end);fs.writeFileSync(file,s);
