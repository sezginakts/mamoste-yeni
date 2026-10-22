# Sunucu Mimarisi — Taslak

Durum: **taslak, kodlanmadı.** Amaç: öğretmen ödev verdiğinde öğrencinin cihazında kendiliğinden görünmesi, sonucun öğretmene kendiliğinden gelmesi. Bugünkü QR/kod ile taşıma yedek yol olarak kalır.

Bu doküman bir KVKK avukatına gösterilmek üzere de yazıldı. Hukuki değerlendirme içermez.

## 1. İlkeler

1. **En az veri.** Sunucu yalnızca ödev alıp vermek için gereken veriyi tutar. Öğrenciden e-posta, telefon, fotoğraf, konum alınmaz.
2. **Gerçek isim sunucuya gitmez.** Öğretmenin yüklediği isim listesi öğretmenin cihazında kalır. Sunucu öğrenciyi *sınıf + okul numarası (+ isteğe bağlı takma ad)* olarak bilir; isim eşleştirmesi öğretmenin telefonunda yapılır.
3. **Herkes yalnızca kendi verisini görür.** Kural uygulamada değil veritabanında (satır bazlı yetki, RLS) uygulanır; uygulamada hata olsa bile başkasının verisi dönmez.
4. **Rol sunucuda kayıtlıdır.** Öğrenci uygulamadaki ayarı değiştirse de öğretmen yetkisi alamaz.
5. **Öğretmen için sade.** Öğretmen bir kez giriş yapar; geri kalan her şey bugünkü ekranlarla aynı kalır.

## 2. Hesaplar ve giriş

| Kim | Nasıl giriş yapar | Ne kadar sürer |
|---|---|---|
| Öğretmen | Google, Apple ya da e-postaya gelen tek kullanımlık kod | Telefonda oturum açık kalır |
| Öğrenci | Sınıf kodu + okul numarası. **Hesap açılmaz**: cihaza gizli bir anahtar verilir, sunucuda yalnızca özeti tutulur. Öğrenci tablolara erişemez, sadece anahtarı kontrol eden `student_*` fonksiyonlarını çağırır (aktif kullanıcı sayılmaz → maliyet öğretmen sayısıyla büyür) | Bir kez; uygulama her açılışta doğrudan öğrenci ana ekranına gider |
| Akıllı tahta | Öğretmen kendi hesabıyla girer | Ders sonunda otomatik çıkış (aşağıda) |

### 2.1 Öğrenci telefon değiştirirse
Anonim hesap yeni telefona kendiliğinden geçmez. Çözüm (öğretmen için tek adım):

1. Öğretmen, öğrenci profilinde **"Yeni cihaza bağla"**ya basar.
2. Ekranda 6 haneli, **10 dakika geçerli, tek kullanımlık** bir kod çıkar.
3. Öğrenci yeni telefonda "Sınıfa katıl → Kodum var"a kodu girer; eski kayıtları yeni cihaza bağlanır, eski cihazın erişimi kapanır.

Öğrenciye ayrıca PIN ya da şifre verilmez.

### 2.2 Akıllı tahtada otomatik çıkış
Tahta okulun ortak cihazı olduğu için:
- Tahtada giriş yapılırken **"Ortak cihaz (tahta)"** kutusu varsayılan işaretli gelir.
- Ortak cihaz oturumu **45 dk işlem yapılmazsa** ya da **gün sonunda** kapanır; ekranda "Çıkış yap" düğmesi her zaman görünür.
- Ortak cihazda öğrenci isimleri gösterilmez (yalnızca numara + takma ad), çünkü isim listesi öğretmenin kişisel cihazındadır.

## 3. Veri: nerede ne tutulur

