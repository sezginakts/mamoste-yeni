// Yıllık plan: bugünün haftası tek bakışta (öğrenme çıktıları, etkinlikler) + plan yükleme.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { spacing, font, radius, gradeColor, inkOn } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { usePlans } from '../../teacher/PlanContext';
import { parseYearPlan, weekForDay, guessGrade, assignDates, parseStartDate } from '../../teacher/yearPlan';
import { pickTableFile, RosterFileError } from '../../teacher/rosterFile';
import { WeekCard, WeekDaysCard, LessonCard, PlanCalendar, unitColor } from '../../teacher/planUi';
import { useDesk, weekdayOf, periodAt } from '../../teacher/DeskContext';
import { Header, Card, SectionTitle, Field, SmallButton, Chip, formatDate, formatDateLong, confirmAction } from '../../teacher/ui';
import { dayKey } from '../../utils/helpers';
import { useRole } from '../../context/RoleContext';

const GRADES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
const STATUS_LABEL ={ now: 'BU HAFTA', weekend: 'BU HAFTA (hafta sonu)', next: 'SIRADAKİ HAFTA', ended: 'PLANIN SON HAFTASI' };

export default function YearPlanScreen({ route, navigation }) {
  const { colors, shadow } = useTheme();
  const { plans, addPlan, removePlan, planForGrade } = usePlans();
  const desk = useDesk();
  const { branchId } = useRole();
  const params = route.params || {};
  // Haftanın dersleri (ders programından). Plan her zaman TEK bir dersi gösterir:
  // bugünkü / şimdiki ders, bugün yoksa o sınıfla bir sonraki ders.
  const todayDay = weekdayOf();
  const allWeek = desk.weekLessons(branchId).filter((l) => planForGrade(l.grade));
  const at = periodAt(desk.todayPeriods);
  const hasTimes = desk.todayPeriods.some((p) => p.start);
  const isUpcoming = (l) => l.day > todayDay || (l.day === todayDay && (!hasTimes || (at && l.period >= at.period)));
  const pickDefault = (list) => list.find(isUpcoming) || list[0] || null;
  const keyOf = (l) => `${l.day}-${l.period}`;
  const firstLesson = params.lessonKey ? allWeek.find((l) => keyOf(l) === params.lessonKey) : pickDefault(allWeek);
  const initialPlan =
    (params.planId && plans.find((p) => p.id === params.planId)) ||
    (params.grade && planForGrade(params.grade)) ||
    (firstLesson && planForGrade(firstLesson.grade)) ||
    plans[0];
  // Bu düzeyin bu haftaki dersleri bittiyse (ör. pazartesi dersi, bugün çarşamba) gelecek haftanın dersine geç.
  const rollsOver = (grade) => {
    const gl = allWeek.filter((l) => l.grade === grade);
    return gl.length > 0 && !gl.some(isUpcoming);
  };
  const [planId, setPlanId] = useState(initialPlan && initialPlan.id);
  const [lessonKey, setLessonKey] = useState(firstLesson && !params.lessonKey && initialPlan && firstLesson.grade !== initialPlan.grade ? null : firstLesson ? keyOf(firstLesson) : null);
  const [full, setFull] = useState(false); // haftanın tamamı açık mı
  const [rolled, setRolled] = useState(!params.lessonKey && !!initialPlan && rollsOver(initialPlan.grade));
  const [offset, setOffset] = useState(rolled ? 1 : 0); // bugünün haftasına göre kaç hafta ileri/geri
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState(null); // yükleme önizlemesi
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const plan = plans.find((p) => p.id === planId) || plans[0];
  const today = dayKey();
  const current = useMemo(() => (plan ? weekForDay(plan.weeks, today) : null), [plan, today]);
  const baseIndex = plan && current ? plan.weeks.indexOf(current.week) : 0;
  const index = plan ? Math.max(0, Math.min(plan.weeks.length - 1, baseIndex + offset)) : 0;
  const shown = plan ? plan.weeks[index] : null;
  const [calOpen, setCalOpen] = useState(false);
  // Kartın üstündeki çizgilerden haftanın başka bir ders saati seçildiyse (null = bugünkü/sıradaki ders).
  const [slotIdx, setSlotIdx] = useState(null);
  useEffect(() => setSlotIdx(null), [offset, planId, lessonKey]);
  // Bu düzeyin haftadaki dersleri (7-A, 7-B… farklı günler). Seçili ders yoksa bugünkü/sıradaki.
  const gradeLessons = plan ? allWeek.filter((l) => l.grade === plan.grade) : [];
  const picked = gradeLessons.find((l) => keyOf(l) === lessonKey) || (offset === 0 ? pickDefault(gradeLessons) : gradeLessons[0]) || null;
  const nextWeekLesson = rolled && offset === 1;
  const lesson = picked
    ? {
        ...picked,
        dayName: offset === 0 && picked.day === todayDay ? 'Bugün' : `${nextWeekLesson ? 'Gelecek ' : ''}${DAY_NAMES[picked.day - 1]}`,
        date: shown ? addDays(shown.start, picked.day - 1) : null,
        upcoming: (offset === 0 && picked.day !== todayDay && isUpcoming(picked)) || nextWeekLesson,
      }
    : null;

  // Üstte gösterilen gün: bu haftadaysak bugün; başka haftada o haftadaki dersin günü (yoksa pazartesi).
  const shownDay = !shown
    ? null
    : offset === 0
      ? today
      : addDays(shown.start, Math.max(0, (picked ? picked.day : Math.min(todayDay || 1, 5)) - 1));

  // Takvimden seçilen gün -> o günün haftası (hafta sonu da o haftaya sayılır; tatil/boşluksa sıradaki hafta).
  const pickDay = (k) => {
    const found = weekForDay(plan.weeks, k);
    if (found) setOffset(plan.weeks.indexOf(found.week) - baseIndex);
  };

  const importFile = async () => {
    setError(null);
    setBusy(true);
    try {
      const f = await pickTableFile({ replicateSpans: true });
      if (!f) return;
      const body = f.rows || String(f.text || '').split('\n').map((l) => l.split('\t'));
      // Word başlık paragrafı (yıl, sınıf) tablonun üstüne tek hücreli satır olarak eklenir.
      const rows = f.title ? [[f.title], ...body] : body;
      const res = parseYearPlan(rows);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDraft({
        file: f.name,
        grade: guessGrade(f.name) || res.grade,
        weeks: res.weeks,
        undated: res.undated,
        needsStart: !!res.needsStart,
        entries: res.entries || null,
        startText: '',
      });
    } catch (e) {
      setError(e instanceof RosterFileError ? e.message : 'Dosya okunamadı. Dosyanın bozuk ya da şifreli olmadığından emin ol.');
      if (!(e instanceof RosterFileError)) console.warn('yıllık plan dosyası', e);
    } finally {
      setBusy(false);
    }
  };

  // Tarihsiz planda haftalar, girilen ilk pazartesiden sırayla tarihlenir.
  const firstMonday = draft && draft.needsStart ? parseStartDate(draft.startText) : null;
  const draftWeeks = draft ? (draft.needsStart ? (firstMonday ? assignDates(draft.entries, firstMonday) : []) : draft.weeks) : [];

  const saveDraft = () => {
    const id = addPlan({ grade: draft.grade, name: draft.file.replace(/\.[^.]+$/, ''), file: draft.file, weeks: draftWeeks });
    setDraft(null);
    setPlanId(id);
    setOffset(0);
  };

  const confirmRemove = () => {
    const go = () => {
      removePlan(plan.id);
      setPlanId(null);
      setOffset(0);
    };
    const msg = `“${plan.name}” planı silinsin mi?`;
    confirmAction({ title: 'Planı sil', message: msg, ok: 'Sil', destructive: true, onOk: go });
  };

  // ---- Yükleme önizlemesi ----
  if (draft) {
    const first = draftWeeks[0];
    const last = draftWeeks[draftWeeks.length - 1];
    const replaces = draft.grade ? planForGrade(draft.grade) : null;
    const canSave = !!draft.grade && draftWeeks.length > 0;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Planı kontrol et" subtitle={draft.file} onBack={() => setDraft(null)} />
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={[st.label, { color: colors.textMuted }]}>BU PLAN HANGİ SINIF İÇİN?</Text>
            <View style={[st.chips, { marginTop: spacing.sm }]}>
              {GRADES.map((g) => (
                <Chip key={g} small label={`${g}. sınıf`} active={draft.grade === g} onPress={() => setDraft({ ...draft, grade: g })} />
              ))}
            </View>
            {replaces ? (
              <Text style={{ color: colors.warning, fontSize: font.small }}>
                {draft.grade}. sınıf için yüklü plan bunun yerine geçecek.
              </Text>
            ) : null}

            {draft.needsStart ? (
              <View style={{ marginTop: spacing.md }}>
                <Text style={{ color: colors.text, fontSize: font.small, marginBottom: spacing.sm }}>
                  Bu planda haftaların tarihi yazmıyor ({draft.entries.length} hafta). Ders yılının ilk haftasının tarihini gir; haftalar sırayla tarihlenecek.
                </Text>
                <Field
                  label="İlk haftanın tarihi (gg.aa.yyyy)"
                  value={draft.startText}
                  onChangeText={(startText) => setDraft({ ...draft, startText })}
                  placeholder="ör. 07.09.2026"
                  keyboardType="numbers-and-punctuation"
                />
                {draft.startText && !firstMonday ? (
                  <Text style={{ color: colors.danger, fontSize: font.small, marginTop: -spacing.sm, marginBottom: spacing.sm }}>Tarihi gg.aa.yyyy biçiminde yaz.</Text>
                ) : null}
              </View>
            ) : null}

            {first ? (
              <View style={{ marginTop: spacing.md }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{draftWeeks.length} hafta</Text>
                <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>
                  {formatDate(first.start)} – {formatDate(last.end)}
                </Text>
              </View>
            ) : null}
            {draft.undated ? (
              <Text style={{ color: colors.warning, fontSize: font.small, marginTop: 2 }}>
                {draft.undated} satırın tarihi okunamadı, bu satırlar alınmadı.
              </Text>
            ) : null}
            <SmallButton
              title={!draft.grade ? 'Önce sınıfı seç' : !draftWeeks.length ? 'Önce tarihi gir' : 'Planı kaydet'}
              filled
              disabled={!canSave}
              onPress={saveDraft}
              style={{ marginTop: spacing.md }}
            />
          </Card>
          {draftWeeks.length ? <SectionTitle>İLK HAFTALAR</SectionTitle> : null}
          {draftWeeks.slice(0, 3).map((w, i) => (
            <WeekCard key={`${w.start}-${i}`} w={w} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Yıllık Plan"
        subtitle={plan ? plan.name : 'Planını bir kez yükle, her gün o haftayı gör'}
        onBack={() => navigation.goBack()}
        right={plan ? <SmallButton title="＋ Plan" onPress={importFile} disabled={busy} /> : null}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        {error ? (
          <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.danger }}>
            <Text style={{ color: colors.text, fontSize: font.small }}>{error}</Text>
          </Card>
        ) : null}

        {!plan ? (
          <Card onPress={busy ? null : importFile} style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            {busy ? <ActivityIndicator color={colors.accent} /> : <Text style={{ fontSize: 36 }}>📅</Text>}
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: font.body, marginTop: 6 }}>
              {busy ? 'Plan okunuyor…' : 'Yıllık planı yükle'}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.small, textAlign: 'center', marginTop: 4 }}>
              Kullandığın yıllık planın Excel ya da Word dosyasını seç. Uygulama her gün o haftanın öğrenme çıktılarını ve etkinliklerini gösterir.
            </Text>
          </Card>
        ) : (
          <>
            {plans.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.gradeTabs}>
                {plans.map((p) => {
                  const on = p.id === plan.id;
                  const gc = gradeColor(p.grade);
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        const r = rollsOver(p.grade);
                        setPlanId(p.id);
                        setRolled(r);
                        setOffset(r ? 1 : 0);
                        setLessonKey(null);
                        setFull(false);
                      }}
                      style={[st.gradeTab, { backgroundColor: on ? gc : colors.card, borderColor: on ? gc : colors.border }]}
                    >
                      <Text style={{ color: on ? inkOn(gc) : colors.text, fontWeight: '800', fontSize: font.small }}>{p.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* Hafta gezgini: ‹  [📅 BU HAFTA · tarih]  › — ortaya dokununca takvim açılır */}
            <View style={[st.navBar, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={() => setOffset(offset - 1)} disabled={index === 0} style={[st.navArrow, { backgroundColor: colors.cardSoft }, index === 0 && { opacity: 0.35 }]} accessibilityLabel="Önceki hafta">
                <Text style={[st.navArrowT, { color: colors.text }]}>‹</Text>
              </Pressable>
              <Pressable onPress={() => setCalOpen(true)} style={st.navCenter} accessibilityLabel="Takvimden tarih seç">
                <Text style={{ color: offset === 0 ? colors.accent : colors.textMuted, fontWeight: '900', fontSize: font.tiny, letterSpacing: 1 }}>
                  {offset === 0 ? STATUS_LABEL[current.status] : nextWeekLesson ? 'GELECEK HAFTA' : `${offset > 0 ? offset + ' HAFTA SONRA' : -offset + ' HAFTA ÖNCE'}`}
                </Text>
                <View style={st.navDateRow}>
                  <Text style={{ fontSize: 16 }}>📅</Text>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: font.body }}>
                    {shown ? formatDateLong(shown.start) : '—'}
                  </Text>
                  <Text style={{ color: colors.textFaint, fontSize: 12 }}>▾</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => setOffset(offset + 1)} disabled={index >= plan.weeks.length - 1} style={[st.navArrow, { backgroundColor: colors.cardSoft }, index >= plan.weeks.length - 1 && { opacity: 0.35 }]} accessibilityLabel="Sonraki hafta">
                <Text style={[st.navArrowT, { color: colors.text }]}>›</Text>
              </Pressable>
            </View>
            {offset !== 0 && !nextWeekLesson ? (
              <Pressable onPress={() => setOffset(0)} style={[st.backToday, { borderColor: colors.accent }]}>
                <Text style={{ color: colors.accent, fontWeight: '800', fontSize: font.small }}>↺ Bu haftaya dön</Text>
              </Pressable>
            ) : null}

            {/* Aynı gün bu düzeyde birden çok ders varsa (7-A, 7-B) hangisi? */}
            {/* Bu sınıf düzeyinin haftadaki dersleri — hangisinin planını görmek istiyorsun? */}
            {gradeLessons.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: spacing.sm }}>
                {gradeLessons.map((l) => {
                  const on = lesson && keyOf(l) === keyOf(lesson);
                  return (
                    <Chip
                      key={keyOf(l)}
                      small
                      label={`${offset === 0 && l.day === todayDay ? 'Bugün' : DAY_SHORT[l.day - 1]} ${l.period}. ders · ${l.label}`}
                      active={on}
                      onPress={() => { setLessonKey(keyOf(l)); setFull(false); }}
                    />
                  );
                })}
              </ScrollView>
            ) : null}

            {shown ? (
              !lesson || full ? (
                <>
                  <WeekDaysCard w={shown} today={today} lessons={gradeLessons} />
                  {lesson ? (
                    <Pressable onPress={() => setFull(false)} style={[st.backToday, { borderColor: colors.accent, marginTop: -spacing.sm }]}>
                      <Text style={{ color: colors.accent, fontWeight: '800', fontSize: font.small }}>▴ Bugünkü derse dön</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : (
                <LessonCard
                  w={shown}
                  lesson={slotIdx != null ? { idx: slotIdx, count: lesson ? lesson.count : null, label: lesson ? lesson.label : plan.name } : lesson}
                  onShowWeek={() => setFull(true)}
                  onPickSlot={(i) => setSlotIdx(i)}
                />
              )
            ) : null}
            {!lesson ? (
              <Pressable onPress={() => navigation.navigate('Timetable')} style={[st.hint, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={{ color: colors.text, fontSize: font.small }}>
                  🗓️{' '}
                  {desk.hasTimetable ? (
                    <>
                      <Text style={{ fontWeight: '800' }}>Ders programında {plan.grade}. sınıflara ders yok.</Text> Programa eklersen plan her gün o dersin kısmını gösterir. ›
                    </>
                  ) : (
                    <>
                      <Text style={{ fontWeight: '800' }}>Ders programını gir</Text> — plan her gün sadece o günkü dersinin kısmını göstersin. ›
                    </>
                  )}
                </Text>
              </Pressable>
            ) : null}

            <SectionTitle right={<SmallButton title={showAll ? 'Gizle' : 'Göster'} onPress={() => setShowAll(!showAll)} />}>TÜM HAFTALAR</SectionTitle>
            {showAll ? (
              <View style={[st.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {plan.weeks.map((w, i) => (
                  <Pressable key={`${w.start}-${i}`} onPress={() => { setOffset(i - baseIndex); setShowAll(false); }} style={[st.row, { borderColor: colors.border }, i === index && { backgroundColor: colors.cardSoft }]}>
                    <View style={[st.dot, { backgroundColor: unitColor(w) }]} />
                    <Text style={{ color: colors.textMuted, fontSize: font.tiny, width: 44 }}>{w.week ? `${w.week}.` : '—'}</Text>
                    <Text style={{ color: w.holiday ? colors.textMuted : colors.text, fontSize: font.small, flex: 1, fontWeight: i === index ? '800' : '500' }} numberOfLines={1}>
                      {w.holiday ? '🏖️ ' : ''}{w.unit || w.topic || firstLine(w.outcomes) || firstLine(w.notes) || '—'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {calOpen ? (
              <PlanCalendar visible weeks={plan.weeks} selected={shown && shown.start} onClose={() => setCalOpen(false)} onPick={pickDay} />
            ) : null}

            {plan.builtin ? null : (
              <SmallButton title="Bu planı sil" color={colors.danger} onPress={confirmRemove} style={{ alignSelf: 'flex-start', marginTop: spacing.lg }} />
            )}
          </>
        )}

        <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.lg }}>
          Plan dosyasında hafta sütununda tarih olmalı (ör. “08-12 Eylül” ya da “08.09.2025 - 12.09.2025”).
        </Text>
      </ScrollView>
    </View>
  );
}

const firstLine = (s) => (s || '').split('\n')[0];

const MONTHS_LONG = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
// "21 Ekim 2026 Çarşamba"
function longDate(key) {
  const d = new Date(key + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()} ${WEEKDAYS_LONG[d.getDay()]}`;
}
function addDays(key, n) {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  label: { fontSize: font.tiny, fontWeight: '800', letterSpacing: 1 },
  gradeTabs: { gap: spacing.sm, paddingBottom: spacing.md },
  gradeTab: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5 },
  navBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  navArrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  navArrowT: { fontSize: 24, fontWeight: '800', lineHeight: 26 },
  navCenter: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  navDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  backToday: { alignSelf: 'center', borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, marginTop: -spacing.xs, marginBottom: spacing.md },
  list: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 11, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 10, height: 10, borderRadius: 5 },
  hint: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
});
