// Evrak yayın hattı — TEK komut:  node tools/evrak/yayinla.mjs          (denetle + tahta-site/evrak/v3/ + liste3.json yaz)
//                                 node tools/evrak/yayinla.mjs --kontrol (yalnız denetle, hiçbir şey yazma)
// Şablon kaynakları:
//   1) tools/evrak/sablon.mjs → uret()            (kodla üretilen tutanaklar, kulüp, yıllık plan)
//   2) evrak-kaynak/katalog.json + sablonlar/*.docx (Word'de hazırlanmış / dışarıdan gelip etiketlenmiş şablonlar)
// Denetim (biri bile hatalıysa HİÇBİR ŞEY yazılmaz):
//   - her etiket src/teacher/evrak/sozluk.js'te var, döngüler doğru kapanıyor, tarih kuralları geçerli
//   - şablon örnek bir okul / sınıf (35 öğrenci) / kulüp / planla dolduruluyor: içinde etiket kalmıyor ve bilgisi verilen
//     hiçbir alan "……" olmuyor (şablondaki elle doldurulacak "……" sayısı değişmemeli); boş bilgiyle de hatasız doluyor
// Liste satırının `tarih`i (YENİ etiketi) yalnız şablonun içeriği değişince güncellenir.
// Yayın: cd tahta-site && git add -A && git commit -m … && git push
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { uret } from './sablon.mjs';
import { doldur, sablonMetni } from '../../src/teacher/evrak/motor.js';
import { ETIKETLER, etiketleriAyikla, isterler } from '../../src/teacher/evrak/sozluk.js';
import { evrakVerisi } from '../../src/teacher/evrak/baglam.js';
import { kuralTarihi } from '../../src/teacher/evrak/takvim.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const KAYNAK = path.join(ROOT, 'evrak-kaynak');
const YAYIN = path.join(ROOT, 'tahta-site/evrak');
const KLASOR = 'v3';
const LISTE = 'liste3.json';
const KONTROL = process.argv.includes('--kontrol');
// Ekrandaki başlıklar (docs.js → CATEGORIES ile aynı sıra): sok = ŞÖK ve yıllık plan; sinif = veli toplantısı, sınıf rehberlik dahil
const KATEGORILER = ['zumre', 'sok', 'sinav', 'olcme', 'kulup', 'sinif', 'bep'];

// ---------- örnek veri ----------
const ADLAR = ['Ali Yılmaz', 'Ayşe Kaya', 'Mehmet Demir', 'Zeynep Çelik', 'Emre Şahin', 'Elif Öztürk', 'Can Aydın', 'Ece Arslan', 'Burak Doğan', 'İrem Koç'];
const ogrenciler = Array.from({ length: 35 }, (_, i) => ({ no: String(100 + i * 3), ad: `${ADLAR[i % 10]} ${i + 1}` }));
const mebPlan = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/yearPlans/ingilizce.json'), 'utf8'))[6];
const TARIH = new Date(2026, 9, 29, 12);
const tamVeri = evrakVerisi({
  tarih: TARIH,
  brans: 'İngilizce',
  profil: { ad: 'Deneme Öğretmen', okul: 'Atatürk Ortaokulu', il: 'Ankara', ilce: 'Çankaya', mudur: 'Müdür Bey', mudurYrd: 'Yardımcı Hanım', rehber: 'Rehber Bey', zumre: 'Zümre Bir, Zümre İki', zumreBaskani: 'Zümre Bir' },
  sinif: { ad: '6-A', danisman: 'Danışman Hanım', ogrenciler, haftalikSaat: 3, plan: mebPlan, secili: ogrenciler[4] },
  duzey: { duzey: 6, weeks: mebPlan, kaynak: 'MEB 2026-2027 çerçeve yıllık planı' },
  kulup: { ad: 'Satranç Kulübü', baskan: 'Ayşe Kaya 2', danisman: '', uyeler: ogrenciler.slice(0, 12).map((o) => ({ ...o, sinif: '6-A' })) },
});
const bosVeri = evrakVerisi({ tarih: TARIH, brans: 'İngilizce', profil: {} });

// ---------- yardımcılar ----------
const duzMetin = (bytes) => sablonMetni(bytes);
const ozet = (bytes) => crypto.createHash('sha1').update(duzMetin(bytes)).digest('hex').slice(0, 12);
const sayi = (t, s) => t.split(s).length - 1;
const IZ = '⟦BOŞ⟧';

