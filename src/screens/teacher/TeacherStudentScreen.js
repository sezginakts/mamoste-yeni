// Öğrenci profili: sayılar (otomatik), artı/eksi ve notlar (öğretmen). Yorum öğretmenindir.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { PATTERNS, SENTENCE_BY_ID } from '../../data/patterns';
import { studentPatternStats, studentTotals, accColor, addDays, POINT_TAGS } from '../../teacher/analytics';
import { Header, Card, SectionTitle, Field, SmallButton, Chip, Stat, Empty, formatDate, formatTime, confirmAction, notify } from '../../teacher/ui';
import { dayKey } from '../../utils/helpers';
import { useRole } from '../../context/RoleContext';

export default function TeacherStudentScreen({ route, navigation }) {
  const { classId, studentId } = route.params;
  const { colors } = useTheme();
  const t = useTeacher();
  const { branch } = useRole();
  const drills = !branch || branch.drills;
  const cls = t.getClass(classId);
  const s = cls && cls.students[studentId];
  const [tag, setTag] = useState(null);
  const [note, setNote] = useState('');
  const [remind, setRemind] = useState(null);
  const [edit, setEdit] = useState(null);
  const [link, setLink] = useState(null);

  const ps = useMemo(() => (s ? studentPatternStats(s) : {}), [s]);
  const tot = useMemo(() => (s ? studentTotals(s) : null), [s]);
  const hardest = useMemo(() => {
    if (!s) return [];
    return Object.entries(s.attempts || {})
      .filter(([, a]) => a.f > 0)
      .sort((a, b) => b[1].f - a[1].f || a[1].p - b[1].p)
      .slice(0, 6)
      .map(([id, a]) => ({ s: SENTENCE_BY_ID[id], a }))
      .filter((x) => x.s);
  }, [s]);

  if (!s) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Öğrenci bulunamadı" onBack={() => navigation.goBack()} /></View>;

  const today = dayKey();
  const remindOpts = [
    [null, 'Hatırlatma yok'],
    [addDays(today, 1), 'Yarın'],
    [addDays(today, 3), '3 gün sonra'],
    [addDays(today, 7), '1 hafta sonra'],
  ];

  const saveNote = async () => {
    if (!note.trim()) return;
    await t.addNote(classId, studentId, note, remind);
    setNote('');
    setRemind(null);
  };

  const del = () => {
    const go = () => {
      t.removeStudent(classId, studentId);
      navigation.goBack();
    };
    confirmAction({ title: 'Öğrenciyi sınıftan çıkar', message: 'Öğrenci ve tüm kayıtları silinsin mi? Telefonundaki bu ders de kalkar.', ok: 'Çıkar', destructive: true, onOk: go });
  };

  const usedPatterns = PATTERNS.filter((p) => ps[p.id] && ps[p.id].t > 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={`${s.no} ${s.nk || ''}`} subtitle={cls.name} onBack={() => navigation.goBack()} right={<SmallButton title="✏️" onPress={() => setEdit({ no: s.no, nk: s.nk })} />} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        {edit ? (
          <Card>
            <Field label="Numara" value={edit.no} onChangeText={(v) => setEdit({ ...edit, no: v })} />
            <Field label="Takma ad" value={edit.nk} onChangeText={(v) => setEdit({ ...edit, nk: v })} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <SmallButton title="Kaydet" filled onPress={() => { t.updateStudent(classId, studentId, { no: edit.no.trim() || s.no, nk: edit.nk.trim() }); setEdit(null); }} />
              <SmallButton title="Vazgeç" onPress={() => setEdit(null)} />
              <View style={{ flex: 1 }} />
              <SmallButton title="Öğrenciyi sil" color={colors.danger} onPress={del} />
            </View>
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {drills ? <Stat value={tot.t ? `%${Math.round(tot.acc * 100)}` : '—'} label={`${tot.p} doğru / ${tot.f} yanlış`} color={accColor(tot.acc, colors)} /> : null}
          <Stat value={`${tot.points > 0 ? '+' : ''}${tot.points}`} label="puan" color={tot.points >= 0 ? colors.success : colors.danger} />
          <Stat value={s.submissions.length} label="teslim" />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: font.tiny, marginTop: 6 }}>Son çalışma: {formatTime(tot.last)}</Text>

        {drills ? (
          <SmallButton title="📝 Bu öğrenciye ödev ver (takıldıkları otomatik)" filled style={{ marginTop: spacing.md }} onPress={() => navigation.navigate('HomeworkCreate', { classId, studentId })} />
        ) : (
          <SmallButton title="📋 Bu öğrenciye görev ver" filled style={{ marginTop: spacing.md }} onPress={() => navigation.navigate('TaskCreate', { classId, studentId })} />
        )}

        {/* Uygulamaya katılım + yeni telefona bağlama kodu */}
        {t.cloudOn ? (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>
              {s.joined ? '📱 Uygulamadan sınıfa katıldı' : '◌ Henüz uygulamadan katılmadı'}
              {s.nick ? <Text style={{ color: colors.textMuted, fontWeight: '600' }}> · takma adı “{s.nick}”</Text> : null}
            </Text>
            {s.joined ? (
              link ? (
                <Text style={{ color: colors.text, marginTop: spacing.sm }}>
                  Bağlama kodu: <Text style={{ fontSize: 26, fontWeight: '900', letterSpacing: 4, color: colors.accent }} selectable>{link}</Text>
                  {'\n'}
                  <Text style={{ color: colors.textMuted, fontSize: font.small }}>10 dakika geçerli, tek kullanımlık. Öğrenci yeni telefonda “Sınıfa katıl → Yeni telefona geç”e yazar.</Text>
                </Text>
              ) : (
                <SmallButton
                  title="Telefon değiştirdi → bağlama kodu üret"
                  style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
                  onPress={async () => {
                    try {
                      setLink(await t.deviceLinkCode(classId, studentId));
                    } catch (e) {
                      setLink(null);
                      notify('Kod üretilemedi', e.message);
                    }
                  }}
                />
              )
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 4 }}>
                Öğrenci Okul uygulamasında “Derse katıl”a sınıf kodunu ve {s.no} numarasını yazarak katılır.
              </Text>
            )}
          </Card>
        ) : null}

        {/* --- Artı / eksi --- */}
        <SectionTitle>ARTI / EKSİ</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {POINT_TAGS.map((tg) => (
            <Chip key={tg} small label={tg} active={tag === tg} onPress={() => setTag(tag === tg ? null : tg)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          <Pressable style={[st.big, { backgroundColor: colors.success }]} onPress={() => { t.addPoint(classId, studentId, 1, tag); setTag(null); }}>
            <Text style={st.bigT}>＋1</Text>
          </Pressable>
          <Pressable style={[st.big, { backgroundColor: colors.danger }]} onPress={() => { t.addPoint(classId, studentId, -1, tag); setTag(null); }}>
            <Text style={st.bigT}>−1</Text>
          </Pressable>
        </View>
        {s.points.slice(-8).reverse().map((p) => (
          <View key={p.id} style={[st.line, { borderColor: colors.border }]}>
            <Text style={{ color: p.d > 0 ? colors.success : colors.danger, fontWeight: '900', width: 34 }}>{p.d > 0 ? '+1' : '−1'}</Text>
            <Text style={{ color: colors.text, flex: 1 }}>{p.tag || '—'}</Text>
            <Text style={{ color: colors.textFaint, fontSize: font.tiny }}>{formatTime(p.at)}</Text>
            <Pressable onPress={() => t.removePoint(classId, studentId, p.id)} hitSlop={8} style={{ marginLeft: 10 }}>
              <Text style={{ color: colors.textFaint }}>✕</Text>
            </Pressable>
          </View>
        ))}

        {/* --- Notlar --- */}
        <SectionTitle>NOTLAR & HATIRLATICI</SectionTitle>
        <Field value={note} onChangeText={setNote} multiline placeholder="ör. must kalıbında olumsuzu karıştırıyor — Cuma tekrar sor" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {remindOpts.map(([k, l]) => (
            <Chip key={l} small label={k ? `⏰ ${l}` : l} active={remind === k} onPress={() => setRemind(k)} />
          ))}
        </View>
        <SmallButton title="Notu kaydet" filled onPress={saveNote} disabled={!note.trim()} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
        {s.notes.map((n) => (
          <Card key={n.id} style={{ marginTop: spacing.sm, opacity: n.done ? 0.5 : 1 }}>
            <Text style={{ color: colors.text, textDecorationLine: n.done ? 'line-through' : 'none' }}>{n.text}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={{ color: n.remind && !n.done && n.remind <= today ? colors.danger : colors.textFaint, fontSize: font.tiny, flex: 1 }}>
                {formatTime(n.at)}{n.remind ? ` · ⏰ ${formatDate(n.remind)}` : ''}
              </Text>
              <SmallButton title={n.done ? 'Geri al' : '✓ Tamam'} onPress={() => t.toggleNote(classId, studentId, n.id)} style={{ paddingVertical: 4 }} />
              <Pressable onPress={() => t.removeNote(classId, studentId, n.id)} hitSlop={8} style={{ marginLeft: 12 }}>
                <Text style={{ color: colors.textFaint }}>🗑</Text>
              </Pressable>
            </View>
          </Card>
        ))}

        {/* --- Kalıp performansı (yalnız İngilizce) --- */}
        {drills ? (
        <>
        <SectionTitle>KALIPLARA GÖRE</SectionTitle>
        {usedPatterns.length === 0 ? <Empty text="Henüz cevap verisi yok. Ödev sonucu okutulunca ya da tahtada cevap verince dolar." /> : null}
        {usedPatterns.map((p) => {
          const o = ps[p.id];
          const ratio = o.t ? o.p / o.t : 0;
          return (
            <View key={p.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ color: colors.text, flex: 1, fontWeight: '700' }}>{p.emoji} {p.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: font.small }}>{o.p}/{o.t}</Text>
              </View>
              <View style={[st.bar, { backgroundColor: colors.cardSoft }]}>
                <View style={{ width: `${Math.round(ratio * 100)}%`, height: '100%', backgroundColor: accColor(o.acc, colors), borderRadius: 6 }} />
              </View>
            </View>
          );
        })}

        {hardest.length ? (
          <>
            <SectionTitle>EN ÇOK TAKILDIĞI CÜMLELER</SectionTitle>
            {hardest.map(({ s: sen, a }) => (
              <View key={sen.id} style={[st.line, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, flex: 1 }}>{sen.en}</Text>
                <Text style={{ color: colors.danger, fontSize: font.small }}>✗{a.f}</Text>
                <Text style={{ color: colors.success, fontSize: font.small, marginLeft: 8 }}>✓{a.p}</Text>
              </View>
            ))}
          </>
        ) : null}
        </>
        ) : null}

        <SectionTitle>TESLİM ETTİĞİ ÖDEVLER</SectionTitle>
        {s.submissions.length === 0 ? <Empty text="Henüz teslim yok." /> : null}
        {s.submissions.map((x, i) => {
          const hw = cls.homeworks.find((h) => h.id === x.h);
          if (x.task) return <TaskSubmission key={i} x={x} hw={hw} classId={classId} studentId={studentId} />;
          return (
            <View key={i} style={[st.line, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, flex: 1 }}>{hw ? hw.title : x.title || 'Ödev'}</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.small }}>{x.c}/{x.t}{x.dur != null ? ` · ${x.dur} dk` : ''}</Text>
              <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginLeft: 8 }}>{formatTime(x.at)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Görev teslimi: öğrencinin notu + öğretmenin geri bildirimi ve puanı (sunucuya yazılır, öğrenci görür).
function TaskSubmission({ x, hw, classId, studentId }) {
  const { colors } = useTheme();
  const t = useTeacher();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(x.fb ? x.fb.text : '');
  const [score, setScore] = useState(x.fb && x.fb.score != null ? String(x.fb.score) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const n = score.trim() === '' ? null : Math.max(0, Math.min(100, parseInt(score, 10) || 0));
      await t.giveFeedback(classId, studentId, x.sub, text.trim(), n);
      setOpen(false);
    } catch (e) {
      setErr(/fetch|network/i.test(e.message) ? 'İnternet yok.' : e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[st.task, { borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: colors.text, flex: 1, fontWeight: '700' }}>📋 {hw ? hw.title : x.title || 'Görev'}</Text>
        <Text style={{ color: colors.textFaint, fontSize: font.tiny }}>{formatTime(x.at)}</Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>✓ Tamamladı{x.note ? ` — “${x.note}”` : ''}</Text>
      {x.fb && !open ? (
        <Text style={{ color: colors.accent, fontSize: font.small, marginTop: 4 }}>
          💬 {x.fb.text || '—'}{x.fb.score != null ? ` · ${x.fb.score} puan` : ''}
        </Text>
      ) : null}
      {open ? (
        <View style={{ marginTop: spacing.sm }}>
          <Field label="Geri bildirim" value={text} onChangeText={(v) => setText(v.slice(0, 1000))} placeholder="ör. Eskizin çok özenli, ölçüleri de ekle." multiline />
          <Field label="Puan (0–100, isteğe bağlı)" value={score} onChangeText={(v) => setScore(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="ör. 90" />
          {err ? <Text style={{ color: colors.danger, marginBottom: 6 }}>{err}</Text> : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <SmallButton title={busy ? 'Gönderiliyor…' : 'Gönder'} filled onPress={save} disabled={busy} />
            <SmallButton title="Vazgeç" color={colors.textMuted} onPress={() => setOpen(false)} />
          </View>
        </View>
      ) : (
        <SmallButton title={x.fb ? 'Geri bildirimi düzenle' : '💬 Geri bildirim ver'} onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  task: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  big: { flex: 1, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bigT: { color: '#fff', fontSize: 24, fontWeight: '900' },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  bar: { height: 10, borderRadius: 6, marginTop: 4, overflow: 'hidden' },
});
