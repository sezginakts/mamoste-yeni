// Eğitim takvimi — evrak tarihlerinin tek kaynağı (saf JS; uygulama ve tools/evrak betikleri birlikte kullanır).
// Yıl verisi: ders yılı / dönem sınırları, ara tatiller, resmî ve dinî tatiller. Yeni yıl gelince YILLAR'a ekle.
// 2026-2027: dönem ve ara tatil günleri src/data/yearPlans (MEB çerçeve planları) hafta tarihlerinden.
// Dinî bayram günleri Diyanet takviminden DOĞRULANMALI (ay takvimine göre hesaplanır, bir gün kayabilir).
//
// Evrak tarih kuralı (liste satırındaki `gun`):
//   'AA-GG'                 → o eğitim yılındaki gün (Eylül–Aralık ilk yıl, Ocak–Ağustos ikinci yıl)
//   '@ders_basi' '@donem1_sonu' '@donem2_basi' '@ders_sonu' (+/-N: N okul günü ileri/geri, ör. '@donem1_sonu-2')
//   'ay-sonu:AA'            → o ayın son okul günü · 'ay-basi' → bulunulan ayın ilk okul günü
//   (ay-sonu, ay-basi ve @…+N ders günü sayar; AA-GG evrak tarihinde iş günü, şablondaki {gun:…} etiketinde ders günü)
//   [kural, kural…]         → yılda birkaç kez yapılan evrak: bugüne en yakını
//   null                    → bugün
// İş günü değilse (hafta sonu, tatil) bir önceki iş gününe çekilir.

const YILLAR = {
  2026: {
    ders_basi: '2026-09-14',
    donem1_sonu: '2027-01-22',
    donem2_basi: '2027-02-08',
    ders_sonu: '2027-06-25',
    tatiller: [
      ['2026-10-29', '2026-10-29'], // Cumhuriyet Bayramı (28 Ekim öğleden sonra yarım gün)
      ['2026-11-16', '2026-11-20', 'ders'], // 1. ara tatil (öğretmen için iş günü olabilir)
      ['2027-01-01', '2027-01-01'], // Yılbaşı
      ['2027-01-25', '2027-02-05', 'ders'], // yarıyıl tatili (son haftası mesleki çalışma)
      ['2027-03-08', '2027-03-08', 'ders'], // 2. ara tatil
      ['2027-03-09', '2027-03-11'], // Ramazan Bayramı (DOĞRULA)
      ['2027-03-12', '2027-03-12', 'ders'], // 2. ara tatil
      ['2027-04-23', '2027-04-23'], // Ulusal Egemenlik ve Çocuk Bayramı
      ['2027-05-01', '2027-05-01'], // Emek ve Dayanışma Günü
      ['2027-05-17', '2027-05-19'], // Kurban Bayramı 16–19 Mayıs (DOĞRULA) + 19 Mayıs
    ],
  },
};

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s) => {
  const [y, m, g] = s.split('-').map(Number);
  return new Date(y, m - 1, g, 12);
};
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

// Eğitim yılının ilk takvim yılı: Eylül 2026 … Ağustos 2027 → 2026.
export const ilkYil = (d = new Date()) => (d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1);
export const egitimYili = (d = new Date()) => `${ilkYil(d)}-${ilkYil(d) + 1}`;

// Verisi olmayan yıl için en yakın bilinen yılın günleri takvim yılı kaydırılarak kullanılır (yaklaşık).
function yilVerisi(y) {
  if (YILLAR[y]) return { ...YILLAR[y], yaklasik: false };
  const bilinen = Object.keys(YILLAR).map(Number).sort((a, b) => Math.abs(a - y) - Math.abs(b - y))[0];
  const k = y - bilinen;
  const kay = (s) => `${+s.slice(0, 4) + k}${s.slice(4)}`;
  const v = YILLAR[bilinen];
  return {
    ders_basi: kay(v.ders_basi),
    donem1_sonu: kay(v.donem1_sonu),
    donem2_basi: kay(v.donem2_basi),
    ders_sonu: kay(v.ders_sonu),
    tatiller: v.tatiller.filter(([a, , tur]) => !tur && /-(01-01|04-23|05-01|05-19|10-29)$/.test(a)).map(([a, b]) => [kay(a), kay(b)]),
    yaklasik: true,
  };
}

