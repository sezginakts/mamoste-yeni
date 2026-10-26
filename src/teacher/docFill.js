// Evrak şablonu (Word .docx) doldurma — cihazda, JSZip ile.
// Yer tutucular: {OGRETMEN} {OKUL} {IL} {ILCE} {MUDUR} {MUDUR_YRD} {DANISMAN} {BRANS} {SINIF} {TARIH} {EGITIM_YILI}
// Öğrenci: {OGRENCI} (tek öğrenci — ilk isim), {OGRENCI1} … {OGRENCI40} (sıralı liste: form tablolarındaki ad hücreleri),
//          {OGRENCILER} (tek satırda virgüllü liste; eski şablonlar için korunur).
// Word bir yazıyı çoğu zaman birkaç parçaya (w:t) böler ("{OGR" + "ETMEN}"); bu yüzden her paragrafın parçaları birleştirilip
// aranır. Yer tutucu bulunan paragrafta yazı ilk parçaya toplanır (o paragrafın içindeki biçim farkları — ör. yarısı kalın — tek biçime iner).
// Boş bilgi "……" olur; öğretmen dosyada elle doldurur. Tamamen büyük harfli satırda bilgi de büyük harfe çevrilir.
import JSZip from 'jszip';

// Satır satır öğrenci adı için kaç yer tutucu destekleniyor.
export const OGRENCI_SAYI = 40;
const OGRENCI_KODLARI = Array.from({ length: OGRENCI_SAYI }, (_, i) => `OGRENCI${i + 1}`);
export const PLACEHOLDERS = [
  ...OGRENCI_KODLARI,
  'OGRENCILER', 'OGRENCI',
  'OGRETMEN', 'OKUL', 'IL', 'ILCE', 'MUDUR', 'MUDUR_YRD', 'DANISMAN', 'BRANS', 'SINIF', 'TARIH', 'EGITIM_YILI',
];
const PH_RE = new RegExp(`\\{(${PLACEHOLDERS.join('|')})\\}`, 'g');

const xmlEsc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const xmlUnesc = (t) => String(t).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// Eylülden itibaren yeni eğitim yılı: Ekim 2026 → "2026-2027", Mart 2027 → "2026-2027".
export function schoolYear(d = new Date()) {
  const y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
}
export const trDate = (d = new Date()) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

export function fillXml(xml, values) {
  const val = (k) => {
    const v = values[k];
    return v && String(v).trim() ? String(v).trim() : '……';
  };
  return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (para) => {
    const parts = [...para.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)];
    if (!parts.length) return para;
    const joined = parts.map((m) => xmlUnesc(m[1])).join('');
    if (!PH_RE.test(joined)) return para;
    PH_RE.lastIndex = 0;
    // Başlık gibi tamamen büyük harfli satıra yazılan bilgi de büyük harf olsun ("ÇANKAYA KAYMAKAMLIĞI").
    const rest = joined.replace(PH_RE, '');
    const upper = /\p{L}/u.test(rest) && rest === rest.toLocaleUpperCase('tr');
    const text = joined.replace(PH_RE, (_, k) => (upper ? val(k).toLocaleUpperCase('tr') : val(k)));
    let i = 0;
    return para.replace(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g, () => (i++ === 0 ? `<w:t xml:space="preserve">${xmlEsc(text)}</w:t>` : '<w:t></w:t>'));
  });
}

// bytes: Uint8Array | ArrayBuffer (şablon). Döner: Uint8Array (doldurulmuş .docx).
export async function fillDocx(bytes, values) {
  const zip = await JSZip.loadAsync(bytes);
  const parts = Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n));
  for (const n of parts) {
    const xml = await zip.file(n).async('string');
    zip.file(n, fillXml(xml, values));
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
