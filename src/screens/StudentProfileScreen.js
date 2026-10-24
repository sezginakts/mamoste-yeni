// Öğrenci profili: avatar (emoji) + takma ad, derslerim (öğretmen tanıtımıyla), ilerleme, seri/seviye/rozetler,
// haftalık hedef, hatırlatıcı. Fotoğraf, telefon, e-posta, doğum tarihi istenmez; okul numarası yalnızca öğretmene görünür.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { spacing, font, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useProgress } from '../context/ProgressContext';
import { Header, Card, SectionTitle, Field, SmallButton, Chip, Stat } from '../teacher/ui';
import { STUDENT_AVATARS, levelOf } from '../data/avatars';
import { branchOf } from '../data/branches';
import { dayKey } from '../utils/helpers';
import { scheduleDaily, cancelReminder } from '../utils/notify';

const WEEK_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const REMINDER_TIMES = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

// Bu haftanın (Pazartesi başlar) gün anahtarları.
function thisWeek() {
  const d = new Date();
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => dayKey(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)));
}

export default function StudentProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const p = useProgress();
  const { state, stats } = p;
  const st = state.student;
  const classes = st.classes || [];
  const [nk, setNk] = useState(st.nk || '');
  const [avatar, setAvatar] = useState(st.avatar || '');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null); // açık ders kartı (öğretmen tanıtımı)
  const dirty = nk.trim() !== (st.nk || '') || avatar !== (st.avatar || '');

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await p.setProfile({ nk, avatar });
      setMsg({ ok: true, text: classes.length ? 'Kaydedildi. Öğretmenlerin yeni takma adını ve avatarını görür.' : 'Kaydedildi.' });
    } catch (e) {
      setMsg({ ok: false, text: `Telefonuna kaydedildi ama öğretmenine gönderilemedi: ${e.message}` });
    }
    setBusy(false);
  };

  // Ödevler: alınan / biten; cümle ödevlerinde doğru oranı, görevlerde öğretmen puanı ortalaması.
  const hw = useMemo(() => {
    const all = Object.values(state.homeworks || {});
    const done = all.filter((h) => h.result);
    let c = 0;
    let t = 0;
    const scores = [];
    done.forEach((h) => {
      Object.values(h.result.res || {}).forEach((v) => {
        t += 1;
        if (v === 1) c += 1;
      });
      if (h.fb && h.fb.score != null) scores.push(h.fb.score);
    });
    return {
      total: all.length,
      done: done.length,
      acc: t ? c / t : null,
      // Tam puan: cümle ödevinde hepsi doğru ya da görevde öğretmenden 100.
      perfect: done.some((h) => {
        const v = Object.values(h.result.res || {});
        return (v.length > 0 && v.every((x) => x === 1)) || (h.fb && h.fb.score === 100);
      }),
      score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      days: new Set(done.map((h) => h.result.at && dayKey(new Date(h.result.at))).filter(Boolean)),
    };
  }, [state.homeworks]);

  // Haftalık hedef: bu hafta çalışılan gün (İngilizce çalışma ya da ödev bitirme).
  const week = thisWeek();
  const activeWeek = week.map((k) => !!(state.studyLog || {})[k] || hw.days.has(k));
  const activeCount = activeWeek.filter(Boolean).length;
  // Seri, XP, seviye ve kalıp sayıları İngilizce çalışmasından gelir: yalnız İngilizce dersi olan öğrencide.
  const english = classes.some((c) => c.branch === 'ingilizce');
  const lv = levelOf(state.xp || 0);

  const badges = [
    { e: '👣', name: 'İlk adım', ok: (state.xp || 0) > 0 || hw.done > 0 },
    { e: '🎒', name: 'Derse katıldı', ok: classes.length > 0 },
    { e: '📝', name: 'İlk ödev', ok: hw.done >= 1 },
    { e: '📚', name: '10 ödev', ok: hw.done >= 10 },
    { e: '💯', name: 'Tam puan', ok: hw.perfect },
    { e: '🎯', name: 'Haftalık hedef', ok: activeCount >= (state.weeklyGoal || 4) },
    ...(english
      ? [
          { e: '🔥', name: '3 gün seri', ok: (state.longestStreak || 0) >= 3 },
          { e: '🚀', name: '7 gün seri', ok: (state.longestStreak || 0) >= 7 },
          { e: '🏆', name: '30 gün seri', ok: (state.longestStreak || 0) >= 30 },
          { e: '🧩', name: '10 kalıp cümlesi', ok: stats.mastered >= 10 },
          { e: '🧠', name: '50 kalıp cümlesi', ok: stats.mastered >= 50 },
          { e: '⭐', name: 'Seviye 5', ok: lv.level >= 5 },
        ]
      : []),
  ];

  const pickReminder = async (time) => {
    if (state.reminder && state.reminder.id) await cancelReminder(state.reminder.id);
    if (!time) return p.setReminder(null);
    const id = await scheduleDaily(time, 'Mamoste 📚', 'Bugünkü çalışmanı ve ödevlerini unutma!');
    p.setReminder({ time, id });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Profilim" onBack={() => navigation.goBack()} right={<SmallButton title="⚙️" onPress={() => navigation.navigate('Settings')} />} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        {/* Kimlik */}
        <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <View style={[s.bigAv, { backgroundColor: colors.cardSoft, borderColor: colors.primary }]}>
            <Text style={{ fontSize: 52 }}>{avatar || '🙂'}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: font.h3, fontWeight: '900', marginTop: spacing.sm }}>{nk.trim() || 'Takma adın yok'}</Text>
          {english ? (
            <>
              <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>
                Seviye {lv.level} · ⭐ {state.xp || 0} XP · 🔥 {state.streak || 0} gün seri
              </Text>
              <View style={[s.bar, { backgroundColor: colors.cardSoft }]}>
                <View style={[s.barFill, { width: `${Math.round(lv.ratio * 100)}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: 4 }}>Seviye {lv.level + 1} için {lv.to - (state.xp || 0)} XP</Text>
            </>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>{classes.length} ders · {hw.done} ödev bitti</Text>
          )}
        </Card>

        <SectionTitle>AVATARIN</SectionTitle>
        <Card>
          <View style={s.avGrid}>
            {STUDENT_AVATARS.map((a) => (
              <Pressable
                key={a}
                onPress={() => setAvatar(a)}
                accessibilityLabel={`Avatar ${a}`}
                style={[s.avCell, { borderColor: avatar === a ? colors.primary : 'transparent', backgroundColor: avatar === a ? colors.primary + '22' : colors.cardSoft }]}
              >
                <Text style={{ fontSize: 26 }}>{a}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Field label="Takma adın" value={nk} onChangeText={(v) => setNk(v.slice(0, 30))} placeholder="ör. Ali K." maxLength={30} />
          </View>
          <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginBottom: spacing.sm }}>
            Fotoğraf, telefon ya da tam adın istenmez. Öğretmenin seni okul numaranla tanır.
          </Text>
          <SmallButton title={busy ? '…' : 'Kaydet'} filled disabled={!dirty || busy} onPress={save} style={{ alignSelf: 'flex-start' }} />
          {msg ? <Text style={{ color: msg.ok ? colors.success : colors.danger, fontSize: font.small, marginTop: 6 }}>{msg.text}</Text> : null}
        </Card>

        <SectionTitle right={<SmallButton title="＋ Ders" onPress={() => navigation.navigate('StudentJoin')} />}>DERSLERİM</SectionTitle>
        {classes.length === 0 ? (
          <Card onPress={() => navigation.navigate('StudentJoin')}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>Henüz bir derse katılmadın</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>Öğretmeninin tahtaya yazdığı sınıf kodunu gir.</Text>
          </Card>
        ) : null}
        {classes.map((c) => {
          const b = branchOf(c.branch);
          const isOpen = open === c.rid;
          const more = c.tBio || c.tHours || c.tSchool;
          return (
            <Card key={c.rid} onPress={more ? () => setOpen(isOpen ? null : c.rid) : undefined}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={[s.tAv, { backgroundColor: colors.cardSoft }]}>
                  <Text style={{ fontSize: 24 }}>{c.tAvatar || b.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{b.emoji} {b.name} · {c.cn}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>
                    {c.teacher || 'Öğretmen'}{c.no ? ` · No ${c.no}` : ''}
                  </Text>
                </View>
                {more ? <Text style={{ color: colors.textFaint }}>{isOpen ? '▴' : '▾'}</Text> : null}
              </View>
              {isOpen ? (
                <View style={{ marginTop: spacing.sm }}>
                  {c.tSchool ? <Text style={{ color: colors.textMuted, fontSize: font.small }}>🏫 {c.tSchool}</Text> : null}
                  {c.tHours ? <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>🕒 {c.tHours}</Text> : null}
                  {c.tBio ? <Text style={{ color: colors.text, fontSize: font.small, marginTop: 6 }}>{c.tBio}</Text> : null}
                </View>
              ) : null}
            </Card>
          );
        })}

        <SectionTitle>İLERLEMEM</SectionTitle>
        <View style={s.statRow}>
          <Stat value={`${hw.done}/${hw.total}`} label="ödev bitti" />
          {english ? <Stat value={hw.acc != null ? `%${Math.round(hw.acc * 100)}` : '—'} label="doğru oranı" /> : null}
          <Stat value={hw.score != null ? hw.score : '—'} label="görev puanı ort." />
          {english ? <Stat value={stats.mastered} label="kalıp cümlesi" /> : null}
        </View>
        {english ? (
          <View style={s.statRow}>
            <Stat value={state.streak || 0} label="gün seri" color={colors.warning} />
            <Stat value={state.longestStreak || 0} label="en uzun seri" />
            <Stat value={lv.level} label="seviye" color={colors.primary} />
          </View>
        ) : null}

        <SectionTitle>ROZETLERİM · {badges.filter((b) => b.ok).length}/{badges.length}</SectionTitle>
        <Card>
          <View style={s.badgeGrid}>
            {badges.map((b) => (
              <View key={b.name} style={[s.badge, { opacity: b.ok ? 1 : 0.35 }]} accessibilityLabel={`${b.name}${b.ok ? '' : ' (henüz yok)'}`}>
                <Text style={{ fontSize: 28 }}>{b.ok ? b.e : '🔒'}</Text>
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 2 }} numberOfLines={2}>{b.name}</Text>
              </View>
            ))}
          </View>
        </Card>

        <SectionTitle>HAFTALIK HEDEF · {activeCount}/{state.weeklyGoal || 4} gün</SectionTitle>
        <Card>
          <View style={s.weekRow}>
            {WEEK_DAYS.map((d, i) => (
              <View key={d} style={{ alignItems: 'center', flex: 1 }}>
                <View style={[s.dayDot, { backgroundColor: activeWeek[i] ? colors.primary : colors.cardSoft, borderColor: week[i] === dayKey() ? colors.accent : 'transparent' }]}>
                  <Text style={{ color: activeWeek[i] ? '#fff' : colors.textFaint, fontWeight: '900' }}>{activeWeek[i] ? '✓' : ''}</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: spacing.md, marginBottom: 6 }}>Haftada kaç gün çalışacaksın?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[3, 4, 5, 6, 7].map((n) => (
              <Chip key={n} small label={`${n} gün`} active={(state.weeklyGoal || 4) === n} onPress={() => p.setWeeklyGoal(n)} color={colors.primary} />
            ))}
          </View>
        </Card>

        <SectionTitle>HATIRLATICI</SectionTitle>
        <Card>
          <Text style={{ color: colors.textMuted, fontSize: font.small, marginBottom: 6 }}>Her gün bu saatte telefonuna hatırlatma gelsin:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip small label="Kapalı" active={!state.reminder} onPress={() => pickReminder(null)} />
            {REMINDER_TIMES.map((t) => (
              <Chip key={t} small label={t} active={state.reminder && state.reminder.time === t} onPress={() => pickReminder(t)} color={colors.primary} />
            ))}
          </View>
          {Platform.OS === 'web' ? (
            <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: 6 }}>Bildirim yalnızca telefondaki uygulamada çalışır.</Text>
          ) : state.reminder && !state.reminder.id ? (
            <Text style={{ color: colors.danger, fontSize: font.tiny, marginTop: 6 }}>Bildirim izni verilmedi; telefon ayarlarından Mamoste'ye bildirim izni ver.</Text>
          ) : null}
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  bigAv: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 8, borderRadius: 4, alignSelf: 'stretch', marginTop: spacing.md, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  avGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  avCell: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  tAv: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  badge: { width: '24%', alignItems: 'center' },
  weekRow: { flexDirection: 'row' },
  dayDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
