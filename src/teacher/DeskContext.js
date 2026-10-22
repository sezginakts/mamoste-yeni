// Öğretmenin masası — SADECE bu cihazda: haftalık ders programı + ders saatleri + kişisel notlar / hatırlatıcılar.
//
// Ders:   lessons['<gün>-<ders>'] = { classId|null, grade, label }   gün: 1 = Pazartesi … 5 = Cuma
// Saat:   periods = [{ start: 'HH:MM', end: 'HH:MM' }, …]           her okulun saati farklı; öğretmen düzenler
// Not:    { id, text, color, remind: 'YYYY-MM-DD'|null, time: 'HH:MM'|null, done, at, nid }
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shortId } from '../utils/codec';
import { scheduleReminder, cancelReminder } from '../utils/notify';

const TT_KEY = '@ingapp/teacher/v1/timetable';
const PERIODS_KEY = '@ingapp/teacher/v1/periods';
const NOTES_KEY = '@ingapp/teacher/v1/notes';
const Ctx = createContext(null);

const DEFAULT_PERIODS = Array.from({ length: 7 }, () => ({ start: '', end: '' }));

export const weekdayOf = (d = new Date()) => ((d.getDay() + 6) % 7) + 1; // Pzt=1 … Paz=7
// Sınıf adından düzey: "7-B" -> 7
export const gradeOfName = (name) => {
  const m = String(name || '').match(/^\s*(\d{1,2})/);
  return m ? +m[1] : null;
};

const toMin = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || '');
  return m ? +m[1] * 60 + +m[2] : null;
};
const toHHMM = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Hızlı ayar: ilk ders başlangıcı + ders süresi + teneffüs (+ öğle arası) -> tüm ders saatleri.
// lunchAfter: kaçıncı dersten sonra öğle arası (0 = yok), lunch: dakika.
export function buildPeriods({ count, first, lesson, rest, lunchAfter, lunch }) {
  let t = toMin(first);
  if (t == null) return null;
  const out = [];
  for (let i = 1; i <= count; i++) {
    out.push({ start: toHHMM(t), end: toHHMM(t + lesson) });
    t += lesson + (i === lunchAfter && lunch ? lunch : rest);
  }
  return out;
}

// Şu an hangi ders? Döner { period, status: 'now' | 'next' } ya da null (gün bitti / saat yok).
export function periodAt(periods, date = new Date()) {
  const now = date.getHours() * 60 + date.getMinutes();
  for (let i = 0; i < periods.length; i++) {
    const s = toMin(periods[i].start);
    const e = toMin(periods[i].end);
    if (s == null || e == null) continue;
    if (now >= s && now < e) return { period: i + 1, status: 'now' };
    if (now < s) return { period: i + 1, status: 'next' };
  }
  return null;
}

