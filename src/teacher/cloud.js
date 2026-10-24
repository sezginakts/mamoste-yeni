// Öğretmen verisinin sunucuyla (Supabase) eşitlenmesi.
// Cihazdaki veri asıl kaynaktır; burada sınıf/öğrenci/ödev sunucuya yazılır, öğrenci katılımları ve sonuçlar çekilir.
// GİZLİLİK: öğrencinin cihazdaki adı (nk) sunucuya GÖNDERİLMEZ; yalnızca okul numarası gider.
import { supabase } from '../lib/supabase';

const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};
const validNo = (no) => /^[0-9]{1,6}$/.test(String(no));

// Bir sınıfı eşitle. Döner: mutate'e uygulanacak sonuç (applySync ile).
// branch: öğretmenin branşı (sınıf ilk açılırken yazılır, sonra değişmez).
export async function syncClass(cls, userId, branch = 'ingilizce') {
  let sid = cls.rid;
  let cc = cls.cc;
  if (!sid) {
    const row = must(await supabase.from('classes').insert({ teacher_id: userId, name: cls.name.slice(0, 40), branch }).select('id, join_code').single());
    sid = row.id;
    cc = row.join_code;
  } else if (cls.syncedName !== cls.name) {
    must(await supabase.from('classes').update({ name: cls.name.slice(0, 40) }).eq('id', sid));
  }
  // Davet kodu (öğretmen başka cihazda yenilemiş olabilir). Sunucuda migration yoksa hata verir; eşitleme yine de sürsün.
  const join = (await supabase.from('classes').select('invite_code, branch').eq('id', sid).single()).data || {};

  // Öğretmenin eklediği numaralar (isim değil) sunucuya.
  const nums = Object.values(cls.students)
    .filter((s) => !s.rid && validNo(s.no))
    .map((s) => ({ class_id: sid, number: String(s.no) }));
  if (nums.length) must(await supabase.from('students').upsert(nums, { onConflict: 'class_id,number', ignoreDuplicates: true }));
  const students = must(await supabase.from('students').select('id, number, nickname, joined_at').eq('class_id', sid));
  const byNo = Object.fromEntries(students.map((s) => [s.number, s.id]));

  // Henüz gönderilmemiş ödevler.
  const hwSids = {};
  for (const hw of cls.homeworks || []) {
    if (hw.rid) continue;
    const to = hw.to && cls.students[hw.to] ? byNo[String(cls.students[hw.to].no)] : null;
    if (hw.to && !to) continue; // hedef öğrenci sunucuda yoksa sonra tekrar dene
    const row = must(
      await supabase
        .from('homeworks')
        .insert({
          class_id: sid,
          title: String(hw.title || 'Ödev').slice(0, 80),
          // Görev ödevi: açıklama + öğretmenin foto/videoları; cümle ödevi: payload.
          kind: hw.type === 'task' ? 'task' : 'sentences',
          body: hw.type === 'task' ? String(hw.body || '').slice(0, 4000) : null,
          attachments: hw.type === 'task' ? (hw.att || []).map((a) => ({ path: a.path, url: a.url, type: a.type, name: a.name || '' })) : [],
          payload: hw.type === 'task' ? {} : { kind: hw.kind, p: hw.p, n: hw.n, r: hw.r, ids: hw.ids },
          due_date: hw.due || null,
          target_student_id: to,
        })
        .select('id')
        .single()
    );
    hwSids[hw.id] = row.id;
  }

  // Yeni sonuçlar (son eşitlemeden sonra gelenler).
  const allHw = (cls.homeworks || []).map((h) => hwSids[h.id] || h.rid).filter(Boolean);
  let subs = [];
  if (allHw.length) {
    let q = supabase
      .from('submissions')
      .select('id, homework_id, student_id, results, duration_s, submitted_at, note')
      .in('homework_id', allHw)
      .order('submitted_at', { ascending: true });
    if (cls.subsSince) q = q.gt('submitted_at', cls.subsSince);
    subs = must(await q);
  }
  return { rid: sid, cc, code: join.invite_code || null, branch: join.branch || null, students, hwSids, subs, syncedName: cls.name };
}