function denetle({ meta, bytes }) {
  const hatalar = [];
  const metin = duzMetin(bytes);
  const { etiketler, hatalar: eh } = etiketleriAyikla(metin);
  hatalar.push(...eh);
  if (!KATEGORILER.includes(meta.kategori)) hatalar.push(`bilinmeyen kategori ${meta.kategori}`);
  for (const k of [].concat(meta.gun ?? [])) {
    try {
      kuralTarihi(k, TARIH);
    } catch (e) {
      hatalar.push(e.message);
    }
  }
  for (const m of metin.matchAll(/\{gun:([^}]*)\}/g)) {
    try {
      kuralTarihi(m[1].trim(), TARIH, true);
    } catch (e) {
      hatalar.push(e.message);
    }
  }
  if (!hatalar.length) {
    try {
      const dolu = duzMetin(doldur(bytes, tamVeri, { bos: IZ }));
      const kalan = dolu.match(/\{[^{}]*\}/g);
      if (kalan) hatalar.push(`doldurduktan sonra kalan etiket: ${[...new Set(kalan)].join(' ')}`);
      // Bilgisi verildiği halde boş kalan etiket (bağlamda karşılığı yok) → işaret görünür.
      if (dolu.includes(IZ)) hatalar.push(`tam veriyle ${sayi(dolu, IZ)} etiket boş kaldı`);
      doldur(bytes, bosVeri);
    } catch (e) {
      hatalar.push(e.message);
    }
  }
  return { etiketler, hatalar };
}

// ---------- topla ----------
const sablonlar = (await uret()).map((x) => ({ ...x, kaynak: 'sablon.mjs' }));
const katalog = JSON.parse(fs.readFileSync(path.join(KAYNAK, 'katalog.json'), 'utf8')).evraklar;
for (const e of katalog) {
  const dosya = path.join(KAYNAK, e.dosya);
  if (!fs.existsSync(dosya)) {
    console.error(`✗ ${e.id}: dosya yok (${e.dosya})`);
    process.exitCode = 1;
    continue;
  }
  const { dosya: _, ...meta } = e;
  sablonlar.push({ meta: { ...meta, gun: e.gun ?? null }, bytes: fs.readFileSync(dosya), kaynak: e.dosya });
}
const idler = new Map();
for (const s of sablonlar) {
  if (idler.has(s.meta.id)) {
    console.error(`✗ ${s.meta.id}: aynı kimlik iki kez (${idler.get(s.meta.id)} / ${s.kaynak})`);
    process.exitCode = 1;
  }
  idler.set(s.meta.id, s.kaynak);
}

// ---------- denetle ----------
const onceki = (() => {
  try {
    return Object.fromEntries(JSON.parse(fs.readFileSync(path.join(YAYIN, LISTE), 'utf8')).evraklar.map((e) => [e.id, e]));
  } catch (e) {
    return {};
  }
})();
const bugun = new Date().toISOString().slice(0, 10);
const satirlar = [];
for (const s of sablonlar) {
  const { etiketler, hatalar } = denetle(s);
  if (hatalar.length) {
    console.error(`✗ ${s.meta.id} (${s.kaynak})\n   - ${hatalar.join('\n   - ')}`);
    process.exitCode = 1;
    continue;
  }
  const iz = ozet(s.bytes);
  const eski = onceki[s.meta.id];
  satirlar.push({
    ...s.meta,
    brans: s.meta.brans ?? null,
    dosya: `${KLASOR}/${s.meta.id}.docx`,
    tarih: eski && eski.iz === iz ? eski.tarih : bugun,
    iz,
    etiketler,
    ister: isterler(etiketler),
    surum: 3,
  });
}
const sira = (r) => KATEGORILER.indexOf(r.kategori);
satirlar.sort((a, b) => sira(a) - sira(b));

if (process.exitCode) {
  console.error('\nDenetim geçmedi — hiçbir şey yazılmadı.');
  process.exit();
}
const ozetSatir = KATEGORILER.map((k) => `${k} ${satirlar.filter((r) => r.kategori === k).length}`).join(' · ');
if (KONTROL) {
  console.log(`✓ ${satirlar.length} şablon denetimden geçti (${ozetSatir}). --kontrol: yazılmadı.`);
  process.exit();
}

// ---------- yaz ----------
const hedef = path.join(YAYIN, KLASOR);
fs.rmSync(hedef, { recursive: true, force: true });
fs.mkdirSync(hedef, { recursive: true });
for (const s of sablonlar) fs.writeFileSync(path.join(hedef, `${s.meta.id}.docx`), s.bytes);
fs.writeFileSync(path.join(YAYIN, LISTE), JSON.stringify({ surum: 3, guncelleme: bugun, evraklar: satirlar }, null, 2) + '\n');
console.log(`✓ ${satirlar.length} şablon → tahta-site/evrak/${KLASOR}/ + ${LISTE} (${ozetSatir})`);
console.log(`  Kullanılmayan etiketler: ${Object.keys(ETIKETLER).filter((e) => !satirlar.some((r) => r.etiketler.includes(e))).join(', ') || 'yok'}`);
console.log('  Yayın: cd tahta-site && git add -A && git commit -m "Evrak şablonları" && git push');
