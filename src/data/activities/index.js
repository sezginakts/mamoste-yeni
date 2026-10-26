// Sınıf etkinlikleri — her branşta "Etkinlikler" bölümü. Oyunlar uygulama içinde (WebView) internetsiz çalışır.
//
// YENİ İÇERİK EKLEMEK (ör. Fen Bilimleri 6. sınıf Pasaparola):
//   1. Soru havuzunu src/data/activities/<branş kimliği>/pasaparola<sınıf>_u<ünite>.js olarak yaz:
//        export default { A: [["b", "ipucu", "doğru cevap", "yanlış cevap", 1], …], B: […], … };
//      Her satır: kural ("b" = cevap o harfle başlar, "i" = içinde o harf geçer), ipucu, doğru, yanlış, seviye (1 kolay · 2 orta · 3 zor).
//      Harf başına birkaç soru olursa her oyunda farklıları gelir; gösterilenler cihazda hatırlanır.
//   2. Aşağıda o branşın listesine bir satır ekle: { type: 'pasaparola', grade, unit, unitName, pool: () => require('./…').default }.
// İngilizce oyunlarda okunan cümleler gömülü doğal sesle çalar: `sesler` → ingilizce/ses/<havuz>.js
//   (havuz değişince `node tools/etkinlik/sesler.mjs` çalıştır).
// Branş kimlikleri: data/branches.js (ingilizce, teknoloji-tasarim, turkce, matematik, fen, sosyal, inkilap, din, gorsel, muzik, beden, bilisim).

