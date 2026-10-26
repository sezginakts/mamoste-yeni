// Değişken Ustası — 8. sınıf ve üstü (Fen Bilimleri, bilimsel yöntem).
// Her soruda üç adım: bağımsız değişkeni seç → bağımlı değişkeni seç → sabit tutulacakları seç.
export default {
  sorular: [
    {
      soru: 'Suyun sıcaklığı, şekerin çözünme hızını etkiler mi?',
      gorsel: '🍬',
      bagimsiz: { dogru: 'Su sıcaklığı', secenekler: ['Su sıcaklığı', 'Şeker miktarı', 'Karıştırma hızı', 'Bardak rengi'] },
      bagimli: { dogru: 'Çözünme süresi', secenekler: ['Çözünme süresi', 'Su hacmi', 'Şeker markası', 'Oda sıcaklığı'] },
      sabitler: {
        dogru: ['Şeker miktarı', 'Su hacmi', 'Karıştırma hızı'],
        secenekler: ['Şeker miktarı', 'Su hacmi', 'Karıştırma hızı', 'Su sıcaklığı', 'Çözünme süresi', 'Bardağın şekli'],
      },
      aciklama: 'Sıcaklığı değiştiriyoruz (bağımsız), çözünme süresini ölçüyoruz (bağımlı); diğer her şey aynı kalmalı.',
    },
    {
      soru: 'Gübre miktarı bitkinin boyunu etkiler mi?',
      gorsel: '🌿',
      bagimsiz: { dogru: 'Gübre miktarı', secenekler: ['Gübre miktarı', 'Bitki boyu', 'Su miktarı', 'Saksı rengi'] },
      bagimli: { dogru: 'Bitki boyu', secenekler: ['Bitki boyu', 'Toprak türü', 'Gübre markası', 'Işık süresi'] },
      sabitler: {
        dogru: ['Su miktarı', 'Toprak türü', 'Işık süresi'],
        secenekler: ['Su miktarı', 'Toprak türü', 'Işık süresi', 'Gübre miktarı', 'Bitki boyu', 'Saksının yeri'],
      },
      aciklama: 'Gübre değişir, boy ölçülür; su-toprak-ışık sabit kalmalı ki fark gübreden olsun.',
    },
    {
      soru: 'Işık şiddeti fotosentez hızını etkiler mi?',
      gorsel: '🫧',
      bagimsiz: { dogru: 'Işık şiddeti', secenekler: ['Işık şiddeti', 'Kabarcık sayısı', 'Su sıcaklığı', 'Bitki türü'] },
      bagimli: { dogru: 'Kabarcık sayısı', secenekler: ['Kabarcık sayısı', 'Işık rengi', 'Su hacmi', 'Cam türü'] },
      sabitler: {
        dogru: ['Su sıcaklığı', 'Bitki türü', 'Su miktarı'],
        secenekler: ['Su sıcaklığı', 'Bitki türü', 'Su miktarı', 'Işık şiddeti', 'Kabarcık sayısı', 'Deney süresi'],
      },
      aciklama: 'Işığı değiştir, kabarcık sayısını ölç; sıcaklık-tür-su miktarı sabit olmalı.',
    },
  ],
};