| Veri | Sunucu | Öğretmen cihazı | Öğrenci cihazı |
|---|---|---|---|
| Öğretmen hesabı (e-posta ya da Google/Apple kimliği) | ✓ | | |
| Sınıf (ad, sınıf kodu) | ✓ | ✓ | |
| Öğrenci kaydı: sınıf, okul no, takma ad | ✓ | ✓ | ✓ (kendisi) |
| Öğrenci **gerçek adı soyadı** | ✗ | ✓ | |
| Ödev (cümle id'leri, son gün) | ✓ | ✓ | ✓ |
| Ödev sonucu (cümle id → doğru/yanlış, süre) | ✓ | ✓ | ✓ |
| Öğretmenin artı/eksi puanları ve notları | ✗ (ilk sürümde) | ✓ | |
| Öğrencinin kendi çalışma geçmişi (SRS kartları) | ✗ | | ✓ |
| Yıllık plan | ✗ (ilk sürümde) | ✓ | |

Öğretmen notları ve yıllık plan ilk sürümde cihazda kalır; öğretmen telefon değiştirirse bugünkü "Yedek al" ile taşınır. İleride öğretmenin kendi hesabına senkronize edilebilir (öğrenci verisi içermediği için yıllık plan düşük risklidir).

## 4. Tablolar (ilk sürüm)

Uygulanabilir SQL: `supabase/migrations/20261021000000_init.sql` (Supabase projesi: `ingapp`, Frankfurt).

```
teachers      id (= auth.users.id), display_name, created_at          — kayıtta tetikleyiciyle oluşur
classes       id, teacher_id, name, join_code (6 hane, benzersiz), created_at
students      id, class_id, number, nickname, token_hash (cihaz anahtarı özeti), joined_at, created_at
homeworks     id, class_id, title, payload (cümle id'leri vb.), due_date, target_student_id (null = herkes), created_at
submissions   id, homework_id, student_id, results (json: cümle id → 0/1), duration_s, submitted_at
device_links  student_id, code_hash, expires_at, used_at
rate_limits   bucket, at                                              — kaba kuvvet sayacı
```

Öğrenci fonksiyonları (anon çağırır): `student_join`, `student_link_device`, `student_homeworks`, `student_submit`.
Öğretmen fonksiyonu: `create_device_link`. Katılma/bağlama hatalı denemede hata fırlatmaz, `error` döner — aksi halde deneme sayacı da geri alınır.

## 5. Erişim kuralları (RLS)

- **Öğretmen:** `classes.teacher_id = kendisi` olan sınıfları ve bunlara bağlı öğrenci/ödev/sonuçları okur-yazar. Başka öğretmenin hiçbir satırını göremez.
- **Öğrenci:** hiçbir tabloya doğrudan erişemez (anon rolünün tablo yetkisi yok). Fonksiyonlar cihaz anahtarını doğrular; öğrenci yalnızca kendi sınıfının ödevlerini (kendisine ya da herkese verilenler) alır ve kendi adına sonuç gönderir. Sonucu silemez/değiştiremez, sınıf arkadaşlarını göremez.
- **Öğretmen** öğrencinin cihaz anahtarı özetini göremez (sütun yetkisi) ve sonuç yazamaz (yalnızca okur/siler).
- **Sınıfa katılma** ve **cihaz bağlama** veritabanında tek bir sunucu fonksiyonu üzerinden yapılır (doğrudan tablo yazımı yok); deneme sayısı sınırlanır.
- **Silme:** öğretmen sınıfı silince sınıfın tüm öğrenci, ödev ve sonuç kayıtları da silinir. Öğrenci "verimi sil" diyebilir.

## 6. Güvenlik önlemleri

- Tüm trafik HTTPS; veritabanı diskte şifreli.
- Sınıf kodu ve cihaz bağlama kodu için deneme sınırı (kaba kuvvet tahminine karşı).
- Bağlama kodları veritabanında düz değil, özetlenmiş (hash) olarak tutulur.
- Uygulama içinde yalnızca "anon" anahtar bulunur; yönetici anahtarı uygulamaya hiç girmez.
- Sunucu kayıtlarında (log) öğrenci verisi tutulmaz.
- Kullanılmayan veriler için saklama süresi: okul yılı bitiminden belirli bir süre sonra otomatik silme (süre avukatla netleşecek).

## 7. Altyapı seçeneği

Önerilen: **Supabase** (PostgreSQL + RLS + anonim giriş + Google/Apple girişi hazır).
- Bölge seçimi hukuki bir karar: Supabase'in AB bölgesi de **yurt dışına aktarım** sayılır (KVKK 9. madde ve 2024 değişikliği). Alternatif: Supabase'i ya da düz PostgreSQL'i **Türkiye'de barındırmak**. Bu, avukatla birlikte seçilmeli.
- Maliyet: kullanıcı sayısına bağlı; bugün tahmin vermiyorum.

## 8. Avukata sorulacaklar (kontrol listesi)

- [ ] Aydınlatma metni ve gizlilik politikası (öğretmen ve öğrenci/veli için ayrı)
- [ ] 18 yaş altı için veli açık rızası nasıl ve ne zaman alınmalı (uygulama içi onay yeterli mi)
- [ ] Veri sorumlusu kim: biz mi, öğretmen mi, okul mu? Okulla veri işleme sözleşmesi gerekir mi
- [ ] Öğretmenin e-Okul listesini uygulamaya yüklemesi (isimler yalnızca cihazda kalsa da) sorun yaratır mı
- [ ] Yurt dışı barındırma mı Türkiye'de barındırma mı
- [ ] VERBİS kaydı gerekir mi
- [ ] Saklama ve silme süreleri
- [ ] Google Play "Families" ve App Store çocuk kategorisi kuralları

## 9. Geçiş sırası

1. Avukat değerlendirmesi ve altyapı/bölge kararı
2. Öğretmen girişi + sınıf + öğrenci katılımı (sınıf kodu)
3. Ödev gönderme / sonuç alma (QR yolu yedek olarak kalır)
4. Cihaz bağlama kodu, tahtada otomatik çıkış
5. Mevcut cihazdaki sınıfları hesaba taşıma ("Bu cihazdaki sınıfları hesabıma yükle", isimler hariç)
