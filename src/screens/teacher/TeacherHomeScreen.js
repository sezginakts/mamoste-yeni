// Öğretmen ana sayfası: karşılama bandı, şimdiki/sıradaki ders, kısayollar, sınıflar.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, font, radius, inkOn } from '../../theme';
import { usePlans } from '../../teacher/PlanContext';
import { weekForDay } from '../../teacher/yearPlan';
import { useDesk, weekdayOf, sortNotes, gradeOfName } from '../../teacher/DeskContext';
import { outcomesForLesson, splitOutcome, unitColor, lessonSlot } from '../../teacher/planUi';
import { usePruneStaleLessons } from '../../teacher/pruneLessons';
import { classColor } from './TimetableScreen';
import { branchOf } from '../../data/branches';
import { dayKey } from '../../utils/helpers';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { useRole } from '../../context/RoleContext';
import StatusBarCover from '../../components/StatusBarCover';
import Collapsible from '../../components/Collapsible';
import LineIcon from '../../components/LineIcon';
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

const minOf = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || '');
  return m ? +m[1] * 60 + +m[2] : null;
};

export default function TeacherHomeScreen({ navigation }) {
  const { colors, shadow, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTeacher();
  const { branch, branchId } = useRole();
  const { profile } = useTeacherProfile();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [weekPlanId, setWeekPlanId] = useState(null); // program yokken üst kartta gösterilen düzey
  const attention = useMemo(() => attentionItems(t.classes), [t.classes]);
  const { plans, planForGrade } = usePlans();
  const desk = useDesk();
  // Silinmiş sınıfın ders programında kalmasını engelle (hayalet 5-C kartı).
  usePruneStaleLessons();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = dayKey();
  const todayLessons = desk.lessonsOnDay(weekdayOf(), branchId);
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
  // Saati girilmemiş ders ATLANMAZ: zamanı bilinmeyen ders "sıradaki" sayılır. (Eskiden saati olmayan dersler
  // yok sayıldığı için, saatler kısmen girilmişse o günkü ders "gün bitti" diye atlanıp yarının dersine geçiliyordu.)
  const hasTimes = todayLessons.some((l) => l.start && l.end);
  let focus = null;
  let focusLabel = '';
  let focusDay = today;
  if (todayLessons.length) {
    if (!hasTimes) {
      focus = todayLessons[0];
      focusLabel = 'BUGÜN';
    } else {
      const nowLesson = todayLessons.find((l) => {
        const s = minOf(l.start);
        const e = minOf(l.end);
        return s != null && e != null && nowMin >= s && nowMin < e;
      });
      const nextLesson =
        nowLesson ||
        todayLessons.find((l) => {
          const s = minOf(l.start);
          const e = minOf(l.end);
          if (s == null || e == null) return true; // saati yok: atlama, sıradaki ders say
          return nowMin < s;
        });
      focus = nextLesson || null;
      // Zamanı bilinmeyen ders için "SIRADAKİ" demek yanlış olur (gün bitmiş de olabilir): "BUGÜN" denir.
      if (focus) focusLabel = nowLesson ? 'ŞİMDİ' : minOf(focus.start) == null || minOf(focus.end) == null ? 'BUGÜN' : 'SIRADAKİ';
    }
  }
  const dayOver = todayLessons.length > 0 && hasTimes && !focus;
  if (!focus && desk.hasTimetable) {
    for (let i = 1; i <= 7 && !focus; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const ls = desk.lessonsOnDay(weekdayOf(d), branchId);
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
        {/* Üst satır: solda OKUL logosu (assets/logo.png: karakalem harfler, beyaz, saydam), sağda profil + ayarlar. */}
        <View style={st.heroTop}>
          {colors.onAccent === '#FFFFFF' ? (
            <Image source={require('../../../assets/logo.png')} style={st.logo} resizeMode="contain" accessibilityLabel="Okul" />
          ) : (
            // Sarı gibi açık bantlarda beyaz logo görünmez: aynı yazı koyu renkte.
            <Text style={[st.logoText, { color: colors.onAccent }]} accessibilityLabel="Okul">OKUL</Text>
          )}
          <View style={{ flex: 1 }} />
          {/* Profil + ayarlar: koyu yarı saydam tek hap içinde beyaz çizgi simgeler. */}
          <View style={st.tools}>
            <Pressable onPress={() => navigation.navigate('Profile')} style={({ pressed }) => [st.tool, pressed && st.toolOn]} accessibilityLabel="Profilim" hitSlop={4}>
              <LineIcon name="user" />
            </Pressable>
            <View style={st.toolLine} />
            <Pressable onPress={() => navigation.navigate('Settings')} style={({ pressed }) => [st.tool, pressed && st.toolOn]} accessibilityLabel="Ayarlar" hitSlop={4}>
              <LineIcon name="settings" />
            </Pressable>
          </View>
        </View>
        <Text style={[st.heroDate, { color: colors.onAccent }]}>{DAY_NAMES[now.getDay()]}, {now.getDate()} {MONTH_NAMES[now.getMonth()]}</Text>
        {branch ? (
          <View style={st.branchPill}>
            <Text style={[st.branchTxt, { color: colors.onAccent }]}>{branch.name}</Text>
          </View>
        ) : null}
        <View style={st.stats}>
          <Stat icon="🏫" value={t.classes.length} label="sınıf" color={colors.onAccent} />
          <Stat icon="👥" value={totalStudents} label="öğrenci" color={colors.onAccent} />
          <Stat icon="📚" value={desk.hasTimetable ? todayLessons.length : '–'} label="bugün ders" color={colors.onAccent} />
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.md, marginTop: -spacing.xl }}>
        {/* ---- Şimdi / sıradaki dersin kazanımı (ekranın asıl işi) ---- */}
        {focus ? (
          (() => {
            const { w, skills, review, p, slot } = planOf(focus, focusDay);
            const c = classColor(focus.label);
            return (
              <Pressable onPress={() => openLesson(focus)} style={({ pressed }) => [st.focus, shadow, { backgroundColor: colors.card, borderColor: colors.border }, pressed && { opacity: 0.94 }]}>
                {/* Üst satır: ne zaman + hangi sınıf */}
                <View style={st.focusHead}>
                  <View style={[st.pill, { backgroundColor: colors.cardSoft }]}>
                    {live ? <View style={[st.liveDot, { backgroundColor: colors.accent }]} /> : null}
                    <Text style={[st.pillT, { color: colors.accent }]}>{focusLabel}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <View style={[st.classBadge, { backgroundColor: c }]}>
                    <Text style={[st.classBadgeT, { color: inkOn(c) }]}>{focus.label}</Text>
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
                    <Text style={[st.more, { color: colors.accent }]}>Yıllık plan yükle ›</Text>
                  </View>
                ) : !w ? (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={[st.outText, { color: colors.text }]}>Yıllık plan bitti.</Text>
                    <Text style={[st.more, { color: colors.accent }]}>Planı aç ›</Text>
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
                      <>
                        {skills.slice(0, 2).map((o, i) => (
                          <View key={i} style={[st.outRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                            {o.code || o.label ? (
                              <Text style={[st.outCode, { color: colors.accent }]}>
                                {o.code || ''}{o.code && o.label ? '  ·  ' : ''}{o.label ? `${o.icon} ${o.label}` : ''}
                              </Text>
                            ) : null}
                            <Text style={[st.outText, { color: colors.text }]}>{o.text}</Text>
                          </View>
                        ))}
                        {skills.length > 2 ? (
                          <Text style={{ color: colors.textMuted, fontSize: font.small, fontWeight: '700', marginTop: 6 }}>
                            +{skills.length - 2} öğrenme çıktısı daha · hepsini görmek için karta dokun
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text style={[st.outText, { color: colors.textMuted }]}>Planda bu haftanın öğrenme çıktısı yazmıyor.</Text>
                    )}
                    <View style={[st.focusFoot, { borderTopColor: colors.border }]}>
                      <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '700', flex: 1 }}>
                        📅 {w.week ? `${w.week}. hafta` : ''}
                        {slot.count > 1 ? ` · ${slot.idx + 1}. ders / ${slot.count}` : ''}
                      </Text>
                      <Text style={[st.more, { color: colors.accent, marginTop: 0 }]}>Dersin planı ›</Text>
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
                  ? 'Öğrenme çıktısını görebilmek için ders programını gir: hangi gün, kaçıncı derste hangi sınıfa girdiğini bir kez yaz.'
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

        {/* ---- Haftalık ders programı (salt okunur): değişiklik yalnız Ders Programı ekranından ---- */}
        {desk.hasTimetable
          ? (() => {
              const week = desk.weekLessons();
              const GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
              const bugun = weekdayOf();
              // Satır sayısı: en geç dersin sırası (en az 1)
              const sonDers = week.reduce((m, l) => Math.max(m, l.period), 1);
              // İki okul: günlerin saat düzeni farklı olabilir (Pzt 07:30, Sal 08:10…).
              // Günler aynı saatleri kullanıyorsa solda TEK saat sütunu; farklıysa her hücrede o günün saati.
              const doluSaat = (liste) => Array.isArray(liste) && liste.some((p) => p && p.start);
              const gunSaatleri = [1, 2, 3, 4, 5].map((g) => desk.periodsFor(g));
              const imza = (liste) => (liste || []).map((p) => `${(p && p.start) || ''}-${(p && p.end) || ''}`).join('|');
              const ayniSaat = gunSaatleri.every((s) => imza(s) === imza(gunSaatleri[0]));
              let saatler = gunSaatleri.find((s) => doluSaat(s)) || gunSaatleri[0] || [];
              const saatVar = gunSaatleri.some((s) => doluSaat(s));
              // Hücre: günün saatleri (start/end) weekLessons'tan gelir (gün bazlı ders saati).
              const en = (day, period) => week.find((w) => w.day === day && w.period === period) || null;
              return (
                <View style={[st.ttCard, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={st.ttHead}>
                    <Text style={[st.ttTitle, { color: colors.textMuted }]}>🗓️ HAFTALIK DERS PROGRAMI</Text>
                    <View style={{ flex: 1 }} />
                    <Pressable onPress={() => navigation.navigate('Timetable')} hitSlop={8} accessibilityLabel="Ders programını düzenle">
                      <Text style={{ color: colors.accent, fontWeight: '800', fontSize: font.small }}>Düzenle ›</Text>
                    </Pressable>
                  </View>

                  {/* Günler üstte */}
                  {!saatVar ? (
                    <Pressable onPress={() => navigation.navigate('Timetable')} hitSlop={6} style={{ marginBottom: spacing.xs }}>
                      <Text style={{ color: colors.accent, fontSize: font.tiny, fontWeight: '800' }}>⏱️ Saatler henüz girilmemiş — saatleri ayarla ›</Text>
                    </Pressable>
                  ) : null}
                  <View style={[st.ttGridRow, { borderBottomColor: colors.border }]}>
                    <Text style={[st.ttSaat, { color: colors.textFaint }]}>SAAT</Text>
                    {GUN.map((g, i) => {
                      const isToday = i + 1 === bugun;
                      return (
                        <View key={g} style={[st.ttGun, isToday && { backgroundColor: colors.accent, borderRadius: radius.sm }]}>
                          <Text style={[st.ttGunT, { color: isToday ? colors.onAccent : colors.textMuted }]}>{g}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Saatler solda, günler sütun */}
                  {Array.from({ length: sonDers }, (_, i) => {
                    const period = i + 1;
                    const s = saatler[i] || {};
                    return (
                      <View key={period} style={[st.ttGridRow, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                        <View style={st.ttSaatCol}>
                          {ayniSaat && s.start ? (
                            <>
                              <Text style={[st.ttSaatT, { color: colors.text }]}>{s.start}</Text>
                              {s.end ? <Text style={[st.ttSaatT, { color: colors.textFaint }]}>{s.end}</Text> : null}
                            </>
                          ) : (
                            <Text style={[st.ttSaatT, { color: colors.textMuted }]}>{period}.</Text>
                          )}
                        </View>
                        {[1, 2, 3, 4, 5].map((d) => {
                          const l = en(d, period);
                          const col = l && l.label ? classColor(l.label) : null;
                          const isToday = d === bugun;
                          return (
                            <View key={d} style={[st.ttCell, isToday && { backgroundColor: colors.accent + '0D' }]}>
                              {l ? (
                                <View style={[st.ttBox, { backgroundColor: col + '1F', borderColor: col + '66' }]}>
                                  {/* Günlerin saatleri farklıysa (iki okul) saati hücrenin içinde göster */}
                                  {!ayniSaat && l.start ? <Text style={[st.ttBoxSaat, { color: colors.textMuted }]}>{l.start}</Text> : null}
                                  <Text style={[st.ttBoxT, { color: colors.text }]} numberOfLines={1}>{l.label || '—'}</Text>
                                  {l.ders ? <Text style={[st.ttBoxTag, { color: col }]}>{branchOf(l.ders).short}</Text> : null}
                                </View>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              );
            })()
          : null}

        {/* ---- Kısayollar ---- */}
        {/* defaultOpen: ana sayfa açıldığında kısayollar görünür başlar; kullanıcı isterse kapatır. */}
        <Collapsible title="KISAYOLLAR" defaultOpen style={{ marginTop: spacing.lg }}>
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
          <Tile icon="🖥️" tint={colors.second} title="Akıllı tahta" onPress={() => navigation.navigate('Board')} />
          <Tile icon="🎯" tint={colors.accent} title="Etkinlikler" onPress={() => navigation.navigate('Activities')} />
          <Tile icon="📁" tint={colors.second} title="Evraklar" onPress={() => navigation.navigate('Docs')} />
        </View>
        </Collapsible>

        {/* ---- Sınıflarım ---- */}
        <Collapsible
          title="SINIFLARIM"
          style={{ marginTop: spacing.lg }}
          right={<SmallButton title={adding ? 'Vazgeç' : '＋ Sınıf'} onPress={() => setAdding(!adding)} />}
        >
        {adding ? (
          <Card>
            <Field label="Sınıf adı" value={newName} onChangeText={setNewName} placeholder="ör. 7-B" autoFocus onSubmitEditing={create} />
            <SmallButton title="Oluştur" filled onPress={create} disabled={!newName.trim()} />
          </Card>
        ) : null}
        {Array.isArray(t.classes) && t.classes.length ? (
          <View style={st.classGrid}>
            {/* Küçük sınıftan büyüğe (5-A, 5-B, 6-A …), iki sütun. */}
            {[...t.classes].sort((a, b) => classOrder(a.name, b.name)).map((c) => {
              const sts = Object.values(c.students);
              const active = sts.filter((s) => studentTotals(s).last > Date.now() - 7 * 864e5).length;
              const col = classColor(c.name);
              return (
                <Pressable key={c.id} onPress={() => navigation.navigate('TeacherClass', { classId: c.id })} style={({ pressed }) => [st.classCard, shadow, { backgroundColor: col }, pressed && { opacity: 0.9 }]}>
                  <View style={[st.blob, { width: 90, height: 90, top: -30, right: -25 }]} />
                  <Text style={[st.className, { color: inkOn(col) }]}>{c.name}</Text>
                  <Text style={[st.classMeta, { color: inkOn(col), opacity: 0.9 }]}>{sts.length} öğrenci</Text>
                  <Text style={[st.classMeta, { color: inkOn(col), opacity: 0.9 }]}>{c.homeworks.length} ödev · {active} aktif</Text>
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
          <Pressable onPress={() => setAdding(true)} style={[st.emptyClass, { borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel="Sınıf ekle">
            <Text style={{ fontSize: 28 }}>🏫</Text>
            <Text style={{ color: colors.text, fontWeight: '800', marginTop: 4 }}>＋ Sınıf ekle</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.small, textAlign: 'center', marginTop: 2 }}>
              Sınıf adını yaz (ör. 7-B). Ya da ders programında şube seçtiğinde sınıf kendiliğinden eklenir.
            </Text>
          </Pressable>
        ) : null}
        {Array.isArray(t.classes) && t.classes.length && !adding ? (
          <Pressable onPress={() => setAdding(true)} style={{ alignSelf: 'flex-start', marginTop: spacing.sm }} accessibilityRole="button" accessibilityLabel="Yeni sınıf ekle">
            <Text style={{ color: colors.accent, fontWeight: '800', fontSize: font.small }}>＋ Yeni sınıf ekle</Text>
          </Pressable>
        ) : null}
        </Collapsible>

        {/* ---- Dikkat ---- */}
        {attention.length ? (
          <>
            <Collapsible title="DİKKAT" style={{ marginTop: spacing.lg }}>
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
            </Collapsible>
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

function Stat({ icon, value, label, color }) {
  return (
    <View style={st.stat}>
      <Text style={[st.statV, color && { color }]}>
        {icon} {value}
      </Text>
      <Text style={[st.statL, color && { color, opacity: 0.75 }]}>{label}</Text>
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
  // Haftalık ders programı kartı (ana sayfa, salt okunur): günler üstte, saatler solda
  ttCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg },
  ttHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  ttTitle: { fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  ttGridRow: { flexDirection: 'row', alignItems: 'stretch' },
  ttSaat: { width: 44, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, paddingVertical: 4 },
  ttGun: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  ttGunT: { fontSize: 10, fontWeight: '900' },
  ttSaatCol: { width: 44, justifyContent: 'center', paddingVertical: 6 },
  ttSaatT: { fontSize: 9, fontWeight: '700' },
  ttCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 1, paddingVertical: 3, minHeight: 34 },
  ttBox: { width: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 7, paddingVertical: 4, paddingHorizontal: 2 },
  ttBoxT: { fontSize: 10, fontWeight: '900' },
  ttBoxSaat: { fontSize: 8, fontWeight: '700', marginBottom: 1 },
  ttBoxTag: { fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl + spacing.lg, overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  logo: { height: 34, width: Math.round((34 * 669) / 200) }, // assets/logo.png (beyaz harfler) oranı 669×200
  logoText: { fontSize: 30, fontWeight: '900', letterSpacing: 3 },
  heroDate: { color: '#fff', fontSize: font.h2, fontWeight: '900', marginTop: spacing.md },
  // Branş: bant zaten tema rengi; ikinci bir marka rengi çakışıyordu. Banttaki diğer cam
  // yüzeylerle (istatistikler, profil hapı) aynı dil: yarı saydam beyaz zemin + beyaz yazı.
  branchPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 12, marginTop: spacing.sm },
  branchTxt: { color: '#FFFFFF', fontSize: font.small, fontWeight: '800', letterSpacing: 0.3 },
  tools: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.22)', borderRadius: radius.pill, padding: 3 },
  tool: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  toolOn: { backgroundColor: 'rgba(255,255,255,0.18)' },
  toolLine: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.35)' },
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