// syncClass sonucunu cihazdaki sınıf kopyasına uygula (mutate içinde çağrılır).
export function applySync(c, r, { newId, emptyStudent }) {
  c.rid = r.rid;
  c.cc = r.cc;
  c.code = r.code;
  if (r.branch) c.branch = r.branch;
  c.syncedName = r.syncedName;
  const localByNo = {};
  Object.values(c.students).forEach((s) => (localByNo[String(s.no)] = s));
  r.students.forEach((ss) => {
    let s = localByNo[ss.number];
    if (!s) {
      s = emptyStudent(newId(), ss.number, ss.nickname || '');
      c.students[s.id] = s;
      localByNo[ss.number] = s;
    }
    s.rid = ss.id;
    s.joined = !!ss.joined_at;
    if (ss.nickname) s.nick = ss.nickname; // öğrencinin kendi yazdığı takma ad (ayrı alan; öğretmenin yazdığı adı ezmez)
  });
  (c.homeworks || []).forEach((h) => {
    if (r.hwSids[h.id]) h.rid = r.hwSids[h.id];
  });
  const stBySid = {};
  Object.values(c.students).forEach((s) => s.rid && (stBySid[s.rid] = s));
  const hwBySid = {};
  (c.homeworks || []).forEach((h) => h.rid && (hwBySid[h.rid] = h));
  r.subs.forEach((sub) => {
    const s = stBySid[sub.student_id];
    const h = hwBySid[sub.homework_id];
    if (!s || !h || (s.submissions || []).some((x) => x.sub === sub.id)) return;
    const at = new Date(sub.submitted_at).getTime();
    const entries = Object.entries(sub.results || {});
    entries.forEach(([id, v]) => {
      const a = s.attempts[id] || { p: 0, f: 0, last: 0 };
      if (v === 1) a.p += 1;
      else a.f += 1;
      a.last = Math.max(a.last, at);
      s.attempts[id] = a;
    });
    s.submissions.unshift({
      sub: sub.id,
      h: h.id,
      at,
      c: entries.filter(([, v]) => v === 1).length,
      t: entries.length,
      dur: sub.duration_s != null ? Math.max(1, Math.round(sub.duration_s / 60)) : null,
      title: h.title,
      ...(h.type === 'task' ? { task: true, note: sub.note || '' } : {}),
    });
    if (!c.subsSince || sub.submitted_at > c.subsSince) c.subsSince = sub.submitted_at;
  });
}

// Silme / yeniden adlandırma anında sunucuya (hata olursa sessizce geçer; sonraki eşitleme düzeltmez — kayıt yerelde zaten silindi).
export const cloudDeleteClass = (rid) => supabase.from('classes').delete().eq('id', rid);
export const cloudDeleteHomework = (rid) => supabase.from('homeworks').delete().eq('id', rid);
export const cloudUpdateStudentNo = (rid, no) => supabase.from('students').update({ number: String(no) }).eq('id', rid);
export const cloudDeleteStudent = (rid) => supabase.from('students').delete().eq('id', rid);
// Görev sonucuna geri bildirim + puan (0–100, boş bırakılabilir).
export const cloudFeedback = async (subRid, text, score) =>
  must(await supabase.from('submissions').update({ feedback: text || null, score: score ?? null, feedback_at: new Date().toISOString() }).eq('id', subRid));
export const cloudDeviceLink = async (studentRid) => must(await supabase.rpc('create_device_link', { p_student_id: studentRid }));
// Davet kodunu yenile (eski kod çalışmaz, sınıftakiler kalır): tek sınıf / öğretmenin tüm sınıfları.
export const cloudNewCode = async (rid) => must(await supabase.rpc('teacher_new_code', { p_class_id: rid }));
export const cloudNewCodesAll = async () => must(await supabase.rpc('teacher_new_codes_all'));
// Öğretmen profili (öğrenciler derslerinde görür).
export const cloudTeacherProfile = async (userId) =>
  must(await supabase.from('teachers').select('display_name, avatar, school, bio, contact_hours').eq('id', userId).maybeSingle());
export const cloudSaveTeacherProfile = async (userId, p) => must(await supabase.from('teachers').update(p).eq('id', userId));
