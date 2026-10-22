// Yıllık plan ayıklayıcı: öğretmenin internetten indirdiği Excel / Word yıllık planından haftaları çıkarır.
// Planlar birbirinden farklı: başlıklar Türkçe ya da İngilizce ("HAFTA" / "Week", "KAZANIMLAR" / "Learning Outcomes"),
// tarih hafta hücresinde ("1.HAFTA(14-20)", "1. Week 14-18 September") ya da ayrı sütunda olabilir.
// Önce başlıklara bakılır; başlık tanınmazsa sütunların İÇERİĞİNE bakılır.
// Her hafta: { start, end ('YYYY-MM-DD'), week, unit, topic, outcomes, functions, activities, notes, holiday }.
import { dayKey } from '../utils/helpers';

// Eşleştirme için harfleri sadeleştir: "ÖĞRENME ÇIKTILARI" -> "ogrenme ciktilari", "APRIL" -> "april".
const fold = (s) =>
  String(s == null ? '' : s)
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[âàá]/g, 'a').replace(/[îí]/g, 'i').replace(/[ûú]/g, 'u')
    .replace(/[ \t]+/g, ' ')
    .trim();

const MONTHS = {
  ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6, temmuz: 7, agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12,
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sept: 9, sep: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};
// Uzun adlar önce (sept < september eşleşmesin diye).
const MONTH_RE = `(?<![a-z])(${Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')})\\.?(?![a-z])`;
const DASH = '\\s*[-–—]+\\s*';

const clean = (v) => (v == null ? '' : String(v).replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim());
// Plan sitelerinin filigranları ("https://www.ingilizceciyiz.com/") içerikten atılır.
const stripUrls = (s) => clean(String(s || '').replace(/\b(https?:\/\/|www\.)\S+/gi, ''));
const pad = (n) => String(n).padStart(2, '0');
const key = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const fullYear = (y) => (y < 100 ? 2000 + y : y);

// Sütun rolleri — başlık metnine göre. Sıra önemli: bir hücre ilk eşleşen role gider.
const ROLES = [
  ['date', /tarih|\bdates?\b/],
  ['week', /hafta|\bweeks?\b/],
  ['month', /(^|\s)ay(lar)?$|\bmonths?\b/],
  ['hours', /saat|\bhours?\b|ders sayisi/],
  ['week2', /^sure$/],
  // Sosyal-duygusal beceriler, değerler, okuryazarlık sütunları gösterilmez.
  ['skip', /social|sosyal|duygusal|\bvalues\b|degerler|literacy|okuryazarlik|intercurricular|disiplinler/],
  ['outcomes', /ogrenme cikti|kazanim|ciktilar|hedef|outcome|objective|language skills|study skills|language tasks|\bskills\b/],
  ['functions', /function|islev|useful language|fonksiyon/],
  ['content', /content frame|icerik|konu cercevesi|vocabulary|kelime/],
  ['activities', /etkinlik|activit|tasks and assignments|suggested|context/],
  ['activities2', /ogrenme[- ]ogretme|uygulama|yontem|method|material|arac|gerec/],
  ['unit', /unite|tema|theme|\bunits?\b|topics?/],
  ['topic', /konu|subject/],
  ['notes', /aciklama|belirli gun|important days|celebration|kutlama|\bnotes?\b|remarks/],
  ['evaluation', /degerlendirme|evaluation|assessment|olcme/],
];

function detectColumns(row) {
  const cols = {};
  row.forEach((cell, i) => {
    const c = fold(cell);
    if (!c || c.length > 80) return;
    for (const [role, re] of ROLES) {
      if (re.test(c)) {
        if (cols[role] == null) cols[role] = i;
        break;
      }
    }
  });
  if (cols.activities == null && cols.activities2 != null) cols.activities = cols.activities2;
  if (cols.week == null && cols.week2 != null) cols.week = cols.week2;
  // Ayrı "belirli günler" sütunu yoksa "Değerlendirme" sütunu genelde belirli günleri taşır (eski planlar).
  if (cols.notes == null && cols.evaluation != null) {
    cols.notes = cols.evaluation;
    delete cols.evaluation;
  }
  // Öğrenme çıktısı birkaç beceri sütununa bölünmüşse (Türkçe: DİNLEME/İZLEME | KONUŞMA | OKUMA | YAZMA) hepsi alınır.
  if (cols.outcomes != null) {
    const extra = [];
    row.forEach((cell, i) => {
      if (i !== cols.outcomes && /^(dinleme|izleme|konusma|okuma|yazma)\b/.test(fold(cell))) extra.push(i);
    });
    if (extra.length) cols.outcomesExtra = extra;
  }
  delete cols.activities2;
  delete cols.week2;
  delete cols.skip;
  return cols;
}

