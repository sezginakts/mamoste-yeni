// Pasaparola soru havuzlarını kısa satır biçiminden okur (tools/etkinlik/paso.html motoru için).
// Her satır:  HARF ZORLUK[i] | doğru cevap | ipucu | çeldirici; çeldirici; çeldirici
//   ZORLUK: 1 kolay · 2 orta · 3 zor.  Sondaki "i" → cevabın İÇİNDE o harf geçer (yoksa o harfle BAŞLAR).
//   Örnek:  A 1 | Anadolu | Türkiye’nin Asya kıtasındaki toprakları | Avrupa; Arabistan; Afrika
//           X 2i | taxi | Taksi | box; six; fox
// Boş satır, # ile başlayan satır ve bozuk satır atlanır. Her harfte en az 10 soru olmalı (iki takım + tekrar etmesin).
export function satirlar(metin) {
  const out = [];
  String(metin || '')
    .split('\n')
    .forEach((satir) => {
      const t = satir.trim();
      if (!t || t.startsWith('#')) return;
      const [bas, d, s, y] = t.split('|').map((x) => (x || '').trim());
      const m = (bas || '').match(/^(\S+)\s+([123])(i?)$/);
      if (!m || !d || !s) return;
      const q = { h: m[1], z: +m[2], s, d, y: (y || '').split(';').map((x) => x.trim()).filter(Boolean) };
      if (m[3]) q.k = 'i';
      out.push(q);
    });
  return out;
}