// Etkinlik türleri. Yeni bir oyun türü eklenirse motoru (HTML) buraya bağlanır.
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
  // Akıllı tahta sınıf modu (eski Board ekranı). Kaynağı tools/etkinlik/kalip.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz: ingilizce/kalip.js — patterns.js'teki kalıplar ve cümleleri (tek kaynak).
  kalip: {
    icon: '🖥️',
    name: 'Kalıp Tahtası',
    desc: 'Kalıbı seç, cümleler tahtada büyük çıksın: oku-tekrarla ya da Türkçeden çevir. Dinle, cevabı aç, 🎲 ile söz ver; doğru/yanlışla sınıf ya da iki takım yarışır.',
    branches: ['ingilizce'],
    engine: () => require('./kalipEngine.js').default,
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
  // Kaynağı tools/etkinlik/logo.html (öğretmenin Claude'da hazırladığı oyun); değişince `node tools/etkinlik/derle.js`.
  // Havuz yok: hazır logo paketi oyunun içinde, öğretmen kendi logolarını ekleyebilir (cihazda saklanır).
  logo: {
    icon: '🔍',
    name: 'Logo Avcısı',
    desc: 'Logo parça parça açılır; takımlar markayı ne kadar erken tanırsa o kadar çok puan alır. Hazır logo paketi var, öğretmen kendi logolarını da ekleyebilir.',
    branches: ['teknoloji-tasarim'],
    engine: () => require('./logoEngine.js').default,
  },
  // Kaynağı tools/etkinlik/kronoloji.html (öğretmenin Claude'da hazırladığı oyun); değişince `node tools/etkinlik/derle.js`.
  // Havuz yok: 37 buluş kartı oyunun içinde; öğretmen kart ekleyip çıkarabilir (cihazda saklanır).
  kronoloji: {
    icon: '🛞',
    name: 'Kronoloji Şeridi',
    desc: 'Takımlar sırayla gelen buluş kartını zaman şeridinde doğru yere koyar; şerit uzadıkça yer bulmak zorlaşır. Yanlış konan kart doğru yerine kayar. Öğretmen kendi kartlarını ekleyebilir.',
    branches: ['teknoloji-tasarim'],
    engine: () => require('./kronolojiEngine.js').default,
  },
  // Kaynağı tools/etkinlik/zaman.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz: { sinif, seviye, setler } — olaylar ve düzey zorluğu src/data/timelines.js (oynananlar cihazda hatırlanır).
  zaman: {
    icon: '🕰️',
    name: 'Zaman Şeridi',
    desc: 'Görselli olay kartlarını şeritte soldan sağa, eskiden yeniye diz. Tarihler sıralanmadan görünmez; doğru yerdekilerin tarihi açılır. Tek oyuncu ya da iki takım; öğretmen kendi olaylarını da yazabilir.',
    branches: ['sosyal', 'inkilap'],
    engine: () => require('./zamanEngine.js').default,
  },
  // Kaynağı tools/etkinlik/harita.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz: haritaHavuzu.js — harita geometrisi (turkeyMap.js) + düzeyin yerleri ve zorluğu (mapFeatures.js).
  harita: {
    icon: '🗺️',
    name: 'Türkiye Haritası',
    desc: 'Önce İller (81 il, plaka), sonra dağlar, akarsular, göller, ovalar, platolar, madenler, ticaret ve ulaşım. Keşfet ile öğren; Hangisi? ve Haritada bul ile tek oyuncu ya da iki takım yarış.',
    branches: ['sosyal'],
    engine: () => require('./haritaEngine.js').default,
  },
  hikaye: {
    icon: '📖',
    name: 'Hikâye Zinciri',
    desc: 'Sınıf ya da takımlar sırayla hikâyeye cümle ekler: makaranın verdiği kelimeyi kullan, dil görevini yap. Son cümleden sonra başlık konur; hikâyeler cihazda saklanır.',
    branches: ['turkce'],
    engine: () => require('./hikayeEngine.js').default,
  },
  // Kaynağı tools/etkinlik/hucre.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz: { bolumler: [{ id, ad, gorev, emoji, renk }], organeller: [{ ad, emoji, bolum, aciklama }] }
  // Hücre bir fabrika: her organel doğru görev bölümüne yerleştirilir. Tek oyuncu ya da iki takım.
  hucre: {
    icon: '🏭',
    name: 'Hücre Fabrikası',
    desc: 'Hücre bir fabrika: kartta çıkan organeli doğru görev bölümüne yerleştir (enerji, üretim, paketleme, depo, geri dönüşüm, yönetim, güvenlik). Hızlı doğru cevap bonus kazandırır; yanlışta doğru bölüm ve görevi açıklanır.',
    branches: ['fen'],
    engine: () => require('./hucreEngine.js').default,
  },
  // Kaynağı tools/etkinlik/molekul.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz: { atomlar: [{ id, ad, renk }], molekuller: [{ ad, formul, atomlar:{H:2,O:1}, aciklama }] }
  // Hedef molekülün atomlarını rafdan seçip kabı doldur; "Bağ kur" ile kontrol et.
  molekul: {
    icon: '⚛️',
    name: 'Molekül Kur',
    desc: 'Hedef molekül verilir; atom rafından doğru atomları seçip kabı doldurursun. H₂O, CO₂, CH₄, NH₃… Doğru kurulum puan kazandırır, yanlışta eksik/fazla atom söylenir.',
    branches: ['fen'],
    engine: () => require('./molekulEngine.js').default,
  },
  // Kaynağı tools/etkinlik/degisken.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz: { deneyler: [...] (temel), sorular: [...] (usta) }
  // Tek etkinlik, iki seviye: TEMEL = terimi kutuya koy; USTA = deneyi tasarla (8. sınıf ve üstü).
  degisken: {
    icon: '🔎',
    name: 'Değişken Avcısı',
    desc: 'İki seviyeli oyun. Temel: deney verilir, terimi doğru kutuya koy (🎚️ değiştirdim · 📏 ölçtüm · 🔒 sabit tuttum). Usta: araştırma sorusundan deneyi sen tasarla — değişkeni, ölçümü ve sabitleri seç (üst sınıflar).',
    branches: ['fen'],
    engine: () => require('./degiskenEngine.js').default,
  },
  // Kaynağı tools/etkinlik/hava.html; değişince `node tools/etkinlik/derle.js`.
  // Havuz: { zirve: 4000, senaryolar: [{ ad, denizSeviyesi, nem }] }
  // Dağ kesiti: bayrağı yüksekliğe koy, yağışın başladığı seviyeyi bul (çiy noktası + sıcaklık gradyanı).
  hava: {
    icon: '🌦️',
    name: 'Hava İstasyonu',
    desc: 'Rüzgâr nemli havayı yamaç boyunca yukarı iter: yükseldikçe basınç ve sıcaklık düşer, çiy noktasında yoğuşma başlar. Bayrağı doğru yüksekliğe koy; yağışın hangi yamaçta düştüğünü ve zirvedeki basıncı bul.',
    branches: ['sosyal'],
    engine: () => require('./havaEngine.js').default,
  },
};

// Zaman Şeridi havuzu: düzeyin olay setleri + zorluk ayarı.
const zamanHavuzu = (g) => {
  const { setsForGrade, GRADE_LEVELS } = require('../timelines');
  return { sinif: g, seviye: GRADE_LEVELS[g], setler: setsForGrade(g) };
};

const DKAB_IMZA = 'Hazırlayan: <b>Ejder AKÇİÇEK</b> · Din Kültürü ve Ahlak Bilgisi Öğretmeni';

