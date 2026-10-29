# Evrak kaynakları

Uygulamadaki **Evraklar** bölümünün şablon kaynağı. Bu klasör ana (gizli) depoda kalır; yayına yalnız işlenmiş şablonlar çıkar.

```
evrak-kaynak/
  gelen/        ← ham dosyalar: buraya at (elle ya da Cowork ile). Yayına ÇIKMAZ.
  sablonlar/    ← etiketlenmiş Word şablonları (<id>.docx)
  katalog.json  ← sablonlar/ içindeki her şablonun kaydı
```

Kodla üretilen şablonlar (zümre, ŞÖK, veli, rehberlik planı, kulüp, yıllık plan) `tools/evrak/sablon.mjs` içindedir.

## Yeni evrak eklemek

1. Ham dosyayı `gelen/<kategori>/` altına koy (kategori: `zumre` `sok` `yillik-plan` `sinav` `olcme` `kulup` `veli` `rehberlik` `sinif`).
   Başka sitelerden alınan dosyaların telif durumuna dikkat: yayın deposu herkese açık.
2. Claude'a "gelen klasöründeki evrakları işle" de. İşleme = dosyayı `sablonlar/<id>.docx` olarak etiketlemek
   ve `katalog.json`'a satır eklemek. Elle de yapılabilir: Word'de bilgilerin geleceği yere etiketi yaz (aşağıda).
3. `node tools/evrak/yayinla.mjs` — bütün şablonları örnek okul/sınıf/kulüp verisiyle doldurup denetler; hata varsa
   hiçbir şey yazmaz ve neyin yanlış olduğunu söyler. Geçerse `tahta-site/evrak/v3/` + `liste3.json` yazılır.
4. `cd tahta-site && git add -A && git commit -m "Evrak" && git push` → öğretmenler birkaç dakikada görür (uygulama derlemesi gerekmez).

## katalog.json satırı

```json
{ "id": "gozlem-formu", "kategori": "olcme", "ad": "Gözlem formu", "donem": "Süreç değerlendirme",
  "dosya": "sablonlar/gozlem-formu.docx", "gun": null }
```

- `id`: dosya adıyla aynı, Türkçe karakter / boşluk yok. Değiştirme (öğretmenin "görüldü" kaydı buna bağlı).
- `ad`: indirilen dosyanın adı. İsteğe bağlı `kisa` (ekranda kısa ad), `grup: "aylik"` (kulüp aylık raporları ızgarası), `brans` (yalnız o branş).
- `gun`: evrakın varsayılan tarihi — kurallar `src/teacher/evrak/takvim.js` başında (`"09-25"`, `"@donem1_sonu-5"`,
  `"ay-sonu:10"`, `["09-18", "02-12"]`, `null` = indirildiği gün). Öğretmen uygulamada 📅 ile değiştirir.
- Evrakın sınıf / kulüp / sınıf düzeyi isteyip istemediği etiketlerden kendiliğinden çıkarılır.

## Etiketler

Tam liste ve anlamları: `src/teacher/evrak/sozluk.js` (sözlükte olmayan etiket yayında hata verir).

| Yazım | Anlamı |
|---|---|
| `{okul}` `{ilce}` `{mudur}` `{mudur_yrd}` `{ogretmen}` `{brans}` | Okul bilgileri (Evraklar → Okul bilgileri) |
| `{okul\|buyuk}` | Büyük harfle (başlık satırları) |
| `{tarih}` `{egitim_yili}` `{donem}` | Evrak tarihi ve eğitim yılı |
| `{gun:11-10}` `{gun:@donem1_sonu-2}` | Takvimden tarih (tatil / hafta sonu ise önceki ders günü) |
| `{sinif}` `{danisman}` `{ogrenci_sayisi}` `{haftalik_saat}` | Seçilen sınıf |
| `{#ogrenciler}{sira} {no} {ad} {nobet}{/ogrenciler}` | Tablo satırı her öğrenci için çoğalır (ilk hücreye `{#…}`, son hücreye `{/…}`) |
| `{#ogrenci_sayfalari}` … `{/ogrenci_sayfalari}` | Sayfanın tamamı her öğrenci için tekrar (öz değerlendirme gibi) |
| `{#zumre}{ad} {brans}{/zumre}` `{zumre_baskani}` | Zümre öğretmenleri |
| `{kulup}` `{kulup_baskani}` `{kulup_danisman}` `{uye_sayisi}` `{#uyeler}{sira} {ad} {sinif} {no}{/uyeler}` | Kulübüm |
| `{duzey}` `{plan_kaynagi}` `{#haftalar}{ay} {hafta} {tarihler} {saat} {unite} {ciktilar}{/haftalar}` | Yıllık plan (düzey seçilir) |
| `{hafta_no}` `{hafta_unite}` `{hafta_ciktilari}` | Seçilen sınıfın planında evrak tarihine denk gelen hafta |

Boş kalan bilgi evrakta `……` olur; öğretmenin elle dolduracağı yerlere de `……` yazılır.
