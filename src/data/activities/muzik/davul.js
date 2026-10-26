// Davul Ustası — Müzik (ritim tekrarı). Her desen 4/4'lük bir ölçü, 8 sekizlik dilim.
// dizi: 1 = vuruş var, 0 = yok. bpm: tempo.
export default {
  desenler: [
    { ad: 'Dörtlük vuruşlar', bpm: 80, dizi: [1, 0, 1, 0, 1, 0, 1, 0] },
    { ad: 'Vuruş + sekizlik', bpm: 84, dizi: [1, 0, 0, 0, 1, 0, 1, 0] },
    { ad: 'Senkop', bpm: 88, dizi: [1, 0, 0, 1, 0, 0, 1, 0] },
    { ad: 'Bateri kalıbı', bpm: 92, dizi: [1, 0, 1, 1, 0, 1, 0, 1] },
    { ad: 'Usta', bpm: 100, dizi: [1, 1, 0, 1, 0, 1, 1, 0] },
  ],
};
