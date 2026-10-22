// Öğrenci listesi ayıklayıcı: Excel / CSV / Word tablosu ya da yapıştırılan metinden {no, nk} listesi çıkarır.
// Tamamen cihazda çalışır. Başlık satırı ("Öğrenci No", "Adı", "Soyadı"...) varsa onu kullanır,
// yoksa sütunları içeriğe bakarak tahmin eder (sayı sütunu = numara, harf sütunları = ad soyad).

const NO_HEADER = /^(okul|öğrenci|ogrenci|öğr\.?)\s*(no|numaras[ıi]|numara)$|^(no|numara|numaras[ıi]|nu)$/i;
const ORDER_HEADER = /^(s\.?\s*no|s[ıi]ra(\s*no)?|#)$/i;
const FULLNAME_HEADER = /^(ad[ıi]?\s*(ve\s*)?soyad[ıi]?|ad\s*-\s*soyad|isim(\s*soyisim)?|öğrenci(nin)?\s*(ad[ıi]?|ad[ıi]\s*soyad[ıi]))$/i;
const FIRST_HEADER = /^(ad[ıi]?|isim|öğrenci(nin)?\s*ad[ıi])$/i;
const LAST_HEADER = /^(soyad[ıi]?|soyisim|öğrenci(nin)?\s*soyad[ıi])$/i;
// Başlık/alt bilgi gibi görünen satırlar (isim değil).
const NOISE = /(s[ıi]n[ıi]f|liste|okul|müdür|mudur|tarih|sayfa|toplam|şube|sube|öğretmen|ogretmen|imza|e-?okul)/i;

const NAME_RE = /^[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛûÄäËëÏïÔôŒœ'’.\- ]+$/;
const INT_RE = /^\d{1,6}$/;

const clean = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

// Türkçe büyük/küçük harf: "ALİ KAYA" -> "Ali Kaya", "IŞIK" -> "Işık".
function trLower(s) {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}
function trUpperFirst(w) {
  if (!w) return w;
  const f = w[0] === 'i' ? 'İ' : w[0] === 'ı' ? 'I' : w[0].toUpperCase();
  return f + w.slice(1);
}
export function tidyName(s) {
  s = clean(s);
  if (!s) return '';
  // Zaten karışık yazılmışsa (Ali Kaya) dokunma; tamamı büyük/küçükse düzelt.
  const hasLower = /[a-zçğıöşü]/.test(s);
  const hasUpper = /[A-ZÇĞİÖŞÜ]/.test(s);
  if (hasLower && hasUpper) return s;
  return trLower(s)
    .split(' ')
    .map((w) => w.split('-').map(trUpperFirst).join('-'))
    .join(' ');
}

// "Ali Can Kaya" -> "Ali Can K."
export function shortenSurname(name) {
  const parts = clean(name).split(' ');
  if (parts.length < 2) return clean(name);
  const last = parts.pop();
  return `${parts.join(' ')} ${last[0].toLocaleUpperCase('tr')}.`;
}

// Yapıştırılan metni tablo satırlarına çevir.
export function textToRows(text) {
  const rows = [];
  String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      // "1-32" -> numara aralığı
      const range = line.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (range) {
        const a = +range[1];
        const b = Math.min(+range[2], a + 500);
        for (let i = a; i <= b; i++) rows.push([String(i), '']);
        return;
      }
      let cells;
      if (/\t/.test(line)) cells = line.split('\t');
      else if (/[;|]/.test(line)) cells = line.split(/[;|]/);
      else if ((line.match(/,/g) || []).length >= 2) cells = line.split(',');
      else if (/\S\s{2,}\S/.test(line)) cells = line.split(/\s{2,}/);
      else {
        // "14 Ali Kaya", "14. Ali Kaya", "14) Ali", "Ali Kaya 14", "Ali Kaya, 14"
        const lead = line.match(/^(\d{1,6})(?:\s*[.)\-:]\s*|\s+)(.+)$/);
        const trail = line.match(/^(.+?)[\s,]+(\d{1,6})$/);
        if (lead) cells = [lead[1], lead[2]];
        else if (trail) cells = [trail[2], trail[1]];
        else if (INT_RE.test(line)) cells = [line, ''];
        else cells = ['', line];
      }
      rows.push(cells.map(clean));
    });
  return rows;
}

function findHeader(rows) {
  const limit = Math.min(rows.length, 20);
  for (let r = 0; r < limit; r++) {
    const cells = rows[r].map((c) => clean(c).replace(/[:*]$/, ''));
    const cols = { no: -1, order: -1, full: -1, first: -1, last: -1 };
    cells.forEach((c, i) => {
      if (!c) return;
      if (cols.no < 0 && NO_HEADER.test(c)) cols.no = i;
      else if (cols.order < 0 && ORDER_HEADER.test(c)) cols.order = i;
      else if (cols.full < 0 && FULLNAME_HEADER.test(c)) cols.full = i;
      else if (cols.first < 0 && FIRST_HEADER.test(c)) cols.first = i;
      else if (cols.last < 0 && LAST_HEADER.test(c)) cols.last = i;
    });
    const hasName = cols.full >= 0 || cols.first >= 0;
    if (hasName || (cols.no >= 0 && (cols.last >= 0 || cols.order >= 0))) return { row: r, cols };
  }
  return null;
}

