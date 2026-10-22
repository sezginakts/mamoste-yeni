// Sınıf ekranı: öğrenci ızgarası (öğrenci × kalıp renkleri), hızlı artı/eksi, ödevler.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { PATTERNS, PATTERN_BY_ID } from '../../data/patterns';
import { studentPatternStats, studentTotals, weakSuggestion, homeworkStatus, accColor, classPatternStats } from '../../teacher/analytics';
import { Header, Card, SectionTitle, Field, SmallButton, Chip, Empty, formatDate } from '../../teacher/ui';
import { hwSummary } from '../../utils/homework';
import { dayKey } from '../../utils/helpers';
import { usePlans } from '../../teacher/PlanContext';
import { weekForDay } from '../../teacher/yearPlan';
import { useRole } from '../../context/RoleContext';

const CELL = 34;

export default function TeacherClassScreen({ route, navigation }) {
  const { classId } = route.params;
  const { colors } = useTheme();
  const t = useTeacher();
  const { branch } = useRole();
  const drills = !branch || branch.drills;
  const cls = t.getClass(classId);
  const [tab, setTab] = useState(route.params.tab || 'students');
  const [sort, setSort] = useState('no');
  const [rename, setRename] = useState(null);

  const rows = useMemo(() => {
    if (!cls) return [];
    const r = Object.values(cls.students).map((s) => ({ s, tot: studentTotals(s), ps: studentPatternStats(s) }));
    if (sort === 'no') r.sort((a, b) => (parseInt(a.s.no, 10) || 0) - (parseInt(b.s.no, 10) || 0) || String(a.s.no).localeCompare(String(b.s.no)));
    if (sort === 'weak') r.sort((a, b) => (a.tot.acc ?? 2) - (b.tot.acc ?? 2));
    if (sort === 'points') r.sort((a, b) => b.tot.points - a.tot.points);
    if (sort === 'idle') r.sort((a, b) => (a.tot.last || 0) - (b.tot.last || 0));
    return r;
  }, [cls, sort]);

  // Sadece içinde veri olan kalıp sütunlarını göster (20 sütun telefonda boğar).
  const cols = useMemo(() => {
    if (!cls) return [];
    const cps = classPatternStats(cls);
    const used = PATTERNS.filter((p) => cps[p.id].t > 0 || (cls.homeworks || []).some((h) => (h.p || []).includes(p.id)));
    return used.length ? used : PATTERNS.slice(0, 6);
  }, [cls]);

  const weak = useMemo(() => (cls ? weakSuggestion(cls) : { patterns: [], ids: [] }), [cls]);
  // Sınıf adındaki düzeye göre yıllık plan: "7-B" -> 7. sınıf planı.
  const { planForGrade } = usePlans();
  const gradeMatch = cls ? String(cls.name).match(/^\s*(\d{1,2})/) : null;
  const gradePlan = gradeMatch ? planForGrade(+gradeMatch[1]) : null;
  const planWeek = gradePlan ? weekForDay(gradePlan.weeks, dayKey()) : null;

  if (!cls) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Sınıf bulunamadı" onBack={() => navigation.goBack()} /></View>;

  const openImport = () => navigation.navigate('RosterImport', { classId });

  const confirmDelete = () => {
    const go = () => {
      t.removeClass(classId);
      navigation.goBack();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`${cls.name} ve tüm kayıtları silinsin mi? Geri alınamaz.`)) go();
    } else Alert.alert('Sınıfı sil', `${cls.name} ve tüm kayıtları silinsin mi? Geri alınamaz.`, [{ text: 'Vazgeç' }, { text: 'Sil', style: 'destructive', onPress: go }]);
  };

  const today = dayKey();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={cls.name}
        subtitle={`Sınıf kodu ${cls.cc} · ${rows.length} öğrenci`}
        onBack={() => navigation.goBack()}
        right={<SmallButton title="🖥️ Tahta" onPress={() => navigation.navigate('Board', { classId })} />}
      />
      <View style={[st.tabs, { borderColor: colors.border }]}>
        {[['students', 'Öğrenciler'], ['homework', 'Ödevler']].map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[st.tab, tab === k && { borderBottomColor: colors.accent }]}>
            <Text style={{ color: tab === k ? colors.accent : colors.textMuted, fontWeight: '800' }}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        {tab === 'students' ? (
          <>
            {planWeek ? (
              <Card onPress={() => navigation.navigate('YearPlan', { planId: gradePlan.id })} style={{ borderLeftWidth: 4, borderLeftColor: colors.accent }}>
                <Text style={{ color: colors.accent, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 }}>
                  📅 {gradePlan.name.toLocaleUpperCase('tr')} · {planWeek.status === 'next' ? 'SIRADAKİ HAFTA' : planWeek.status === 'ended' ? 'PLAN BİTTİ' : 'BU HAFTA'}
                </Text>
                <Text style={{ color: colors.text, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>
                  {planWeek.week.holiday ? '🏖️ Tatil / özel gün' : planWeek.week.unit || planWeek.week.topic || '—'}
                </Text>
                {planWeek.week.outcomes ? (
                  <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }} numberOfLines={3}>{planWeek.week.outcomes}</Text>
                ) : null}
              </Card>
            ) : null}
            {weak.patterns.length ? (
              <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.warning }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>🩹 Önerilen ödev</Text>
                <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 4 }}>
                  Sınıfın en zorlandığı: {weak.patterns.map((p) => `${PATTERN_BY_ID[p.id].name} (%${Math.round(p.acc * 100)})`).join(', ')}
                </Text>
                <SmallButton title="Tek dokunuşla oluştur →" filled style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} onPress={() => navigation.navigate('HomeworkCreate', { classId, preset: 'weak' })} />
              </Card>
            ) : null}

            {/* Öğrencilerin uygulamadan katılacağı sınıf kodu */}
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1 }}>SINIF KODU</Text>
                <Text style={{ color: colors.accent, fontSize: 30, fontWeight: '900', letterSpacing: 4 }} selectable>
                  {t.cloudOn && !cls.rid ? '……' : cls.cc}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: font.small }}>
                  {t.cloudOn
                    ? `Öğrenciler “Sınıfa katıl”a bu kodu ve numaralarını yazar · ${Object.values(cls.students).filter((s) => s.joined).length}/${rows.length} katıldı`
                    : 'Sunucuya bağlı değilsin; ödevler gönderilemez.'}
                </Text>
              </View>
              {t.cloudOn ? <SmallButton title={t.sync.busy ? '…' : '↻'} onPress={t.syncNow} disabled={t.sync.busy} /> : null}
            </Card>

            <SectionTitle right={<SmallButton title="＋ Öğrenci" onPress={openImport} />}>ÖĞRENCİLER</SectionTitle>
            {rows.length === 0 ? (
              <Card onPress={openImport} style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                <Text style={{ fontSize: 32 }}>📄</Text>
                <Text style={{ color: colors.text, fontWeight: '800', marginTop: 6 }}>Öğrenci listesini ekle</Text>
                <Text style={{ color: colors.textMuted, fontSize: font.small, textAlign: 'center', marginTop: 2 }}>
                  Excel / Word dosyasından ya da yapıştırarak tüm sınıfı tek seferde ekle.
                </Text>
                <Text style={{ color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.sm }}>
                  Gerçek isim zorunlu değil. Öğrenciler ödev sonucunu okuttuğunda numarayla eşleşir; listede olmayan numara otomatik eklenir.
                </Text>
              </Card>
            ) : null}

            {rows.length ? (
              <>
                <View style={st.sortRow}>
                  {[['no', 'Numara'], ['weak', 'En zorlanan'], ['points', 'Puan'], ['idle', 'Çalışmayan']].map(([k, l]) => (
                    <Chip key={k} small label={l} active={sort === k} onPress={() => setSort(k)} />
                  ))}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    <View style={st.gridRow}>
                      <Text style={[st.nameCol, st.headCell, { color: colors.textMuted }]}>Öğrenci</Text>
                      <Text style={[st.numCol, st.headCell, { color: colors.textMuted }]}>Doğru</Text>
                      <Text style={[st.numCol, st.headCell, { color: colors.textMuted }]}>Puan</Text>
                      {cols.map((p) => (
                        <Text key={p.id} style={[st.cell, st.headCell, { color: p.color }]} numberOfLines={2}>
                          {p.name.replace(/\s+/g, '')}
                        </Text>
                      ))}
                    </View>
                    {rows.map(({ s, tot, ps }) => (
                      <Pressable key={s.id} style={[st.gridRow, { borderColor: colors.border }]} onPress={() => navigation.navigate('TeacherStudent', { classId, studentId: s.id })}>
                        <View style={st.nameCol}>
                          <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>
                            {t.cloudOn ? (s.joined ? '📱 ' : '◌ ') : ''}{s.no} {s.nk || s.nick || ''}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                            <MiniPM label="+" color={colors.primary} onPress={() => t.addPoint(classId, s.id, 1)} />
                            <MiniPM label="−" color={colors.danger} onPress={() => t.addPoint(classId, s.id, -1)} />
                          </View>
                        </View>
                        <Text style={[st.numCol, { color: colors.text }]}>{tot.t ? `%${Math.round(tot.acc * 100)}` : '—'}</Text>
                        <Text style={[st.numCol, { color: tot.points > 0 ? colors.primary : tot.points < 0 ? colors.danger : colors.textMuted, fontWeight: '800' }]}>
                          {tot.points > 0 ? '+' : ''}{tot.points}
                        </Text>
                        {cols.map((p) => (
                          <View key={p.id} style={[st.cell, { alignItems: 'center', justifyContent: 'center' }]}>
                            <View style={[st.dot, { backgroundColor: accColor(ps[p.id].acc, colors) }]}>
                              {ps[p.id].acc != null ? <Text style={st.dotT}>{Math.round(ps[p.id].acc * 100)}</Text> : null}
                            </View>
                          </View>
                        ))}
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.sm }}>
                  Renk: 🔴 %50 altı · 🟠 %50–79 · 🟢 %80+ · gri = henüz yeterli veri yok (en az 3 cevap). Satıra dokun → öğrenci profili.
                </Text>
              </>
            ) : null}

            <SectionTitle>SINIF AYARLARI</SectionTitle>
            {rename != null ? (
              <Card>
                <Field label="Sınıf adı" value={rename} onChangeText={setRename} />
                <SmallButton title="Kaydet" filled onPress={() => { t.renameClass(classId, rename.trim() || cls.name); setRename(null); }} />
              </Card>
            ) : (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <SmallButton title="Adını değiştir" onPress={() => setRename(cls.name)} />
                <SmallButton title="Sınıfı sil" color={colors.danger} onPress={confirmDelete} />
              </View>
            )}
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {drills ? (
                <>
                  <SmallButton title="＋ Cümle ödevi" filled style={{ flex: 1 }} onPress={() => navigation.navigate('HomeworkCreate', { classId })} />
                  <SmallButton title="📋 Görev" style={{ flex: 1 }} onPress={() => navigation.navigate('TaskCreate', { classId })} />
                  <SmallButton title="📅 Haftalık" style={{ flex: 1 }} onPress={() => navigation.navigate('HomeworkCreate', { classId, preset: 'week' })} />
                </>
              ) : (
                <SmallButton title="＋ Yeni ödev (görev)" filled style={{ flex: 1 }} onPress={() => navigation.navigate('TaskCreate', { classId })} />
              )}
            </View>
            <SectionTitle>VERİLEN ÖDEVLER</SectionTitle>
            {cls.homeworks.length === 0 ? <Empty text="Henüz ödev yok." /> : null}
            {cls.homeworks.map((hw) => {
              const s = homeworkStatus(cls, hw);
              const to = hw.to && cls.students[hw.to];
              const late = hw.due && hw.due < today && s.done < s.expected;
              return (
                <Card key={hw.id} onPress={() => navigation.navigate('HomeworkShare', { classId, hwIds: [hw.id] })}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{hw.title}{to ? ` · 👤 ${to.no} ${to.nk}` : ''}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 3 }}>{hwSummary(hw)}</Text>
                  <Text style={{ color: late ? colors.danger : colors.textMuted, fontSize: font.small, marginTop: 3 }}>
                    Son gün {formatDate(hw.due)} · teslim {s.done}/{s.expected}
                  </Text>
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MiniPM({ label, color, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={[st.pm, { borderColor: color }]}>
      <Text style={{ color, fontWeight: '900', fontSize: 16, lineHeight: 18 }}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  headCell: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  nameCol: { width: 130, paddingRight: 6, textAlign: 'left' },
  numCol: { width: 48, textAlign: 'center', fontSize: font.small },
  cell: { width: CELL + 18 },
  dot: { width: CELL, height: CELL, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  dotT: { color: '#fff', fontSize: 11, fontWeight: '900' },
  pm: { width: 28, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
