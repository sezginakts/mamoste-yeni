// Öğretmen verisi — cihazda (AsyncStorage) asıl kopya; öğretmen giriş yaptıysa sunucuyla eşitlenir (cloud.js).
// Her sınıf ayrı anahtarda tutulur (tek dev JSON'un boyut sınırına takılmamak için).
//
// Sınıf: { id, rid (sunucu id), cc (sınıf kodu — sunucudan), name, createdAt, students: { [sid]: Öğrenci }, homeworks: [Ödev], subsSince }
// Öğrenci: { id, rid, joined (uygulamadan katıldı mı), no, nk (öğretmenin yazdığı ad — sunucuya gitmez), nick (öğrencinin takma adı), createdAt,
//            attempts: { [cümleId]: { p, f, last } },       // doğru / yanlış sayısı
//            submissions: [{ h, at, c, t, dur }],             // teslim edilen ödevler
//            points: [{ id, d: +1|-1, tag, at }],
//            notes: [{ id, text, remind: 'YYYY-MM-DD'|null, done, at, nid }] }
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encodePayload, shortId, classCode } from '../utils/codec';
import { SENTENCE_BY_ID } from '../data/patterns';
import { scheduleReminder, cancelReminder } from '../utils/notify';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { syncClass, applySync, cloudDeleteClass, cloudDeleteHomework, cloudDeleteStudent, cloudUpdateStudentNo, cloudDeviceLink, cloudFeedback } from './cloud';

const emptyStudent = (id, no, nk) => ({ id, no: String(no), nk: nk || '', createdAt: Date.now(), attempts: {}, submissions: [], points: [], notes: [] });

const INDEX_KEY = '@ingapp/teacher/v1/index';
const CLASS_KEY = (id) => `@ingapp/teacher/v1/class/${id}`;

const Ctx = createContext(null);

