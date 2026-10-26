// Nota Avcısı — Müzik (5-8. sınıf). Sol anahtarı porte okuma.
// notalar: portedeki adımlar (0 = alt birinci çizgi E4, her adım yarım aralık).
// isimler: Türkçe nota adları (Do Re Mi Fa Sol La Si).
export default {
  isimler: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'],
  // step: 0 = E4 (alt 1. çizgi) · negatif = aşağı · pozitif = yukarı
  notalar: [
    { step: -2, ad: 'Do', oktav: 4 },   // C4 (yardımcı çizgi)
    { step: -1, ad: 'Re', oktav: 4 },
    { step: 0, ad: 'Mi', oktav: 4 },
    { step: 1, ad: 'Fa', oktav: 4 },
    { step: 2, ad: 'Sol', oktav: 4 },
    { step: 3, ad: 'La', oktav: 4 },
    { step: 4, ad: 'Si', oktav: 4 },
    { step: 5, ad: 'Do', oktav: 5 },
    { step: 6, ad: 'Re', oktav: 5 },
    { step: 7, ad: 'Mi', oktav: 5 },
    { step: 8, ad: 'Fa', oktav: 5 },
    { step: 9, ad: 'Sol', oktav: 5 },
    { step: 10, ad: 'La', oktav: 5 },
  ],
};
