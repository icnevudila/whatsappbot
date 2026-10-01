'use client'
import { useEffect, useRef, useState } from 'react';
import { getMedia } from '@/content/media-manifest';

export function GeneratedMediaSlot({ id, alt, aspectRatio, poster, active = true }: { id: string; alt: string; aspectRatio?: string; poster?: string; active?: boolean; fallback?: string }) {
  const asset = getMedia(id);
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  useEffect(() => { setFailed(false); setEnabled(false); setPosterFailed(false); }, [id]);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let visible = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const saveData = (navigator as Navigator & {connection?: {saveData?: boolean}}).connection?.saveData;
      if (visible && active && !saveData && !reduced.matches) setEnabled(true);
      if (enabled && visible && active && !saveData && !reduced.matches && !document.hidden && document.documentElement.dataset.labPaused !== 'true' && video.closest('[data-story-paused]')?.getAttribute('data-story-paused') !== 'true') void video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: .2 });
    observer.observe(video); document.addEventListener('visibilitychange', update); window.addEventListener('lab-motion-change', update); reduced.addEventListener('change', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); window.removeEventListener('lab-motion-change', update); reduced.removeEventListener('change', update); video.pause(); };
  }, [id, active, enabled]);
  return <div className="ml-media" style={{ aspectRatio: aspectRatio || asset?.aspectRatio || '9/16' }}>
    {asset?.status === 'available' && !failed ? asset.type === 'video'
      ? <video ref={ref} src={enabled ? asset.path : undefined} poster={poster || asset.posterPath} controls loop muted playsInline preload="none" aria-label={alt} onClick={()=>setEnabled(true)} onError={() => setFailed(true)} />
      : <img src={asset.path} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      : <><img src={posterFailed ? '/brand/mesajify-symbol.png' : poster || asset?.posterPath || '/landing/studio/product-poster.jpg'} alt={alt} loading="lazy" onError={()=>setPosterFailed(true)} /><small className="ml-pending-label">Video asset bekleniyor</small></>}
  </div>;
}
