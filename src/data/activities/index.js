// Sınıf etkinlikleri — her branşta "Etkinlikler" bölümü. Oyunlar uygulama içinde (WebView) internetsiz çalışır.
//
// YENİ İÇERİK EKLEMEK (ör. Fen Bilimleri 6. sınıf Pasaparola):
//   1. Soru havuzunu src/data/activities/<branş kimliği>/pasaparola<sınıf>_u<ünite>.js olarak yaz:
//        export default { A: [["b", "ipucu", "doğru cevap", "yanlış cevap", 1], …], B: […], … };
//      Her satır: kural ("b" = cevap o harfle başlar, "i" = içinde o harf geçer), ipucu, doğru, yanlış, seviye (1 kolay · 2 orta · 3 zor).
//      Harf başına birkaç soru olursa her oyunda farklıları gelir; gösterilenler cihazda hatırlanır.
//   2. Aşağıda o branşın listesine bir satır ekle: { type: 'pasaparola', grade, unit, unitName, pool: () => require('./…').default }.
// Branş kimlikleri: data/branches.js (ingilizce, teknoloji-tasarim, turkce, matematik, fen, sosyal, inkilap, din, gorsel, muzik, beden, bilisim).

// Etkinlik türleri. Yeni bir oyun türü eklenirse motoru (HTML) buraya bağlanır.
// `screen` olan türler HTML değil, uygulamanın kendi ekranıdır (Oyna → o ekran, sınıf düzeyiyle);
// tek dosya olarak indirilemez, akıllı tahtada web sürümünden (npm run web) açılır.
export const ACTIVITY_TYPES = {
  pasaparola: {
    icon: '🔤',
    name: 'Pasaparola',
    desc: 'Harf çemberi: her harfte bir ipucu, iki seçenek. Doğru, yanlış ve pas hakkıyla süreli yarışma.',
    engine: () => require('./pasaparolaEngine.js').default,
  },
  // Kaynağı tools/etkinlik/cumle.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz: [["cümle.", "emoji", "Türkçe anlamı", seviye, "fazladan kelime (isteğe bağlı)"], …]
  cumle: {
    icon: '🧩',
    name: 'Cümle Kur',
    desc: 'Karışık kelimelere dokun ya da sürükle, resimdeki cümleyi kur. Tek oyuncu ya da iki takım; doğru cümle sesli okunur.',
    branches: ['ingilizce'],
    engine: () => require('./cumleEngine.js').default,
  },
  // Kaynağı tools/etkinlik/cark.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz: [["soru", "örnek cevap", "emoji", seviye, ["seçenek", …] (isteğe bağlı; doğru cevap aynen içinde)], …]
  cark: {
    icon: '🎡',
    name: 'Çarkıfelek',
    desc: '2-4 takım sırayla çarkı çevirir; gelen puana göre soru cevaplar. Büyük dilimde zor soru, ayrıca ×2, hediye, pas ve iflas dilimleri.',
    branches: ['ingilizce'],
    engine: () => require('./carkEngine.js').default,
  },
  // Kaynağı tools/etkinlik/terazi.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz soru listesi değil: { seviyeler: [1-6] } — denklemler oyunda rastgele üretilir (6: y'li).
  terazi: {
    icon: '⚖️',
    name: 'Denklem Terazisi',
    desc: 'Kefelerde x, y, küp ve balon. Dört oyun: Çöz, Kendin kur (gizli x\'i öğretmen/takım seçer), Tahmin et, Denklemi bul. Denklemler her oyunda yeniden üretilir.',
    branches: ['matematik'],
    engine: () => require('./teraziEngine.js').default,
  },
  // Kaynağı tools/etkinlik/fiilimsi.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz: [["cümle (*hedef kelime*)", "isim|sifat|zarf|degil", "kök|ek|diğer", "açıklama"], …]
  fiilimsi: {
    icon: '🗂️',
    name: 'Fiilimsi Kovası',
    desc: 'Cümledeki altı çizili kelimeyi doğru kovaya at: isim-fiil, sıfat-fiil, zarf-fiil ya da fiilimsi değil. Kart aşağı inerken hızlı ol; doğru bilince ekin başladığı harfi bul.',
    branches: ['turkce'],
    engine: () => require('./fiilimsiEngine.js').default,
  },
  // Kaynağı tools/etkinlik/hikaye.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz: { baslangiclar, kelimeler, gorevler, sinif } — tek içerik dosyası, sınıf düzeyi görevleri seçer.
  // Uygulama ekranı: src/screens/teacher/TimelineScreen.js · olaylar ve düzey zorluğu src/data/timelines.js
  zaman: {
    icon: '🕰️',
    name: 'Zaman Şeridi',
    desc: 'Görselli olay kartlarını soldan sağa doğru sıraya diz. Tarihler kontrol edilmeden görünmez; doğru yerdekilerin tarihi açılır, yanlışlar yeniden denenir. Öğretmen kendi olaylarını da ekleyebilir.',
    branches: ['sosyal', 'inkilap'],
    screen: 'Timeline',
  },
  // Uygulama ekranı: src/screens/teacher/MapGameScreen.js · yerler ve düzey zorluğu src/data/mapFeatures.js
  harita: {
    icon: '🗺️',
    name: 'Türkiye Haritası',
    desc: 'Önce İller (81 il, plaka), sonra dağlar, akarsular, göller, ovalar, platolar, madenler, ticaret ve ulaşım. Keşfet, Hangisi? ve Bul kipleri; doğru yer ve uzaklık haritada gösterilir.',
    branches: ['sosyal'],
    screen: 'MapGame',
  },
  hikaye: {
    icon: '📖',
    name: 'Hikâye Zinciri',
    desc: 'Sınıf ya da takımlar sırayla hikâyeye cümle ekler: makaranın verdiği kelimeyi kullan, dil görevini yap. Son cümleden sonra başlık konur; hikâyeler cihazda saklanır.',
    branches: ['turkce'],
    engine: () => require('./hikayeEngine.js').default,
  },
};

