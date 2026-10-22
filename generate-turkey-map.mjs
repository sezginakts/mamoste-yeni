// Türkiye haritası verisini üretir → src/data/turkeyMap.js (SVG path'leri, uygulama içinde ağ gerekmez).
// Kaynak: Natural Earth 1:10m (kamu malı / public domain), GeoJSON sürümü:
//   https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
//   ne_10m_admin_1_states_provinces, ne_10m_admin_0_countries, ne_10m_lakes,
//   ne_10m_rivers_lake_centerlines, ne_10m_rivers_europe
// Kullanım: node generate-turkey-map.mjs <geojson klasörü>
import fs from 'fs';
import path from 'path';

const DIR = process.argv[2];
if (!DIR) throw new Error('Kullanım: node generate-turkey-map.mjs <natural-earth geojson klasörü>');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f + '.geojson'), 'utf8')).features;

// Projeksiyon: eşdikdörtgen, 39° enlemde boylam düzeltmesi. 1 birim ≈ 1.1 km.
export const BOX = { lon0: 25.4, lon1: 45.2, lat0: 35.6, lat1: 42.4 };
const K = Math.cos((39 * Math.PI) / 180);
const S = 100;
const px = ([lon, lat]) => [Math.round((lon - BOX.lon0) * K * S), Math.round((BOX.lat1 - lat) * S)];
const W = Math.round((BOX.lon1 - BOX.lon0) * K * S);
const H = Math.round((BOX.lat1 - BOX.lat0) * S);

// Douglas-Peucker (piksel cinsinden tolerans)
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let max = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > max) (max = d), (idx = i);
    }
    if (max > tol) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
const dedupe = (pts) => pts.filter((p, i) => !i || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
const ringD = (ring, tol, closed) => {
  let pts = dedupe(ring.map(px));
  if (closed) {
    // Kapalı halka: başı=sonu olduğundan en uzak noktadan ikiye bölüp ayrı sadeleştir.
    if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
    let far = 0;
    let best = -1;
    pts.forEach((q, i) => {
      const d = Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]);
      if (d > best) (best = d), (far = i);
    });
    pts = [...simplify(pts.slice(0, far + 1), tol), ...simplify([...pts.slice(far), pts[0]], tol).slice(1, -1)];
  } else pts = simplify(pts, tol);
  if (pts.length < (closed ? 3 : 2)) return '';
  return 'M' + pts.map((p) => p.join(' ')).join('L') + (closed ? 'Z' : '');
};
const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
const lines = (g) => (g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []);
const near = (ring, pad = 1.5) => ring.some(([lon, lat]) => lon > BOX.lon0 - pad && lon < BOX.lon1 + pad && lat > BOX.lat0 - pad && lat < BOX.lat1 + pad);
const polyD = (g, tol, minArea = 0) =>
  polys(g)
    .filter((p) => near(p[0]))
    .map((p) => ringD(p[0], tol, true))
    .filter((d) => d && (!minArea || d.split('L').length > 3))
    .join('');