export function TeacherProvider({ children }) {
  const [classes, setClasses] = useState({}); // id -> sınıf
  const [order, setOrder] = useState([]); // sınıf id sırası
  const [loaded, setLoaded] = useState(false);
  const dirty = useRef(new Set());
  const timer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const idx = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) || '[]');
        const all = {};
        for (const id of idx) {
          const raw = await AsyncStorage.getItem(CLASS_KEY(id));
          if (raw) all[id] = JSON.parse(raw);
        }
        setClasses(all);
        setOrder(idx.filter((id) => all[id]));
      } catch (e) {
        console.warn('öğretmen verisi okunamadı', e);
      }
      setLoaded(true);
    })();
  }, []);

  // Değişen sınıfları gecikmeli kaydet.
  useEffect(() => {
    if (!loaded) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(order));
        for (const id of dirty.current) {
          if (classes[id]) await AsyncStorage.setItem(CLASS_KEY(id), JSON.stringify(classes[id]));
          else await AsyncStorage.removeItem(CLASS_KEY(id));
        }
        dirty.current.clear();
      } catch (e) {
        console.warn('öğretmen verisi kaydedilemedi', e);
      }
    }, 300);
  }, [classes, order, loaded]);

  const mutate = (classId, fn) => {
    dirty.current.add(classId);
    setClasses((prev) => {
      if (!prev[classId]) return prev;
      const copy = JSON.parse(JSON.stringify(prev[classId]));
      fn(copy);
      return { ...prev, [classId]: copy };
    });
  };

  const mutateStudent = (classId, sid, fn) =>
    mutate(classId, (c) => {
      if (c.students[sid]) fn(c.students[sid], c);
    });

  // ---- Sunucu eşitlemesi (giriş yapılmışsa) ----
  const auth = useAuth();
  const userId = auth.user ? auth.user.id : null;
  const { branchId } = useRole();
  const classesRef = useRef(classes);
  classesRef.current = classes;
  const syncing = useRef(false);
  const again = useRef(false);
  const [sync, setSync] = useState({ at: null, error: null, busy: false });

  const syncAll = async () => {
    if (!userId) return;
    if (syncing.current) {
      again.current = true;
      return;
    }
    syncing.current = true;
    setSync((s) => ({ ...s, busy: true }));
    let error = null;
    try {
      for (const cls of Object.values(classesRef.current)) {
        const r = await syncClass(cls, userId, branchId || 'ingilizce');
        mutate(cls.id, (c) => applySync(c, r, { newId: shortId, emptyStudent }));
      }
    } catch (e) {
      error = /fetch|network/i.test(e.message) ? 'İnternet yok — bağlantı gelince eşitlenecek.' : e.message;
    }
    syncing.current = false;
    setSync({ at: Date.now(), error, busy: false });
    if (again.current) {
      again.current = false;
      setTimeout(syncAll, 300);
    }
  };
  const syncSoon = useRef(null);
  const requestSync = () => {
    if (!userId) return;
    clearTimeout(syncSoon.current);
    syncSoon.current = setTimeout(syncAll, 600);
  };

  // Açılışta, uygulamaya dönünce ve dakikada bir.
  useEffect(() => {
    if (!loaded || !userId) return undefined;
    syncAll();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && syncAll());
    const iv = setInterval(syncAll, 60000);
    return () => {
      sub.remove();
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, userId]);
  const cloud = (p) => userId && p && Promise.resolve(p).catch(() => {});

  // ---- Sınıf ----
  const addClass = (name) => {
    const used = new Set(Object.values(classes).map((c) => c.cc));
    let cc = classCode();
    while (used.has(cc)) cc = classCode();
    const id = shortId();
    const cls = { id, cc, name: name.trim() || 'Yeni sınıf', createdAt: Date.now(), students: {}, homeworks: [] };
    dirty.current.add(id);
    setClasses((p) => ({ ...p, [id]: cls }));
    setOrder((o) => [...o, id]);
    requestSync();
    return id;
  };
  const renameClass = (id, name) => {
    mutate(id, (c) => (c.name = name));
    requestSync();
  };
  const removeClass = (id) => {
    const c = classes[id];
    if (c && c.rid) cloud(cloudDeleteClass(c.rid));
    dirty.current.add(id);
    setClasses((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    setOrder((o) => o.filter((x) => x !== id));
  };

  // ---- Öğrenci ----
  // Satır biçimleri: "14 Ali K." | "14" | "1-30" (numara aralığı). Aynı numara varsa atlanır.
  const addStudents = (classId, text) => {
    const cls = classes[classId];
    if (!cls) return 0;
    const existing = new Set(Object.values(cls.students).map((s) => String(s.no)));
    const fresh = [];
    const push = (no, nk) => {
      no = String(no).trim();
      if (!no || existing.has(no)) return;
      const id = shortId() + fresh.length;
      fresh.push({ id, no, nk: (nk || '').trim(), createdAt: Date.now(), attempts: {}, submissions: [], points: [], notes: [] });
      existing.add(no);
    };
    String(text)
      .split(/\n|,|;/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        const range = line.match(/^(\d+)\s*-\s*(\d+)$/);
        if (range) {
          const a = +range[1];
          const b = Math.min(+range[2], a + 200);
          for (let i = a; i <= b; i++) push(i, '');
          return;
        }
        const m = line.match(/^(\d+)[\s.)-]*(.*)$/);
        if (m) push(m[1], m[2]);
        else push(String(existing.size + 1), line);
      });
    if (fresh.length) {
      mutate(classId, (c) => fresh.forEach((s) => (c.students[s.id] = s)));
      requestSync();
    }
    return fresh.length;
  };
  // Toplu içe aktarma (dosya / yapıştırma önizlemesinden): list = [{ no, nk }]. Aynı numara varsa atlanır.
  const addStudentList = (classId, list) => {
    const cls = classes[classId];
    if (!cls) return 0;
    const existing = new Set(Object.values(cls.students).map((s) => String(s.no)));
    const fresh = [];
    list.forEach(({ no, nk }) => {
      no = String(no || '').trim();
      if (!no || existing.has(no)) return;
      const id = shortId() + fresh.length;
      fresh.push({ id, no, nk: (nk || '').trim(), createdAt: Date.now(), attempts: {}, submissions: [], points: [], notes: [] });
      existing.add(no);
    });
    if (fresh.length) {
      mutate(classId, (c) => fresh.forEach((s) => (c.students[s.id] = s)));
      requestSync();
    }
    return fresh.length;
  };
  const updateStudent = (classId, sid, patch) => {
    const st = classes[classId] && classes[classId].students[sid];
    if (st && st.rid && patch.no != null && String(patch.no) !== String(st.no)) cloud(cloudUpdateStudentNo(st.rid, patch.no));
    mutateStudent(classId, sid, (s) => Object.assign(s, patch));
  };
  const removeStudent = (classId, sid) => {
    const st = classes[classId] && classes[classId].students[sid];
    if (st && st.rid) cloud(cloudDeleteStudent(st.rid));
    mutate(classId, (c) => delete c.students[sid]);
  };
  // Öğrenciyi yeni telefona bağlamak için tek kullanımlık 6 haneli kod (10 dk geçerli).
  const deviceLinkCode = async (classId, sid) => {
    const st = classes[classId] && classes[classId].students[sid];
    if (!userId) throw new Error('Önce giriş yapmalısın.');
    if (!st || !st.rid) throw new Error('Öğrenci henüz sunucuya eşitlenmedi; birazdan tekrar dene.');
    return cloudDeviceLink(st.rid);
  };
  // Görev teslimine geri bildirim + puan: önce sunucuya, sonra cihazdaki kayda.
  const giveFeedback = async (classId, sid, subId, text, score) => {
    if (!userId) throw new Error('Önce giriş yapmalısın.');
    await cloudFeedback(subId, text, score);
    mutateStudent(classId, sid, (s) => {
      const e = (s.submissions || []).find((x) => x.sub === subId);
      if (e) e.fb = { text: text || '', score: score ?? null };
    });
  };

  // ---- Artı / eksi ----
  const addPoint = (classId, sid, d, tag) =>
    mutateStudent(classId, sid, (s) => s.points.push({ id: shortId(), d, tag: tag || null, at: Date.now() }));
  const removePoint = (classId, sid, pid) =>
    mutateStudent(classId, sid, (s) => (s.points = s.points.filter((p) => p.id !== pid)));

  // ---- Not + hatırlatıcı ----
  const addNote = async (classId, sid, text, remind) => {
    const cls = classes[classId];
    const st = cls && cls.students[sid];
    const nid = remind ? await scheduleReminder(remind, `${cls.name} · ${st.no} ${st.nk || ''}`, text) : null;
    mutateStudent(classId, sid, (s) => s.notes.unshift({ id: shortId(), text: text.trim(), remind: remind || null, done: false, at: Date.now(), nid }));
  };
  const toggleNote = (classId, sid, noteId) =>
    mutateStudent(classId, sid, (s) => {
      const n = s.notes.find((x) => x.id === noteId);
      if (n) {
        n.done = !n.done;
        if (n.done && n.nid) cancelReminder(n.nid);
      }
    });
  const removeNote = (classId, sid, noteId) =>
    mutateStudent(classId, sid, (s) => {
      const n = s.notes.find((x) => x.id === noteId);
      if (n && n.nid) cancelReminder(n.nid);
      s.notes = s.notes.filter((x) => x.id !== noteId);
    });

  // ---- Ödev ----
  // list: [ödev...] — haftalık planda birden çok ödev. Sunucuya hemen gönderilir (öğrenciye bildirim gider).
  const addHomeworks = (classId, list) => {
    const withIds = list.map((hw) => ({ ...hw, id: hw.id || shortId(), createdAt: Date.now() }));
    mutate(classId, (c) => c.homeworks.unshift(...withIds));
    requestSync();
    return { list: withIds };
  };
  const removeHomework = (classId, hwId) => {
    const h = classes[classId] && classes[classId].homeworks.find((x) => x.id === hwId);
    if (h && h.rid) cloud(cloudDeleteHomework(h.rid));
    mutate(classId, (c) => (c.homeworks = c.homeworks.filter((x) => x.id !== hwId)));
  };

  const packHomeworks = (cls, list) => {
    const to = (hw) => (hw.to && cls.students[hw.to] ? cls.students[hw.to].no : undefined);
    return encodePayload('H', {
      cc: cls.cc,
      cn: cls.name,
      list: list.map((hw) => ({ id: hw.id, title: hw.title, kind: hw.kind, p: hw.p, n: hw.n, r: hw.r, ids: hw.ids, due: hw.due, to: to(hw) })),
    });
  };

  // ---- Sonuç içe aktarma (öğrencinin QR'ı) ----
  const importResult = (data) => {
    const cls = Object.values(classes).find((c) => c.cc === data.cc);
    if (!cls) return { ok: false, msg: `Bu sonuç "${data.cc}" kodlu sınıfa ait; bu cihazda böyle bir sınıf yok.` };
    let st = Object.values(cls.students).find((s) => String(s.no) === String(data.no));
    let created = false;
    let sid = st ? st.id : null;
    if (!st) {
      sid = shortId();
      created = true;
    } else if ((st.submissions || []).some((x) => x.h === data.h && x.at === data.at)) {
      return { ok: false, msg: `${cls.name} · ${st.no} ${st.nk || ''}: bu sonuç zaten okutulmuş.`, dup: true };
    }
    const entries = Object.entries(data.res || {}).filter(([id]) => SENTENCE_BY_ID[id]);
    const c = entries.filter(([, v]) => v === 1).length;
    mutate(cls.id, (k) => {
      if (created) k.students[sid] = { id: sid, no: String(data.no), nk: data.nk || '', createdAt: Date.now(), attempts: {}, submissions: [], points: [], notes: [] };
      const s = k.students[sid];
      if (!s.nk && data.nk) s.nk = data.nk;
      entries.forEach(([id, v]) => {
        const a = s.attempts[id] || { p: 0, f: 0, last: 0 };
        if (v === 1) a.p += 1;
        else a.f += 1;
        a.last = Math.max(a.last, data.at || Date.now());
        s.attempts[id] = a;
      });
      s.submissions.unshift({ h: data.h, at: data.at || Date.now(), c, t: entries.length, dur: data.dur || null, title: data.ht || null });
    });
    const hw = cls.homeworks.find((h) => h.id === data.h);
    return {
      ok: true,
      created,
      msg: `${cls.name} · ${data.no} ${data.nk || ''} — ${hw ? hw.title : 'ödev'}: ${c}/${entries.length} doğru${created ? ' (yeni öğrenci eklendi)' : ''}`,
    };
  };

  // ---- Akıllı tahta: sınıf içinde sözlü cevap ----
  const recordAttempt = (classId, sid, sentenceId, correct) =>
    mutateStudent(classId, sid, (s) => {
      const a = s.attempts[sentenceId] || { p: 0, f: 0, last: 0 };
      if (correct) a.p += 1;
      else a.f += 1;
      a.last = Date.now();
      s.attempts[sentenceId] = a;
    });

  // ---- Yedek ----
  const exportBackup = () => JSON.stringify({ app: 'ingapp-teacher', v: 1, at: Date.now(), order, classes });
  const importBackup = (text) => {
    try {
      const d = JSON.parse(text);
      if (d.app !== 'ingapp-teacher' || !d.classes) return { ok: false, msg: 'Bu metin bir öğretmen yedeği değil.' };
      Object.keys(classes).forEach((id) => dirty.current.add(id));
      Object.keys(d.classes).forEach((id) => dirty.current.add(id));
      setClasses(d.classes);
      setOrder((d.order || Object.keys(d.classes)).filter((id) => d.classes[id]));
      return { ok: true, msg: `${Object.keys(d.classes).length} sınıf geri yüklendi.` };
    } catch (e) {
      return { ok: false, msg: 'Yedek okunamadı — metnin tamamı kopyalandı mı?' };
    }
  };

  const list = useMemo(() => order.map((id) => classes[id]).filter(Boolean), [order, classes]);

  const value = {
    loaded,
    cloudOn: !!userId,
    sync,
    syncNow: syncAll,
    deviceLinkCode,
    giveFeedback,
    branchId,
    classes: list,
    getClass: (id) => classes[id],
    addClass,
    renameClass,
    removeClass,
    addStudents,
    addStudentList,
    updateStudent,
    removeStudent,
    addPoint,
    removePoint,
    addNote,
    toggleNote,
    removeNote,
    addHomeworks,
    removeHomework,
    packHomeworks,
    importResult,
    recordAttempt,
    exportBackup,
    importBackup,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTeacher() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTeacher, TeacherProvider içinde kullanılmalı');
  return c;
}
