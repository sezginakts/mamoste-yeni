// Değişken Avcısı — 7. sınıf (Fen Bilimleri, Bilimsel Yöntem).
// Her deney: kurulum metni + 4-5 terim kartı. Her kartın rolü:
//   bagimsiz = deneyde değiştirilen (tek değişken)
//   bagimli  = ölçülen/sonuç
//   sabit    = aynı tutulan
// gorsel: kartın üstünde görünen simge (kavramı çağrıştıran).
export default {
  deneyler: [
    {
      ad: 'Sulama ve bitki boyu',
      kurulum: 'Aynı toprak, aynı ışık, aynı saksı. Üç saksıya farklı miktarda su verildi; 3 hafta sonra boyları ölçüldü.',
      kartlar: [
        { ad: 'Su miktarı', gorsel: '💧', rol: 'bagimsiz', aciklama: 'Deneyde bilerek değiştirdiğimiz tek şey: bağımsız değişken.' },
        { ad: 'Bitki boyu', gorsel: '🌱', rol: 'bagimli', aciklama: 'Suyun etkisini görmek için ölçtüğümüz sonuç: bağımlı değişken.' },
        { ad: 'Toprak türü', gorsel: '🪴', rol: 'sabit', aciklama: 'Tüm saksılarda aynı tutuldu: kontrol edilen (sabit) değişken.' },
        { ad: 'Işık süresi', gorsel: '☀️', rol: 'sabit', aciklama: 'Değişirse sonucu suya bağlayamayız; bu yüzden sabit.' },
      ],
    },
    {
      ad: 'Gübre ve yaprak sayısı',
      kurulum: 'Özdeş iki saksı: birine gübre verildi, diğerine verilmedi. Su, toprak ve ışık aynı; 4 hafta sonra yaprak sayıldı.',
      kartlar: [
        { ad: 'Gübre miktarı', gorsel: '🧪', rol: 'bagimsiz', aciklama: 'Karşılaştırmak için değiştirdiğimiz değişken.' },
        { ad: 'Yaprak sayısı', gorsel: '🍃', rol: 'bagimli', aciklama: 'Gübrenin etkisini gösteren ölçüm: bağımlı değişken.' },
        { ad: 'Su miktarı', gorsel: '🚿', rol: 'sabit', aciklama: 'Her iki saksıya eşit verildi.' },
      ],
    },
    {
      ad: 'Sıcaklık ve çözünme süresi',
      kurulum: 'Aynı miktarda şeker, aynı hacimde su. Su sıcaklığı değiştirildi; şekerin tamamen çözünme süresi ölçüldü.',
      kartlar: [
        { ad: 'Su sıcaklığı', gorsel: '🌡️', rol: 'bagimsiz', aciklama: 'Değiştirdiğimiz bağımsız değişken.' },
        { ad: 'Çözünme süresi', gorsel: '⏱️', rol: 'bagimli', aciklama: 'Ölçtüğümüz sonuç: bağımlı değişken.' },
        { ad: 'Şeker miktarı', gorsel: '🍬', rol: 'sabit', aciklama: 'Her denemede eşit tutuldu.' },
        { ad: 'Karıştırma hızı', gorsel: '🥄', rol: 'sabit', aciklama: 'Sabit tutulmazsa süreyi sıcaklığa bağlayamayız.' },
      ],
    },
    {
      ad: 'Yüzey ve durma mesafesi',
      kurulum: 'Oyuncak araba aynı eğimden bırakıldı; halı, tahta ve cam üzerinde durma mesafesi ölçüldü.',
      kartlar: [
        { ad: 'Yüzey türü', gorsel: '🛣️', rol: 'bagimsiz', aciklama: 'Değiştirdiğimiz değişken: halı, tahta, cam.' },
        { ad: 'Durma mesafesi', gorsel: '📐', rol: 'bagimli', aciklama: 'Yüzeyin etkisini gösteren ölçüm.' },
        { ad: 'Arabanın ağırlığı', gorsel: '🚗', rol: 'sabit', aciklama: 'Aynı araba kullanıldı; sabit değişken.' },
      ],
    },
    {
      ad: 'Işık ve fotosentez',
      kurulum: 'Aynı bitki türü, aynı su ve sıcaklık. Işık şiddeti değiştirildi; yaprakta çıkan oksijen kabarcıkları sayıldı.',
      kartlar: [
        { ad: 'Işık şiddeti', gorsel: '🔆', rol: 'bagimsiz', aciklama: 'Değiştirilen değişken: ışığın gücü.' },
        { ad: 'Kabarcık sayısı', gorsel: '🫧', rol: 'bagimli', aciklama: 'Fotosentez hızını gösteren ölçüm: bağımlı değişken.' },
        { ad: 'Su sıcaklığı', gorsel: '🌡️', rol: 'sabit', aciklama: 'Tüm denemelerde aynı tutuldu.' },
      ],
    },
  ],
};
