export type MediaSlot = {
  id: string; section: string; type: 'image' | 'video'; aspectRatio: string;
  desktopDimensions: { width: number; height: number }; mobileDimensions: { width: number; height: number };
  path: string; posterPath: string; required: boolean; status: 'pending' | 'available';
  generationTool: 'veo' | 'flow' | 'gpt-image' | 'existing'; notes: string;
  fallbackPath: string; fallbackPosterPath: string;
};

// Final assets are intentionally pending. Current real media remains the fallback.
// One creative master is shared by hero, journey, creative, reply and CTA.
export const mediaSlots: MediaSlot[] = [
  { id: 'creative-master', section: 'hero / campaign-journey / creative-engine / reply-inbox / final-cta', type: 'video', aspectRatio: '9:16', desktopDimensions: {width:300,height:533}, mobileDimensions:{width:280,height:498}, path:'/landing/studio/ecommerce-flow-veo.mp4', posterPath:'/landing/studio/ecommerce-flow-veo-poster.jpg', required:true,status:'available',generationTool:'veo',notes:'Mesajify dynamic promo video',fallbackPath:'/landing/studio/ecommerce-flow-veo.mp4',fallbackPosterPath:'/landing/studio/ecommerce-flow-veo-poster.jpg' },
  ...['ecommerce','restaurant','automotive','realestate','clinic','service'].map((sector): MediaSlot => ({id:`sector-${sector}`,section:'sector-lab',type:'video',aspectRatio:'9:16',desktopDimensions:{width:350,height:622},mobileDimensions:{width:330,height:587},path:`/media/sectors/${sector}.mp4`,posterPath:`/media/sectors/${sector}.webp`,required:true,status:'pending',generationTool:'flow',notes:sector==='clinic'?'8 seconds. Neutral clinic environment; no procedures, medical claims or identifiable patients.':'8 seconds. Sector-specific commercial; no invented prices or real customer activity.',fallbackPath:`/landing/studio/${sector}-flow-veo.mp4`,fallbackPosterPath:`/landing/studio/${sector}-flow-veo-poster.jpg`})),
];
