# CROSS-TENANT CAMPAIGN SECURITY — MESAJIFY CAMPAIGN STUDIO V1

## 1. Güvenlik ve İzolasyon Mimarisi

Mesajify çok kiracılı (multi-tenant) bir platformdur. Her işletme (Organization) yalnızca kendi verilerine, kreatiflerine, kişi listelerine, hatlarına ve kampanya taslaklarına erişebilmelidir.

Campaign Studio V1 kapsamında cross-tenant güvenlik testleri Ayvazoğlu İnşaat (`4a58b0dd-0931-4901-880a-686457d15010`) ve Bofe (`afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc`) kiracıları arasında yürütülmüştür.

---

## 2. Test Edilen Saldırı ve İhlal Senaryoları

### Senaryo 1: Yabancı Kreatif ID Enjeksiyonu (CAM-20)
- **Deneme:** Aktif kiracı Bofe iken, Ayvazoğlu'na ait bir kreatif ID (`758ca50a-be63-5ae5-a9cf-f8a15a0a7343`) query string ile `/kampanyalar/yeni?creative_id=...` adresine verildi.
- **Sonuç:** `loadCampaignCreativeHandoff` server-side düzeyde kreatifi reddetti (`.eq('org_id', orgId)` eşleşmediği için `null` döndü). Arayüzde *"İçerik bulunamadı veya kampanyada kullanıma hazır değil"* uyarısı gösterildi; Ayvazoğlu'nun görseli Bofe ekranında kesinlikle açılmadı. (PASS)

### Senaryo 2: Yabancı Kişi Listesi Enjeksiyonu (CAM-21)
- **Deneme:** Bofe kampanyasına Ayvazoğlu'na ait bir `contact_list` ID'si eklenmeye çalışıldı.
- **Sonuç:** Server action içindeki `idsMatch` fonksiyonu belirtilen listelerin `org_id`'sini doğrulamaktadır; yabancı listeler elenmekte veya istek reddedilmektedir. (PASS)

### Senaryo 3: Yabancı WhatsApp Hattı Enjeksiyonu (CAM-22)
- **Deneme:** Bofe kampanyasına Ayvazoğlu'na ait bir `account_id` ile gönderici bağlanmaya çalışıldı.
- **Sonuç:** Server action içindeki `idsMatch` fonksiyonu belirtilen hatların kiracı aidiyetini doğrulamaktadır; yabancı hatlar reddedilmektedir. (PASS)

### Senaryo 4: Yabancı Taslağa Doğrudan Erişim (CAM-23)
- **Deneme:** Ayvazoğlu kiracısında oluşturulan bir taslak ID'sine (`b6593938-7429-4b43-afa1-39ce03caaef4`), aktif kiracı Bofe iken `/kampanyalar/[id]` üzerinden erişilmeye çalışıldı.
- **Sonuç:** Sayfa server component'i `supabase.from('campaigns').select(...).eq('id', id).eq('org_id', org.id).single()` sorgusunda kayıt bulamadığı için Next.js `notFound()` fırlattı ve kullanıcıya 404 Sayfa Bulunamadı ekranı render edildi. (PASS)

### Senaryo 5: Anonim / Oturumsuz İstekler (CAM-24)
- **Deneme:** Oturum açmamış bir tarayıcı bağlamından `/kampanyalar/yeni` adresine gidildi.
- **Sonuç:** İstek anında `/giris?devam=%2Fkampanyalar%2Fyeni` adresine yönlendirildi. (PASS)

### Senaryo 6: İki Ayrı İşletmenin Taslaklarının Karışmaması (CAM-30)
- **Deneme:** Veritabanındaki tüm kampanyalar sorgulandı; Bofe ve Ayvazoğlu kiracılarına ait kampanya kimlikleri küme kesişim testine tabi tutuldu.
- **Sonuç:** Kesişim kümesi 0 elemanlı çıktı (`overlapCount: 0`). Her iki kiracının taslakları tamamen izoledir. (PASS)