const DKAB_IMZA = 'Hazırlayan: <b>Ejder AKÇİÇEK</b> · Din Kültürü ve Ahlak Bilgisi Öğretmeni';

const LIST = {
  din: [
    { type: 'pasaparola', grade: 9, unit: 1, unitName: 'Allah-İnsan İlişkisi', imza: DKAB_IMZA, pool: () => require('./din/pasaparola9_u1.js').default },
    { type: 'pasaparola', grade: 10, unit: 1, unitName: "İslam'da Varlık ve Bilgi", imza: DKAB_IMZA, pool: () => require('./din/pasaparola10_u1.js').default },
  ],
  // Diğer branşların içeriği eklenecek (yukarıdaki açıklamaya bak).
  ingilizce: [
    { type: 'cumle', grade: 5, unit: 1, unitName: 'School Life', pool: () => require('./ingilizce/cumle5_u1.js').default },
    { type: 'cumle', grade: 6, unit: 1, unitName: 'School Life', pool: () => require('./ingilizce/cumle6_u1.js').default },
    { type: 'cumle', grade: 7, unit: 1, unitName: 'Appearance and Personality', pool: () => require('./ingilizce/cumle7_u1.js').default },
    { type: 'cumle', grade: 8, unit: 1, unitName: 'Friendship', pool: () => require('./ingilizce/cumle8_u1.js').default },
    { type: 'cark', grade: 5, unit: 1, unitName: 'School Life', pool: () => require('./ingilizce/cark5_u1.js').default },
    { type: 'cark', grade: 6, unit: 1, unitName: 'School Life', pool: () => require('./ingilizce/cark6_u1.js').default },
    { type: 'cark', grade: 7, unit: 1, unitName: 'Appearance and Personality', pool: () => require('./ingilizce/cark7_u1.js').default },
    { type: 'cark', grade: 8, unit: 1, unitName: 'Friendship', pool: () => require('./ingilizce/cark8_u1.js').default },
  ],
  'teknoloji-tasarim': [],
  turkce: [
    { type: 'fiilimsi', grade: 8, unit: null, unitName: 'Fiilimsiler', pool: () => require('./turkce/fiilimsi8.js').default },
    { type: 'hikaye', grade: 5, unit: null, unitName: 'Yaratıcı Yazma', pool: () => ({ ...require('./turkce/hikaye.js').default, sinif: 5 }) },
    { type: 'hikaye', grade: 6, unit: null, unitName: 'Yaratıcı Yazma', pool: () => ({ ...require('./turkce/hikaye.js').default, sinif: 6 }) },
    { type: 'hikaye', grade: 7, unit: null, unitName: 'Yaratıcı Yazma', pool: () => ({ ...require('./turkce/hikaye.js').default, sinif: 7 }) },
    { type: 'hikaye', grade: 8, unit: null, unitName: 'Yaratıcı Yazma', pool: () => ({ ...require('./turkce/hikaye.js').default, sinif: 8 }) },
  ],
  matematik: [
    { type: 'terazi', grade: 7, unit: null, unitName: 'Birinci Dereceden Denklemler', pool: () => require('./matematik/terazi7.js').default },
    { type: 'terazi', grade: 8, unit: null, unitName: 'Doğrusal Denklemler', pool: () => require('./matematik/terazi8.js').default },
  ],
  fen: [],
  sosyal: [
    { type: 'zaman', grade: 5, unit: null, unitName: 'Önemli günler · icatlar · Anadolu’nun ilk izleri' },
    { type: 'zaman', grade: 6, unit: null, unitName: 'İlk Türk devletleri ve Türk-İslam tarihi' },
    { type: 'zaman', grade: 7, unit: null, unitName: 'Osmanlı · Avrupa’da değişim' },
    { type: 'harita', grade: 5, unit: null, unitName: '20 il ve temel yeryüzü şekilleri' },
    { type: 'harita', grade: 6, unit: null, unitName: '45 il ve Türkiye’nin fiziki-ekonomik coğrafyası' },
    { type: 'harita', grade: 7, unit: null, unitName: '81 il ve tüm yerler' },
  ],
  inkilap: [{ type: 'zaman', grade: 8, unit: null, unitName: 'Milli Mücadele · Atatürk ilke ve inkılapları' }],
  gorsel: [],
  muzik: [],
  beden: [],
  bilisim: [],
};

// unit: null → ünite numarası yok (oyun bir konuya bağlı); listede ve dosya adında konu adı görünür.
const withId = (branchId) => (a) => ({ ...a, branchId, id: `${branchId}-${a.type}-${a.grade}-${a.unit ? `u${a.unit}` : 'genel'}` });
export const activitiesFor = (branchId) => (LIST[branchId] || []).map(withId(branchId));
export const activityById = (id) =>
  Object.keys(LIST)
    .flatMap((b) => activitiesFor(b))
    .find((a) => a.id === id) || null;
