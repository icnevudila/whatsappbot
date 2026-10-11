# Mesajify Tenant Security Negative Test Suite (P0 Hardening)

Bu doküman, çoklu işletme (multi-tenant) veri ve medya güvenliğinin müşteri panelinde tam olarak izole edildiğini kanıtlayan negatif test sonuçlarını içerir.

## Test Özeti
- **Tarih**: 2026-10-11
- **Kapsam**: 
  - `SEC-NEG-01`: Anonim (yetkisiz) doğrudan medya erişimi engeli (HTTP 401).
  - `SEC-NEG-02`: Bofe oturumunda Ayvazoğlu çıktısına doğrudan medya erişimi engeli (HTTP 403).
  - `SEC-NEG-03`: Ayvazoğlu oturumunda Bofe çıktısına doğrudan medya erişimi engeli (HTTP 403).
  - `SEC-NEG-04`: Bofe içerik kütüphanesinde (`/icerik`) sıfır Ayvazoğlu veri sızıntısı.
  - `SEC-NEG-05`: Ayvazoğlu içerik kütüphanesinde (`/icerik`) sıfır Bofe veri sızıntısı.
  - `SEC-NEG-06`: Çapraz işletme kreatif detay sayfası (`/icerik/[id]`) erişim engeli (404 / Erişim Yok).
- **Genel Sonuç**: **6 / 6 PASS (%100 Başarı, Sıfır False-Pass)**
- **Otomasyon Scripti**: `scripts/test_tenant_security_negative.mjs`

---

## Kanıt Tablosu

| Test ID | Senaryo | Hedef Varlık | Beklenen Sonuç | Gerçek Sonuç | Durum |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SEC-NEG-01` | Anonim kullanıcı çıktı isteği | `ai_media_outputs/2797c229...` | HTTP 401 Unauthorized | HTTP 401 (Giriş yapılmadı) | **PASS** |
| `SEC-NEG-02` | Bofe oturumu -> Ayvazoğlu çıktısı | `ai_media_outputs/d37ba66c...` | HTTP 403 Forbidden | HTTP 403 (Bu medya işletmenize ait değil) | **PASS** |
| `SEC-NEG-03` | Ayvazoğlu oturumu -> Bofe çıktısı | `ai_media_outputs/2797c229...` | HTTP 403 Forbidden | HTTP 403 (Bu medya işletmenize ait değil) | **PASS** |
| `SEC-NEG-04` | Bofe Kütüphane DOM İncelemesi | `/icerik` (Bofe aktif) | Sıfır Tuğla / Ayvazoğlu kartı | 0 sızıntı tespit edildi | **PASS** |
| `SEC-NEG-05` | Ayvazoğlu Kütüphane DOM İncelemesi | `/icerik` (Ayvazoğlu aktif) | Sıfır Bofe / Pompa kartı | 0 sızıntı tespit edildi | **PASS** |
| `SEC-NEG-06` | Çapraz Kreatif Sayfa Erişimi | `/icerik/b599ab4d...` (Bofe oturumu) | 404 / İçerik Bulunamadı | 404 Sayfası Yüklendi | **PASS** |

---

## Alınan Kod ve Mimari Önlemler
1. **Server-Side Fail-Closed Kontrolü** (`apps/customer/src/app/api/ai-media/outputs/[outputId]/route.ts`):
   - `isPlatformAdmin` müşteri oturumu bypass'ı kaldırıldı.
   - Her istekte aktif işletme doğrulanır (`output.org_id === org.id`).
   - Uyuşmazlık anında HTTP 403 ve güvenlik logu basılır (`[SECURITY_ALERT] CROSS_ORG_CONTAMINATION attempt blocked`).
   - Oturumu olmayan istekler HTTP 401 ile anında reddedilir.
2. **SwitchOrg ve Cookie Senkronizasyonu** (`apps/customer/src/app/(panel)/org-actions.ts`):
   - `writeActiveOrgCookie` ve `supabase.from('profiles').update({ active_org_id })` atomik senkronize hale getirildi.
3. **React State & RSC Temizliği** (`apps/customer/src/app/(panel)/icerik/page.tsx` & `library-board.tsx`):
   - `<LibraryBoard key={org.id} ...>` ile tenant değişiminde bileşenin DOM ve in-memory state'i tamamen sıfırlanır.
   - `useEffect` ile tenant değiştiğinde `items` ve pagination state'i sıfırlanarak eski tenant cache'inin gösterilmesi engellendi.
4. **Veritabanı Kirliliği Temizliği**:
   - Geçmiş testlerden kalan yanlış etiketli kayıtlar elendi, kütüphane kirliliği sıfırlandı.