const isHeaderLike = (cols) =>
  (cols.week != null || cols.date != null || cols.month != null) &&
  (cols.outcomes != null || cols.unit != null || cols.topic != null || cols.functions != null);

// Başlık tek satırda ya da iki-üç satıra bölünmüş olabilir (üstte "SÜRE", altında "AY | HAFTA | SAAT").
// Döner { row: başlığın son satırı, cols } ya da null.
function findHeader(rows) {
  const limit = Math.min(rows.length, 30);
  const mergedCols = (r, span) => {
    const width = Math.max(...rows.slice(r, r + span).map((x) => x.length));
    const merged = Array.from({ length: width }, (_, i) =>
      rows.slice(r, r + span).map((x) => x[i] || '').filter(Boolean).join(' ')
    );
    return detectColumns(merged);
  };
  // Alt başlık satırı mı? ("AY | HAFTA | SAAT" — rakam yok, en az iki başlık)
  const isSubHeader = (row) => row && !row.some((c) => /\d/.test(c)) && Object.keys(detectColumns(row)).length >= 2;
  // Başlığın altında yalnız beceri alt başlıkları varsa ("DİNLEME/İZLEME | KONUŞMA | OKUMA | YAZMA") onları da çıktı say.
  const skillSub = (row) => row && !row.some((c) => /\d/.test(c)) && row.filter((c) => /^(dinleme|izleme|konusma|okuma|yazma)\b/.test(fold(c))).length >= 2;
  for (let r = 0; r < limit; r++) {
    const cols = detectColumns(rows[r]);
    if (!isHeaderLike(cols)) continue;
    if (isSubHeader(rows[r + 1])) return { row: r + 1, cols: mergedCols(r, 2) };
    if (cols.outcomes != null && skillSub(rows[r + 1])) {
      const extra = [];
      rows[r + 1].forEach((c, i) => {
        if (i !== cols.outcomes && /^(dinleme|izleme|konusma|okuma|yazma)\b/.test(fold(c))) extra.push(i);
      });
      return { row: r + 1, cols: { ...cols, outcomesExtra: extra } };
    }
    return { row: r, cols };
  }
  for (let r = 0; r < limit; r++) {
    for (const span of [2, 3]) {
      if (r + span > rows.length) continue;
      const cols = mergedCols(r, span);
      if (isHeaderLike(cols)) return { row: r + span - 1, cols };
    }
  }
  return null;
}

// Başlık tanınmadıysa: sütunların içeriğine bak.
const OUTCOME_HINT = /students will|be able to|\b[a-z]{1,3}\d{1,2}\.\d+\.[a-z]{1,2}\d|ogrenciler|kazanim/;
const UNIT_HINT = /\bunit\s*\d|\bunite\b|\btheme\s*\d|\btema\s*\d|\d+\.\s*unite/;
function guessColumnsByContent(rows, startYear) {
  const width = Math.max(...rows.map((r) => r.length));
  const score = (i, test) => rows.reduce((n, r) => n + (r[i] && test(r[i]) ? 1 : 0), 0);
  const best = (test, exclude = []) => {
    let pick = null;
    let top = 0;
    for (let i = 0; i < width; i++) {
      if (exclude.includes(i)) continue;
      const s = score(i, test);
      if (s > top) [pick, top] = [i, s];
    }
    return top >= Math.max(2, rows.length * 0.3) ? pick : null;
  };
  const week = best((c) => !!parseDateRange(c, startYear, monthOf(c)) || /\d+\s*\.?\s*(hafta|week)/.test(fold(c)));
  if (week == null) return null;
  const outcomes = best((c) => OUTCOME_HINT.test(fold(c)), [week]);
  const unit = best((c) => UNIT_HINT.test(fold(c)) && c.length < 120, [week, outcomes]);
  const month = best((c) => c.length < 25 && !!monthOf(c) && !/\d/.test(c), [week, outcomes, unit]);
  if (outcomes == null && unit == null) return null;
  const cols = { week };
  if (outcomes != null) cols.outcomes = outcomes;
  if (unit != null) cols.unit = unit;
  if (month != null) cols.month = month;
  return cols;
}

