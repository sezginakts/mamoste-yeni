// BİR KERELİK: eski biçimli (v1: {OGRETMEN}, {OGRENCI1…40}) elle yapılmış evrakları yeni etiket düzenine çevirir
// → evrak-kaynak/sablonlar/<id>.docx + evrak-kaynak/katalog.json satırları.
// Kaynak: tahta-site/evrak/ altındaki sınav, ölçme, sınıf evrakları ve rehberlik dönem raporu (üreticileri make-evrak.py kayıp).
//   node tools/evrak/eski-donustur.mjs
// Kurallar: büyük harfli satırdaki etikete |buyuk; {OGRENCIn} satırları tek döngü satırına ({#ogrenciler}…{/ogrenciler});
// tek öğrencilik form ({OGRENCI}) → her öğrenciye bir sayfa ({#ogrenci_sayfalari} … {/ogrenci_sayfalari}).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const ESKI = path.join(ROOT, 'tahta-site/evrak');
const HEDEF = path.join(ROOT, 'evrak-kaynak');

const ADLAR = { OGRETMEN: 'ogretmen', OKUL: 'okul', IL: 'il', ILCE: 'ilce', MUDUR: 'mudur', MUDUR_YRD: 'mudur_yrd', DANISMAN: 'danisman', BRANS: 'brans', SINIF: 'sinif', TARIH: 'tarih', EGITIM_YILI: 'egitim_yili' };
// Eski listede "……" bırakılmış ama artık bilinen bilgiler (bilgi hücresinin solundaki başlığa göre).
const BASLIK_ETIKET = { 'Sınıf mevcudu': '{ogrenci_sayisi}', 'Dönem': '{donem}' };
const GUN = {
  'not-cizelgesi': ['@donem1_sonu-5', '@ders_sonu-5'],
  'sinif-ogrenci-listesi': ['09-18', '02-12'],
  'oturma-plani': ['09-18', '02-12'],
  'nobet-listesi': 'ay-basi',
  'ogrenci-tanima': '09-25',
  'ders-kesim': '@ders_sonu-5',
  'rehberlik-donem-raporu': ['@donem1_sonu', '@ders_sonu'],
};
const DONUSECEK = (e) => /^(sinav|olcme|sinif)\//.test(e.dosya) || e.id === 'rehberlik-donem-raporu';