// Başlık yoksa: sütunların içeriğine bak.
function guessColumns(rows) {
  const width = Math.max(...rows.map((r) => r.length));
  const info = [];
  for (let i = 0; i < width; i++) {
    const vals = rows.map((r) => clean(r[i])).filter(Boolean);
    const ints = vals.filter((v) => INT_RE.test(v));
    const names = vals.filter((v) => NAME_RE.test(v) && /[A-Za-zÇĞİÖŞÜçğıöşü]{2}/.test(v));
    const distinct = new Set(vals.map((v) => v.toLowerCase())).size;
    // Sıra no mu? (1,2,3,... satır sırasıyla artıyor)
    let sequential = 0;
    for (let k = 1; k < ints.length; k++) if (+ints[k] === +ints[k - 1] + 1) sequential++;
    info.push({
      i,
      n: vals.length,
      intRatio: vals.length ? ints.length / vals.length : 0,
      nameRatio: vals.length ? names.length / vals.length : 0,
      distinctRatio: vals.length ? distinct / vals.length : 0,
      seqRatio: ints.length > 1 ? sequential / (ints.length - 1) : 0,
      maxInt: ints.length ? Math.max(...ints.map(Number)) : 0,
    });
  }
  const total = rows.length;
  const intCols = info.filter((c) => c.intRatio > 0.7 && c.n >= total * 0.5);
  // İki sayı sütunu varsa (sıra no + okul no) sıralı olmayanı / büyük değerliyi numara say.
  intCols.sort((a, b) => a.seqRatio - b.seqRatio || b.maxInt - a.maxInt);
  const noCol = intCols.length ? intCols[0].i : -1;
  // Ad sütunları: harf ağırlıklı ve çeşitli (Cinsiyet "Erkek/Kız" gibi sütunlar elenir).
  const nameCols = info
    .filter((c) => c.i !== noCol && c.nameRatio > 0.6 && c.distinctRatio > 0.5 && c.n >= total * 0.5)
    .map((c) => c.i)
    .slice(0, 2);
  return { no: noCol, order: -1, full: nameCols.length === 1 ? nameCols[0] : -1, first: nameCols.length > 1 ? nameCols[0] : -1, last: nameCols.length > 1 ? nameCols[1] : -1 };
}

// rows: string[][] -> { students: [{ no, nk }], skipped, usedHeader }
export function parseRosterRows(rawRows) {
  const rows = (rawRows || []).map((r) => (Array.isArray(r) ? r : [r]).map(clean)).filter((r) => r.some(Boolean));
  if (!rows.length) return { students: [], skipped: 0, usedHeader: false };

  const header = findHeader(rows);
  const cols = header ? header.cols : guessColumns(rows);
  const body = header ? rows.slice(header.row + 1) : rows;
  // Başlıkta okul no yoksa sıra no'yu numara olarak kullan.
  const noCol = cols.no >= 0 ? cols.no : cols.order;

  const students = [];
  let skipped = 0;
  body.forEach((r) => {
    let no = noCol >= 0 ? clean(r[noCol]) : '';
    let name = '';
    if (cols.full >= 0) name = r[cols.full];
    else if (cols.first >= 0 || cols.last >= 0) name = [cols.first >= 0 ? r[cols.first] : '', cols.last >= 0 ? r[cols.last] : ''].join(' ');
    name = clean(name);

    // Numara hücresi "14 Ali" gibi birleşikse ayır.
    if (no && !INT_RE.test(no)) {
      const m = no.match(/^(\d{1,6})\b\s*(.*)$/);
      if (m) {
        no = m[1];
        if (!name) name = m[2];
      } else no = '';
    }
    if (!no && !name) return;
    if (name && (!NAME_RE.test(name) || NOISE.test(name))) {
      skipped++;
      return;
    }
    if (!name && !no) return;
    students.push({ no, nk: tidyName(name) });
  });

  return { students, skipped, usedHeader: !!header };
}

// Önizleme için: numarası olmayanlara sıradaki boş numarayı ver, numaraya göre sırala, çakışmaları işaretle.
// existingNos: sınıfta zaten olan numaralar.
export function prepareRoster(students, existingNos = []) {
  const existing = new Set(existingNos.map(String));
  const used = new Set([...existing, ...students.map((s) => s.no).filter(Boolean)]);
  let next = 1;
  const nextFree = () => {
    while (used.has(String(next))) next++;
    used.add(String(next));
    return String(next);
  };
  const seen = new Map();
  const out = students.map((s, idx) => {
    const no = s.no || nextFree();
    return { key: `${idx}-${no}`, no, nk: s.nk, autoNo: !s.no };
  });
  out.sort((a, b) => (parseInt(a.no, 10) || 0) - (parseInt(b.no, 10) || 0) || a.nk.localeCompare(b.nk, 'tr'));
  return out.map((s) => {
    let status = 'new';
    if (existing.has(String(s.no))) status = 'exists';
    else if (seen.has(s.no)) status = 'dup';
    seen.set(s.no, true);
    return { ...s, status };
  });
}