// Hata mesajı için: ilk satırlarda görülen başlık benzeri hücreler.
function seenHeaders(rows) {
  const out = [];
  rows.slice(0, 12).forEach((r) => r.forEach((c) => {
    const t = clean(c);
    if (t && t.length <= 40 && !/^\d/.test(t) && !out.includes(t)) out.push(t);
  }));
  return out.slice(0, 12);
}

// Okul yılının başladığı yıl: dosyada "2025-2026" varsa o, yoksa bugüne göre.
function schoolStartYear(rows, today = new Date()) {
  for (const r of rows.slice(0, 60)) {
    for (const c of r) {
      const m = String(c).match(/(20\d\d)\s*[-–—/]\s*(20\d\d)/);
      if (m && +m[2] === +m[1] + 1) return +m[1];
    }
  }
  return today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
}
// Ay numarasından yıl: Ağustos–Aralık başlangıç yılı, Ocak–Temmuz bir sonraki yıl.
const yearFor = (startYear, month) => (month >= 8 ? startYear : startYear + 1);
const nextMonth = (m) => (m % 12) + 1;

// Metinden tarih aralığı çıkar. Döner { start, end } ya da null.
export function parseDateRange(text, startYear, monthHint) {
  const t = fold(text);
  if (!t) return null;
  let m;
  // 08.09.2025 - 12.09.2025  |  8/9/25-12/9/25
  m = t.match(new RegExp(`(\\d{1,2})[./](\\d{1,2})[./](\\d{2,4})${DASH}(\\d{1,2})[./](\\d{1,2})[./](\\d{2,4})`));
  if (m) return { start: key(fullYear(+m[3]), +m[2], +m[1]), end: key(fullYear(+m[6]), +m[5], +m[4]) };
  // 29 eylül (2025) - 3 ekim (2025)  |  28 September – 02 October
  m = t.match(new RegExp(`(\\d{1,2})\\s*${MONTH_RE}\\s*(20\\d\\d)?${DASH}(\\d{1,2})\\s*${MONTH_RE}\\s*(20\\d\\d)?`));
  if (m) {
    const m1 = MONTHS[m[2]];
    const m2 = MONTHS[m[5]];
    return { start: key(m[3] ? +m[3] : yearFor(startYear, m1), m1, +m[1]), end: key(m[6] ? +m[6] : yearFor(startYear, m2), m2, +m[4]) };
  }
  // 08-12 eylül (2025)  |  14-18 September
  m = t.match(new RegExp(`(\\d{1,2})${DASH}(\\d{1,2})\\s*${MONTH_RE}\\s*(20\\d\\d)?`));
  if (m) {
    const mo = MONTHS[m[3]];
    const y = m[4] ? +m[4] : yearFor(startYear, mo);
    // "29-03 Ekim": başlangıç bir önceki ayda.
    if (+m[1] > +m[2]) {
      const prev = mo === 1 ? 12 : mo - 1;
      return { start: key(yearFor(startYear, prev), prev, +m[1]), end: key(y, mo, +m[2]) };
    }
    return { start: key(y, mo, +m[1]), end: key(y, mo, +m[2]) };
  }
  // September 14-18
  m = t.match(new RegExp(`${MONTH_RE}\\s*(\\d{1,2})${DASH}(\\d{1,2})(?!\\s*[./\\d])`));
  if (m) {
    const mo = MONTHS[m[1]];
    const endMonth = +m[3] < +m[2] ? nextMonth(mo) : mo;
    return { start: key(yearFor(startYear, mo), mo, +m[2]), end: key(yearFor(startYear, endMonth), endMonth, +m[3]) };
  }
  // Tek tarih: 08.09.2025 -> o haftanın pazartesi–cuması
  m = t.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (m) return weekOf(new Date(fullYear(+m[3]), +m[2] - 1, +m[1]));
  // "1.HAFTA(14-20)" — ay ayrı sütunda. "28-04" ay sonunu aşıyor -> bitiş bir sonraki ayda.
  m = t.replace(/\d{1,2}\s*\.?\s*(hafta|week)/, ' ').match(new RegExp(`(\\d{1,2})${DASH}(\\d{1,2})(?!\\s*[./\\d])`));
  if (m && monthHint) {
    const endMonth = +m[2] < +m[1] ? nextMonth(monthHint) : monthHint;
    return { start: key(yearFor(startYear, monthHint), monthHint, +m[1]), end: key(yearFor(startYear, endMonth), endMonth, +m[2]) };
  }
  return null;
}

