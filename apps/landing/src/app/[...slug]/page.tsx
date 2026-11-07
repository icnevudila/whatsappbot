import {resources} from '@/components/marketing/resource-content';
import {ResourcePage} from '@/components/marketing/resource-pages';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { features, solutions } from '@/components/marketing/content';
import { ExplorePage, FeaturePage, SolutionPage } from '@/components/marketing/site';
import {PackagePage,QuestionsPage} from '@/components/marketing/package-page';
import {LegalPage} from '@/components/marketing/legal-pages';

const legalRoutes=[
  {path:'gizlilik-politikasi',title:'Gizlilik Politikası ve KVKK Aydınlatma Metni',description:'Mesajify platformu, web sitesi ve müşteri paneli için KVKK Aydınlatma Metni, veri işleme ilkeleri ve haklar.'},
  {path:'kvkk',title:'KVKK Aydınlatma Metni ve Gizlilik Politikası',description:'Mesajify platformu, web sitesi ve müşteri paneli için KVKK Aydınlatma Metni, veri işleme ilkeleri ve haklar.'},
  {path:'kullanim-kosullari',title:'Kullanım Koşulları ve Hizmet Sözleşmesi',description:'Mesajify platformu, kampanya hazırlığı, WhatsApp hat bağlantısı ve paket kullanım koşulları.'},
  {path:'kosullar',title:'Kullanım Koşulları ve Hizmet Sözleşmesi',description:'Mesajify platformu, kampanya hazırlığı, WhatsApp hat bağlantısı ve paket kullanım koşulları.'}
];

const routes=[...legalRoutes,...resources,{path:'paketler',title:'Paketler ve kullanım',description:'Mesajify paketlerinin standart WhatsApp hat ve aylık mesaj kapasitelerini inceleyin.'},{path:'sik-sorulan-sorular',title:'Sık sorulan sorular',description:'Liste aktarımı, kampanya planlama ve içerik üretimi hakkında sorularınız.'},...features.map(f=>({path:f.slug,title:f.label,description:f.description})),...solutions.map(s=>({path:`cozumler/${s.slug}`,title:s.label,description:s.text})),{path:'ornekler',title:'Örnek çalışmalar',description:'Kurgusal markalarla, kaynak ürün fotoğrafından kampanya tasarımına uzanan Mesajify örnekleri.'},{path:'nasil-calisir',title:'Nasıl çalışır?',description:'İşletme listesi, Kreatif Stüdyo, WhatsApp kampanyası ve Mesajlar akışını keşfedin.'},{path:'cozumler',title:'İşletmeniz için çözümler',description:'Mağazalar, atölyeler ve hizmet işletmeleri için Mesajify kullanım akışları.'}];
export function generateStaticParams(){return routes.map(r=>({slug:r.path.split('/')}));}
export async function generateMetadata({params}:{params:Promise<{slug:string[]}>}):Promise<Metadata>{const {slug}=await params;const r=routes.find(r=>r.path===slug.join('/'));if(!r)return {};return {title:`${r.title} | Mesajify`,description:r.description,alternates:{canonical:`https://mesajify.com/${r.path}`},openGraph:{title:`${r.title} | Mesajify`,description:r.description,url:`https://mesajify.com/${r.path}`}};}
export default async function Page({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params;const path=slug.join('/');if(!routes.some(r=>r.path===path))notFound();if(path==='gizlilik-politikasi'||path==='kvkk')return <LegalPage kind="gizlilik"/>;if(path==='kullanim-kosullari'||path==='kosullar')return <LegalPage kind="kosullar"/>;if(resources.some(r=>r.path===path))return <ResourcePage path={path}/>;if(path==='paketler')return <PackagePage/>;if(path==='sik-sorulan-sorular')return <QuestionsPage/>;if(features.some(f=>f.slug===path))return <FeaturePage slug={path}/>;if(slug[0]==='cozumler'&&slug.length===2)return <SolutionPage slug={slug[1]}/>;return <ExplorePage kind={path as 'ornekler'|'nasil-calisir'|'cozumler'}/>;}