const metinOf = (xml) => [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');
const buyukMu = (t) => /\p{L}/u.test(t) && t === t.toLocaleUpperCase('tr');

// Paragraf içindeki eski etiketleri yenisine çevirir; etiketin bölündüğü durum için paragraf metni ilk w:t'ye toplanır.
function paragrafCevir(para, ozel) {
  const parts = [...para.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)];
  if (!parts.length) return para;
  const metin = parts.map((m) => m[1]).join('');
  if (!/\{[A-Z_0-9]+\}/.test(metin)) return para;
  const geri = metin.replace(/\{[A-Z_0-9]+\}/g, '');
  const buyuk = buyukMu(geri);
  const yeni = metin.replace(/\{([A-Z_0-9]+)\}/g, (_, k) => {
    if (ozel[k]) return ozel[k];
    if (!ADLAR[k]) throw new Error(`eşlenmeyen etiket {${k}}`);
    return `{${ADLAR[k]}${buyuk ? '|buyuk' : ''}}`;
  });
  let i = 0;
  return para.replace(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g, () => (i++ === 0 ? `<w:t xml:space="preserve">${yeni}</w:t>` : '<w:t></w:t>'));
}
const hucreler = (tr) => [...tr.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((m) => m[0]);
// Hücrenin ilk w:t'sine yazı koy (yoksa ilk boş run'a ekle).
function hucreYaz(tc, yazi, sona = false) {
  if (/<w:t(?: [^>]*)?>/.test(tc)) {
    if (sona) {
      const son = tc.lastIndexOf('</w:t>');
      return tc.slice(0, son) + yazi + tc.slice(son);
    }
    return tc.replace(/(<w:t(?: [^>]*)?>)/, `$1${yazi}`);
  }
  return tc.replace(/<w:r><\/w:r>|<w:r\/>(?![\s\S]*<w:r\/>)/, `<w:r><w:t xml:space="preserve">${yazi}</w:t></w:r>`);
}

function cevir(xml, id) {
  // 1) Öğrenci satırları → tek döngü satırı
  xml = xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, (tbl) => {
    const satirlar = [...tbl.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
    const ogr = satirlar.filter((r) => /\{OGRENCI\d+\}/.test(metinOf(r)));
    if (!ogr.length) return tbl;
    const ilk = ogr[0];
    const baslik = satirlar[satirlar.indexOf(ilk) - 1];
    const ilkBaslik = baslik ? metinOf(hucreler(baslik)[0]).trim() : '';
    let tcs = hucreler(ilk);
    const ilkSutun = /^no$/i.test(ilkBaslik) ? '{no}' : '{sira}';
    tcs = tcs.map((tc, i) => {
      let t = tc;
      const yazi = metinOf(tc);
      if (/\{OGRENCI\d+\}/.test(yazi)) t = t.replace(/\{OGRENCI\d+\}/, '{ad}');
      else if (i === 0 && /^\d+$/.test(yazi.trim())) t = t.replace(/(<w:t(?: [^>]*)?>)\d+(<\/w:t>)/, `$1${ilkSutun}$2`);
      else if (id === 'nobet-listesi' && i === 2) t = hucreYaz(t, '{nobet}');
      return t;
    });
    tcs[0] = hucreYaz(tcs[0], '{#ogrenciler}');
    tcs[tcs.length - 1] = hucreYaz(tcs[tcs.length - 1], '{/ogrenciler}', true);
    let k = 0;
    const yeniSatir = ilk.replace(/<w:tc>[\s\S]*?<\/w:tc>/g, () => tcs[k++]);
    let ilkGecti = false;
    return tbl.replace(/<w:tr[ >][\s\S]*?<\/w:tr>/g, (r) => {
      if (!ogr.includes(r)) return r;
      if (ilkGecti) return '';
      ilkGecti = true;
      return yeniSatir;
    });
  });
  // 2) Bilgi tablosunda "……" kalan ama artık bilinen hücreler
  xml = xml.replace(/<w:tr[ >][\s\S]*?<\/w:tr>/g, (tr) => {
    const tcs = hucreler(tr);
    if (tcs.length !== 2) return tr;
    const sol = metinOf(tcs[0]).trim();
    if (!BASLIK_ETIKET[sol] || metinOf(tcs[1]).trim() !== '……') return tr;
    return tr.replace(tcs[1], tcs[1].replace('……', BASLIK_ETIKET[sol]));
  });
  // 3) Tek öğrencilik form: her öğrenciye bir sayfa
  const tekOgrenci = /\{OGRENCI\}/.test(metinOf(xml));
  xml = xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (p) => paragrafCevir(p, { OGRENCI: '{ad}' }));
  if (tekOgrenci) {
    const govde = xml.indexOf('<w:body>') + '<w:body>'.length;
    const son = xml.lastIndexOf('<w:sectPr');
    xml =
      xml.slice(0, govde) +
      '<w:p><w:r><w:t>{#ogrenci_sayfalari}</w:t></w:r></w:p>' +
      xml.slice(govde, son) +
      '<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:r><w:t>{/ogrenci_sayfalari}</w:t></w:r></w:p>' +
      xml.slice(son);
  }
  const kalan = metinOf(xml).match(/\{[A-Z_0-9]+\}/g);
  if (kalan) throw new Error(`${id}: çevrilmemiş etiket ${kalan.join(' ')}`);
  return { xml, tekOgrenci };
}

const liste = JSON.parse(fs.readFileSync(path.join(ESKI, 'liste.json'), 'utf8')).evraklar.filter(DONUSECEK);
fs.mkdirSync(path.join(HEDEF, 'sablonlar'), { recursive: true });
const katalogYolu = path.join(HEDEF, 'katalog.json');
const katalog = fs.existsSync(katalogYolu) ? JSON.parse(fs.readFileSync(katalogYolu, 'utf8')) : { evraklar: [] };
for (const e of liste) {
  const zip = await JSZip.loadAsync(fs.readFileSync(path.join(ESKI, e.dosya)));
  const { xml, tekOgrenci } = cevir(await zip.file('word/document.xml').async('string'), e.id);
  zip.file('word/document.xml', xml);
  const dosya = `sablonlar/${e.id}.docx`;
  fs.writeFileSync(path.join(HEDEF, dosya), await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  const satir = { id: e.id, kategori: e.kategori, ad: e.ad, donem: e.donem, dosya, gun: GUN[e.id] ?? null };
  const i = katalog.evraklar.findIndex((x) => x.id === e.id);
  if (i >= 0) katalog.evraklar[i] = { ...katalog.evraklar[i], ...satir };
  else katalog.evraklar.push(satir);
  console.log(`${e.id.padEnd(24)} ${tekOgrenci ? 'öğrenci başına sayfa' : ''}`);
}
fs.writeFileSync(katalogYolu, JSON.stringify(katalog, null, 2) + '\n');
