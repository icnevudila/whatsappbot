# Taslak Hedefsiz & Hatsız Kampanya Mimarisi (Draft Without Targets Design)

**Tarih:** 11 Ekim 2026  
**Doküman:** DRAFT_WITHOUT_TARGETS_DESIGN.md  
**Modül:** Mesajify Campaign Studio V1  

---

## 1. Tasarım Kararı

Mesajify müşterisi bir reklam görseli veya video oluşturduğunda kampanya hazırlığına başlar. Henüz hedef kişi grubu (audience) yüklememiş veya WhatsApp hattı bağlamamış olsa bile reklam metnini yazıp, görselini bağlayıp **taslak olarak veritabanına kaydedebilmelidir**.

### Temel Ayrım:

1. **TASLAK KAYDETME (Draft Save):**
   - **Gereksinimler:** Kampanya adı (`name.trim()`) + (Metin veya Medya URL'si).
   - **Hedef Kişi Grubu:** İsteğe bağlı (0 veya daha fazla liste).
   - **Gönderen Hat:** İsteğe bağlı (0 veya daha fazla hat).
   - **Veritabanı Durumu:** `status = 'draft'`.
   - **İş Kuyruğu:** KESİNLİKLE hiçbir kuyruk işi (`campaign.start`, `campaign.refresh_targets`, `message.send`) başlatılmaz.
   - **Güvenlik & İzolasyon:** Kampanya yalnızca oturum açmış aktif `org_id` için oluşturulur.

2. **GÖNDERİME HAZIRLAMA & PLANLAMA (Schedule or Send Now):**
   - **Gereksinimler:**
     - Kampanya adı zorunlu.
     - Metin veya medya zorunlu.
     - En az 1 kişi grubu zorunlu (`listIds.length >= 1`).
     - En az 1 WhatsApp hattı zorunlu (`accountIds.length >= 1`).
     - Seçilen hatlar aktif, bağlı (`status = 'connected'`) ve kilitli olmamalı (`!is_locked && enabled`).
     - Planlama durumunda geçerli ileri bir tarih (`scheduled_at > now() + 60s`) zorunlu.
   - **Kullanıcı Onayı:** Hemen gönderimde modal ile açık onay alınır.

---

## 2. Server Action Kontratı (`actions.ts`)

```typescript
const isDraft = startMode === 'draft'

// Yalnızca gönderim veya planlama modunda hedef ve hat zorunludur:
if (!isDraft) {
  if (listIds.length === 0) return { error: 'Göndermek veya planlamak için en az bir kişi grubu seçin.' }
  if (accountIds.length === 0) return { error: 'Göndermek veya planlamak için en az bir WhatsApp hattı seçin.' }
}
```

Eğer `listIds` boşsa: `source_list_ids: []` olarak kaydedilir.  
Eğer `accountIds` boşsa: `campaign_accounts` tablosuna kayıt atılmaz, sadece kampanya kaydı oluşturulur.

---

## 3. UI Sihirbazı İyileştirmesi (`campaign-wizard.tsx`)

- Kullanıcı hangi adımda olursa olsun üst barda veya alt barda bulunan "Taslağı Kaydet" butonu ile mevcut durumu sunucuya iletebilir.
- `validateStep('alicilar')` ve `validateStep('gonderen')` yalnızca `startMode !== 'draft'` durumunda gönderimi engeller; taslak kaydını engellemez.
- İdempotency: Form gönderilirken `submitting` kilidi ile çift tıklama engellenir.
