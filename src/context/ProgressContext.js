// Global durum: kartlar (SRS), streak, XP, günlük hedef, ayarlar.
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadState, saveState, clearState } from '../utils/storage';
import { ALL_SENTENCES, PATTERNS, PATTERN_BY_ID, SENTENCE_BY_ID, CATEGORIES } from '../data/patterns';
import {
  newCard,
  gradeTest,
  isDue,
  isNew,
  isMastered,
  isLearning,
  statusOf,
  tickFor,
  MASTER_STAGE,
  DAY,
} from '../utils/srs';
import { dayKey, daysBetween, lastNDays, shortDayLabel } from '../utils/helpers';
import { selectHomeworkIds, sessionFromIds } from '../utils/homework';
import { encodePayload } from '../utils/codec';
import { AppState } from 'react-native';
import { rpc, cloudEnabled } from '../lib/supabase';
import { registerStudentPush } from '../utils/push';

const ProgressContext = createContext(null);

const DEFAULT_STATE = {
  cards: {}, // sentenceId -> cardState
  streak: 0,
  longestStreak: 0,
  xp: 0,
  lastStudyDay: null, // 'YYYY-MM-DD'
  studyLog: {}, // dayKey -> tamamlanan cümle sayısı
  dailyGoal: 10, // 5 | 10 | 15 | 20
  settings: {
    sound: true,
    autoSpeak: true,
  },
  // Öğrenci tarafı: numara + takma ad + avatar (emoji); cihaz anahtarı (token) ve dersler
  // (classes: [{ rid, cn, branch, no, teacher, tAvatar, tSchool, tBio, tHours }]). rid/cn: ilk dersin kopyası (eski sürümlerle uyum).
  // Fotoğraf, telefon, e-posta, doğum tarihi tutulmaz (çocuk verisi).
  student: { no: '', nk: '', avatar: '', rid: null, token: null, cc: null, cn: null, classes: [] },
  weeklyGoal: 4, // haftada kaç gün çalışılacak (profil)
  reminder: null, // { time: 'HH:MM', id } günlük çalışma hatırlatıcısı (yerel bildirim)
  homeworks: {}, // id -> { ...ödev, cc, cn, receivedAt, sessionIds, result: { res, at, dur } }
};

// Eski sürümde tek sınıf vardı (student.rid); ders listesine çevir.
const withClasses = (st) =>
  st.classes && st.classes.length
    ? st
    : { ...st, classes: st.rid ? [{ rid: st.rid, cn: st.cn || '', branch: 'ingilizce', no: st.no, teacher: '' }] : [] };

const XP_PER_CORRECT = 10;
const XP_PER_SESSION = 20;

