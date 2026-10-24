// Öğretmen ana sayfası: karşılama bandı, şimdiki/sıradaki ders, bugünün akışı, kısayollar, sınıflar.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, font, radius } from '../../theme';
import { usePlans } from '../../teacher/PlanContext';
import { weekForDay } from '../../teacher/yearPlan';
import { useDesk, weekdayOf, sortNotes, periodAt, gradeOfName } from '../../teacher/DeskContext';
import { outcomesForLesson, splitOutcome, unitColor, lessonSlot } from '../../teacher/planUi';
import { classColor } from './TimetableScreen';
import { dayKey } from '../../utils/helpers';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { useRole } from '../../context/RoleContext';
import StatusBarCover from '../../components/StatusBarCover';
import { attentionItems, studentTotals } from '../../teacher/analytics';
import { Card, SectionTitle, Field, SmallButton, formatJoinCode } from '../../teacher/ui';
import { useTeacherProfile } from '../../teacher/profile';

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// '2026-10-27' → 'Salı, 27 Ekim' / '27 Eki'
const longDate = (k) => {
  const d = new Date(k + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
};
const shortDate = (k) => {
  if (!k) return '';
  const d = new Date(k + 'T00:00:00');
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
};

const greeting = (h) => (h < 5 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar');
const minOf = (t) => {
  const m = /^(\d{2}):(\d{2})$/.exec(t || '');
  return m ? +m[1] * 60 + +m[2] : null;
};

export default function TeacherHomeScreen({ navigation }) {
  const { colors, shadow, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTeacher();
  const { branch } = useRole();
  const { profile } = useTeacherProfile();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [weekPlanId, setWeekPlanId] = useState(null); // program yokken üst kartta gösterilen düzey
  const attention = useMemo(() => attentionItems(t.classes), [t.classes]);
  const { plans, planForGrade } = usePlans();
  const desk = useDesk();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = dayKey();
  const todayLessons = desk.lessonsOnDay(weekdayOf());
  const pendingNotes = sortNotes(desk.notes);
  const todayNotes = pendingNotes.filter((n) => n.remind && n.remind <= today); // bugün ya da gecikmiş
  const totalStudents = t.classes.reduce((n, c) => n + Object.keys(c.students).length, 0);

  // Dersin o haftaki planı ve bu derse düşen öğrenme çıktıları (kazanımlar).
  // day: dersin günü (yarının dersi gösterilirken yarının haftası seçilsin).
  const planOf = (l, day = today) => {
    const p = planForGrade(l.grade);
    const cur = p ? weekForDay(p.weeks, day) : null;
    const w = cur && cur.status !== 'ended' ? cur.week : null;
    const slot = w ? lessonSlot(w, l) : { idx: l.idx, count: l.count };
    const out = w && !w.holiday ? outcomesForLesson(w, slot.idx, slot.count) : { lines: [], review: false };
    return { p, w, skills: out.lines.map(splitOutcome), review: out.review, slot };
  };

  // Ana kart: şimdiki ders, yoksa bugünün sıradaki dersi; bugün bitti/ders yoksa bir sonraki okul gününün ilk dersi.
  const hasTimes = todayLessons.some((l) => l.start);
  const at = periodAt(desk.periods);
  let focus = null;
  let focusLabel = '';
  let focusDay = today;
  if (todayLessons.length) {
    if (!hasTimes) {
      focus = todayLessons[0];
      focusLabel = 'BUGÜN';
    } else if (at) {
      focus = todayLessons.find((l) => l.period >= at.period) || null;
      if (focus) focusLabel = focus.period === at.period && at.status === 'now' ? 'ŞİMDİ' : 'SIRADAKİ';
    }
  }
  const dayOver = todayLessons.length > 0 && hasTimes && !focus;
  if (!focus && desk.hasTimetable) {
    for (let i = 1; i <= 7 && !focus; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const ls = desk.lessonsOnDay(weekdayOf(d));
      if (ls.length) {
        focus = ls[0];
        focusDay = dayKey(d);
        focusLabel = i === 1 ? 'YARIN' : 'SONRAKİ DERS';
      }
    }
  }
  const live = focusLabel === 'ŞİMDİ';
  // Ders programı yoksa üst kart bu haftanın öğrenme çıktılarını düzey düzey gösterir.
  // Varsayılan: öğretmenin ilk sınıfının düzeyi (sınıf yoksa ilk plan).
  const myGrades = t.classes.map((c) => gradeOfName(c.name)).filter(Boolean).sort((a, b) => a - b);
  const weekPlan =
    !focus && !desk.hasTimetable && plans.length
      ? plans.find((p) => p.id === weekPlanId) || plans.find((p) => myGrades.includes(p.grade)) || plans[0]
      : null;
  const openLesson = (l) => navigation.navigate('YearPlan', planForGrade(l.grade) ? { lessonKey: `${l.day}-${l.period}` } : {});

  const create = () => {
    if (!newName.trim()) return;
    const id = t.addClass(newName);
    setNewName('');
    setAdding(false);
    navigation.navigate('TeacherClass', { classId: id, justCreated: true });
  };

  const heroBg = colors.accentDeep;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {/* ---- Karşılama bandı ---- */}
      <View style={[st.hero, { backgroundColor: heroBg, paddingTop: insets.top + spacing.lg }]}>
        {/* Dekor ayrı katmanda: taşan daireler bant içinde odaklanınca bandı yana kaydırmasın (web). */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <View style={[st.blob, { width: 220, height: 220, top: -80, right: -60 }]} />
          <View style={[st.blob, { width: 140, height: 140, bottom: -50, left: -40 }]} />
        </View>
        <View style={st.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={st.heroHello}>{greeting(now.getHours())}{profile.display_name ? `, ${profile.display_name}` : ''} 👋</Text>
            <Text style={st.heroDate}>{DAY_NAMES[now.getDay()]}, {now.getDate()} {MONTH_NAMES[now.getMonth()]}</Text>
            {branch ? <Text style={st.heroBranch}>{branch.emoji} {branch.name}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => navigation.navigate('Profile')} style={st.gear} accessibilityLabel="Profilim" hitSlop={8}>
              <Text style={{ fontSize: 20 }}>{profile.avatar || '🧑‍🏫'}</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Settings')} style={st.gear} accessibilityLabel="Ayarlar" hitSlop={8}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </Pressable>
          </View>
        </View>
        <View style={st.stats}>
          <Stat icon="🏫" value={t.classes.length} label="sınıf" />
          <Stat icon="👥" value={totalStudents} label="öğrenci" />
          <Stat icon="📚" value={desk.hasTimetable ? todayLessons.length : '–'} label="bugün ders" />
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.md, marginTop: -spacing.xl }}>
        {/* ---- Şimdi / sıradaki dersin kazanımı (ekranın asıl işi) ---- */}
        {focus ? (
          (() => {
            const { w, skills, review, p, slot } = planOf(focus, focusDay);
            const c = classColor(focus.label);
            return (
              <Pressable onPress={() => openLesson(focus)} style={({ pressed }) => [st.focus, shadow, { backgroundColor: colors.card, borderColor: c }, pressed && { opacity: 0.94 }]}>
                {/* Üst satır: ne zaman + hangi sınıf */}
                <View style={st.focusHead}>
                  <View style={[st.pill, { backgroundColor: c + '1F' }]}>
                    {live ? <View style={[st.liveDot, { backgroundColor: c }]} /> : null}
                    <Text style={[st.pillT, { color: c }]}>{focusLabel}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <View style={[st.classBadge, { backgroundColor: c }]}>
                    <Text style={st.classBadgeT}>{focus.label}</Text>
                  </View>
                </View>
                <Text style={[st.when, { color: colors.text }]}>
                  {longDate(focusDay)} · {focus.period}. ders
                  {focus.start ? <Text style={{ color: colors.textMuted }}>{`  ${focus.start}–${focus.end}`}</Text> : null}
                </Text>

                {!p ? (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={[st.outText, { color: colors.text }]}>{focus.grade ? `${focus.grade}. sınıf` : 'Bu sınıfın'} yıllık planı yüklü değil.</Text>
                    <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 4 }}>Planı yükleyince bu dersin öğrenme çıktısı burada görünür.</Text>
                    <Text style={[st.more, { color: c }]}>Yıllık plan yükle ›</Text>
                  </View>
                ) : !w ? (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={[st.outText, { color: colors.text }]}>Yıllık plan bitti.</Text>
                    <Text style={[st.more, { color: c }]}>Planı aç ›</Text>
                  </View>
                ) : w.holiday ? (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={[st.outText, { color: colors.text }]}>🏖️ {w.unit || w.topic || 'Tatil haftası'}</Text>
                  </View>
                ) : (
                  <>
                    {w.unit || w.topic ? (
                      <Text style={[st.unit, { color: colors.textMuted }]} numberOfLines={1}>
                        {(w.unit || w.topic).toLocaleUpperCase('tr')}
                      </Text>
                    ) : null}
                    <Text style={[st.outHead, { color: colors.textFaint }]}>
                      {review ? 'PEKİŞTİRME · BU HAFTANIN ÖĞRENME ÇIKTILARI' : skills.length > 1 ? 'BU DERSİN ÖĞRENME ÇIKTILARI' : 'BU DERSİN ÖĞRENME ÇIKTISI'}
                    </Text>
                    {skills.length ? (
                      skills.map((o, i) => (
                        <View key={i} style={[st.outRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                          {o.code || o.label ? (
                            <Text style={[st.outCode, { color: c }]}>
                              {o.code || ''}{o.code && o.label ? '  ·  ' : ''}{o.label ? `${o.icon} ${o.label}` : ''}
                            </Text>
                          ) : null}
                          <Text style={[st.outText, { color: colors.text }]}>{o.text}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={[st.outText, { color: colors.textMuted }]}>Planda bu haftanın öğrenme çıktısı yazmıyor.</Text>
                    )}
                    <View style={[st.focusFoot, { borderTopColor: colors.border }]}>
                      <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '700', flex: 1 }}>
                        📅 {w.week ? `${w.week}. hafta · ` : ''}{w.start ? `${shortDate(w.start)} – ${shortDate(w.end)}` : ''}
                        {slot.count > 1 ? ` · ${slot.idx + 1}. ders / ${slot.count}` : ''}
                      </Text>
                      <Text style={[st.more, { color: c, marginTop: 0 }]}>Dersin planı ›</Text>
                    </View>
                  </>
                )}
                {!hasTimes && focusDay === today ? (
                  <Pressable onPress={() => navigation.navigate('Timetable')} style={[st.timesHint, { backgroundColor: colors.cardSoft }]}>
                    <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' }}>
                      ⏱️ Okulun ders saatlerini girersen o saatteki dersin öğrenme çıktısı kendiliğinden gelir ›
                    </Text>
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })()
        ) : weekPlan ? (
          (() => {
            // Program yok: haftanın çıktıları haftalık ders saatine (yazmıyorsa 5 okul gününe; çıktı azsa çıktı sayısına) bölünür,
            // bugüne düşen gösterilir. Hafta sonu pazartesinin çıktısı.
            const wd = weekdayOf(now);
            const dayK = wd > 5 ? dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8 - wd)) : today;
            const cur = weekForDay(weekPlan.weeks, dayK);
            const w = cur && cur.status !== 'ended' ? cur.week : null;
            // Yalnız beceri başlığı olan (metinsiz) satırlar sayılmaz.
            const all = w && !w.holiday ? outcomesForLesson(w, 0, 1).lines.map(splitOutcome).filter((o) => o.text.trim()) : [];
            const count = Math.max(1, Math.min((w && w.hours) || 5, all.length)); // her güne bir pay düşsün, tüm hafta tekrar gösterilmesin
            const idx = wd > 5 ? 0 : Math.min(count - 1, Math.floor(((wd - 1) * count) / 5));
            const skills = all.filter((_, i) => Math.floor((i * count) / all.length) === idx);
            const c = unitColor(w);
            return (
              <Pressable onPress={() => navigation.navigate('YearPlan', { planId: weekPlan.id })} style={({ pressed }) => [st.focus, shadow, { backgroundColor: colors.card, borderColor: c }, pressed && { opacity: 0.94 }]}>
                <View style={st.focusHead}>
                  <View style={[st.pill, { backgroundColor: c + '1F' }]}>
                    <Text style={[st.pillT, { color: c }]}>{wd > 5 ? 'PAZARTESİ' : 'BUGÜN'}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                </View>
                {plans.length > 1 ? (
                  <View style={st.gradeChips}>
                    {plans.map((p) => {
                      const on = p.id === weekPlan.id;
                      return (
                        <Pressable key={p.id} onPress={() => setWeekPlanId(p.id)} hitSlop={4} style={[st.gradeChip, { borderColor: on ? c : colors.border, backgroundColor: on ? c : 'transparent' }]}>
                          <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '800', fontSize: font.small }}>{p.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[st.when, { color: colors.text }]}>{weekPlan.name}</Text>
                )}
                {!w ? (
                  <Text style={[st.outText, { color: colors.text, marginTop: spacing.md }]}>Yıllık plan bitti.</Text>
                ) : w.holiday ? (
                  <Text style={[st.outText, { color: colors.text, marginTop: spacing.md }]}>🏖️ {w.unit || w.topic || 'Tatil haftası'}</Text>
                ) : (
                  <>
                    {w.unit || w.topic ? (
                      <Text style={[st.unit, { color: colors.textMuted }]} numberOfLines={1}>
                        {(w.unit || w.topic).toLocaleUpperCase('tr')}
                      </Text>
                    ) : null}
                    <Text style={[st.outHead, { color: colors.textFaint }]}>{skills.length > 1 ? 'BU DERSİN ÖĞRENME ÇIKTILARI' : 'BU DERSİN ÖĞRENME ÇIKTISI'}</Text>
                    {skills.length ? (
                      skills.map((o, i) => (
                        <View key={i} style={[st.outRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                          {o.code || o.label ? (
                            <Text style={[st.outCode, { color: c }]}>
                              {o.code || ''}{o.code && o.label ? '  ·  ' : ''}{o.label ? `${o.icon} ${o.label}` : ''}
                            </Text>
                          ) : null}
                          <Text style={[st.outText, { color: colors.text }]}>{o.text}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={[st.outText, { color: colors.textMuted }]}>Planda bu haftanın öğrenme çıktısı yazmıyor.</Text>
                    )}
                    <View style={[st.focusFoot, { borderTopColor: colors.border }]}>
                      <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '700', flex: 1 }}>
                        📅 {w.week ? `${w.week}. hafta · ` : ''}{w.start ? `${shortDate(w.start)} – ${shortDate(w.end)}` : ''}
                      </Text>
                      <Text style={[st.more, { color: c, marginTop: 0 }]}>Planı aç ›</Text>
                    </View>
                  </>
                )}
                <Pressable onPress={() => navigation.navigate('Timetable')} style={[st.timesHint, { backgroundColor: colors.cardSoft }]}>
                  <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' }}>
                    🗓️ Ders programını girersen o saatteki dersin öğrenme çıktısı gelir ›
                  </Text>
                </Pressable>
              </Pressable>
            );
          })()
        ) : (
          <Pressable
            onPress={() => navigation.navigate(desk.hasTimetable ? 'YearPlan' : 'Timetable')}
            style={[st.focus, shadow, { backgroundColor: colors.card, borderColor: colors.border, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }]}
          >
            <Text style={{ fontSize: 34 }}>{!desk.hasTimetable ? '🗓️' : dayOver ? '🌇' : '☕'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body }}>
                {!desk.hasTimetable ? 'Ders programını gir' : dayOver ? 'Bugünkü derslerin bitti' : 'Bugün dersin yok'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>
                {!desk.hasTimetable
                  ? 'Hangi gün hangi saatte hangi sınıfa gireceğini bir kez gir; o dersin öğrenme çıktısı burada görünsün.'
                  : dayOver
                    ? 'Emeğine sağlık! Yarının planına göz atabilirsin.'
                    : 'İyi dinlenmeler. Yıllık planına göz atabilirsin.'}
              </Text>
            </View>
          </Pressable>
        )}

        {/* ---- Bugünün hatırlatmaları ---- */}
        {todayNotes.length ? (
          <Pressable onPress={() => navigation.navigate('Notes')} style={st.sticky}>
            <View style={st.tape} />
            <Text style={st.stickyHead}>📌 BUGÜN UNUTMA</Text>
            {todayNotes.slice(0, 3).map((n) => (
              <Text key={n.id} style={st.stickyLine} numberOfLines={1}>
                {n.time ? <Text style={{ fontWeight: '900' }}>{n.time}  </Text> : '•  '}
                {n.text}
                {n.remind < today ? <Text style={{ color: '#E2574C' }}>  (gecikti)</Text> : null}
              </Text>
            ))}
            {todayNotes.length > 3 ? <Text style={[st.stickyLine, { opacity: 0.7 }]}>+{todayNotes.length - 3} not daha</Text> : null}
          </Pressable>
        ) : null}

        {/* ---- Bugünün akışı ---- */}
        {todayLessons.length ? (
          <>
            <SectionTitle>BUGÜNÜN AKIŞI</SectionTitle>
            <View style={[st.flow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {todayLessons.map((l, i) => {
                const { w, skills, review } = planOf(l);
                const c = classColor(l.label);
                const past = l.end && minOf(l.end) != null && minOf(l.end) <= nowMin;
                const isLive = live && focusDay === today && focus.period === l.period;
                const first = skills[0];
                return (
                  <Pressable key={l.period} onPress={() => openLesson(l)} style={[st.flowRow, past && { opacity: 0.45 }]}>
                    <View style={st.flowTime}>
                      <Text style={{ color: isLive ? c : colors.text, fontWeight: '900', fontSize: font.small }}>{l.start || `${l.period}.`}</Text>
                      {l.start ? <Text style={{ color: colors.textFaint, fontSize: 10, fontWeight: '700' }}>{l.period}. ders</Text> : null}
                    </View>
                    <View style={st.flowRail}>
                      <View style={[st.flowLine, { backgroundColor: colors.border }, i === 0 && { top: '50%' }, i === todayLessons.length - 1 && { bottom: '50%' }]} />
                      <View style={[st.flowDot, { backgroundColor: c, borderColor: colors.card }, isLive && { width: 16, height: 16, borderRadius: 8 }]} />
                    </View>
                    <View style={[st.flowCard, { backgroundColor: c + (isLive ? '26' : '14'), borderColor: isLive ? c : 'transparent' }]}>
                      <Text style={{ color: c, fontWeight: '900', fontSize: font.body }}>{l.label}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: font.small, flex: 1 }} numberOfLines={2}>
                        {!w ? (planForGrade(l.grade) ? '' : 'Plan yok') : w.holiday ? '🏖️ Tatil' : first ? `${review ? '↻ Pekiştirme · ' : ''}${first.text}` : w.unit || w.topic || ''}
                      </Text>
                      <Text style={{ color: colors.textFaint, fontSize: 18 }}>›</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {/* ---- Kısayollar ---- */}
        <SectionTitle>KISAYOLLAR</SectionTitle>
        <View style={st.grid}>
          <Tile icon="📅" tint={colors.accent} title="Yıllık plan" onPress={() => navigation.navigate('YearPlan')} />
          <Tile icon="🗓️" tint={colors.second} title="Ders programı" onPress={() => navigation.navigate('Timetable')} />
          <Tile
            icon="📝"
            tint={colors.accent}
            title="Notlarım"
            badge={todayNotes.length || null}
            onPress={() => navigation.navigate('Notes')}
          />
          <Tile icon="🖥️" tint={colors.second} title="Akıllı tahta" onPress={() => navigation.navigate('Activities', { board: true })} />
          <Tile icon="🎯" tint={colors.accent} title="Etkinlikler" onPress={() => navigation.navigate('Activities')} />
        </View>

        {/* ---- Sınıflarım ---- */}
        <SectionTitle right={<SmallButton title={adding ? 'Vazgeç' : '＋ Sınıf'} onPress={() => setAdding(!adding)} />}>SINIFLARIM</SectionTitle>
        {adding ? (
          <Card>
            <Field label="Sınıf adı" value={newName} onChangeText={setNewName} placeholder="ör. 7-B" autoFocus onSubmitEditing={create} />
            <SmallButton title="Oluştur" filled onPress={create} disabled={!newName.trim()} />
          </Card>
        ) : null}
        {t.classes.length ? (
          <View style={st.classGrid}>
            {/* Küçük sınıftan büyüğe (5-A, 5-B, 6-A …), iki sütun. */}
            {[...t.classes].sort((a, b) => classOrder(a.name, b.name)).map((c) => {
              const sts = Object.values(c.students);
              const active = sts.filter((s) => studentTotals(s).last > Date.now() - 7 * 864e5).length;
              const col = classColor(c.name);
              return (
                <Pressable key={c.id} onPress={() => navigation.navigate('TeacherClass', { classId: c.id })} style={({ pressed }) => [st.classCard, shadow, { backgroundColor: col }, pressed && { opacity: 0.9 }]}>
                  <View style={[st.blob, { width: 90, height: 90, top: -30, right: -25 }]} />
                  <Text style={st.className}>{c.name}</Text>
                  <Text style={st.classMeta}>{sts.length} öğrenci</Text>
                  <Text style={st.classMeta}>{c.homeworks.length} ödev · {active} aktif</Text>
                  {c.code ? (
                    <View style={st.classCode}>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 }}>{formatJoinCode(c.code)}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : !adding ? (
          <Pressable onPress={() => setAdding(true)} style={[st.emptyClass, { borderColor: colors.border }]}>
            <Text style={{ fontSize: 28 }}>🏫</Text>
            <Text style={{ color: colors.text, fontWeight: '800', marginTop: 4 }}>İlk sınıfını ekle</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.small, textAlign: 'center', marginTop: 2 }}>
              Ya da ders programında şube seçtiğinde sınıf kendiliğinden eklenir.
            </Text>
          </Pressable>
        ) : null}

        {/* ---- Dikkat ---- */}
        {attention.length ? (
          <>
            <SectionTitle>DİKKAT</SectionTitle>
            <View style={[st.flow, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 4 }]}>
              {attention.slice(0, 6).map((a, i) => (
                <Pressable
                  key={i}
                  onPress={() =>
                    a.st
                      ? navigation.navigate('TeacherStudent', { classId: a.cls.id, studentId: a.st.id })
                      : navigation.navigate('TeacherClass', { classId: a.cls.id, tab: a.kind === 'late' ? 'homework' : 'students' })
                  }
                  style={st.attRow}
                >
                  <View style={[st.attDot, { backgroundColor: a.kind === 'remind' ? colors.accent : a.kind === 'late' ? colors.warning : colors.textFaint }]} />
                  <Text style={{ color: colors.text, fontSize: font.small, flex: 1 }}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {/* ---- İngilizce çalış (sadece kalıp çalışması olan branş) ---- */}
        {branch?.drills ? (
        <Pressable onPress={() => navigation.navigate('Learn')} style={[st.learn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 26 }}>🧩</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>Kalıpları dene</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.small }}>Öğrencilerin çalışacağı cümleleri önce sen gör.</Text>
          </View>
          <Text style={{ color: colors.textFaint, fontSize: 22 }}>›</Text>
        </Pressable>
        ) : null}
      </View>
    </ScrollView>
    <StatusBarCover color={heroBg} />
    </View>
  );
}

function Stat({ icon, value, label }) {
  return (
    <View style={st.stat}>
      <Text style={st.statV}>
        {icon} {value}
      </Text>
      <Text style={st.statL}>{label}</Text>
    </View>
  );
}

// "5-B" < "6-A" < "10-A": önce düzey (sayı), sonra şube.
function classOrder(a, b) {
  const g = (n) => {
    const m = String(n || '').match(/^\s*(\d{1,2})/);
    return m ? +m[1] : 99;
  };
  return g(a) - g(b) || String(a).localeCompare(String(b), 'tr');
}

function Tile({ icon, tint, title, sub, onPress, badge }) {
  const { colors, shadow } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.tile, shadow, { backgroundColor: colors.card, borderColor: colors.border }, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={[st.tileIcon, { backgroundColor: tint + '22' }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: font.small, marginTop: spacing.sm }} numberOfLines={1}>{title}</Text>
      {sub ? <Text style={{ color: colors.textMuted, fontSize: font.tiny }} numberOfLines={1}>{sub}</Text> : null}
      {badge ? (
        <View style={st.badge}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11 }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const st = StyleSheet.create({
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl + spacing.lg, overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroHello: { color: 'rgba(255,255,255,0.85)', fontSize: font.body, fontWeight: '700' },
  heroDate: { color: '#fff', fontSize: font.h2, fontWeight: '900', marginTop: 2 },
  heroBranch: { color: 'rgba(255,255,255,0.85)', fontSize: font.small, fontWeight: '800', marginTop: 4 },
  gear: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  statV: { color: '#fff', fontSize: font.body, fontWeight: '900' },
  statL: { color: 'rgba(255,255,255,0.8)', fontSize: font.tiny, fontWeight: '700', marginTop: 1 },

  focus: { borderRadius: radius.lg, borderTopWidth: 4, padding: spacing.lg },
  focusHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillT: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  when: { fontSize: font.body, fontWeight: '800', marginTop: spacing.sm },
  classBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, minWidth: 54, alignItems: 'center' },
  classBadgeT: { color: '#fff', fontSize: font.h3, fontWeight: '900' },
  unit: { fontSize: font.tiny, fontWeight: '800', letterSpacing: 0.8, marginTop: spacing.md },
  outHead: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: spacing.md, marginBottom: 2 },
  outRow: { paddingVertical: 10 },
  outCode: { fontSize: font.tiny, fontWeight: '900', letterSpacing: 0.4, marginBottom: 4 },
  outText: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  focusFoot: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm, paddingTop: spacing.md },
  more: { fontSize: font.small, fontWeight: '900', marginTop: spacing.md },
  gradeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  gradeChip: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  timesHint: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, marginTop: spacing.sm },

  sticky: { marginTop: spacing.lg, backgroundColor: '#C7EFEA', borderRadius: 4, padding: spacing.md, paddingTop: spacing.lg, transform: [{ rotate: '-0.8deg' }], shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  tape: { position: 'absolute', top: -7, alignSelf: 'center', width: 64, height: 16, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 2 },
  stickyHead: { color: '#0F766E', fontSize: font.tiny, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  stickyLine: { color: '#1F2937', fontSize: font.small, fontWeight: '600', paddingVertical: 2 },

  flow: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  flowRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 56 },
  flowTime: { width: 56, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8 },
  flowRail: { width: 20, alignItems: 'center', justifyContent: 'center' },
  flowLine: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  flowDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  flowCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: 10, marginVertical: 4, marginLeft: 6 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '2.75%', rowGap: spacing.sm },
  tile: { width: '31.5%', borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, alignItems: 'flex-start' },
  tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 8, right: 8, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#E2574C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },

  attRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, paddingHorizontal: spacing.sm },
  attDot: { width: 8, height: 8, borderRadius: 4 },

  classGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm, paddingVertical: 4 },
  classCard: { width: '48.5%', borderRadius: radius.lg, padding: spacing.md, overflow: 'hidden' },
  className: { color: '#fff', fontSize: 28, fontWeight: '900' },
  classMeta: { color: 'rgba(255,255,255,0.9)', fontSize: font.tiny, fontWeight: '700', marginTop: 2 },
  classCode: { alignSelf: 'flex-start', marginTop: spacing.sm, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  emptyClass: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },

  learn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.xl },
});
