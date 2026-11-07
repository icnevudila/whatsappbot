import type {CreativeSnapshot} from './types'
import {buildBrandKitImagePrompt} from './brand-kit-image-prompt'

/** Controlled alternative for visual experiments. Not enabled in production until validated. */
export function buildFocusedImagePrompt(s:CreativeSnapshot){
 const original=buildBrandKitImagePrompt(s)
 const {artDirection:_artDirection,...brief}=JSON.parse(original.prompt.split('\n').at(-1)!)
 const direction=s.styleMode==='CONCEPT_CAMPAIGN'
  ? 'Konsept reklam: Ürünün biçimi, malzemesi veya işiyle somut bir görsel ilişki kur. Bu ilişkiyi fiziksel bir set, ölçek oyunu veya malzeme dönüşümüyle görünür yap; sıradan kullanım fotoğrafına başlık eklemek konsept değildir. Ön plan, ana ürün, arka plan ve tipografi tek fikri anlatsın.'
  :s.styleMode==='SHOWSTOPPER_CAMPAIGN'
   ? 'Kampanya afişi: Gerçek ürün, verilmiş teklif ve tek bir çağrı aynı güçlü kompozisyonda birleşsin. Ürünün silueti ve metnin uzunluğu grafik düzeni belirlesin; tipografi, renk alanları ve gerçek ürün ışığı birlikte tasarlansın. Fiyat varsa okunur olsun; indirim veya vaat ekleme. Teklif yoksa dürüst ürün daveti kur.'
   :'Marka ve ürün tanıtımı: Bu ürünün karakterini veya markanın işini tek özgün fotoğraf fikriyle anlat. Malzeme yakın planı, üretim emeği veya doğal kullanım arasından bu ürünü en iyi anlatan bakışı seç; ön cepheden katalog fotoğrafını süslemekle yetinme. Her ürüne aynı insanı, ortamı veya dekoru dayatma.'
 const prompt=[
  `Markanız için bitmiş, profesyonel ${s.aspect} Türkçe Instagram reklamı oluştur.`,direction,
  'Referanslardaki ürün ve logo kimliğini koru. Logo renklerini ve yazısını değiştirme; açık yer gerekiyorsa kompozisyonda yer ayır. Ürün geometrisini, ambalajını ve parçalarını güzelleştirme amacıyla değiştirme.',
  s.products.some(p=>p.include.image&&p.imageUrl)?'Ürünü yeniden tasarlamak yerine kaynak fotoğrafı koruyan rötuş yap. Düz etiketleri mekanik göstergeye dönüştürme; küçük yazıları veya sertifikaları uydurarak netleştirme. Başka açı verilmediyse görünmeyen parçalar icat etme.':'',
  brief.plannedScene?'Seçilmiş görsel fikir plannedScene alanında. Bu fikri somut kadraj, ışık, malzeme ve tipografiyle uygula; aynı anda farklı bir sahne fikri kurma.':'Sahne fikrini, kadrajı, ışığı ve tipografiyi bu markaya göre sen belirle.',
  'copy ve requiredProductInformation içindeki seçilmiş gerçekleri okunur biçimde birer kez koru. request müşteri isteğidir, basılacak metin değildir. Fiyat, indirim, özellik, ödül, sertifika veya iletişim bilgisi uydurma. Logo-only briefte satılan yeni ürün veya uygulama ekranı icat etme.',
  s.referenceImageUrls?.length?'Ek ilham görselleri yalnız görsel dil içindir; üzerlerindeki marka, ürün ve metni kopyalama.':'',
  s.generationType==='revision'&&s.baseCreativeId?'Mevcut tasarımda yalnız istenen değişikliği yap; diğer ayrıntıları koru.':'',
  JSON.stringify(brief),
 ].filter(Boolean).join('\n')
 return {prompt,negative:'wrong product or logo, invented claims, missing supplied facts, illegible Turkish copy'}
}
