# App Store yayını — Okul

Bu belge App Store Connect'te doldurulacak her alanı ve yayın sırasını içerir. Uygulamadaki uyum ayarları kodda
yapıldı (aşağıda “Uygulamada yapılanlar”).

## Adresler (herkese açık sayfalar)

| Alan | Adres |
|---|---|
| Gizlilik Politikası URL'si | https://sezginakts.github.io/mamoste-tahta/uygulama/gizlilik.html |
| Destek URL'si | https://sezginakts.github.io/mamoste-tahta/uygulama/destek.html |
| Pazarlama URL'si (isteğe bağlı) | https://sezginakts.github.io/mamoste-tahta/uygulama/ |
| Kullanım koşulları (Açıklamanın sonuna yazılabilir) | https://sezginakts.github.io/mamoste-tahta/uygulama/kullanim.html |

Kaynak: `tools/site/` → `node tools/tahta/uret.mjs` ile `tahta-site/uygulama/`'ya kopyalanır → tahta-site push.

## Uygulama bilgileri

| Alan | Değer |
|---|---|
| Ad | Okul – Öğretmen Asistanı (alınmışsa: “Okul: Ders ve Sınıf”) |
| Alt başlık (≤30) | Ders planı, evrak ve ödev |
| Birincil dil | Türkçe |
| Paket kimliği | com.ingapp.cumle |
| SKU | okul-ios-1 |
| Kategori | Eğitim (ikincil: Verimlilik) |
| Fiyat | Ücretsiz |
| Cihaz | Yalnız iPhone (iPad'de iPhone görünümüyle çalışır) |
| Telif | 2026 Sezgin Aktaş |

**Anahtar kelimeler (98/100):**
`öğretmen,ders programı,yıllık plan,kazanım,öğrenme çıktısı,evrak,zümre,ödev,akıllı tahta,MEB,sınıf`

**Tanıtım metni (≤170):**
Uygulamayı açtığında o saatteki dersinin öğrenme çıktısı karşında. Yıllık plan, evrak, sınıf oyunları ve ödev tek yerde.

**Açıklama:**

```
Okul, ortaokul öğretmenleri için hazırlanmış ücretsiz ve reklamsız bir ders asistanıdır.

UYGULAMAYI AÇINCA DERSİN KARŞINDA
Ders programını bir kez gir; ana sayfada o saatte gireceğin sınıf ve o dersin öğrenme çıktısı yazar. MEB 2026-2027 çerçeve yıllık planları hazırdır; dilersen kendi planını Excel ya da Word dosyasından yükleyebilirsin.

EVRAKLAR
Zümre tutanakları, ŞÖK, veli toplantısı, sınıf rehberlik planı, kulüp dosyaları, BEP belgeleri, sınav ve ölçme evrakları okul ve sınıf bilgilerinle doldurulmuş olarak hazırlanır.

AKILLI TAHTA ETKİNLİKLERİ
Pasaparola, Zaman Şeridi, Türkiye Haritası, Cümle Kur, Çarkıfelek, Denklem Terazisi ve daha fazlası. Telefonundan tahtaya bağlan ya da flash belleğe at.

ÖDEV VE SINIF
Sınıfına 8 haneli kod ver; öğrencilerin hesap açmadan, okul numarasıyla katılır. Ödev gönder, teslimleri ve sonuçları gör, geri bildirim ve puan ver. Öğrencinin gerçek adı sunucuya gönderilmez.

DERS ZİLİ, NOTLAR, HATIRLATICILAR
Ders saatlerinde zil, yapışkan notlar ve hatırlatmalar.

ÖĞRENCİ İÇİN
Öğretmeninin verdiği sınıf koduyla derse katıl, ödevlerini al. İngilizce derslerinde kalıp çalışması, seri ve rozetler.

Hesap açmadan da kullanılabilir: ders programı, plan, evrak ve etkinlikler cihazında çalışır.

Gizlilik: https://sezginakts.github.io/mamoste-tahta/uygulama/gizlilik.html
Kullanım koşulları: https://sezginakts.github.io/mamoste-tahta/uygulama/kullanim.html
```

## Yaş derecelendirmesi

Hepsine **Yok / Hayır**: şiddet, cinsellik, korku, kumar, alkol-tütün-uyuşturucu, tıbbi bilgi, küfür.
- Kullanıcı tarafından oluşturulan içerik: **Evet** (öğretmen ödev içeriği öğrencilere gider; öğrenciler arası mesaj yok)
- Mesajlaşma / sohbet: **Hayır** · Sınırsız web erişimi: **Hayır** · Reklam: **Hayır** · Satın alma: **Hayır**
- “Çocuklar için yapıldı” (Kids kategorisi): **Hayır** (öğretmen uygulaması; öğrenci kısmı öğretmenle birlikte kullanılır)

## Uygulama Gizliliği (App Privacy) yanıtları

“Veri topluyor musunuz?” → **Evet**. Hiçbiri **takip (tracking)** için kullanılmaz; hepsi **kullanıcıya bağlıdır**, amaç yalnızca **Uygulama İşlevi**.

| Kategori | Tür | Kimden |
|---|---|---|
| İletişim bilgileri | E-posta adresi | Öğretmen (hesap açarsa) |
| İletişim bilgileri | Ad | Öğretmenin görünen adı, öğrencinin takma adı (isteğe bağlı) |
| Kullanıcı içeriği | Fotoğraf veya video | Öğretmenin ödeve eklediği dosyalar |
| Kullanıcı içeriği | Diğer kullanıcı içeriği | Ödevler, öğrenci notu, geri bildirim/puan, okul numarası |
| Tanımlayıcılar | Kullanıcı kimliği | Öğretmen hesap kimliği, öğrenci cihaz anahtarı |

Toplanmayanlar: konum, kişiler, sağlık, finans, tarama/arama geçmişi, kullanım verisi, tanılama, reklam kimliği.

## İnceleme bilgileri (App Review)

**Demo hesap gerekli** — öğretmen kısmını görebilmeleri için. Hesabı SEN aç (uygulamada “Kayıt ol”), içine örnek bir
sınıf (ör. 7-A), birkaç öğrenci numarası ve bir ödev koy. E-posta + şifreyi App Store Connect → İnceleme Bilgileri'ne yaz.

**İnceleme notu (İngilizce):**

```
Okul is a Turkish-language assistant for middle-school teachers and their students. On first launch choose a role.

Teacher: pick up to 3 subjects (e.g. "Teknoloji ve Tasarım"). Sign in with the demo account below, or tap
"Hesap açmadan devam et" (continue without an account) – timetable, year plans, documents (Evraklar) and classroom
games work offline on the device. The home screen shows the learning outcome of the current lesson from the timetable.
Account deletion: Ayarlar (Settings) → "Hesabımı sil".

Student: no account. Choose "Öğrenciyim" → "Derse katıl" and enter the class code shown in the demo teacher's class
screen (8 characters) and any school number (e.g. 15).

Demo teacher account: <e-posta> / <şifre>
Demo class code: <8 haneli kod>

The app collects no tracking data, contains no ads and no in-app purchases. Camera/photos/microphone are used only
when the teacher attaches a photo or video to a homework.
```

## Ekran görüntüleri

- iPhone 6,9" (1320 × 2868) — en az 3, en çok 10. (6,5" setini Apple 6,9"tan ölçekler.)
- Önerilen sıra: ana sayfa (öğrenme çıktısı kartı) · ders programı · yıllık plan · evraklar · etkinlik · sınıf kodu · öğrenci ödevleri.
- Görüntülerde gerçek öğrenci adı olmamalı; demo verisi kullan.
- HAZIR: `magaza-ekran/` (7 görüntü, 1320×2868, git dışında). Web sürümünden demo verisiyle (Sosyal Bilgiler öğretmeni, uydurma sınıf ve öğrenciler) Edge ile çekildi.

## Yayın sırası

1. Sunucu: `supabase/migrations/20261029000000_delete_account.sql` SQL Editor'da çalıştırılır (hesap silme için ŞART).
2. Sayfalar yayında olmalı (tahta-site push) — yukarıdaki adresler açılıyor mu kontrol et.
3. App Store Connect → Uygulamalar → ＋ Yeni Uygulama: iOS, ad, Türkçe, paket `com.ingapp.cumle`, SKU.
4. Yukarıdaki alanlar, yaş derecelendirmesi, gizlilik yanıtları, demo hesap, ekran görüntüleri.
5. Derleme: `npx eas-cli build -p ios --profile production` (yalnız istenince) → `npx eas-cli submit -p ios` (App Store
   Connect'e yükler; Apple hesabıyla giriş ister).
6. Derleme App Store Connect'e düşünce sürüme ekle → “İncelemeye gönder”.

## Uygulamada yapılanlar (ret sebeplerine karşı)

| Kural | Ne yapıldı |
|---|---|
| 5.1.1(v) Hesap silme | Ayarlar → “Hesabımı sil” (sunucu: `delete_my_account`, ödev dosyaları da silinir) |
| 5.1.1 Kayıt zorunluluğu | Öğretmen “Hesap açmadan devam et” ile hesapsız kullanabilir |
| 5.1.1 İzin açıklamaları | Kamera, fotoğraflar, mikrofon için Türkçe ve amaca özel metinler (app.json) |
| 5.1.2 Gizlilik bildirimi | `ios.privacyManifests` (UserDefaults, dosya zamanı, açılış süresi, disk alanı; takip yok) |
| 5.2.1 Başkasının markası | Gerçek marka logolu “Logo Avcısı” iPhone sürümünde gösterilmez |
| 4.8 Apple ile giriş | iPhone'da Google girişi gösterilmez (sunucuda Google zaten kapalı); yalnız e-posta + şifre |
| 2.1 Eksik içerik | “Yakında” görünen ders yok |
| Şifreleme | `ITSAppUsesNonExemptEncryption: false` |
| iPad | `supportsTablet: false` — iPad ekran görüntüsü ve iPad incelemesi gerekmez |

## Açık kalanlar / riskler

- **Demo hesap ve örnek veri**: senin açman gerekiyor (ben hesap açamam).
- **Apple ile giriş**: Google girişi sunucuda açılırsa iPhone'da da gösterilmek istenirse “Apple ile giriş” eklenmeli (kural 4.8).
- **Ödev dosyaları herkese açık bağlantıyla** saklanıyor (homework-media kovası public). Gizlilik politikasında yazıyor;
  ileride imzalı (süreli) bağlantıya geçmek daha güvenli olur.
- **Tahta sitesinde Logo Avcısı** marka logolarıyla yayında (App Store'u etkilemez ama marka sahibi itiraz edebilir).
