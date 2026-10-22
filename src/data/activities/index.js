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
export const ACTIVITY_TYPES = {
  pasaparola: {
    icon: '🔤',
    name: 'Pasaparola',
    desc: 'Harf çemberi: her harfte bir ipucu, iki seçenek. Doğru, yanlış ve pas hakkıyla süreli yarışma.',
    engine: () => require('./pasaparolaEngine.js').default,
  },
};

const DKAB_IMZA = 'Hazırlayan: <b>Ejder AKÇİÇEK</b> · Din Kültürü ve Ahlak Bilgisi Öğretmeni';

const LIST = {
  din: [
    { type: 'pasaparola', grade: 9, unit: 1, unitName: 'Allah-İnsan İlişkisi', imza: DKAB_IMZA, pool: () => require('./din/pasaparola9_u1.js').default },
    { type: 'pasaparola', grade: 10, unit: 1, unitName: "İslam'da Varlık ve Bilgi", imza: DKAB_IMZA, pool: () => require('./din/pasaparola10_u1.js').default },
  ],
  // Diğer branşların içeriği eklenecek (yukarıdaki açıklamaya bak).
  ingilizce: [],
  'teknoloji-tasarim': [],
  turkce: [],
  matematik: [],
  fen: [],
  sosyal: [],
  inkilap: [],
  gorsel: [],
  muzik: [],
  beden: [],
  bilisim: [],
};

const withId = (branchId) => (a) => ({ ...a, branchId, id: `${branchId}-${a.type}-${a.grade}-u${a.unit}` });
export const activitiesFor = (branchId) => (LIST[branchId] || []).map(withId(branchId));
export const activityById = (id) =>
  Object.keys(LIST)
    .flatMap((b) => activitiesFor(b))
    .find((a) => a.id === id) || null;
