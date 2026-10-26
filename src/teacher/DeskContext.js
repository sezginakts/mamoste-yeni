// Öğretmenin masası — SADECE bu cihazda: haftalık ders programı + ders saatleri + kişisel notlar / hatırlatıcılar.
// Her branşın kendi programı, saatleri ve notları vardır (utils/branchStore).
//
// Ders:   lessons['<gün>-<ders>'] = { classId|null, grade, label }   gün: 1 = Pazartesi … 5 = Cuma
// Saat:   schedules = { a: { name, periods: [{ start, end }, …] }, b: { … } } — iki okulun saat düzeni ayrı tutulur.
// Gün→düzen: daySchedule = { 1:'a', … 5:'b' } — hangi gün hangi okulun saatleri geçerli.
//         Tek haftalık program vardır; okul ayrımı yalnız saatlerdedir.
// Not:    { id, text, color, remind: 'YYYY-MM-DD'|null, time: 'HH:MM'|null, done, at, nid }
// Zil:    bell = { mode: 'off' | 'mine' | 'all', end: ders bitişinde de çalsın } → utils/bell (haftalık bildirimler)
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { shortId } from '../utils/codec';
import { useRole } from '../context/RoleContext';
import { getBranchItem, setBranchItem } from '../utils/branchStore';
import { bellTimes, scheduleBells } from '../utils/bell';
import { scheduleReminder, cancelReminder } from '../utils/notify';

const TT_KEY = '@ingapp/teacher/v1/timetable';
const PERIODS_KEY = '@ingapp/teacher/v1/periods'; // ESKİ: yalnız migration için okunur
const SCHEDULES_KEY = '@ingapp/teacher/v1/schedules';
const DAYSCHED_KEY = '@ingapp/teacher/v1/day-schedule';
const NOTES_KEY = '@ingapp/teacher/v1/notes';
const BELL_KEY = '@ingapp/teacher/v1/bell';
const DEFAULT_BELL = { mode: 'off', end: true };
const Ctx = createContext(null);

const DEFAULT_PERIODS = Array.from({ length: 7 }, () => ({ start: '', end: '' }));
const SCHED_IDS = ['a', 'b'];
const DEFAULT_DAY = { 1: 'a', 2: 'a', 3: 'a', 4: 'a', 5: 'a' };
const bosSaatlar = (n) => Array.from({ length: n }, () => ({ start: '', end: '' }));
const DEFAULT_SCHEDULES = { a: { name: '1. Okul', periods: bosSaatlar(7) }, b: { name: '2. Okul', periods: bosSaatlar(7) } };

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

// Kayıtlı veriyi güvenli biçime getir: iki düzen de var, saatler {start,end}.
function duzenle(sched) {
  const out = {};
  SCHED_IDS.forEach((id) => {
    const s = (sched && sched[id]) || {};
    const periods = Array.isArray(s.periods) && s.periods.length ? s.periods : bosSaatlar(7);
    out[id] = {
      name: String(s.name || (id === 'a' ? '1. Okul' : '2. Okul')),
      periods: periods.map((p) => ({ start: (p && p.start) || '', end: (p && p.end) || '' })),
    };
  });
  return out;
}
function gunDuzeni(map) {
  const out = { ...DEFAULT_DAY };
  if (map && typeof map === 'object') {
    for (let d = 1; d <= 5; d++) if (SCHED_IDS.includes(map[d])) out[d] = map[d];
    for (let d = 6; d <= 7; d++) if (SCHED_IDS.includes(map[d])) out[d] = map[d];
  }
  return out;
}

