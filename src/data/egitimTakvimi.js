// Eğitim-öğretim yılı çalışma takvimi — uygulamanın tarihe bağlı her şeyinin TEK kaynağı (evrak tarihleri, toplantı günleri,
// ders zilinin tatil günleri, takvim ekranı). Saf JS: uygulama ve tools/evrak betikleri birlikte kullanır.
//
// HER YIL GÜNCELLENİR: MEB yeni yılın takvimini açıklayınca buraya yeni yılı ekle (anahtar = ilk takvim yılı), sonra
// `node tools/evrak/yayinla.mjs` → tahta-site/evrak/takvim.json → push. Uygulama takvimi oradan da okur (derleme gerekmez);
// bu dosyadaki kopya internet yokken kullanılır.
//
// Alanlar:
//   tarihler: adlandırılmış günler (evrak tarih kuralı '@ad' bunları kullanır, ör. gun: '@zumre_1')
//   tatiller: [başlangıç, bitiş, tür, ad] — tür: 'resmi' (kimse çalışmaz), 'ders' (öğrenci tatili; öğretmen mesleki
//             çalışma yapabilir: ara tatil, yarıyıl), 'yarim' (arife: öğleden sonra tatil, iş günü sayılır)
//   mesleki:  [başlangıç, bitiş, ad] — öğretmenlerin mesleki çalışma dönemleri
//   olaylar:  [tarih, ad, tür, bitiş?] — tür: 'toplanti' | 'gun' (belirli gün ve haftalar) | 'donem'
const TAKVIM = {
  2026: {
    ad: '2026-2027',
    kaynak: 'https://www.meb.gov.tr/2026-2027-egitim-ogretim-yili-takvimi-aciklandi/haber/41057/tr',
    not: 'Dönem, tatil ve bayram günleri MEB duyurusu ve il millî eğitim müdürlüklerinin (İstanbul, Sivas) 2026-2027 çalışma takvimlerinden. 2. dönem okul zümresi ilden ile değişebilir (İstanbul 9, Sivas 8 Şubat).',
    tarihler: {
      mesleki_basi: '2026-09-01',
      ogretmenler_kurulu_1: '2026-09-01',
      zumre_1: '2026-09-02',
      zumre_baskanlari_1: '2026-09-03',
      ilce_zumre_1: '2026-09-04',
      il_zumre_1: '2026-09-07',
      ders_basi: '2026-09-14',
      donem1_sonu: '2027-01-22',
      ogretmenler_kurulu_2: '2027-02-08',
      donem2_basi: '2027-02-08',
      zumre_2: '2027-02-09',
      ilce_zumre_2: '2027-02-11',
      ders_sonu: '2027-06-25',
      ogretmenler_kurulu_3: '2027-06-28',
      zumre_3: '2027-06-29',
      ilce_zumre_3: '2027-06-30',
      ogretmen_tatili: '2027-07-01',
    },
    tatiller: [
      ['2026-10-28', '2026-10-28', 'yarim', 'Cumhuriyet Bayramı arifesi (13.00’ten sonra)'],
      ['2026-10-29', '2026-10-29', 'resmi', 'Cumhuriyet Bayramı'],
      ['2026-11-16', '2026-11-20', 'ders', '1. dönem ara tatili'],
      ['2027-01-01', '2027-01-01', 'resmi', 'Yılbaşı'],
      ['2027-01-25', '2027-02-05', 'ders', 'Yarıyıl tatili'],
      ['2027-03-08', '2027-03-08', 'ders', '2. dönem ara tatili · Ramazan Bayramı arifesi'],
      ['2027-03-09', '2027-03-11', 'resmi', 'Ramazan Bayramı'],
      ['2027-03-12', '2027-03-12', 'ders', '2. dönem ara tatili'],
      ['2027-04-23', '2027-04-23', 'resmi', 'Ulusal Egemenlik ve Çocuk Bayramı'],
      ['2027-05-01', '2027-05-01', 'resmi', 'Emek ve Dayanışma Günü'],
      ['2027-05-15', '2027-05-15', 'yarim', 'Kurban Bayramı arifesi'],
      ['2027-05-16', '2027-05-19', 'resmi', 'Kurban Bayramı · 19 Mayıs'],
    ],
    mesleki: [
      ['2026-09-01', '2026-09-11', 'Eylül mesleki çalışması'],
      ['2026-11-16', '2026-11-20', 'Ara tatil mesleki çalışması'],
      ['2027-03-08', '2027-03-12', 'Ara tatil mesleki çalışması'],
      ['2027-06-28', '2027-06-30', 'Yıl sonu mesleki çalışması'],
    ],
    olaylar: [
      ['2026-09-01', 'Öğretmenlerin göreve başlaması · Öğretmenler kurulu', 'toplanti'],
      ['2026-09-02', 'Okul zümre toplantıları', 'toplanti'],
      ['2026-09-03', 'Zümre başkanları kurulu', 'toplanti'],
      ['2026-09-04', 'İlçe zümre toplantıları', 'toplanti'],
      ['2026-09-07', 'İl zümre toplantıları', 'toplanti'],
      ['2026-09-07', 'Okul öncesi ve 1. sınıf uyum eğitimi', 'donem', '2026-09-11'],
      ['2026-09-14', 'Ders yılı ve 1. dönem başlıyor', 'donem'],
      ['2026-09-14', '5. sınıflar için uyum (rehberlik) çalışmaları', 'donem', '2026-09-18'],
      ['2026-09-14', 'İlköğretim Haftası', 'gun', '2026-09-18'],
      ['2026-09-21', '15 Temmuz Demokrasi ve Millî Birlik Günü anma programları', 'gun', '2026-09-25'],
      ['2026-10-01', 'Veli toplantısı ve ŞÖK (Ekim ayı içinde)', 'toplanti'],
      ['2026-11-10', 'Atatürk Haftası', 'gun', '2026-11-16'],
      ['2026-11-24', 'Öğretmenler Günü', 'gun'],
      ['2026-12-03', 'Dünya Engelliler Günü', 'gun'],
      ['2027-01-22', '1. dönem sona eriyor · karne', 'donem'],
      ['2027-02-08', '2. dönem başlıyor · Öğretmenler kurulu', 'donem'],
      ['2027-02-09', 'Okul zümre toplantıları (2. dönem)', 'toplanti'],
      ['2027-02-11', 'İlçe zümre toplantıları (2. dönem)', 'toplanti'],
      ['2027-03-12', 'İstiklal Marşı’nın Kabulü ve Mehmet Akif Ersoy’u Anma Günü', 'gun'],
      ['2027-03-18', 'Şehitler Günü (Çanakkale Zaferi)', 'gun'],
      ['2027-05-19', 'Atatürk’ü Anma, Gençlik ve Spor Bayramı', 'gun'],
      ['2027-06-01', 'Hayat Boyu Öğrenme Haftası', 'gun', '2027-06-06'],
      ['2027-06-25', 'Ders yılı sona eriyor · karne', 'donem'],
      ['2027-06-28', 'Öğretmenler kurulu (yıl sonu)', 'toplanti'],
      ['2027-06-29', 'Okul zümre toplantıları (yıl sonu)', 'toplanti'],
      ['2027-06-30', 'İlçe zümre toplantıları (yıl sonu)', 'toplanti'],
      ['2027-07-01', 'Öğretmenlerin tatile girmesi', 'donem'],
    ],
  },
};

export default TAKVIM;
