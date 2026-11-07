'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
export function BrandHomeLink({children,className,onNavigate}:{children:React.ReactNode;className?:string;onNavigate?:()=>void}){
 const pathname=usePathname();
 return <Link href="/" className={className} aria-label="Mesajify ana sayfa" onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;onNavigate?.();if(pathname==='/'){event.preventDefault();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}}}>{children}</Link>;
}
