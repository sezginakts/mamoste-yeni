// Molekül Kur — 7. sınıf (Fen Bilimleri, Saf Madde ve Karışımlar).
// atomlar: raftaki atom düğmeleri. molekuller: hedef moleküller (atomlar = atom sayıları).
// yapi: doğru kurulunca çizilecek 2B yapı. atoms: {el, x, y} (merkez 0,0 · birim ~1),
//       bonds: [i, j, bağ sayısı] — 1 tek, 2 çift, 3 üçlü bağ.
export default {
  atomlar: [
    { id: 'H', ad: 'Hidrojen', renk: '#0284C7' },
    { id: 'C', ad: 'Karbon', renk: '#334155' },
    { id: 'O', ad: 'Oksijen', renk: '#E2574C' },
    { id: 'N', ad: 'Azot', renk: '#0D9488' },
    { id: 'Cl', ad: 'Klor', renk: '#D99A1E' },
  ],
  molekuller: [
    {
      ad: 'Su', formul: 'H₂O', atomlar: { H: 2, O: 1 },
      aciklama: 'İki hidrojen, bir oksijen. Su molekülü kırık (açılı) bir yapıdadır.',
      yapi: { atoms: [{ el: 'O', x: 0, y: 0 }, { el: 'H', x: -0.62, y: 0.42 }, { el: 'H', x: 0.62, y: 0.42 }], bonds: [[0, 1, 1], [0, 2, 1]] },
    },
    {
      ad: 'Oksijen gazı', formul: 'O₂', atomlar: { O: 2 },
      aciklama: 'İki oksijen atomu çift bağla bağlanır.',
      yapi: { atoms: [{ el: 'O', x: -0.42, y: 0 }, { el: 'O', x: 0.42, y: 0 }], bonds: [[0, 1, 2]] },
    },
    {
      ad: 'Azot gazı', formul: 'N₂', atomlar: { N: 2 },
      aciklama: 'İki azot atomu üçlü bağla bağlanır; bu yüzden çok kararlıdır.',
      yapi: { atoms: [{ el: 'N', x: -0.42, y: 0 }, { el: 'N', x: 0.42, y: 0 }], bonds: [[0, 1, 3]] },
    },
    {
      ad: 'Hidrojen gazı', formul: 'H₂', atomlar: { H: 2 },
      aciklama: 'İki hidrojen atomu tek bağla birleşir.',
      yapi: { atoms: [{ el: 'H', x: -0.4, y: 0 }, { el: 'H', x: 0.4, y: 0 }], bonds: [[0, 1, 1]] },
    },
    {
      ad: 'Karbondioksit', formul: 'CO₂', atomlar: { C: 1, O: 2 },
      aciklama: 'Karbon ortada, iki oksijen iki yanda; iki çift bağ vardır. Molekül doğrusaldır.',
      yapi: { atoms: [{ el: 'C', x: 0, y: 0 }, { el: 'O', x: -0.85, y: 0 }, { el: 'O', x: 0.85, y: 0 }], bonds: [[0, 1, 2], [0, 2, 2]] },
    },
    {
      ad: 'Karbon monoksit', formul: 'CO', atomlar: { C: 1, O: 1 },
      aciklama: 'Karbon ile oksijen arasında üçlü bağ vardır.',
      yapi: { atoms: [{ el: 'C', x: -0.42, y: 0 }, { el: 'O', x: 0.42, y: 0 }], bonds: [[0, 1, 3]] },
    },
    {
      ad: 'Metan', formul: 'CH₄', atomlar: { C: 1, H: 4 },
      aciklama: 'Karbon dört hidrojenle tek bağ kurar; dört bağ da karbona bağlıdır.',
      yapi: {
        atoms: [{ el: 'C', x: 0, y: 0 }, { el: 'H', x: 0, y: -0.8 }, { el: 'H', x: 0.8, y: 0 }, { el: 'H', x: 0, y: 0.8 }, { el: 'H', x: -0.8, y: 0 }],
        bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
      },
    },
    {
      ad: 'Amonyak', formul: 'NH₃', atomlar: { N: 1, H: 3 },
      aciklama: 'Azot üç hidrojenle bağlanır; molekül piramit biçimindedir.',
      yapi: { atoms: [{ el: 'N', x: 0, y: 0 }, { el: 'H', x: -0.72, y: 0.45 }, { el: 'H', x: 0.72, y: 0.45 }, { el: 'H', x: 0, y: -0.78 }], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
    },
    {
      ad: 'Hidrojen klorür', formul: 'HCl', atomlar: { H: 1, Cl: 1 },
      aciklama: 'Hidrojen ile klor tek bağla bağlanır.',
      yapi: { atoms: [{ el: 'H', x: -0.42, y: 0 }, { el: 'Cl', x: 0.42, y: 0 }], bonds: [[0, 1, 1]] },
    },
    {
      ad: 'Hidrojen peroksit', formul: 'H₂O₂', atomlar: { H: 2, O: 2 },
      aciklama: 'İki oksijen birbirine bağlıdır; her oksijene bir hidrojen bağlanır.',
      yapi: {
        atoms: [{ el: 'O', x: -0.42, y: 0 }, { el: 'O', x: 0.42, y: 0 }, { el: 'H', x: -0.95, y: 0.35 }, { el: 'H', x: 0.95, y: 0.35 }],
        bonds: [[0, 1, 1], [0, 2, 1], [1, 3, 1]],
      },
    },
  ],
};