export function DeskProvider({ children }) {
  const [lessons, setLessons] = useState({});
  const [periods, setPeriodsState] = useState(DEFAULT_PERIODS);
  const [notes, setNotes] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [tt, ps, ns] = await Promise.all([AsyncStorage.getItem(TT_KEY), AsyncStorage.getItem(PERIODS_KEY), AsyncStorage.getItem(NOTES_KEY)]);
        if (tt) setLessons(JSON.parse(tt));
        if (ps) setPeriodsState(JSON.parse(ps));
        if (ns) setNotes(JSON.parse(ns));
      } catch (e) {
        console.warn('ders programı / notlar okunamadı', e);
      }
      setLoaded(true);
    })();
  }, []);

  const saveLessons = (next) => {
    setLessons(next);
    AsyncStorage.setItem(TT_KEY, JSON.stringify(next)).catch(() => {});
  };
  const savePeriods = (next) => {
    setPeriodsState(next);
    AsyncStorage.setItem(PERIODS_KEY, JSON.stringify(next)).catch(() => {});
  };
  const saveNotes = (fn) =>
    setNotes((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });

  // Bir sınıfın (ya da sadece düzeyin) haftadaki dersleri, gün/ders sırasıyla.
  const lessonsOf = (lesson) => {
    const same = (l) => (lesson.classId ? l.classId === lesson.classId : !l.classId && l.grade === lesson.grade);
    return Object.entries(lessons)
      .map(([k, l]) => ({ ...l, day: +k.split('-')[0], period: +k.split('-')[1] }))
      .filter(same)
      .sort((a, b) => a.day - b.day || a.period - b.period);
  };

  const value = useMemo(
    () => ({
      loaded,
      lessons,
      periods,
      setLesson: (day, period, lesson) => {
        const next = { ...lessons };
        if (lesson) next[`${day}-${period}`] = lesson;
        else delete next[`${day}-${period}`];
        saveLessons(next);
      },
      setPeriod: (i, patch) => savePeriods(periods.map((p, k) => (k === i ? { ...p, ...patch } : p))),
      setPeriods: savePeriods,
      // Ders sayısını değiştir; çıkarılan saatlerdeki dersler de silinir.
      setPeriodCount: (n) => {
        n = Math.max(1, Math.min(12, n));
        const next = periods.slice(0, n);
        while (next.length < n) next.push({ start: '', end: '' });
        savePeriods(next);
        saveLessons(Object.fromEntries(Object.entries(lessons).filter(([k]) => +k.split('-')[1] <= n)));
      },
      // Bir günün dersleri: [{ day, period, classId, grade, label, start, end, idx (haftanın kaçıncı dersi), count }]
      lessonsOnDay: (day) =>
        Object.entries(lessons)
          .filter(([k]) => +k.split('-')[0] === day)
          .map(([k, l]) => {
            const lesson = { ...l, day, period: +k.split('-')[1] };
            const week = lessonsOf(lesson);
            const p = periods[lesson.period - 1] || {};
            return { ...lesson, start: p.start || '', end: p.end || '', idx: week.findIndex((x) => x.period === lesson.period && x.day === day), count: week.length };
          })
          .sort((a, b) => a.period - b.period),
      // Haftanın bütün dersleri (Pzt→Cum, ders sırasıyla) — lessonsOnDay ile aynı alanlar.
      weekLessons: () => {
        const out = [];
        for (let day = 1; day <= 5; day++) {
          Object.entries(lessons)
            .filter(([k]) => +k.split('-')[0] === day)
            .map(([k, l]) => {
              const lesson = { ...l, day, period: +k.split('-')[1] };
              const week = lessonsOf(lesson);
              const p = periods[lesson.period - 1] || {};
              return { ...lesson, start: p.start || '', end: p.end || '', idx: week.findIndex((x) => x.period === lesson.period && x.day === day), count: week.length };
            })
            .sort((a, b) => a.period - b.period)
            .forEach((l) => out.push(l));
        }
        return out;
      },
      hasTimetable: Object.keys(lessons).length > 0,

      notes,
      addNote: async (text, remind, time, color) => {
        const nid = remind ? await scheduleReminder(remind, '📝 Hatırlatma', text.trim(), time) : null;
        saveNotes((p) => [{ id: shortId(), text: text.trim(), color: color || 'green', remind: remind || null, time: remind && time ? time : null, done: false, at: Date.now(), nid }, ...p]);
      },
      toggleNote: (id) =>
        saveNotes((p) =>
          p.map((n) => {
            if (n.id !== id) return n;
            if (!n.done && n.nid) cancelReminder(n.nid);
            return { ...n, done: !n.done };
          })
        ),
      removeNote: (id) =>
        saveNotes((p) => {
          const n = p.find((x) => x.id === id);
          if (n && n.nid) cancelReminder(n.nid);
          return p.filter((x) => x.id !== id);
        }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lessons, periods, notes, loaded]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDesk() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDesk, DeskProvider içinde kullanılmalı');
  return c;
}

// Bekleyen notlar: hatırlatma tarihi olanlar önce (yakın tarih başta), sonra en yeni.
export function sortNotes(notes) {
  return [...notes]
    .filter((n) => !n.done)
    .sort((a, b) => {
      if (a.remind && b.remind) return (a.remind + (a.time || '')).localeCompare(b.remind + (b.time || ''));
      if (a.remind) return -1;
      if (b.remind) return 1;
      return b.at - a.at;
    });
}
