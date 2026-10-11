# Mesajify V1 — Tenant Security & Access Control Regression Report

**Tarih:** 11 Ekim 2026  
**Test Kapsamı:** `SEC-01`, `SEC-02`, `SEC-03`, `SEC-04`, `SEC-05`  
**Kapsanan Kiracılar:**  
- Bofe (`afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc`)
- Ayvazoğlu (`4a58b0dd-0931-4901-880a-686457d15010`)

---

## 1. Test Edilen Güvenlik Senaryoları ve Sonuçlar

### A. Çapraz Kiracı Taslak İzolasyonu (`SEC-01`)
- **Senaryo:** Bofe işletmesine ait bir taslak ID'si (`86ff8778-7308-40a5-a3ed-c6e40cfa642f`) oluşturuldu. Kullanıcı Ayvazoğlu işletmesine geçirildi ve bu ID doğrudan URL'e yazılarak açılmaya çalışıldı.
- **Sonuç:** Sistem işlemi engelledi ve kullanıcıya güvenli 404 Sayfa Bulunamadı ekranı sundu. Başka işletmenin kampanya metni veya medyası asla sızmadı.
- **Durum:** **PASS**

### B. Çoklu Kiracı Bağımsız Taslak Yönetimi (`SEC-02`)
- **Senaryo:** Ayvazoğlu işletmesi aktifken yeni bir taslak oluşturuldu (`24e16d50-6cec-43ad-9f3e-9c2baa16c68c`).
- **Sonuç:** Ayvazoğlu'nun taslağı kendi `org_id`'si ile sorunsuz kaydedildi.
- **Durum:** **PASS**

### C. Geri Dönüşte Bütünlük Koruması (`SEC-03`)
- **Senaryo:** Kullanıcı tekrar Bofe işletmesine geçirildi ve Bofe'nin ilk taslağı açıldı.
- **Sonuç:** Bofe'nin taslağının Ayvazoğlu işlemlerinden hiçbir şekilde etkilenmediği, başlık ve içeriğin tam korunduğu doğrulandı.
- **Durum:** **PASS**

### D. Oturumsuz İstek İzolasyonu (`SEC-04`)
- **Senaryo:** Anonim (çerezsiz / oturumsuz) yeni bir tarayıcı bağlamı açıldı ve doğrudan `/kampanyalar/yeni` adresine gidildi.
- **Sonuç:** Sistem anında 307/302 ile `/giris?devam=%2Fkampanyalar%2Fyeni` sayfasına yönlendirdi; hiçbir korumalı veri sunulmadı.
- **Durum:** **PASS**

### E. Sahte/Bozuk Kreatif Kimliği (`SEC-05`)
- **Senaryo:** Kampanya sihirbazına geçersiz veya var olmayan bir `creative_id=00000000-0000-0000-0000-000000000000` parametresi verildi.
- **Sonuç:** Uygulama çökmedi; kullanıcıya "Kreatif bulunamadı veya henüz hazır değil" uyarısı ile güvenli bir fallback sunuldu.
- **Durum:** **PASS**

---

## 2. Güvenlik Özeti
RLS ve sunucu tarafı `requireActiveOrg` kontrolleri sayesinde işletmeler arası veri izolasyonu %100 doğrulanmıştır.