function weekOf(d) {
  const day = (d.getDay() + 6) % 7; // pazartesi = 0
  const mon = new Date(d);
  mon.setDate(d.getDate() - day);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  return { start: dayKey(mon), end: dayKey(fri) };
}

const monthOf = (text) => {
  const m = fold(text).match(new RegExp(MONTH_RE));
  return m ? MONTHS[m[1]] : null;
};
const isHoliday = (s) => /tatil|bayram|ara donem|yariyil|holiday|break/.test(fold(s));

// Bazı plan dosyalarında aynı metin hücreye art arda birkaç kez yazılmış ("Unit 3: BiographiesUnit 3: Biographies").
function collapseRepeats(s) {
  for (let n = 4; n >= 2; n--) {
    if (s.length % n) continue;
    const part = s.slice(0, s.length / n);
    if (part.length >= 3 && part.repeat(n) === s) return part;
  }
  return s;
}

// Uzun tek paragrafı okunur satırlara böl: beceri başlıkları ve madde işaretleri yeni satırda.
const SKILL_RE = /\s+(?=(Listening|Spoken Interaction|Spoken Production|Speaking|Reading|Writing|Dinleme|Konuşma|Okuma|Yazma)\b)/g;
// Satır başında kazanım kodu ya da beceri adı var mı? ("ENG.5.1.S2.", "E7.2.L1.", "Listening")
const OUTCOME_START = /^([A-Z]{1,4}\.?\d{1,2}\.\d+\.[A-Z]{1,3}\d+|Listening|Spoken|Speaking|Reading|Writing|Dinleme|Konuşma|Okuma|Yazma)/;
// Her kazanım tek satır olsun: kodla başlamayan satırlar (Word'deki satır kırılmaları) öncekine eklenir.
function oneOutcomePerLine(s) {
  const lines = s.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.filter((l) => OUTCOME_START.test(l)).length < 2) return lines.join('\n');
  const out = [];
  lines.forEach((l) => {
    if (OUTCOME_START.test(l) || !out.length) out.push(l);
    else out[out.length - 1] += ` ${l}`;
  });
  return out.join('\n');
}

function tidyField(role, text) {
  let s = collapseRepeats(clean(text));
  if (role === 'outcomes') s = oneOutcomePerLine(s.replace(/\s*•\s*/g, ' ').replace(SKILL_RE, '\n'));
  if (role === 'activities') s = s.replace(/\s+(?=(Tasks\/Activities|Assignments)\b)/g, '\n');
  return s.replace(/\n{2,}/g, '\n').trim();
}

// Plandaki sınıf düzeyi: "7. SINIF", "7.Sinif", dosya adında "7.-Sinif", "Grade 7".
export function guessGrade(...texts) {
  for (const t of texts) {
    const f = fold(t);
    const m = f.match(/(?:^|[^\d])(\d{1,2})\s*[._\-\s]*\s*sinif/) || f.match(/\bgrade\s*(\d{1,2})\b/);
    if (m && +m[1] >= 1 && +m[1] <= 12) return +m[1];
  }
  return null;
}

// Tarihsiz planlar için: ilk haftanın pazartesisinden başlayıp her haftaya sırayla tarih ver.
export function assignDates(entries, firstMonday) {
  const d = new Date(firstMonday + 'T00:00:00');
  return entries.map((e) => {
    const start = dayKey(d);
    const fri = new Date(d);
    fri.setDate(d.getDate() + 4);
    d.setDate(d.getDate() + 7);
    return { ...e, start, end: dayKey(fri) };
  });
}

// "08.09.2026" -> "2026-09-07" (o haftanın pazartesisi)
export function parseStartDate(text) {
  const m = String(text || '').trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (!m) return null;
  const d = new Date(fullYear(+m[3]), +m[2] - 1, +m[1]);
  if (d.getMonth() !== +m[2] - 1) return null;
  return weekOf(d).start;
}