const LIST = {
  din: [
    { type: 'pasaparola', grade: 9, unit: 1, unitName: 'Allah-İnsan İlişkisi', imza: DKAB_IMZA, pool: () => require('./din/pasaparola9_u1.js').default },
    { type: 'pasaparola', grade: 10, unit: 1, unitName: "İslam'da Varlık ve Bilgi", imza: DKAB_IMZA, pool: () => require('./din/pasaparola10_u1.js').default },
  ],
  // Diğer branşların içeriği eklenecek (yukarıdaki açıklamaya bak).
  ingilizce: [
    { type: 'kalip', grade: null, unit: null, unitName: 'Kalıp cümleleri', pool: () => require('./ingilizce/kalip.js').default, sesler: () => require('./ingilizce/ses/kalip.js').default },
    { type: 'cumle', grade: 5, unit: 1, unitName: 'School Life', pool: () => require('./ingilizce/cumle5_u1.js').default, sesler: () => require('./ingilizce/ses/cumle5_u1.js').default },
    { type: 'cumle', grade: 6, unit: 1, unitName: 'School Life', pool: () => require('./ingilizce/cumle6_u1.js').default, sesler: () => require('./ingilizce/ses/cumle6_u1.js').default },
    { type: 'cumle', grade: 7, unit: 1, unitName: 'Appearance and Personality', pool: () => require('./ingilizce/cumle7_u1.js').default, sesler: () => require('./ingilizce/ses/cumle7_u1.js').default },
    { type: 'cumle', grade: 8, unit: 1, unitName: 'Friendship', pool: () => require('./ingilizce/cumle8_u1.js').default, sesler: () => require('./ingilizce/ses/cumle8_u1.js').default },
    { type: 'cark', grade: 5, unit: 1, unitName: 'School Life', pool: () => require('./ingilizce/cark5_u1.js').default, sesler: () => require('./ingilizce/ses/cark5_u1.js').default },
    { type: 'cark', grade: 6, unit: 1, unitName: 'School Life', pool: () => require('./ingilizce/cark6_u1.js').default, sesler: () => require('./ingilizce/ses/cark6_u1.js').default },
    { type: 'cark', grade: 7, unit: 1, unitName: 'Appearance and Personality', pool: () => require('./ingilizce/cark7_u1.js').default, sesler: () => require('./ingilizce/ses/cark7_u1.js').default },
    { type: 'cark', grade: 8, unit: 1, unitName: 'Friendship', pool: () => require('./ingilizce/cark8_u1.js').default, sesler: () => require('./ingilizce/ses/cark8_u1.js').default },
  ],
  // grade: null → sınıf düzeyine bağlı değil (branşın tüm sınıfları).
  'teknoloji-tasarim': [
    { type: 'logo', grade: null, unit: null, unitName: 'Marka ve logo', pool: () => ({}) },
    { type: 'kronoloji', grade: null, unit: null, unitName: 'Buluşlar ve icatlar', pool: () => ({}) },
  ],
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
  fen: [
    { type: 'hucre', grade: 7, unit: null, unitName: 'Hücre ve Organeller', pool: () => require('./fen/hucre7.js').default },
    { type: 'molekul', grade: 7, unit: null, unitName: 'Saf Madde ve Karışımlar', pool: () => require('./fen/molekul7.js').default },
    { type: 'degisken', grade: 7, unit: null, unitName: 'Bilimsel Yöntem · Değişkenler', pool: () => require('./fen/degisken7.js').default },
  ],
  sosyal: [
    { type: 'zaman', grade: 5, unit: null, unitName: 'Kültürel miras · demokrasi · ulaşım · icatlar · Anadolu', pool: () => zamanHavuzu(5) },
    { type: 'zaman', grade: 6, unit: null, unitName: 'Türk-İslam tarihi · bilginler · miras · ulaşım · icatlar', pool: () => zamanHavuzu(6) },
    { type: 'zaman', grade: 7, unit: null, unitName: 'Osmanlı · Avrupa · bilginler · miras · Türk-İslam tarihi', pool: () => zamanHavuzu(7) },
    { type: 'harita', grade: 5, unit: null, unitName: '20 il ve temel yeryüzü şekilleri', pool: () => require('./haritaHavuzu').default(5) },
    { type: 'harita', grade: 6, unit: null, unitName: '45 il ve Türkiye’nin fiziki-ekonomik coğrafyası', pool: () => require('./haritaHavuzu').default(6) },
    { type: 'harita', grade: 7, unit: null, unitName: '81 il ve tüm yerler', pool: () => require('./haritaHavuzu').default(7) },
    { type: 'hava', grade: 6, unit: null, unitName: 'Türkiye’de İklim · Rakım ve Yağış', pool: () => require('./fen/hava8.js').default },
  ],
  inkilap: [{ type: 'zaman', grade: 8, unit: null, unitName: 'Millî Mücadele · inkılaplar · Atatürk’ün hayatı · demokrasi', pool: () => zamanHavuzu(8) }],
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
