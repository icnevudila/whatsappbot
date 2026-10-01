export type Annotation = { label: string; x: number; y: number; width: number; height: number };
export type ProductScreen = { id: string; label: string; image: string; description: string; annotations: Annotation[] };
const regions = [{label:'Ürün gezintisi',x:1,y:12,width:14,height:76},{label:'Çalışma alanı',x:17,y:15,width:79,height:73}];
export const inboxScreen: ProductScreen = {id:'gelenler',label:'Gelen Kutusu',image:'/landing/gelenler.png',description:'Konuşma burada devam eder.',annotations:[{label:'Tüm konuşmalar',x:16,y:14,width:31,height:78},{label:'Konuşma alanı',x:51,y:25,width:44,height:62}]};

export const productScreens: ProductScreen[] = [
  {id:'hizli-gonderim',label:'Kampanya',image:'/landing/current/campaign-mobile.png',description:'Güncel gerçek panel · Yeni kampanya hazırlığı (1 Ekim 2026).',annotations:regions},
  {id:'marka-kiti',label:'Kreatif Stüdyo',image:'/landing/current/creative-mobile.png',description:'Güncel gerçek panel · Kampanya görseli oluşturma (1 Ekim 2026).',annotations:regions},
  {id:'kisiler',label:'Kişiler',image:'/landing/kisiler.png',description:'Kendi listenizi ve kişi kayıtlarını yönetin.',annotations:regions},
  {id:'hesaplar',label:'Hat Yönetimi',image:'/landing/hesaplar.png',description:'Birden fazla bağlı WhatsApp hattını aynı panelde görün.',annotations:regions},
  inboxScreen,
  {id:'raporlar',label:'Raporlar',image:'/landing/raporlar.png',description:'Kampanya gönderim sürecini takip edin.',annotations:regions},
];