// rows: string[][] -> { weeks, undated, grade, needsStart?, entries?, error? }
// needsStart: planda tarih yok ("1. Hafta" gibi) — öğretmen ilk haftanın tarihini girer, assignDates ile tarihlenir.
export function parseYearPlan(rawRows, today = new Date(), forceYear = null) {
  const rows = (rawRows || []).map((r) => (Array.isArray(r) ? r : [r]).map(clean)).filter((r) => r.some(Boolean));
  const grade = guessGrade(...rows.slice(0, 6).map((r) => r.join(' ')));
  const startYear = forceYear || schoolStartYear(rows, today);
  let header = findHeader(rows);
  if (!header) {
    const cols = guessColumnsByContent(rows, startYear);
    if (cols) header = { row: -1, cols };
  }
  if (!header) {
    const seen = seenHeaders(rows);
    return {
      weeks: [],
      undated: 0,
      grade,
      error:
        'Bu dosyada yıllık plan tablosu tanınamadı. Tabloda hafta ya da tarih sütunu ve öğrenme çıktıları / kazanımlar ya da ünite sütunu olmalı.' +
        (seen.length ? `\n\nDosyada görülen başlıklar: ${seen.join(' · ')}` : ''),
    };
  }
  const { cols } = header;
  const hasWhenCol = cols.week != null || cols.date != null;
  const get = (r, role) => {
    if (role === 'outcomes' && cols.outcomesExtra) {
      return [cols.outcomes, ...cols.outcomesExtra]
        .map((i) => tidyField(role, stripUrls(r[i])))
        .filter(Boolean)
        .join('\n');
    }
    return cols[role] != null ? tidyField(role, stripUrls(r[cols[role]])) : '';
  };

  const entries = []; // satır sırasıyla haftalar (tarihli ya da tarihsiz)
  let month = null;
  let last = null;
  const append = (target, fields) =>
    Object.entries(fields).forEach(([k, v]) => {
      if (v && !target[k].includes(v)) target[k] = target[k] ? `${target[k]}\n${v}` : v;
    });

  rows.slice(header.row + 1).forEach((r) => {
    const mCell = get(r, 'month');
    if (mCell && monthOf(mCell)) month = monthOf(mCell);
    const whenText = [get(r, 'date'), get(r, 'week')].filter(Boolean).join(' ');
    const fields = {
      unit: get(r, 'unit'),
      topic: get(r, 'topic'),
      outcomes: get(r, 'outcomes'),
      functions: get(r, 'functions'),
      content: get(r, 'content'),
      activities: get(r, 'activities'),
      evaluation: get(r, 'evaluation'),
      notes: get(r, 'notes'),
    };
    // Birleşik hücre birkaç sütuna kopyalandıysa ("SCHOOL-BASED PLANNING") sadece ünitede kalsın.
    Object.keys(fields).forEach((k) => {
      if (k !== 'unit' && fields[k] && fields[k] === fields.unit) fields[k] = '';
    });
    // Haftalık ders saati: "3", "4 SAAT", "4 hours"
    const hm = fold(cols.hours != null ? r[cols.hours] : '').match(/^(\d{1,2})\b/);
    const hours = hm && +hm[1] > 0 && +hm[1] <= 12 ? +hm[1] : null;
    const hasContent = Object.values(fields).some(Boolean);
    // Tekrarlanan başlık satırı (Word'de her sayfada) — atla.
    if (!/\d/.test(whenText) && Object.keys(detectColumns(r)).length >= 2) return;
    if (!whenText && !hasContent) return;

    // Hafta hücresi boş (birleştirilmiş hücre) -> önceki haftanın devamı.
    if (hasWhenCol && !whenText) {
      if (last) append(last, fields);
      return;
    }
    const range = whenText ? parseDateRange(whenText, startYear, monthOf(whenText) || month) : null;
    // "1. Hafta", "1.HAFTA", "1. Week" ya da "Week 1"
    const wkText = fold(get(r, 'week') || whenText);
    const wk = wkText.match(/(\d{1,2})\s*\.?\s*(hafta|week)/) || wkText.match(/\bweek\s*(\d{1,2})\b/);
    const entry = { start: null, end: null, ...(range || {}), week: wk ? +wk[1] : null, hours, ...fields };
    // Tatil haftası: kazanımı yok ve içerik kısa bir tatil yazısı ("ARA TATİL", "FIRST MID-TERM BREAK").
    const body = [fields.unit, fields.topic, fields.outcomes, fields.activities].filter(Boolean).join(' ');
    entry.holiday =
      body.length < 80 &&
      isHoliday([whenText, body, fields.notes].join(' ')) &&
      (!fields.unit || isHoliday(fields.unit + ' ' + whenText)) &&
      (!fields.outcomes || isHoliday(fields.outcomes));
    if (entry.holiday) {
      // Tatil adı hücrede değil hafta sütunundaysa ("FIRST MIDTERM BREAK 16-20 November") oradan al.
      const fromWhen = clean(whenText.replace(new RegExp(`\\d{1,2}(\\s*${MONTH_RE})?|${DASH}`, 'gi'), ' ').replace(/[^\p{L}\s'’-]/gu, ' ')).replace(/\s+/g, ' ');
      const strip = (s) => clean(s.replace(new RegExp(`\\d{1,2}${DASH}\\d{1,2}\\s*${MONTH_RE}`, 'gi'), ' ')).replace(/\s+/g, ' ');
      entry.unit = strip((fields.unit || fields.outcomes || fields.topic || fields.activities || '').split('\n').filter(Boolean).join(' · ')) || fromWhen;
      entry.outcomes = '';
    }
    // Aynı hafta birden çok satıra bölünmüşse birleştir.
    if (last && range && last.start === entry.start && last.end === entry.end) {
      append(last, fields);
      return;
    }
    entries.push(entry);
    last = entry;
  });

  // Aynı tarihli satırlar (planda arka arkaya olmasa bile) tek haftada birleşir.
  // Okul yılının dışında kalan tarihler (yanlış okunmuş açıklama satırları) alınmaz.
  const yearFrom = `${startYear}-08-01`;
  const yearTo = `${startYear + 1}-07-31`;
  const weeks = [];
  entries
    .filter((e) => e.start && e.start >= yearFrom && e.start <= yearTo)
    .sort((a, b) => a.start.localeCompare(b.start))
    .forEach((e) => {
      const prev = weeks[weeks.length - 1];
      if (prev && prev.start === e.start && prev.end === e.end) {
        append(prev, { unit: e.unit, topic: e.topic, outcomes: e.outcomes, functions: e.functions, content: e.content, activities: e.activities, evaluation: e.evaluation, notes: e.notes });
        prev.hours = prev.hours || e.hours;
        prev.holiday = prev.holiday && e.holiday;
      } else weeks.push(e);
    });
  const undated = entries.length - weeks.length;
  // Dosyadaki yıl yazısı yanlışsa (ör. 2026-27 tarihli planın başlığında "2025-2026") haftalar pazartesiye denk gelmez:
  // komşu yılları dene, en çok pazartesi tutanı al.
  const mondays = (ws) => ws.filter((w) => new Date(w.start + 'T00:00:00').getDay() === 1).length;
  if (weeks.length && !forceYear && mondays(weeks) < weeks.length / 2) {
    const alts = [startYear + 1, startYear - 1].map((y) => parseYearPlan(rawRows, today, y)).filter((x) => x.weeks.length);
    const best = alts.sort((a, b) => mondays(b.weeks) - mondays(a.weeks))[0];
    if (best && mondays(best.weeks) > mondays(weeks)) return best;
  }
  if (weeks.length) return { weeks, undated, grade, error: null };
  if (entries.length >= 3) return { weeks: [], undated: 0, grade, needsStart: true, entries };
  return { weeks: [], undated, grade, error: 'Planda hafta satırı bulunamadı.' };
}

// Bugün hangi haftada? Hafta sonu da o haftaya sayılır. Yoksa sıradaki hafta.
// Döner { week, status: 'now' | 'weekend' | 'next' | 'ended' }
export function weekForDay(weeks, day = dayKey()) {
  if (!weeks || !weeks.length) return null;
  const plus2 = (k) => {
    const d = new Date(k + 'T00:00:00');
    d.setDate(d.getDate() + 2);
    return dayKey(d);
  };
  for (const w of weeks) {
    if (day >= w.start && day <= w.end) return { week: w, status: 'now' };
    if (day > w.end && day <= plus2(w.end)) return { week: w, status: 'weekend' };
  }
  const next = weeks.find((w) => w.start > day);
  if (next) return { week: next, status: 'next' };
  return { week: weeks[weeks.length - 1], status: 'ended' };
}
