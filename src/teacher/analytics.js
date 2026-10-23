// Öğretmen panosu için saf hesaplamalar. Yorum YAPMAZ; sadece sayar ve renklendirir.
import { ALL_SENTENCES, PATTERNS, SENTENCE_BY_ID } from '../data/patterns';
import { dayKey, daysBetween } from '../utils/helpers';

export const MIN_ATTEMPTS = 3; // renk vermek için en az deneme

export function addDays(key, n) {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

// Bir sonraki belirli hafta günü (1=Pzt ... 5=Cuma). Bugün o günse bugünü verir.
export function nextWeekday(target, from = new Date()) {
  const d = new Date(from);
  const diff = (target - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return dayKey(d);
}

export function accColor(acc, colors) {
  if (acc == null) return colors.border;
  if (acc < 0.5) return colors.danger;
  if (acc < 0.8) return colors.warning;
  return colors.primary;
}

export function studentPatternStats(student) {
  const out = {};
  PATTERNS.forEach((p) => (out[p.id] = { p: 0, f: 0, acc: null }));
  Object.entries(student.attempts || {}).forEach(([sid, a]) => {
    const s = SENTENCE_BY_ID[sid];
    if (!s || !out[s.patternId]) return;
    out[s.patternId].p += a.p || 0;
    out[s.patternId].f += a.f || 0;
  });
  Object.values(out).forEach((o) => {
    const t = o.p + o.f;
    o.acc = t >= MIN_ATTEMPTS ? o.p / t : null;
    o.t = t;
  });
  return out;
}

export function studentTotals(student) {
  let p = 0;
  let f = 0;
  Object.values(student.attempts || {}).forEach((a) => {
    p += a.p || 0;
    f += a.f || 0;
  });
  const points = (student.points || []).reduce((s, x) => s + x.d, 0);
  // Son çalışma: cümle cevabı ya da ödev teslimi (görev derslerinde yalnız teslim olur).
  const last = Math.max(
    0,
    ...Object.values(student.attempts || {}).map((a) => a.last || 0),
    ...(student.submissions || []).map((x) => x.at || 0)
  );
  return { p, f, t: p + f, acc: p + f ? p / (p + f) : null, points, last };
}

// Sınıf tablosu sıralaması için öğrencinin durumu.
//   perf: başarı 0–1 (İngilizce: doğru oranı; görev dersleri: öğretmen puanı ortalaması / 100; veri yoksa null)
//   missing: süresi geçmiş ama teslim edilmemiş ödev sayısı
export function studentStanding(student, cls, drills, today = dayKey()) {
  const tot = studentTotals(student);
  let perf = null;
  if (drills) perf = tot.acc;
  else {
    const scores = (student.submissions || []).filter((x) => x.fb && x.fb.score != null).map((x) => x.fb.score);
    perf = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length / 100 : null;
  }
  const done = new Set((student.submissions || []).map((x) => x.h));
  const missing = (cls.homeworks || []).filter((h) => (!h.to || h.to === student.id) && h.due && h.due < today && !done.has(h.id)).length;
  return { ...tot, perf, missing };
}

export function classPatternStats(cls) {
  const out = {};
  PATTERNS.forEach((p) => (out[p.id] = { p: 0, f: 0, acc: null, t: 0 }));
  Object.values(cls.students || {}).forEach((st) => {
    const sp = studentPatternStats(st);
    Object.entries(sp).forEach(([pid, o]) => {
      out[pid].p += o.p;
      out[pid].f += o.f;
    });
  });
  Object.values(out).forEach((o) => {
    o.t = o.p + o.f;
    o.acc = o.t >= MIN_ATTEMPTS * 2 ? o.p / o.t : null;
  });
  return out;
}

// "Zayıf noktalar" önerisi: en düşük doğruluklu 2 kalıp + en çok yanlış yapılan cümleler.
export function weakSuggestion(cls, n = 10) {
  const ps = classPatternStats(cls);
  const pats = Object.entries(ps)
    .filter(([, o]) => o.acc != null)
    .sort((a, b) => a[1].acc - b[1].acc)
    .slice(0, 2)
    .map(([pid, o]) => ({ id: pid, acc: o.acc, t: o.t }));
  const fails = {};
  Object.values(cls.students || {}).forEach((st) =>
    Object.entries(st.attempts || {}).forEach(([sid, a]) => {
      if (!fails[sid]) fails[sid] = { f: 0, t: 0 };
      fails[sid].f += a.f || 0;
      fails[sid].t += (a.f || 0) + (a.p || 0);
    })
  );
  const ids = Object.entries(fails)
    .filter(([, o]) => o.f > 0)
    .sort((a, b) => b[1].f / b[1].t - a[1].f / a[1].t || b[1].f - a[1].f)
    .slice(0, n)
    .map(([sid]) => sid);
  return { patterns: pats, ids };
}

export function homeworkStatus(cls, hw) {
  const students = Object.values(cls.students || {});
  const expected = hw.to ? students.filter((s) => s.id === hw.to) : students;
  const done = expected.filter((s) => (s.submissions || []).some((x) => x.h === hw.id));
  return { expected: expected.length, done: done.length, missing: expected.filter((s) => !done.includes(s)) };
}

// Dikkat şeridi: hatırlatmalar, teslim edilmeyen ödevler, uzun süredir çalışmayanlar.
export function attentionItems(classes, today = dayKey()) {
  const items = [];
  classes.forEach((cls) => {
    Object.values(cls.students || {}).forEach((st) => {
      (st.notes || []).forEach((n) => {
        if (n.remind && !n.done && n.remind <= today) {
          items.push({ kind: 'remind', cls, st, note: n, label: `⏰ ${cls.name} · ${st.no} ${st.nk || ''}: ${n.text}` });
        }
      });
    });
    (cls.homeworks || []).forEach((hw) => {
      if (hw.due && hw.due < today && daysBetween(hw.due, today) <= 7) {
        const s = homeworkStatus(cls, hw);
        if (s.missing.length > 0) {
          items.push({ kind: 'late', cls, hw, label: `📭 ${cls.name} · "${hw.title}" — ${s.missing.length}/${s.expected} öğrenci teslim etmedi` });
        }
      }
    });
    const hasHw = (cls.homeworks || []).length > 0;
    if (hasHw) {
      const idle = Object.values(cls.students || {}).filter((st) => {
        const { last } = studentTotals(st);
        return !last || Date.now() - last > 7 * 24 * 3600 * 1000;
      });
      if (idle.length) items.push({ kind: 'idle', cls, label: `💤 ${cls.name} · ${idle.length} öğrenci 7 gündür hiç çalışmadı` });
    }
  });
  return items;
}

export const POINT_TAGS = ['Katılım', 'Ödev', 'Doğru cevap', 'Yardımlaşma', 'Hazırlıksız', 'Ödev yok', 'Dikkat'];

export { ALL_SENTENCES };