// ---- İller (Natural Earth adları ASCII'ye yakın; doğru Türkçe yazımla eşleştir)
const IL = 'Adana Adıyaman Afyonkarahisar Ağrı Aksaray Amasya Ankara Antalya Ardahan Artvin Aydın Balıkesir Bartın Batman Bayburt Bilecik Bingöl Bitlis Bolu Burdur Bursa Çanakkale Çankırı Çorum Denizli Diyarbakır Düzce Edirne Elazığ Erzincan Erzurum Eskişehir Gaziantep Giresun Gümüşhane Hakkari Hatay Iğdır Isparta İstanbul İzmir Kahramanmaraş Karabük Karaman Kars Kastamonu Kayseri Kilis Kırıkkale Kırklareli Kırşehir Kocaeli Konya Kütahya Malatya Manisa Mardin Mersin Muğla Muş Nevşehir Niğde Ordu Osmaniye Rize Sakarya Samsun Şanlıurfa Siirt Sinop Şırnak Sivas Tekirdağ Tokat Trabzon Tunceli Uşak Van Yalova Yozgat Zonguldak'.split(' ');
const norm = (s) =>
  String(s || '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z]/g, '');
const IL_BY = Object.fromEntries(IL.map((n) => [norm(n), n]));
const ALIAS = { kinkkale: 'Kırıkkale', icel: 'Mersin', afyon: 'Afyonkarahisar', kmaras: 'Kahramanmaraş', sanliurfa: 'Şanlıurfa', urfa: 'Şanlıurfa', zinguldak: 'Zonguldak' };
const provinces = read('ne_10m_admin_1_states_provinces')
  .filter((f) => f.properties.adm0_a3 === 'TUR')
  .map((f) => {
    const p = f.properties;
    const name = [p.name, p.name_tr, p.name_en, p.name_alt, p.woe_name].map(norm).map((k) => IL_BY[k] || ALIAS[k]).find(Boolean);
    if (!name) throw new Error('İl eşleşmedi: ' + p.name);
    return { name, d: polyD(f.geometry, 1.2) };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
if (provinces.length !== 81 || new Set(provinces.map((p) => p.name)).size !== 81) throw new Error('81 il bekleniyordu');

// ---- Komşu ülkeler (soluk zemin)
const neighbors = read('ne_10m_admin_0_countries')
  .filter((f) => ['GRC', 'BGR', 'GEO', 'ARM', 'AZE', 'IRN', 'IRQ', 'SYR', 'CYP', 'RUS', 'UKR', 'ROU', 'MKD', 'LBN', 'ISR', 'JOR', 'EGY', 'CYN', 'PSX'].includes(f.properties.ADM0_A3))
  .map((f) => polyD(f.geometry, 2.5, true))
  .filter(Boolean);

// ---- Göller
const LAKES = { 'Lake Van': 'van', 'Lake Tuz': 'tuz', Beyşehir: 'beysehir', Eğirdir: 'egirdir', 'Ataturk Barajt': 'ataturk', 'Keban Baraji': 'keban' };
const lakes = {};
for (const f of read('ne_10m_lakes')) {
  const id = LAKES[f.properties.name];
  if (id) lakes[id] = polyD(f.geometry, 0.8);
}
if (Object.keys(lakes).length !== 6) throw new Error('Göller eksik: ' + Object.keys(lakes));

// ---- Akarsular: önce ayrıntılı Avrupa katmanı, yoksa genel katman
const RIVERS = {
  kizilirmak: /^kiz.?l.?rmak$/,
  yesilirmak: /^ye.?ilirmak$/,
  sakarya: /^sakarya$/,
  firat: /^(firat|alfurat|euphrates)$/,
  dicle: /^(dicle|tigris)$/,
  buyukmenderes: /^(buyukmenderes|bykmenderes)$/,
  kucukmenderes: /^kucukmenderes$/,
  gediz: /^gediz$/,
  seyhan: /^seyhan$/,
  ceyhan: /^ceyhan$/,
  coruh: /^coruh$/,
  aras: /^aras$/,
  meric: /^(evros|meric|maritsa)$/,
  susurluk: /^(susurluk|simav)$/, // Simav Çayı, Susurluk'un yukarı çığırı
  kelkit: /^kelkit$/,
  murat: /^murat$/,
  porsuk: /^porsuk$/,
  delice: /^delice$/,
};
const riverLayer = (f) =>
  read(f).filter((x) => x.geometry && lines(x.geometry).some((l) => near(l, 0)));
const layers = [riverLayer('ne_10m_rivers_europe'), riverLayer('ne_10m_rivers_lake_centerlines')];
const rivers = {};
for (const [id, re] of Object.entries(RIVERS)) {
  // İki katman da parça parça; ikisini birleştir (üst üste binen kısımlar çizimde fark etmez).
  rivers[id] = layers
    .flat()
    .filter((x) => [x.properties.name, x.properties.name_en, x.properties.name_tr].some((n) => re.test(norm(n))))
    .flatMap((x) => lines(x.geometry))
    .filter((l) => near(l, 0))
    .map((l) => ringD(l, 0.8, false))
    .filter(Boolean)
    .join('');
}
const missing = Object.keys(RIVERS).filter((k) => !rivers[k]);

const out = `// OTOMATİK ÜRETİLDİ — elle düzenleme. Üretici: generate-turkey-map.mjs
// Kaynak: Natural Earth 1:10m (public domain). Koordinatlar: eşdikdörtgen projeksiyon, 1 birim ≈ 1,1 km.
export const MAP_BOX = ${JSON.stringify({ ...BOX, k: K, s: S })};
export const MAP_W = ${W};
export const MAP_H = ${H};
export const PROVINCES = ${JSON.stringify(provinces)};
export const NEIGHBORS = ${JSON.stringify(neighbors)};
export const LAKE_PATHS = ${JSON.stringify(lakes)};
export const RIVER_PATHS = ${JSON.stringify(rivers)};
`;
fs.writeFileSync('src/data/turkeyMap.js', out);
console.log(`yazıldı: ${(out.length / 1024).toFixed(0)} KB · il ${provinces.length} · göl ${Object.keys(lakes).length} · akarsu ${Object.keys(rivers).length}` + (missing.length ? ` · bulunamayan: ${missing.join(', ')}` : ''));
