export const landingTr = {
  metaTitle: 'Filo — Çoklu hattan toplu kampanya gönderimi',
  metaDescription:
    'Kendi hatlarınızı bağlayın, kişi listenizi yükleyin, hattı koruyan hızda toplu kampanya gönderin. Numara doğrulama, ısındırma ve otomatik durdurma dahil.',
  hero: {
    titleBefore: 'Toplu kampanya gönderin,',
    titleAccent: 'hattınızı koruyun.',
    lead: 'Hatlarınızı QR ile bağlayın, listenizi yükleyin, mesajı hazırlayın. Gönderim gerçek limitler içinde, arka planda yürür.',
    ctaPrimary: '7 gün ücretsiz dene',
    ctaSecondary: 'Ürünü gör',
    trust: 'Kredi kartı gerekmez · Kurulum yok · İstediğiniz an biter',
    caption: 'Canlı panel turu — özet, hatlar, gönderim',
  },
  proof: [
    { label: 'Hat başına günlük tavan', detail: 'Platform kotasına uygun gönderim' },
    { label: 'Sunucuda oturum', detail: 'Panel kapalıyken de bağlı kalır' },
    { label: 'Numara doğrulama', detail: 'Kayıtsız numaraya deneme yok' },
    { label: '7 gün deneme', detail: 'Kredi kartı istemiyoruz' },
  ],
  capacity: {
    kicker: 'Kapasite',
    title: 'Önce netleştirelim: günde kaç mesaj gönderebilirsiniz?',
    lead: 'Çoğu panel bunu satış sonrasına saklar. Biz başa koyuyoruz; doğru beklenti hem sizin hem hatlarınızın lehine.',
  },
  calculator: {
    title: 'Kapasite hesabı',
    subtitle: 'Panelde göreceğiniz gerçek limitlerle hesaplanır.',
    badge: 'Hat başına günde en fazla 250',
    linesLabel: 'Kaç hat bağlayacaksınız?',
    targetLabel: 'Kaç kişiye ulaşmak istiyorsunuz?',
    matureTitle: 'Günlük tavan (ısınma sonrası)',
    matureHint: '{lines} hat × 250 mesaj',
    daysTitle: 'Günde tamamlanır',
    daysHintOk: 'Yaklaşık {days} gün',
    daysHintFail: 'Makul sürede bitmez',
    curveTitle: 'Hat başına günlük tavanın gelişimi',
    curveHint: 'Yeni hat ilk günden tam hızda gönderemez; ani hacim kısıt almanın en yaygın sebebi.',
    dayLabel: 'Gün {n}',
    dayPlus: '{n}. gün +',
    msgUnit: 'mesaj',
    curveFooter:
      'Daha hızlı göndermenin tek yolu daha fazla hat. Tek hattan günlük tavanı zorlamak önce geçici kısıt, sonra kalıcı engel getiriyor.',
  },
  problem: {
    kicker: 'Sorun → çözüm',
    title: 'Toplu mesaj panellerinin takıldığı yerler',
    lead: 'Filo gönderimi hızlandırmaktan çok hattı ayakta tutmaya odaklanır. Kaydırdıkça her probleme karşılık gelen ekranı görün.',
    solutionLabel: 'Filo’da çözüm',
    items: [
      {
        title: 'Hattı yakan hız',
        body: 'Sabit tempoda binlerce mesaj atmak hesabı kısıtlatır. “Sınırsız gönderim” vaadi çoğu zaman ban demektir.',
      },
      {
        title: 'Kayıtsız numaraya deneme',
        body: 'Kayıtlı olmayan numaraya basmak hem kotayı hem şikayet riskini yükseltir.',
      },
      {
        title: 'Panel kapanınca duran gönderim',
        body: 'Bilgisayarınız kapalıysa kampanya da duruyorsa operasyon ölçeklenemez.',
      },
      {
        title: 'Yanıtları kaçırmak',
        body: 'Kampanyadan gelen “ilgileniyorum” veya “çık” cevapları dağılırsa satış ve KVKK riski büyür.',
      },
    ],
    solutions: [
      {
        title: 'Isındırma ve rastgele aralık',
        body: 'Yeni hat kademeli tavanla açılır. Mesajlar arasında insanî bekleme vardır; kota panoda canlı görünür.',
        frame: 'Hesaplar · hat kotası',
      },
      {
        title: 'Gönderimden önce doğrula',
        body: 'Listedeki numaralar kayıtlı mı diye işaretlenir. Kayıtsızlara kampanya gitmez.',
        frame: 'Kişiler · numara doğrulama',
      },
      {
        title: 'Sunucuda çalışan motor',
        body: 'Oturum ve kampanya arka planda sürer. Paneli kapatsanız da gönderim devam eder.',
        frame: 'Durum · canlı izleme',
      },
      {
        title: 'Yanıtlar ve kara liste',
        body: 'Gelen cevapları tek yerden okuyun. Çıkmak isteyeni bir tıkla kara listeye alın.',
        frame: 'Kara liste · çıkış talepleri',
      },
    ],
  },
  how: {
    kicker: 'Akış',
    title: 'Üç adımda yayına alırsınız',
    steps: [
      {
        n: '01',
        title: 'Hatlarınızı bağlayın',
        body: 'Panelde QR kodu açılır, telefonunuzdan okutursunuz. İstediğiniz kadar hat ekleyebilirsiniz. Oturumlar sunucuda tutulur; panel kapalıyken de bağlı kalır.',
      },
      {
        n: '02',
        title: 'Kişileri yükleyin',
        body: 'CSV yükleyin veya numaraları yapıştırın. Ülke koduna çevrilir ve kayıtlı olup olmadığı kontrol edilir.',
      },
      {
        n: '03',
        title: 'Kampanyayı başlatın',
        body: 'Mesajı yazın, görseli ekleyin, hatları seçin. Gönderim arka planda sürer; paneli kapatsanız da devam eder.',
      },
    ],
  },
  showcase: {
    kicker: 'Ürün',
    title: 'Panelin içinden kampanya akışı',
    lead: 'Gerçek arayüz görüntüleri. Numaralar ve sohbetler demo kampanya verisiyle değiştirildi.',
    tabs: [
      {
        id: 'kampanyalar',
        label: 'Kampanyalar',
        lead: 'Listeyi ve hatları seçin, mesajı yazın. Gönderim arka planda sürer.',
        caption: 'Raporlar · kampanya performansı',
        alt: 'Filo raporlar ve kampanya özeti ekranı',
      },
      {
        id: 'hesaplar',
        label: 'Hesaplar',
        lead: 'Birden fazla hattı QR ile bağlayın, kotayı canlı görün.',
        caption: 'Hesaplar · çoklu hat',
        alt: 'Filo hesaplar ekranı — demo hatlar',
      },
      {
        id: 'ozet',
        label: 'Özet',
        lead: 'Günün operasyon görünümü: hatlar, defter, trafik ve kısayollar.',
        caption: 'Özet · workbench',
        alt: 'Filo özet paneli',
      },
    ],
    cards: [{ label: 'Hızlı gönderim' }, { label: 'Kişiler' }, { label: 'Durum' }],
  },
  day: {
    kicker: 'Bir gün',
    title: 'Operasyon günü nasıl akar?',
    lead: 'Sabah kontrolden akşam rapora kadar kampanya döngüsü tek panelde.',
    steps: [
      {
        time: '09:00',
        title: 'Hatları kontrol edin',
        body: 'Bağlı hatlar, günlük kota ve ısınma tavanı özetten görünür. QR bekleyen hat varsa Hesaplar’dan bağlanır.',
      },
      {
        time: '10:30',
        title: 'Listeyi doğrulayın',
        body: 'Kampanya listesindeki numaralar kayıtlı mı diye işaretlenir. Kayıtsızlar otomatik elenir.',
      },
      {
        time: '11:15',
        title: 'Kampanyayı başlatın',
        body: 'Mesaj, görsel ve hatları seçin. Gönderim sunucuda yürür; panel kapalı olsa da devam eder.',
      },
      {
        time: '14:00',
        title: 'Yanıtları yönetin',
        body: 'Gelen cevapları okuyun. Kara listeye alınan numaraya bir daha mesaj gitmez.',
      },
      {
        time: '17:30',
        title: 'Teslim ve okundu bakın',
        body: 'Gidenler ve Raporlar’da gönderildi → teslim → okundu hunisi. Ertesi gün için kota netleşir.',
      },
    ],
  },
  safety: {
    kicker: 'Ban önleme',
    title: 'Asıl iş mesaj atmak değil, hattı ayakta tutmak',
    lead: 'Toplu mesaj göndermek teknik olarak kolaydır. Zor olan, üçüncü kampanyadan sonra hattın hâlâ çalışıyor olmasıdır. Filo büyük ölçüde bunu yapar.',
    items: [
      {
        title: 'Numara doğrulama',
        body: 'Gönderimden önce her numara kayıtlı mı diye kontrol edilir. Kayıtsız numaraya denemek kısıt almanın en hızlı yoludur.',
      },
      {
        title: 'Gerçek kota okuması',
        body: 'Hesabınıza tanınan yeni sohbet kotasını ve varsa geçici kilidi kaynaktan okuyup panelde gösteririz. Tahmin yok.',
      },
      {
        title: 'Isındırma eğrisi',
        body: 'Yeni hat ilk gün 10, birinci hafta 120, ikinci haftadan sonra günde 250 mesaja çıkar. Bu tavan panelden aşılamaz.',
      },
      {
        title: 'İnsanî gönderim aralığı',
        body: 'Mesajlar arasında rastgele bekleme vardır. Sabit aralıkla atılan mesaj, otomasyonun en kolay yakalanan imzasıdır.',
      },
      {
        title: 'Otomatik durdurma',
        body: 'Hat kısıt sinyali verdiğinde kampanya o hattan durur, diğerlerinden devam eder. Tüm kampanya çökmez.',
      },
      {
        title: 'Kara liste',
        body: 'Çıkmak isteyen veya elle işaretlenen numaralar bir daha hiçbir kampanyaya dahil edilmez.',
      },
    ],
  },
  multi: {
    title: 'Kapasiteyi hat sayısıyla büyütün',
    lead: 'Tek hattı zorlamak işe yaramaz. Bunun yerine birden fazla hat bağlarsınız; Filo kampanyayı hatlar arasında dağıtır, her hattın kotasını ayrı takip eder ve biri kısıt alırsa diğerlerinden devam eder.',
    bullets: [
      'Tek panelden istediğiniz kadar hat',
      'Hat başına ayrı günlük kota ve canlı durum',
      'Bir hat düşünce kampanya durmaz',
      'Oturumlar sunucuda; panel kapalıyken de bağlı',
    ],
    chartTitle: '3 hatlı bir kampanyanın dağılımı',
    lines: [{ name: 'Satış hattı' }, { name: 'Destek hattı' }, { name: 'Kampanya hattı' }],
    chartNote:
      'Üçüncü hat henüz ısınma döneminde olduğu için tavanı düşük. Kampanya yine de günde 620 mesajla ilerliyor.',
  },
  wall: {
    kicker: 'Operatörler',
    title: 'Hattı koruyarak gönderenler',
    lead: 'Demo alıntılar. Gerçek müşteri hikâyeleri geldikçe buraya eklenir.',
    quotes: [
      {
        quote:
          'Üç hattı bağladık, kampanya arka planda yürüdü. Panel kapalıyken de gönderim sürdü; önceki araçta bu yoktu.',
        name: 'Ege',
        role: 'Operasyon · perakende',
      },
      {
        quote:
          'Numara doğrulama sayesinde kayıtsızlara basmayı bıraktık. Şikayet oranı düştü, kota daha uzun dayandı.',
        name: 'Selin',
        role: 'Pazarlama · hizmet',
      },
      {
        quote:
          'Çıkanları kara listeye almak tek tık. Yanıt kaçırmıyoruz, aynı numaraya tekrar yazmıyoruz.',
        name: 'Murat',
        role: 'Satış · B2B',
      },
      {
        quote:
          'Isındırma tavanı panoda yazılı; spekülasyon yok. Yeni hat ilk hafta yavaş, sonra normale çıkıyor.',
        name: 'Deniz',
        role: 'Kurucu · ajans',
      },
    ],
  },
  pricing: {
    title: 'Mesaj başına ücret yok',
    lead: 'Resmi API kullanan panellerde her pazarlama mesajı ayrıca faturalanır. Biz kendi hattınızı kullandığımız için sabit ücret dışında ek maliyet çıkmaz. Paketleri ayıran tek şey hat sayısı ve günlük kapasitedir. Fiyatlar bilgilendirme amaçlıdır; ödeme kayıttan sonra Ayarlar’dan yapılandırılır.',
    recommended: 'Önerilen',
    accounts: '{n} hat',
    daily: {
      free: 'Günde 50 mesaj',
      starter: 'Günde ~750 mesaj',
      pro: 'Günde ~2.500 mesaj',
      enterprise: 'Günde ~12.500 mesaj',
    },
    monthlyQuota: 'Aylık kota {n} mesaj',
    features: {
      free: ['Kredi kartı istenmez', 'Tüm özellikler açık', 'İstediğiniz an biter'],
      starter: ['Sınırsız kişi listesi', 'Canlı kampanya takibi', 'Numara doğrulama'],
      pro: [
        'Görsel üretici dahil',
        'Sınırsız kişi listesi',
        'Canlı kampanya takibi',
        'Öncelikli destek',
      ],
      enterprise: ['Çoklu müşteri yönetimi', 'Marka kiti başına şablon', 'Detaylı raporlama'],
    },
    cta: 'Ücretsiz dene',
    price: {
      free: '0 TL',
      starter: '890 TL',
      pro: '1.290 TL',
      enterprise: '3.490 TL',
    },
    note: {
      free: '7 gün',
      starter: 'aylık',
      pro: 'aylık',
      enterprise: 'aylık',
    },
    planLabels: {
      free: 'Deneme',
      starter: 'Başlangıç',
      pro: 'Büyüme',
      enterprise: 'Ajans',
    },
  },
  faq: {
    title: 'Sık sorulanlar',
    items: [
      {
        q: 'Hesabım banlanır mı?',
        a: 'Risk sıfır değil; bunu gizlemiyoruz. Gönderim sizin kendi hattınızdan çıkar. Biz riski yönetiriz: numaraları önceden doğrularız, tanıdığınız kotayı okuruz, yeni hattı kademeli ısıtırız, aralıkları rastgeleleştiririz ve ilk kısıt sinyalinde dururuz. Kotayı zorlayan veya alakasız listeye yazan hesap yine de engellenebilir.',
      },
      {
        q: 'Gerçekten sınırsız numara gönderebilir miyim?',
        a: 'Liste tarafında evet; kaç numara yüklerseniz yükleyin taşırız. Gönderim hızında hayır: bir hat günde en fazla 250 mesaj atar. Bu bizim değil platformun sınırı. 10.000 kişiye ulaşmak 3 hatla yaklaşık iki hafta, 40 hatla bir gün sürer. “Sınırsız gönderim” vaat eden her panel ya bunu bilmiyordur ya da hattınızı yakmayı göze almıştır.',
      },
      {
        q: 'Resmi API ile farkı ne?',
        a: 'Resmi API’de her pazarlama konuşması için Meta’ya ücret ödersiniz ve şablonların önceden onaylanması gerekir; karşılığında hesap daha güvendedir. Bizde mesaj başına ücret ve şablon onayı yok, maliyet sabittir; risk sizin hattınızdadır. Hacminiz çok yüksekse ve marka riskiniz büyükse resmi API daha doğru tercih olabilir.',
      },
      {
        q: 'KVKK açısından durum ne?',
        a: 'Onay vermemiş kişilere ticari elektronik ileti göndermek Türkiye’de yasal risk taşır; sorumluluk gönderene aittir. Panel çıkma taleplerini işaretleyebileceğiniz kara liste ve kayıt tutma imkânı verir, ama izinli liste kullanmak sizin sorumluluğunuzdadır.',
      },
      {
        q: 'Bilgisayarımı kapatırsam gönderim durur mu?',
        a: 'Hayır. Oturumlar ve kampanya motoru sunucuda çalışır. Paneli yalnızca izlemek ve yönetmek için açarsınız. Kapatsanız da gönderim kaldığı yerden devam eder; tekrar açtığınızda güncel durumu görürsünüz.',
      },
      {
        q: 'Hat kısıt alırsa ne olur?',
        a: 'O hat otomatik duraklatılır ve panelde kilit sebebiyle gösterilir. Kampanya varsa diğer hatlardan devam eder. Kilit geçiciyse süresi bitince hat kendiliğinden geri döner.',
      },
    ],
  },
  final: {
    title: 'İlk hattınızı beş dakikada bağlayın',
    lead: 'Filo denemesi tam özellikli. Kredi kartı istemiyoruz, otomatik yenileme yok.',
    ctaPrimary: '7 gün ücretsiz dene',
    ctaSecondary: 'Ürünü gör',
    hasAccount: 'Hesabın var mı?',
    signIn: 'Giriş yap',
  },
  stickyCta: '7 gün ücretsiz dene',
  scrollTop: 'Yukarı çık',
}
