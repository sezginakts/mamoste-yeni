// Eğitim takvimi işlevleri — veri src/data/egitimTakvimi.js (uygulamaya gömülü kopya) + yayın sitesindeki takvim.json
// (her yıl güncellenir; takvimGuncelle ile gelir, uygulama derlemesi gerekmez). Saf JS: uygulama ve tools/evrak birlikte kullanır.
// Takvime bağlı her şey buradan: evrak tarihleri, toplantı günleri, ders zilinin tatil günleri, takvim ekranı.
//
// Evrak tarih kuralı (liste satırındaki `gun`):
//   'AA-GG'                 → o eğitim yılındaki gün (Eylül–Aralık ilk yıl, Ocak–Ağustos ikinci yıl)
//   '@ad'  (+/-N: N ders günü ileri/geri) → takvimdeki adlandırılmış gün: @ders_basi @donem1_sonu @donem2_basi @ders_sonu
//                             @zumre_1/2/3 @ilce_zumre_1/2/3 @ogretmenler_kurulu_1/2/3 … (egitimTakvimi.js → tarihler)
//   'ay-sonu:AA'            → o ayın son ders günü · 'ay-basi' → bulunulan ayın ilk ders günü
//   (ay-sonu, ay-basi ve @…±N ders günü sayar; AA-GG evrak tarihinde iş günü, şablondaki {gun:…} etiketinde ders günü)
//   [kural, kural…]         → yılda birkaç kez yapılan evrak: bugüne en yakını
//   null                    → bugün
// İş günü değilse (hafta sonu, tatil) bir önceki iş gününe çekilir.
import TAKVIM from '../../data/egitimTakvimi.js';

const YILLAR = { ...TAKVIM };

// Yayın sitesindeki takvim.json ({ yillar: { 2026: {…} } }) gömülü kopyanın üstüne yazılır. Döner: eklenen/değişen yıl sayısı.
export function takvimGuncelle(json) {
  const yillar = (json && json.yillar) || {};
  let n = 0;
  for (const [y, v] of Object.entries(yillar)) {
    if (!v || !v.tarihler || !v.tarihler.ders_basi || !Array.isArray(v.tatiller)) continue; // bozuk veri alınmaz
    YILLAR[y] = v;
    n++;
  }
  return n;
}
export const takvimYillari = () => Object.keys(YILLAR).map(Number).sort((a, b) => a - b);

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromIso = (s) => {
  const [y, m, g] = s.split('-').map(Number);
  return new Date(y, m - 1, g, 12);
};
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

// Eğitim yılının ilk takvim yılı: Eylül 2026 … Ağustos 2027 → 2026.
export const ilkYil = (d = new Date()) => (d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1);
export const egitimYili = (d = new Date()) => `${ilkYil(d)}-${ilkYil(d) + 1}`;

// Yıl verisi. Verisi olmayan yıl: en yakın bilinen yılın günleri takvim yılı kaydırılarak (yaklaşık; yalnız sabit tarihli
// resmî tatiller alınır — dinî bayramlar her yıl kayar).
export function yilVerisi(y) {
  if (YILLAR[y]) return { ...YILLAR[y], yil: +y, yaklasik: false };
  const bilinen = takvimYillari().sort((a, b) => Math.abs(a - y) - Math.abs(b - y))[0];
  const k = y - bilinen;
  const kay = (s) => `${+s.slice(0, 4) + k}${s.slice(4)}`;
  const v = YILLAR[bilinen];
  return {
    ad: `${y}-${y + 1}`,
    tarihler: Object.fromEntries(Object.entries(v.tarihler).map(([a, t]) => [a, kay(t)])),
    tatiller: v.tatiller.filter(([a, , tur]) => tur === 'resmi' && /-(01-01|04-23|05-01|10-29)$/.test(a)).map(([a, b, tur, ad]) => [kay(a), kay(b), tur, ad]),
    mesleki: [],
    olaylar: [],
    yil: y,
    yaklasik: true,
  };
}

// ders = true: ara tatil / yarıyıl da tatil (öğrencili etkinlik); false: yalnız resmî tatil (öğretmen iş günü). Arife iş günü.
export function tatilMi(d, ders = false) {
  const s = isoDay(d);
  return yilVerisi(ilkYil(d)).tatiller.some(([a, b, tur]) => s >= a && s <= b && tur !== 'yarim' && (ders || tur !== 'ders'));
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
  const t = v.tarihler;
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
    const dersSonu = fromIso(t.ders_sonu);
    return okulGunune(son > dersSonu && isoDay(son).slice(0, 7) === t.ders_sonu.slice(0, 7) ? dersSonu : son, true); // Haziran: son ders günü
  }
  m = /^@([a-z0-9_]+)([+-]\d+)?$/.exec(kural);
  if (m) {
    if (!t[m[1]]) throw new Error(`Takvimde olmayan gün: @${m[1]}`);
    const d = fromIso(t[m[1]]);
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

// Bir günün takvim durumu (takvim ekranı): { tatil: [tür, ad] | null, mesleki: ad | null, olaylar: [[tarih, ad, tür, bitiş?]] }
export function gunDurumu(d) {
  const s = isoDay(d);
  const v = yilVerisi(ilkYil(d));
  const tatil = v.tatiller.find(([a, b]) => s >= a && s <= b);
  const mesleki = (v.mesleki || []).find(([a, b]) => s >= a && s <= b);
  const t = v.tarihler;
  return {
    tatil: tatil ? [tatil[2] || 'resmi', tatil[3] || ''] : null,
    mesleki: mesleki ? mesleki[2] : null,
    dersVar: s >= t.ders_basi && s <= t.ders_sonu && !(s > t.donem1_sonu && s < t.donem2_basi),
    olaylar: (v.olaylar || []).filter(([a, , , b]) => s >= a && s <= (b || a)),
  };
}

// Tarihin dönemi: '1. dönem' / '2. dönem'.
export const donemOf = (d) => (isoDay(d) < yilVerisi(ilkYil(d)).tarihler.donem2_basi ? '1. dönem' : '2. dönem');
export const takvimYaklasikMi = (d = new Date()) => yilVerisi(ilkYil(d)).yaklasik;
export const trTarih = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