// ders = true: ara tatil / yarıyıl da tatil (öğrencili etkinlik); false: yalnız resmî tatil (öğretmen iş günü).
export function tatilMi(d, ders = false) {
  const s = isoDay(d);
  return yilVerisi(ilkYil(d)).tatiller.some(([a, b, tur]) => s >= a && s <= b && (ders || tur !== 'ders'));
}
export const okulGunuMu = (d, ders = false) => d.getDay() !== 0 && d.getDay() !== 6 && !tatilMi(d, ders);

// İş günü değilse (hafta sonu / tatil) önceki iş gününe. Ders yılı dışındaki iş günleri (Eylül ve Haziran mesleki
// çalışma: zümre toplantıları) geçerlidir.
export function okulGunune(d, ders = false) {
  let x = d;
  for (let i = 0; i < 30 && !okulGunuMu(x, ders); i++) x = addDays(x, -1);
  return x;
}
function okulGunuEkle(d, n, ders) {
  let x = d;
  const adim = n < 0 ? -1 : 1;
  for (let k = Math.abs(n); k > 0; ) {
    x = addDays(x, adim);
    if (okulGunuMu(x, ders)) k--;
  }
  return x;
}

// Tek kural → Date. ref: evrakın eğitim yılını belirleyen gün (çoğunlukla bugün).
// ders = true: öğrencili etkinlik günü (şablondaki {gun:…}); false: öğretmen iş günü (evrak tarihi).
export function kuralTarihi(kural, ref = new Date(), ders = false) {
  const y = ilkYil(ref);
  const v = yilVerisi(y);
  if (!kural) return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 12);
  if (kural === 'ay-basi') {
    let d = new Date(ref.getFullYear(), ref.getMonth(), 1, 12);
    for (let i = 0; i < 15 && !okulGunuMu(d, true); i++) d = addDays(d, 1);
    return d;
  }
  let m = /^ay-sonu:(\d\d)$/.exec(kural);
  if (m) {
    const ay = +m[1];
    const son = new Date(ay >= 9 ? y : y + 1, ay, 0, 12);
    const dersSonu = fromIso(v.ders_sonu);
    return okulGunune(son > dersSonu && isoDay(son).slice(0, 7) === v.ders_sonu.slice(0, 7) ? dersSonu : son, true); // Haziran: son ders günü
  }
  m = /^@(ders_basi|donem1_sonu|donem2_basi|ders_sonu)([+-]\d+)?$/.exec(kural);
  if (m) {
    const d = fromIso(v[m[1]]);
    return m[2] ? okulGunuEkle(d, +m[2], true) : d;
  }
  m = /^(\d\d)-(\d\d)$/.exec(kural);
  if (m) {
    const ay = +m[1];
    return okulGunune(new Date(ay >= 9 ? y : y + 1, ay - 1, +m[2], 12), ders);
  }
  throw new Error(`Bilinmeyen tarih kuralı: ${kural}`);
}

// Liste satırının `gun` alanı (tek kural ya da dizi) → Date.
export function varsayilanTarih(gun, now = new Date()) {
  const liste = Array.isArray(gun) ? gun : [gun];
  return liste.map((k) => kuralTarihi(k, now)).sort((a, b) => Math.abs(a - now) - Math.abs(b - now))[0];
}

// Tarihin dönemi: '1. dönem' / '2. dönem'.
export const donemOf = (d) => (isoDay(d) < yilVerisi(ilkYil(d)).donem2_basi ? '1. dönem' : '2. dönem');
export const takvimYaklasikMi = (d = new Date()) => yilVerisi(ilkYil(d)).yaklasik;
export const trTarih = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
