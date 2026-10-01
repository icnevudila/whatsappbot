import { mediaSlots } from './media-slots';
export type MediaAsset = {
  id: string; status: 'available' | 'pending'; type: 'image' | 'video'; path: string;
  posterPath?: string; generationPrompt: string; placement: string; aspectRatio: string;
  provenance: 'product' | 'generated';
  upcomingPath?: string;
};
const root = '/landing/studio/';
export const mediaManifest: MediaAsset[] = [
  { id: 'real-product-video', status: 'available', type: 'video', path: root+'hero-flow-veo.mp4', upcomingPath: '/landing/studio/hero-flow-veo.mp4', posterPath: root+'hero-flow-veo-poster.jpg', generationPrompt: '', placement: 'Creative Studio', aspectRatio: '9/16', provenance: 'product' },
  { id: 'real-restaurant-video', status: 'available', type: 'video', path: root+'restaurant.mp4', posterPath: root+'restaurant-poster.jpg', generationPrompt: '', placement: 'Creative Studio', aspectRatio: '9/16', provenance: 'product' },
  ...['ecommerce','automotive','realestate','clinic','local-business','restaurant'].map((sector): MediaAsset => {
    const file = sector === 'local-business' ? 'service' : sector;
    return { id: `sector-${sector}-video`, status: 'available', type: 'video', path: root+`${file}-flow-veo.mp4`, upcomingPath: `/media/sectors/${file}.mp4`, posterPath: root+`${file}-flow-veo-poster.jpg`, generationPrompt: `sector-${sector}-video`, placement: 'Sector Lab', aspectRatio: '9/16', provenance: 'generated' };
  }),
  { id: 'hero-source-product', status: 'available', type: 'image', path: '/brand/mesajify-official-logo.png', generationPrompt: '', placement: 'Campaign Orchestrator', aspectRatio: '1/1', provenance: 'product' },
];
export function getMedia(id: string) {
  const asset = mediaManifest.find(item => item.id === id);
  if (!asset) return undefined;
  const slotId = id === 'real-product-video' ? 'creative-master' : id.replace(/-video$/, '').replace('local-business', 'service');
  const slot = mediaSlots.find(item => item.id === slotId);
  return slot?.status === 'available' ? {...asset,path:slot.path,posterPath:slot.posterPath} : asset;
}
