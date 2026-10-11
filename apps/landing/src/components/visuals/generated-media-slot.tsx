'use client'
import { useEffect, useRef, useState } from 'react';
import { getMedia } from '@/content/media-manifest';

export function GeneratedMediaSlot({
  id,
  alt,
  aspectRatio,
  poster,
  active = true,
  playlist,
}: {
  id: string;
  alt: string;
  aspectRatio?: string;
  poster?: string;
  active?: boolean;
  fallback?: string;
  playlist?: string[];
}) {
  const asset = getMedia(id);
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [playlistIndex, setPlaylistIndex] = useState(0);

  const currentSrc = playlist && playlist.length > 0 ? playlist[playlistIndex] : asset?.path;

  useEffect(() => {
    setFailed(false);
    setEnabled(false);
    setPosterFailed(false);
    setPlaylistIndex(0);
  }, [id]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let visible = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
      if (visible && active && !saveData && !reduced.matches) setEnabled(true);
      if (
        enabled &&
        visible &&
        active &&
        !saveData &&
        !reduced.matches &&
        !document.hidden &&
        document.documentElement.dataset.labPaused !== 'true' &&
        video.closest('[data-story-paused]')?.getAttribute('data-story-paused') !== 'true'
      ) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.2 });
    observer.observe(video);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('lab-motion-change', update);
    reduced.addEventListener('change', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('lab-motion-change', update);
      reduced.removeEventListener('change', update);
      video.pause();
    };
  }, [id, active, enabled, currentSrc]);

  const handleEnded = () => {
    if (playlist && playlist.length > 1) {
      setPlaylistIndex((prev) => (prev + 1) % playlist.length);
    }
  };

  return (
    <div className="ml-media" style={{ aspectRatio: aspectRatio || asset?.aspectRatio || '9/16' }}>
      {((asset?.status === 'available' || playlist?.length) && !failed) ? (
        <video
          ref={ref}
          key={currentSrc}
          src={enabled ? currentSrc : undefined}
          poster={poster || asset?.posterPath}
          autoPlay={enabled}
          loop={!playlist || playlist.length <= 1}
          onEnded={handleEnded}
          muted
          playsInline
          preload={enabled ? 'auto' : 'none'}
          aria-label={alt}
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <img
            src={posterFailed ? '/brand/mesajify-symbol.png' : poster || asset?.posterPath || '/landing/studio/hero-flow-veo-poster.jpg'}
            alt={alt}
            loading="lazy"
            onError={() => setPosterFailed(true)}
          />
          <small className="ml-pending-label">Video asset bekleniyor</small>
        </>
      )}
    </div>
  );
}