export function ProgressProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // İlk yüklemede kalıcı durumu oku.
  useEffect(() => {
    (async () => {
      const saved = await loadState();
      if (saved) {
        setState({
          ...DEFAULT_STATE,
          ...saved,
          settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
          student: withClasses({ ...DEFAULT_STATE.student, ...(saved.student || {}) }),
          homeworks: saved.homeworks || {},
        });
      }
      setLoaded(true);
    })();
  }, []);

  // Durum değiştikçe (debounce ile) kaydet.
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveState(state), 300);
  }, [state, loaded]);

  // --- Aksiyonlar ---

  // Yazılı test sonucu işlenir: passed=true ise cümle bir tik aşaması atlar.
  const gradeSentence = (sentenceId, passed) => {
    setState((prev) => {
      const card = prev.cards[sentenceId] || newCard(sentenceId);
      const updated = gradeTest(card, passed);
      const xpGain = passed ? XP_PER_CORRECT : 0;
      return {
        ...prev,
        cards: { ...prev.cards, [sentenceId]: updated },
        xp: prev.xp + xpGain,
      };
    });
  };

  // Bir çalışma oturumu tamamlandığında streak ve günlük kaydı güncelle.
  const completeSession = (sentenceCount) => {
    setState((prev) => {
      const today = dayKey();
      let streak = prev.streak;
      if (prev.lastStudyDay === today) {
        // bugün zaten çalışıldı — streak değişmez
      } else if (prev.lastStudyDay && daysBetween(prev.lastStudyDay, today) === 1) {
        streak = prev.streak + 1;
      } else {
        streak = 1;
      }
      const longestStreak = Math.max(prev.longestStreak || 0, streak);
      const studyLog = { ...prev.studyLog, [today]: (prev.studyLog[today] || 0) + sentenceCount };
      return {
        ...prev,
        streak,
        longestStreak,
        lastStudyDay: today,
        studyLog,
        xp: prev.xp + XP_PER_SESSION,
      };
    });
  };

  // ---- Öğrenci ödevleri: sınıf koduyla katılınır, ödevler sunucudan gelir, sonuç sunucuya gider ----
  const setStudentProfile = (no, nk) =>
    setState((prev) => ({ ...prev, student: { ...prev.student, no: String(no).trim(), nk: (nk || '').trim() } }));

  const stateRef = useRef(state);
  stateRef.current = state;

  // Öğrenci cihazı tek anahtar (token) taşır; her ders (öğretmen + sınıf) ayrı üyeliktir: student.classes.
  const setStudent = (student) => {
    setState((prev) => ({ ...prev, student }));
    stateRef.current = { ...stateRef.current, student };
  };

  // Sunucudaki ders listesini cihaza al.
  const refreshClasses = async () => {
    const st = stateRef.current.student;
    if (!cloudEnabled || !st.token) return;
    const rows = await rpc('student_classes', { p_token: st.token });
    const classes = rows.map((r) => ({
      rid: r.student_id,
      cn: r.class_name,
      branch: r.branch,
      no: r.number,
      teacher: r.teacher_name || '',
      tAvatar: r.teacher_avatar || '',
      tSchool: r.teacher_school || '',
      tBio: r.teacher_bio || '',
      tHours: r.teacher_hours || '',
    }));
    const cur = stateRef.current.student;
    // Avatar başka cihazda seçildiyse (ör. telefon değişimi) sunucudakini al.
    const avatar = cur.avatar || (rows.find((r) => r.avatar) || {}).avatar || '';
    setStudent({ ...cur, avatar, classes, rid: classes[0] ? classes[0].rid : null, cn: classes[0] ? classes[0].cn : null });
  };

  // Derse katıl: öğretmenin QR'ındaki anahtar + okul numarası (+ takma ad). Cihazda anahtar varsa aynı anahtarla katılır.
  // Hata mesajını fırlatır.
  const joinClass = async (secret, no, nk) => {
    const cur = stateRef.current.student;
    const rows = await rpc('student_join', {
      p_join_code: secret.trim().toLowerCase(),
      p_number: String(no).trim(),
      p_nickname: (nk || '').trim() || null,
      p_token: cur.token || null,
    });
    const r = rows[0];
    const others = (cur.classes || []).filter((c) => c.rid !== r.student_id);
    const classes = [...others, { rid: r.student_id, cn: r.class_name, branch: r.branch, no: String(no).trim(), teacher: '' }];
    const student = { ...cur, no: String(no).trim(), nk: (nk || '').trim() || cur.nk, token: r.token, classes, rid: classes[0].rid, cn: classes[0].cn };
    setStudent(student);
    registerStudentPush(student).catch(() => {});
    if (student.avatar) rpc('student_set_profile', { p_token: r.token, p_nickname: student.nk || null, p_avatar: student.avatar }).catch(() => {});
    refreshClasses().catch(() => {});
    await refreshHomeworks();
    return r.class_name;
  };

  // Profil: takma ad + avatar. Cihaza hemen yazılır; derse katıldıysa tüm derslerdeki üyeliğe de (öğretmen görür).
  const setProfile = async ({ nk, avatar }) => {
    const cur = stateRef.current.student;
    const student = { ...cur, nk: nk != null ? String(nk).trim().slice(0, 30) : cur.nk, avatar: avatar != null ? avatar : cur.avatar };
    setStudent(student);
    if (cloudEnabled && student.token) {
      await rpc('student_set_profile', { p_token: student.token, p_nickname: student.nk || null, p_avatar: student.avatar || null });
    }
  };
  const setWeeklyGoal = (n) => setState((prev) => ({ ...prev, weeklyGoal: n }));
  const setReminder = (reminder) => setState((prev) => ({ ...prev, reminder }));

  // Yeni telefona geçiş: öğretmenin verdiği 6 haneli kod bütün dersleri taşır.
  const linkDevice = async (code) => {
    const rows = await rpc('student_link_device', { p_code: code.trim() });
    const r = rows[0];
    setStudent({ ...stateRef.current.student, no: r.number, rid: r.student_id, token: r.token, cn: r.class_name });
    await refreshClasses();
    registerStudentPush(stateRef.current.student).catch(() => {});
    await refreshHomeworks();
    return r.class_name;
  };

  // Tüm derslerin ödevlerini sunucudan çek; bekleyen sonuçları gönder. Öğretmenin sildiği (başlanmamış) ödevler kaldırılır.
  // Öğretmenin geri bildirimi/puanı mevcut ödeve işlenir.
  const refreshing = useRef(false);
  const refreshHomeworks = async () => {
    const st = stateRef.current.student;
    if (!cloudEnabled || !st.token || refreshing.current) return;
    refreshing.current = true;
    try {
      const rows = await rpc('student_feed', { p_token: st.token });
      const ids = new Set(rows.map((r) => r.id));
      setState((prev) => {
        const hws = { ...prev.homeworks };
        rows.forEach((r) => {
          const server = {
            type: r.kind,
            body: r.body || '',
            att: r.attachments || [],
            branch: r.branch,
            cn: r.class_name,
            srid: r.student_id,
            fb: r.feedback || r.score != null ? { text: r.feedback || '', score: r.score } : null,
          };
          hws[r.id] = hws[r.id]
            ? { ...hws[r.id], ...server }
            : { id: r.id, title: r.title, ...(r.payload || {}), ...server, due: r.due_date, receivedAt: Date.now(), cloud: true };
        });
        Object.values(hws).forEach((h) => {
          if (h.cloud && !ids.has(h.id) && !h.result && !h.sessionIds) delete hws[h.id];
        });
        return { ...prev, homeworks: hws };
      });
      await flushResults();
    } finally {
      refreshing.current = false;
    }
  };

  // Gönderilmemiş sonuçları sunucuya yolla (her ödev kendi ders üyeliğiyle: srid).
  const flushResults = async () => {
    const { student: st, homeworks } = stateRef.current;
    if (!st.token) return;
    for (const hw of Object.values(homeworks)) {
      if (!hw.cloud || !hw.result || hw.result.sent) continue;
      const sid = hw.srid || st.rid;
      if (!sid) continue;
      await rpc('student_submit', {
        p_student_id: sid,
        p_token: st.token,
        p_homework_id: hw.id,
        p_results: hw.result.res,
        p_duration_s: hw.result.durS ?? null,
        p_note: hw.result.note || null,
      });
      setState((prev) =>
        prev.homeworks[hw.id] ? { ...prev, homeworks: { ...prev.homeworks, [hw.id]: { ...prev.homeworks[hw.id], result: { ...prev.homeworks[hw.id].result, sent: true } } } } : prev
      );
    }
  };

  // Açılışta, uygulamaya dönünce ve dakikada bir (yalnızca sınıfa katılmış öğrencide).
  useEffect(() => {
    if (!loaded || !state.student.token) return undefined;
    refreshClasses().catch(() => {});
    refreshHomeworks().catch(() => {});
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshHomeworks().catch(() => {}));
    const iv = setInterval(() => refreshHomeworks().catch(() => {}), 60000);
    return () => {
      sub.remove();
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, state.student.token]);

  // data: decodePayload(...).data  ->  { cc, cn, list }
  const receiveHomeworks = (data, studentNo = state.student.no) => {
    const added = [];
    const skipped = [];
    const forOther = [];
    (data.list || []).forEach((hw) => {
      if (hw.to && String(hw.to) !== String(studentNo)) forOther.push(hw);
      else if (state.homeworks[hw.id]) skipped.push(hw);
      else added.push({ ...hw, cc: data.cc, cn: data.cn, receivedAt: Date.now() });
    });
    if (added.length) {
      setState((prev) => {
        const hws = { ...prev.homeworks };
        added.forEach((hw) => (hws[hw.id] = hw));
        return { ...prev, homeworks: hws };
      });
    }
    return { added, skipped, forOther };
  };

  // Ödevin cümle listesi ilk açılışta öğrencinin geçmişine göre seçilir ve SABİTLENİR.
  const startHomework = (id) => {
    const hw = state.homeworks[id];
    if (!hw) return [];
    let ids = hw.sessionIds;
    if (!ids) {
      ids = selectHomeworkIds(hw, state.cards);
      setState((prev) => ({ ...prev, homeworks: { ...prev.homeworks, [id]: { ...prev.homeworks[id], sessionIds: ids, startedAt: Date.now() } } }));
    }
    return sessionFromIds(ids);
  };

  // results: [{ id, grade: 'know'|'forgot' }]  ->  öğretmene gidecek kod
  const completeHomework = (id, results) => {
    const hw = state.homeworks[id];
    if (!hw) return null;
    const res = {};
    results.forEach((r) => (res[r.id] = r.grade === 'know' ? 1 : 0));
    const at = Date.now();
    const durS = hw.startedAt ? Math.min(86400, Math.round((at - hw.startedAt) / 1000)) : null;
    const dur = durS != null ? Math.max(1, Math.round(durS / 60)) : null;
    const result = { res, at, dur, durS, sent: false };
    setState((prev) => ({ ...prev, homeworks: { ...prev.homeworks, [id]: { ...prev.homeworks[id], result } } }));
    stateRef.current = { ...stateRef.current, homeworks: { ...stateRef.current.homeworks, [id]: { ...hw, result } } };
    if (hw.cloud) flushResults().catch(() => {});
    return hw.cloud ? null : resultCode({ ...hw, result });
  };

  // Görev ödevi: öğrenci "Tamamladım" der, isterse kısa not ekler (dosya gönderemez).
  const completeTask = (id, note) => {
    const hw = state.homeworks[id];
    if (!hw) return;
    const result = { res: {}, at: Date.now(), note: (note || '').trim().slice(0, 1000), sent: false };
    setState((prev) => ({ ...prev, homeworks: { ...prev.homeworks, [id]: { ...prev.homeworks[id], result } } }));
    stateRef.current = { ...stateRef.current, homeworks: { ...stateRef.current.homeworks, [id]: { ...hw, result } } };
    if (hw.cloud) flushResults().catch(() => {});
  };

  const resultCode = (hw) =>
    hw && hw.result
      ? encodePayload('R', { cc: hw.cc, no: state.student.no, nk: state.student.nk, h: hw.id, ht: hw.title, at: hw.result.at, dur: hw.result.dur, res: hw.result.res })
      : null;

  const removeStudentHomework = (id) =>
    setState((prev) => {
      const hws = { ...prev.homeworks };
      delete hws[id];
      return { ...prev, homeworks: hws };
    });

  const setDailyGoal = (goal) => setState((prev) => ({ ...prev, dailyGoal: goal }));

  const setSetting = (key, value) =>
    setState((prev) => ({ ...prev, settings: { ...prev.settings, [key]: value } }));

  // Sınıf bağlantısı (öğrenci kimliği + anahtar) korunur; yoksa numara "başka cihazda kayıtlı" kalır.
  const resetProgress = async () => {
    await clearState();
    setState((prev) => ({ ...DEFAULT_STATE, student: prev.student }));
  };

  // --- Türetilmiş veriler ---

  const stats = useMemo(() => {
    let mastered = 0;
    let learning = 0;
    let newCount = 0;
    let due = 0;
    // Tik aşama dağılımı: stage 1=mor, 2=mavi, 3=yeşil, 4=sarı
    const ticks = { mor: 0, mavi: 0, yesil: 0, sari: 0 };
    const now = Date.now();
    for (const s of ALL_SENTENCES) {
      const card = state.cards[s.id];
      if (isNew(card)) newCount += 1;
      else if (isMastered(card)) mastered += 1;
      else if (isLearning(card)) learning += 1;
      if (isDue(card, now)) due += 1;
      const t = tickFor(card);
      if (t) ticks[t.key] += 1;
    }
    return { mastered, learning, newCount, due, ticks, total: ALL_SENTENCES.length };
  }, [state.cards]);

  // Her kalıp için ilerleme + tik dağılımı.
  const patternStats = useMemo(() => {
    return PATTERNS.map((p) => {
      let mastered = 0;
      let seen = 0;
      const ticks = { mor: 0, mavi: 0, yesil: 0, sari: 0 };
      for (const s of p.sentences) {
        const card = state.cards[s.id];
        if (isMastered(card)) mastered += 1;
        if (!isNew(card)) seen += 1;
        const t = tickFor(card);
        if (t) ticks[t.key] += 1;
      }
      return { id: p.id, mastered, seen, ticks, total: p.sentences.length };
    });
  }, [state.cards]);

  // Bugün zamanı gelen tekrar sayısı (yeni hariç).
  const dueCount = useMemo(() => {
    const now = Date.now();
    return ALL_SENTENCES.filter((s) => isDue(state.cards[s.id], now)).length;
  }, [state.cards]);

  // Performans / durum panosu verisi.
  const performance = useMemo(() => {
    const now = Date.now();
    const todayKey = dayKey();
    const tomorrowEnd = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 59, 999);
      return d.getTime();
    })();
    const in7days = now + 7 * DAY;

    const cards = Object.values(state.cards);

    // --- Genel ilerleme ---
    let totalPass = 0;
    let totalFail = 0;
    let studied = 0; // en az 1 kez çalışılmış (mor+) cümle
    let mastered = 0; // sarı (ustalaşmış)
    const ticks = { mor: 0, mavi: 0, yesil: 0, sari: 0 };
    cards.forEach((c) => {
      totalPass += c.passCount || 0;
      totalFail += c.failCount || 0;
      if (c.stage > 0) studied += 1;
      if (c.stage >= MASTER_STAGE) mastered += 1;
      const t = tickFor(c);
      if (t) ticks[t.key] += 1;
    });
    const totalAttempts = totalPass + totalFail;
    const accuracy = totalAttempts > 0 ? totalPass / totalAttempts : 0;

    // --- Tekrar takvimi: zamanı gelen tekrarları türüne göre say ---
    // stage 1 -> günlük, stage 2 -> haftalık, stage 3 -> aylık (bir sonraki tekrar adı)
    const reviewName = { 1: 'gunluk', 2: 'haftalik', 3: 'aylik' };
    const dueToday = { gunluk: 0, haftalik: 0, aylik: 0, toplam: 0 };
    let dueTomorrow = 0;
    let dueThisWeek = 0; // bugün dahil 7 gün
    ALL_SENTENCES.forEach((s) => {
      const c = state.cards[s.id];
      if (!c || !c.stage || c.stage >= MASTER_STAGE) return;
      const nr = c.nextReview || 0;
      if (nr <= now) {
        const tip = reviewName[c.stage] || 'gunluk';
        dueToday[tip] += 1;
        dueToday.toplam += 1;
      } else if (nr <= tomorrowEnd) {
        dueTomorrow += 1;
      }
      if (nr <= in7days && nr > now) dueThisWeek += 1;
    });

    // --- Bugünün özeti: bugün kaç YENİ öğrendim + kaç TEKRAR yaptım (cümle başına 1) ---
    // firstLearned bugünse -> yeni; lastSeen bugün ama firstLearned bugün değilse -> tekrar.
    let learnedToday = 0;
    let reviewedToday = 0;
    cards.forEach((c) => {
      const seenToday = c.lastSeen && dayKey(new Date(c.lastSeen)) === todayKey;
      if (!seenToday) return;
      const firstToday = c.firstLearned && dayKey(new Date(c.firstLearned)) === todayKey;
      if (firstToday) learnedToday += 1;
      else reviewedToday += 1;
    });

    // Bugünün hedefi: yeni konu (goal) + bugün gelmiş tekrarlar. Ödev tamam mı?
    const goal = state.dailyGoal;
    const newRemaining = ALL_SENTENCES.filter((s) => isNew(state.cards[s.id])).length;
    const todayNewTarget = Math.min(goal, newRemaining + learnedToday); // bugün öğrenilebilir yeni
    const todayReviewTarget = dueToday.toplam + reviewedToday; // bugün toplam tekrar yükü
    const newDone = learnedToday >= Math.min(goal, todayNewTarget) || newRemaining === 0;
    const reviewDone = dueToday.toplam === 0;
    const homeworkDone = newDone && reviewDone;

    // --- Kategori bazında ilerleme ---
    const byCategory = CATEGORIES.map((cat) => {
      const pats = cat.patternIds.map((pid) => PATTERN_BY_ID[pid]).filter(Boolean);
      let total = 0;
      let seen = 0;
      let catMastered = 0;
      pats.forEach((p) => {
        p.sentences.forEach((s) => {
          total += 1;
          const card = state.cards[s.id];
          if (!isNew(card)) seen += 1;
          if (isMastered(card)) catMastered += 1;
        });
      });
      return { id: cat.id, name: cat.name, emoji: cat.emoji, total, seen, mastered: catMastered };
    });

    // --- Son 14 günün çalışma eğrisi ---
    const days = lastNDays(14);
    const daily = days.map((k) => ({ key: k, label: shortDayLabel(k), count: (state.studyLog || {})[k] || 0 }));
    const activeDays = Object.keys(state.studyLog || {}).length;

    return {
      // genel
      totalSentences: ALL_SENTENCES.length,
      studied,
      mastered,
      ticks,
      // doğruluk
      totalPass,
      totalFail,
      totalAttempts,
      accuracy,
      // bugün
      learnedToday,
      reviewedToday,
      homeworkDone,
      newDone,
      reviewDone,
      newRemaining,
      goal,
      // tekrar takvimi
      dueToday,
      dueTomorrow,
      dueThisWeek,
      // kategori
      byCategory,
      // eğri
      daily,
      activeDays,
    };
  }, [state.cards, state.studyLog, state.dailyGoal]);

  // Bugünün çalışma oturumunu kur:
  //   ÖNCE zamanı gelen TEKRARLAR (dünkü/haftalık/aylık), SONRA yeni konu cümleleri (goal kadar).
  // Böylece her gün: yeni konu + geçmiş konuların tekrarı birlikte gelir.
  const buildDailySession = (goal = state.dailyGoal) => {
    const now = Date.now();
    const due = ALL_SENTENCES
      .filter((s) => isDue(state.cards[s.id], now))
      .sort((a, b) => (state.cards[a.id]?.nextReview || 0) - (state.cards[b.id]?.nextReview || 0))
      .map((s) => ({ ...s, _kind: 'review' }));

    // Yeni cümleler: kotayı (goal) yeni cümleyle doldur — tekrarların ÜSTÜNE eklenir.
    const newOnes = ALL_SENTENCES
      .filter((s) => isNew(state.cards[s.id]))
      .slice(0, goal)
      .map((s) => ({ ...s, _kind: 'new' }));

    // Tekrarlar her zaman dahil; yeni konu goal kadar. Tekrar yoksa sadece yeni gelir.
    return [...due, ...newOnes];
  };

  // Belirli bir kalıbın cümlelerini çalışma oturumu olarak ver (kolaydan zora).
  const buildPatternSession = (patternId) => {
    const p = PATTERNS.find((x) => x.id === patternId);
    return p ? [...p.sentences].map((s) => ({ ...s, patternId: p.id, patternColor: p.color, patternName: p.name })) : [];
  };

  // Kütüphane: çalışılmış cümleler, KALIP BAŞLIKLARI altında gruplu.
  // filter: 'all' | 'mastered' | 'review'
  // Döner: [{ pattern, items: [...] }] — sadece dolu gruplar, kalıp sırasına göre.
  const buildLibraryGrouped = (filter = 'all') => {
    const now = Date.now();
    const groups = [];
    for (const p of PATTERNS) {
      let items = p.sentences.filter((s) => !isNew(state.cards[s.id]));
      if (filter === 'mastered') items = items.filter((s) => isMastered(state.cards[s.id]));
      else if (filter === 'review') items = items.filter((s) => isDue(state.cards[s.id], now));
      if (items.length === 0) continue;
      groups.push({
        pattern: p,
        items: items
          .map((s) => ({ ...s, patternId: p.id, patternColor: p.color, patternName: p.name, card: state.cards[s.id] }))
          .sort((a, b) => (a.level || 0) - (b.level || 0)),
      });
    }
    return groups;
  };

  // Geriye dönük: düz liste (gerekirse).
  const buildLibrary = (filter = 'all') =>
    buildLibraryGrouped(filter).flatMap((g) => g.items);

  // Verilen cümle id listesinden test oturumu kur (Kütüphane'den "test et").
  const buildSessionFromIds = (ids) =>
    ids.map((id) => SENTENCE_BY_ID[id]).filter(Boolean);

  const studiedToday = state.lastStudyDay === dayKey() ? (state.studyLog[dayKey()] || 0) : 0;

  const value = {
    loaded,
    state,
    stats,
    patternStats,
    performance,
    studiedToday,
    dueCount,
    gradeSentence,
    completeSession,
    setDailyGoal,
    setSetting,
    setStudentProfile,
    joinClass,
    setProfile,
    setWeeklyGoal,
    setReminder,
    linkDevice,
    refreshHomeworks,
    refreshClasses,
    completeTask,
    cloudEnabled,
    receiveHomeworks,
    startHomework,
    completeHomework,
    resultCode,
    removeStudentHomework,
    resetProgress,
    buildDailySession,
    buildPatternSession,
    buildLibrary,
    buildLibraryGrouped,
    buildSessionFromIds,
    cardFor: (id) => state.cards[id],
    statusOf: (id) => statusOf(state.cards[id]),
    tickFor: (id) => tickFor(state.cards[id]),
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress, ProgressProvider içinde kullanılmalı');
  return ctx;
}
