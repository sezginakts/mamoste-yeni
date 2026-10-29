// Evrak etiket sözlüğü — şablonlarda kullanılabilecek BÜTÜN etiketler burada (tek kaynak).
// Şablon yayınlanırken (tools/evrak/yayinla.mjs) sözlükte olmayan etiket HATA verir; uygulama da eksik bilgi uyarısını
// buradan üretir. Yeni etiket = buraya satır + baglam.js'te değeri.
//
// Yazım (docxtemplater): {okul} · büyük harf: {okul|buyuk} · tarih: {gun:11-10} (takvim.js kuralı, ör. {gun:@donem1_sonu})
// Döngü (tablo satırı çoğalır): {#ogrenciler}{sira} {no} {ad}{/ogrenciler}
//
// ister: evrak indirilirken ne sorulur — 'sinif' (sınıf seçilir), 'kulup' (kulüp kaydı), 'duzey' (sınıf düzeyi: plan)
// bilgi: boşsa uyarıda gösterilecek ad ve nereden doldurulacağı (profil = Evraklar → Okul bilgileri)
export const ETIKETLER = {
  // Öğretmen ve okul (Okul bilgileri)
  ogretmen: { bilgi: 'Adın soyadın', yer: 'profil' },
  brans: { bilgi: 'Branş', yer: 'otomatik' },
  okul: { bilgi: 'Okul adı', yer: 'profil' },
  il: { bilgi: 'İl', yer: 'profil' },
  ilce: { bilgi: 'İlçe', yer: 'profil' },
  mudur: { bilgi: 'Okul müdürü', yer: 'profil' },
  mudur_yrd: { bilgi: 'Müdür yardımcısı', yer: 'profil' },
  rehber_ogretmen: { bilgi: 'Okul rehber öğretmeni (PDR)', yer: 'profil' },
  zumre: { bilgi: 'Zümre öğretmenleri', yer: 'profil', dongu: ['sira', 'ad', 'brans'] },
  zumre_baskani: { bilgi: 'Zümre başkanı', yer: 'profil' },
  // Tarih
  tarih: { bilgi: 'Evrak tarihi', yer: 'otomatik' },
  egitim_yili: { bilgi: 'Eğitim yılı', yer: 'otomatik' },
  donem: { bilgi: 'Dönem', yer: 'otomatik' },
  // Sınıf (indirirken seçilir)
  sinif: { bilgi: 'Sınıf / şube', yer: 'sinif', ister: 'sinif' },
  duzey: { bilgi: 'Sınıf düzeyi', yer: 'sinif', ister: 'duzey' },
  danisman: { bilgi: 'Sınıf rehber öğretmeni', yer: 'sinif', ister: 'sinif' },
  ogrenci_sayisi: { bilgi: 'Öğrenci sayısı', yer: 'sinif', ister: 'sinif' },
  // nobet: nöbet günü (öğrenciler sırayla Pazartesi…Cuma)
  ogrenciler: { bilgi: 'Öğrenci listesi', yer: 'sinif', ister: 'sinif', dongu: ['sira', 'no', 'ad', 'nobet'] },
  // Öğrenci başına bir sayfa (öz değerlendirme, öğrenci tanıma, veli izni): sayfanın tamamı döngü içinde
  ogrenci_sayfalari: { bilgi: 'Öğrenci listesi', yer: 'sinif', ister: 'sinif', dongu: ['sira', 'no', 'ad'] },
  haftalik_saat: { bilgi: 'Haftalık ders saati (ders programından)', yer: 'program', ister: 'sinif' },
  // Yıllık plan (düzey seçilir; öğretmenin yüklediği plan, yoksa MEB çerçeve planı)
  haftalar: { bilgi: 'Yıllık plan haftaları', yer: 'plan', ister: 'duzey', dongu: ['ay', 'hafta', 'tarihler', 'saat', 'unite', 'ciktilar'] },
  plan_kaynagi: { bilgi: 'Planın kaynağı', yer: 'plan', ister: 'duzey' },
  hafta_no: { bilgi: 'Planda bu hafta', yer: 'plan', ister: 'sinif' },
  hafta_unite: { bilgi: 'Bu haftanın ünitesi', yer: 'plan', ister: 'sinif' },
  hafta_ciktilari: { bilgi: 'Bu haftanın öğrenme çıktıları', yer: 'plan', ister: 'sinif' },
  // Kulüp (Evraklar → Kulübüm)
  kulup: { bilgi: 'Kulüp adı', yer: 'kulup', ister: 'kulup' },
  kulup_baskani: { bilgi: 'Kulüp başkanı', yer: 'kulup', ister: 'kulup' },
  kulup_danisman: { bilgi: 'Kulüp danışman öğretmeni', yer: 'kulup', ister: 'kulup' },
  uye_sayisi: { bilgi: 'Üye sayısı', yer: 'kulup', ister: 'kulup' },
  uyeler: { bilgi: 'Kulüp üyeleri', yer: 'kulup', ister: 'kulup', dongu: ['sira', 'no', 'ad', 'sinif'] },
};

export const SUZGECLER = ['buyuk'];

// Şablon metnindeki etiketleri ayıklar: { etiketler: ['okul', …], hatalar: ['bilinmeyen etiket {x}', …] }.
// Döngü içi alanlar (sira, ad…) sözlükteki döngünün `dongu` listesine göre denetlenir.
export function etiketleriAyikla(metin) {
  const etiketler = new Set();
  const hatalar = [];
  const yigin = [];
  for (const m of String(metin).matchAll(/\{([^{}]*)\}/g)) {
    const ham = m[1].trim();
    if (ham.startsWith('#') || ham.startsWith('^')) {
      const ad = ham.slice(1);
      if (!ETIKETLER[ad] || !ETIKETLER[ad].dongu) hatalar.push(`bilinmeyen döngü {${ham}}`);
      else etiketler.add(ad);
      yigin.push(ad);
      continue;
    }
    if (ham.startsWith('/')) {
      if (yigin.pop() !== ham.slice(1)) hatalar.push(`kapanış sırası yanlış {${ham}}`);
      continue;
    }
    if (ham.startsWith('gun:')) continue; // tarih kuralı; geçerliliği doldururken denetlenir
    const [ad, ...suz] = ham.split('|').map((s) => s.trim());
    suz.filter((s) => !SUZGECLER.includes(s)).forEach((s) => hatalar.push(`bilinmeyen süzgeç |${s} ({${ham}})`));
    const dongu = yigin.length ? ETIKETLER[yigin[yigin.length - 1]] : null;
    if (dongu && dongu.dongu && dongu.dongu.includes(ad)) continue;
    if (!ETIKETLER[ad] || ETIKETLER[ad].dongu) hatalar.push(`bilinmeyen etiket {${ham}}`);
    else etiketler.add(ad);
  }
  if (yigin.length) hatalar.push(`kapanmamış döngü {#${yigin.join('}, {#')}}`);
  return { etiketler: [...etiketler].sort(), hatalar };
}

// Etiketlerden evrakın indirirken neler isteyeceği: ['sinif', 'kulup', 'duzey'] alt kümesi.
export const isterler = (etiketler) => [...new Set(etiketler.map((e) => ETIKETLER[e] && ETIKETLER[e].ister).filter(Boolean))].sort();