export function DeskProvider({ children }) {
  const [lessons, setLessons] = useState({});
  const [schedules, setSchedulesState] = useState(DEFAULT_SCHEDULES);
  const [daySchedule, setDayScheduleState] = useState(DEFAULT_DAY);
  const [activeSchedule, setActiveSchedule] = useState('a'); // düzenlenen düzen (yalnız ekran durumu)
  const [notes, setNotes] = useState([]);
  const [bell, setBellState] = useState(DEFAULT_BELL);
  const { branchId } = useRole();
  const [loadedFor, setLoadedFor] = useState(null); // hangi branşın verisi yüklü
  // Branş seçilmemişken (seçim ekranı) beklenecek bir şey yok.
  const loaded = !branchId || loadedFor === branchId;

  useEffect(() => {
    if (!branchId) return undefined;
    let live = true;
    (async () => {
      let d = { lessons: {}, schedules: DEFAULT_SCHEDULES, daySchedule: DEFAULT_DAY, notes: [], bell: DEFAULT_BELL };
      try {
        const [tt, ps, ns, bl, sc, ds] = await Promise.all([
          getBranchItem(TT_KEY, branchId),
          getBranchItem(PERIODS_KEY, branchId),
          getBranchItem(NOTES_KEY, branchId),
          getBranchItem(BELL_KEY, branchId),
          getBranchItem(SCHEDULES_KEY, branchId),
          getBranchItem(DAYSCHED_KEY, branchId),
        ]);
        let sched = sc ? JSON.parse(sc) : null;
        let daym = ds ? JSON.parse(ds) : null;
        if (!sched) {
          // ESKİ kurulum: tek periods listesi -> "1. Okul" düzeni, bütün günler o düzen.
          const eski = ps ? JSON.parse(ps) : null;
          const periods = Array.isArray(eski) && eski.length ? eski : bosSaatlar(7);
          sched = { a: { name: '1. Okul', periods }, b: { name: '2. Okul', periods: bosSaatlar(periods.length) } };
          daym = DEFAULT_DAY;
          // Yeni anahtarlara bir kez yaz (migration).
          setBranchItem(SCHEDULES_KEY, branchId, JSON.stringify(duzenle(sched))).catch(() => {});
          setBranchItem(DAYSCHED_KEY, branchId, JSON.stringify(gunDuzeni(daym))).catch(() => {});
        }
        d = {
          lessons: tt ? JSON.parse(tt) : {},
          schedules: duzenle(sched),
          daySchedule: gunDuzeni(daym),
          notes: ns ? JSON.parse(ns) : [],
          bell: bl ? { ...DEFAULT_BELL, ...JSON.parse(bl) } : DEFAULT_BELL,
        };
      } catch (e) {
        console.warn('ders programı / notlar okunamadı', e);
      }
      if (!live) return;
      setLessons(d.lessons);
      setSchedulesState(d.schedules);
      setDayScheduleState(d.daySchedule);
      setNotes(d.notes);
      setBellState(d.bell);
      setLoadedFor(branchId);
    })();
    return () => {
      live = false;
    };
  }, [branchId]);

  const saveLessons = (next) => {
    setLessons(next);
    setBranchItem(TT_KEY, branchId, JSON.stringify(next)).catch(() => {});
  };
  const saveSchedules = (next) => {
    setSchedulesState(next);
    setBranchItem(SCHEDULES_KEY, branchId, JSON.stringify(next)).catch(() => {});
  };
  const saveDaySchedule = (next) => {
    setDayScheduleState(next);
    setBranchItem(DAYSCHED_KEY, branchId, JSON.stringify(next)).catch(() => {});
  };

  // Bir günün saatleri: o güne atanmış düzenin listesi.
  const periodsFor = (day) => {
    const key = daySchedule[day] || 'a';
    return (schedules[key] || schedules.a).periods;
  };
  const todayPeriods = periodsFor(weekdayOf());
  const activePeriods = (schedules[activeSchedule] || schedules.a).periods;
  const saveActivePeriods = (list) => saveSchedules({ ...schedules, [activeSchedule]: { ...(schedules[activeSchedule] || {}), periods: list } });

  // Bir düzenin ders sayısını değiştir: yalnız o düzeni kullanan günlerde fazla dersler silinir.
  const setScheduleCount = (key, n) => {
    n = Math.max(1, Math.min(12, n));
    const list = ((schedules[key] || {}).periods || []).slice(0, n);
    while (list.length < n) list.push({ start: '', end: '' });
    saveSchedules({ ...schedules, [key]: { ...(schedules[key] || {}), periods: list } });
    const gunler = [1, 2, 3, 4, 5].filter((g) => (daySchedule[g] || 'a') === key);
    const next = Object.fromEntries(
      Object.entries(lessons).filter(([k]) => {
        const [g, p] = k.split('-').map(Number);
        return !(gunler.includes(g) && p > n);
      })
    );
    if (Object.keys(next).length !== Object.keys(lessons).length) saveLessons(next);
  };

  const setBell = (patch) => {
    const next = { ...bell, ...patch };
    setBellState(next);
    setBranchItem(BELL_KEY, branchId, JSON.stringify(next)).catch(() => {});
  };

  // Zil: her gün kendi saat düzeniyle kurulur.
  const bellTimer = useRef(null);
  const dayPeriods = [1, 2, 3, 4, 5].map((g) => periodsFor(g));
  const bells = useMemo(
    () => (bell.mode === 'off' ? [] : bellTimes({ dayPeriods, lessons, mode: bell.mode, end: bell.end })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bell, schedules, daySchedule, lessons]
  );
  useEffect(() => {
    if (!branchId || loadedFor !== branchId) return undefined;
    clearTimeout(bellTimer.current);
    bellTimer.current = setTimeout(() => scheduleBells(bells), 800);
    return () => clearTimeout(bellTimer.current);
  }, [bells, branchId, loadedFor]);

  const saveNotes = (fn) =>
    setNotes((prev) => {
      const next = fn(prev);
      setBranchItem(NOTES_KEY, branchId, JSON.stringify(next)).catch(() => {});
      return next;
    });

  // Bir sınıfın haftadaki dersleri, gün/ders sırasıyla.
  // Aynı sınıf nasıl bulunur: önce sınıf ADI (sınıf adları benzersiz; eski kayıtlarda classId yok),
  // sonra classId, en son düzey. Yalnız düzeye bakmak 7-A ile 7-B'nin derslerini tek havuz düşürüyordu.
  const lessonsOf = (lesson) => {
    const same = (l) => {
      if (lesson.label && l.label) return String(lesson.label).trim() === String(l.label).trim();
      if (lesson.classId || l.classId) return lesson.classId === l.classId;
      return l.grade === lesson.grade;
    };
    return Object.entries(lessons)
      .map(([k, l]) => ({ ...l, day: +k.split('-')[0], period: +k.split('-')[1] }))
      .filter(same)
      .sort((a, b) => a.day - b.day || a.period - b.period);
  };

  const value = useMemo(
    () => ({
      loaded,
      lessons,
      // Geriye dönük: "periods" = BUGÜNÜN saatleri.
      periods: todayPeriods,
      // Yeni: iki okul düzeni ve gün eşlemesi
      schedules,
      daySchedule,
      activeSchedule,
      setActiveSchedule,
      periodsFor,
      todayPeriods,
      setDaySchedule: (day, key) => saveDaySchedule({ ...daySchedule, [day]: SCHED_IDS.includes(key) ? key : 'a' }),
      renameSchedule: (key, name) => saveSchedules({ ...schedules, [key]: { ...schedules[key], name: String(name || '').trim() || (key === 'a' ? '1. Okul' : '2. Okul') } }),
      setSchedulePeriods: (key, list) => saveSchedules({ ...schedules, [key]: { ...schedules[key], periods: list } }),
      setSchedulePeriod: (key, i, patch) =>
        saveSchedules({ ...schedules, [key]: { ...schedules[key], periods: (schedules[key].periods || []).map((p, k) => (k === i ? { ...p, ...patch } : p)) } }),
      setScheduleCount: (key, n) => setScheduleCount(key, n),

      setLesson: (day, period, lesson) => {
        const next = { ...lessons };
        if (lesson) next[`${day}-${period}`] = lesson;
        else delete next[`${day}-${period}`];
        saveLessons(next);
      },
      // Aşağıdakiler SEÇİLİ düzeni (Timetable ekranı) düzenler.
      setPeriod: (i, patch) => saveActivePeriods(activePeriods.map((p, k) => (k === i ? { ...p, ...patch } : p))),
      setPeriods: saveActivePeriods,
      setPeriodCount: (n) => setScheduleCount(activeSchedule, n),
      // Bir günün dersleri: [{ day, period, classId, grade, label, start, end, idx, count }]
      lessonsOnDay: (day) =>
        Object.entries(lessons)
          .filter(([k]) => +k.split('-')[0] === day)
          .map(([k, l]) => {
            const lesson = { ...l, day, period: +k.split('-')[1] };
            const week = lessonsOf(lesson);
            const p = periodsFor(day)[lesson.period - 1] || {};
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
              const p = periodsFor(day)[lesson.period - 1] || {};
              return { ...lesson, start: p.start || '', end: p.end || '', idx: week.findIndex((x) => x.period === lesson.period && x.day === day), count: week.length };
            })
            .sort((a, b) => a.period - b.period)
            .forEach((l) => out.push(l));
        }
        return out;
      },
      hasTimetable: Object.keys(lessons).length > 0,

      bell,
      bells,
      setBell,

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
    [lessons, schedules, daySchedule, activeSchedule, todayPeriods, notes, loaded, branchId, bell, bells]
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
