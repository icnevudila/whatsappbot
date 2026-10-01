export type Sector = { id: string; label: string; video: string; poster: string; campaignMessage: string; customerReply: string; accent: string; mediaId: string };
const content = [
  ['ecommerce','E-Ticaret','Yeni koleksiyon yayında. Detaylar için bize yazabilirsiniz.','Siyah modeli mevcut mu?','#168347'],
  ['restaurant','Restoran','Akşam menümüz hazır. Rezervasyon ve detaylar için bize yazabilirsiniz.','Bu akşam iki kişilik yer var mı?','#987b4d'],
  ['automotive','Otomotiv','Yeni modellerimizi keşfedin. Test sürüşü için bize yazabilirsiniz.','Cumartesi test sürüşü yapabilir miyim?','#537483'],
  ['realestate','Emlak','Yeni portföyümüzü keşfedin. Detaylar için bize yazabilirsiniz.','Daire planlarını gönderebilir misiniz?','#8e8066'],
  ['clinic','Klinik','Randevu saatleri hakkında bilgi almak için bize yazabilirsiniz.','Randevu için uygun saat var mı?','#6a8d84'],
  ['service','Hizmet','İşletmeniz için çözümlerimizi keşfedin. Detaylar için bize yazabilirsiniz.','Görüşme planlayabilir miyiz?','#74798a'],
];
export const sectors: Sector[] = content.map(([id,label,campaignMessage,customerReply,accent])=>({id,label,campaignMessage,customerReply,accent,video:`/landing/studio/${id}-flow-veo.mp4`,poster:`/landing/studio/${id}-flow-veo-poster.jpg`,mediaId:`sector-${id==='service'?'local-business':id}-video`}));
