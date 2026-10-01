export type MediaSlot = {
  id: string; section: string; type: 'image' | 'video'; aspectRatio: string;
  desktopDimensions: { width: number; height: number }; mobileDimensions: { width: number; height: number };
  path: string; posterPath: string; required: boolean; status: 'pending' | 'available';
  generationTool: 'veo' | 'flow' | 'gpt-image' | 'existing'; notes: string;
  fallbackPath: string; fallbackPosterPath: string;
};

// Final assets are intentionally pending. Current real media remains the fallback.
// One Bofe master is shared by hero, journey, creative, reply and CTA.
export const mediaSlots: MediaSlot[] = [
  { id: 'creative-bofe-master', section: 'hero / campaign-journey / creative-engine / reply-inbox / final-cta', type: 'video', aspectRatio: '9:16', desktopDimensions: {width:300,height:533}, mobileDimensions:{width:280,height:498}, path:'/media/creative/bofe-master.mp4', posterPath:'/media/creative/bofe-master.webp', required:true,status:'pending',generationTool:'veo',notes:'Preserve the exact real Bofe product. No invented design, price, specifications or unsupported fidelity claims. 8–10 seconds; choreography independent of duration.',fallbackPath:'/landing/studio/product.mp4',fallbackPosterPath:'/landing/studio/product-poster.jpg' },
  ...['ecommerce','restaurant','automotive','realestate','clinic','service'].map((sector): MediaSlot => ({id:`sector-${sector}`,section:'sector-lab',type:'video',aspectRatio:'9:16',desktopDimensions:{width:350,height:622},mobileDimensions:{width:330,height:587},path:`/media/sectors/${sector}.mp4`,posterPath:`/media/sectors/${sector}.webp`,required:true,status:'pending',generationTool:'flow',notes:sector==='clinic'?'8 seconds. Neutral clinic environment; no procedures, medical claims or identifiable patients.':'8 seconds. Sector-specific commercial; no invented prices or real customer activity.',fallbackPath:`/landing/studio/${sector}-flow-veo.mp4`,fallbackPosterPath:`/landing/studio/${sector}-flow-veo-poster.jpg`})),
];
