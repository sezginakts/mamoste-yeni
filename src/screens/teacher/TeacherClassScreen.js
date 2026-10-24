// Sınıf ekranı: öğrenci ızgarası (öğrenci × kalıp renkleri), hızlı artı/eksi, ödevler.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Platform, Modal, useWindowDimensions } from 'react-native';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { PATTERNS, PATTERN_BY_ID } from '../../data/patterns';
import { studentPatternStats, studentStanding, weakSuggestion, homeworkStatus, accColor, classPatternStats } from '../../teacher/analytics';
import { Header, Card, SectionTitle, Field, SmallButton, Chip, Empty, formatDate, formatJoinCode, shareText, confirmAction, HW_DELETE_MSG } from '../../teacher/ui';
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
    const r = Object.values(cls.students).map((s) => ({ s, tot: studentStanding(s, cls, drills), ps: studentPatternStats(s) }));
    const byNo = (a, b) => (parseInt(a.s.no, 10) || 0) - (parseInt(b.s.no, 10) || 0) || String(a.s.no).localeCompare(String(b.s.no));
    // Verisi olmayan (null) en sona; eşitlikte puan, sonra numara.
    const perfKey = (x) => (x.tot.perf == null ? 2 : x.tot.perf);
    if (sort === 'no') r.sort(byNo);
    // En zorlanan: başarısı en düşük önce; eşitse geciken ödevi çok olan, sonra puanı düşük olan.
    if (sort === 'weak') r.sort((a, b) => perfKey(a) - perfKey(b) || b.tot.missing - a.tot.missing || a.tot.points - b.tot.points || byNo(a, b));
    // Puan: artı/eksi toplamı en yüksek önce.
    if (sort === 'points') r.sort((a, b) => b.tot.points - a.tot.points || byNo(a, b));
    // Çalışmayan: hiç çalışmamış ya da en uzun süredir çalışmayan önce; eşitse geciken ödevi çok, puanı düşük olan.
    if (sort === 'idle') r.sort((a, b) => (a.tot.last || 0) - (b.tot.last || 0) || b.tot.missing - a.tot.missing || a.tot.points - b.tot.points || byNo(a, b));
    return r;
  }, [cls, sort, drills]);

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
    confirmAction({ title: 'Sınıfı sil', message: `${cls.name}, öğrencileri ve ödevleriyle birlikte silinsin mi? Geri alınamaz.`, ok: 'Sil', destructive: true, onOk: go });
  };

  const today = dayKey();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={cls.name}
        subtitle={`${rows.length} öğrenci`}
        onBack={() => navigation.goBack()}
        right={<SmallButton title="🖥️ Tahta" onPress={() => navigation.navigate('Board')} />}
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
            {drills && weak.patterns.length ? (
              <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.warning }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>🩹 Önerilen ödev</Text>
                <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 4 }}>
                  Sınıfın en zorlandığı: {weak.patterns.map((p) => `${PATTERN_BY_ID[p.id].name} (%${Math.round(p.acc * 100)})`).join(', ')}
                </Text>
                <SmallButton title="Tek dokunuşla oluştur →" filled style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} onPress={() => navigation.navigate('HomeworkCreate', { classId, preset: 'weak' })} />
              </Card>
            ) : null}

            {/* Öğrencilerin evde uygulamaya yazacağı sınıf kodu */}
            <JoinCodeCard cls={cls} total={rows.length} />

            <SectionTitle right={<SmallButton title="＋ Öğrenci" onPress={openImport} />}>ÖĞRENCİLER</SectionTitle>
            {rows.length === 0 ? (
              <Card onPress={openImport} style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                <Text style={{ fontSize: 32 }}>📄</Text>
                <Text style={{ color: colors.text, fontWeight: '800', marginTop: 6 }}>Öğrenci listesini ekle</Text>
                <Text style={{ color: colors.textMuted, fontSize: font.small, textAlign: 'center', marginTop: 2 }}>
                  Excel / Word dosyasından ya da yapıştırarak tüm sınıfı tek seferde ekle.
                </Text>
                <Text style={{ color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.sm }}>
                  Gerçek isim zorunlu değil, sunucuya da gitmez. Öğrenci sınıf koduyla katılınca numarasıyla eşleşir; listede olmayan numara otomatik eklenir.
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
                <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginBottom: spacing.sm }}>{SORT_HINT[sort](drills)}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    <View style={st.gridRow}>
                      <Text style={[st.nameCol, st.headCell, { color: colors.textMuted }]}>Öğrenci</Text>
                      {drills ? <Text style={[st.numCol, st.headCell, { color: colors.textMuted }]}>Doğru</Text> : null}
                      <Text style={[st.numCol, st.headCell, { color: colors.textMuted }]}>Puan</Text>
                      {!drills ? <Text style={[st.numCol, st.headCell, { color: colors.textMuted }]}>Teslim</Text> : null}
                      {!drills ? <Text style={[st.numCol, st.headCell, { color: colors.textMuted }]}>Ort. not</Text> : null}
                      <Text style={[st.numCol, st.headCell, { color: colors.textMuted }]}>Geciken</Text>
                      <Text style={[st.numCol, st.headCell, { color: colors.textMuted }]}>Son</Text>
                      {(drills ? cols : []).map((p) => (
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
                            <MiniPM label="+" color={colors.success} onPress={() => t.addPoint(classId, s.id, 1)} />
                            <MiniPM label="−" color={colors.danger} onPress={() => t.addPoint(classId, s.id, -1)} />
                          </View>
                        </View>
                        {drills ? <Text style={[st.numCol, { color: colors.text }]}>{tot.t ? `%${Math.round(tot.acc * 100)}` : '—'}</Text> : null}
                        <Text style={[st.numCol, { color: tot.points > 0 ? colors.success : tot.points < 0 ? colors.danger : colors.textMuted, fontWeight: '800' }]}>
                          {tot.points > 0 ? '+' : ''}{tot.points}
                        </Text>
                        {!drills ? <Text style={[st.numCol, { color: colors.textMuted }]}>{(s.submissions || []).length}</Text> : null}
                        {!drills ? <Text style={[st.numCol, { color: colors.text }]}>{tot.perf != null ? Math.round(tot.perf * 100) : '—'}</Text> : null}
                        <Text style={[st.numCol, { color: tot.missing ? colors.danger : colors.textMuted, fontWeight: tot.missing ? '800' : '400' }]}>{tot.missing || '—'}</Text>
                        <Text style={[st.numCol, { color: colors.textMuted }]}>{agoLabel(tot.last)}</Text>
                        {(drills ? cols : []).map((p) => (
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
                {drills ? (
                  <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.sm }}>
                    Renk: 🔴 %50 altı · 🟠 %50–79 · 🟢 %80+ · gri = henüz yeterli veri yok (en az 3 cevap).
                  </Text>
                ) : null}
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
              const removeHw = () =>
                confirmAction({ title: `“${hw.title}” silinsin mi?`, message: HW_DELETE_MSG, ok: 'Sil', destructive: true, onOk: () => t.removeHomework(classId, hw.id) });
              return (
                <Card key={hw.id} onPress={() => navigation.navigate('HomeworkShare', { classId, hwIds: [hw.id] })}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '800' }}>{hw.title}{to ? ` · 👤 ${to.no} ${to.nk || to.nick || ''}` : ''}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 3 }}>{hw.type === 'task' ? 'Görev' : hwSummary(hw)}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 3 }}>
                        📅 Verildi {hw.createdAt ? formatDate(dayKey(new Date(hw.createdAt))) : '—'} · Son gün{' '}
                        <Text style={{ color: late ? colors.danger : colors.textMuted, fontWeight: late ? '800' : '400' }}>
                          {hw.due ? formatDate(hw.due) : '—'}{late ? ' (geçti)' : ''}
                        </Text>
                      </Text>
                      <Text style={{ color: s.done >= s.expected && s.expected ? colors.success : colors.textMuted, fontSize: font.small, marginTop: 3, fontWeight: '700' }}>
                        Teslim {s.done}/{s.expected}
                      </Text>
                    </View>
                    <SmallButton title="🗑" color={colors.danger} onPress={removeHw} />
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const ask = (title, message, ok, onOk) => confirmAction({ title, message, ok, onOk });

// Davet kodu: öğretmen tahtaya yazar, öğrenci evde Okul uygulamasında "Derse katıl"a kod + okul numarasıyla girer.
// Yenileyince eski kod çalışmaz; sınıftakiler kalır. Sonradan gelen öğrenciye güncel kod gönderilir (Paylaş).
function JoinCodeCard({ cls, total }) {
  const { colors } = useTheme();
  const t = useTeacher();
  const { width } = useWindowDimensions();
  const [big, setBig] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const joined = Object.values(cls.students).filter((s) => s.joined).length;

  const renew = () =>
    ask('Kodu yenile', 'Eski kod artık çalışmaz. Sınıfa katılmış öğrenciler sınıfta kalır.', 'Yenile', async () => {
      setBusy(true);
      setMsg(null);
      try {
        await t.newJoinCode(cls.id);
        setMsg({ ok: true, text: 'Yeni kod hazır.' });
      } catch (e) {
        setMsg({ ok: false, text: e.message || 'Olmadı, tekrar dene.' });
      }
      setBusy(false);
    });
  const share = async () => {
    const r = await shareText(`Okul uygulaması · ${cls.name} sınıf kodu: ${formatJoinCode(cls.code)}\nUygulamada “Derse katıl”a bu kodu ve okul numaranı yaz.`);
    if (r === 'copied') setMsg({ ok: true, text: 'Kopyalandı.' });
  };

  if (!t.cloudOn) {
    return (
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: font.small }}>Sunucuya bağlı değilsin; öğrenciler katılamaz, ödevler gönderilemez.</Text>
      </Card>
    );
  }
  const head = (
    <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1 }}>
      SINIF KODU · {joined}/{total} katıldı
    </Text>
  );
  if (!cls.rid || !cls.code) {
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          {head}
          <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 4 }}>
            {cls.rid ? 'Kod hazırlanıyor… Sunucu güncellenmediyse kod görünmez.' : 'Sınıf sunucuya eşitleniyor…'}
          </Text>
        </View>
        <SmallButton title={t.sync.busy ? '…' : '↻'} onPress={t.syncNow} disabled={t.sync.busy} />
      </Card>
    );
  }
  const code = formatJoinCode(cls.code);
  return (
    <Card>
      {head}
      <Text style={{ color: colors.accent, fontSize: 34, fontWeight: '900', letterSpacing: 4, marginTop: 4 }} selectable>
        {code}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>
        Tahtaya yaz; öğrenciler Okul uygulamasında “Derse katıl”a bu kodu ve okul numarasını girer. Yenileyince eski kod çalışmaz, sınıftakiler kalır.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
        <SmallButton title="⛶ Tahtada göster" onPress={() => setBig(true)} />
        <SmallButton title={Platform.OS === 'web' ? '📋 Kopyala' : '📤 Gönder'} onPress={share} />
        <SmallButton title={busy ? '…' : '🔄 Kodu yenile'} disabled={busy} onPress={renew} />
      </View>
      {msg ? <Text style={{ color: msg.ok ? colors.success : colors.danger, fontSize: font.small, marginTop: 6 }}>{msg.text}</Text> : null}
      <Modal visible={big} transparent animationType="fade" onRequestClose={() => setBig(false)}>
        <Pressable onPress={() => setBig(false)} style={st.codeModal}>
          <Text style={st.codeModalTitle}>{cls.name} · Okul → “Derse katıl”</Text>
          <Text style={[st.codeModalCode, { fontSize: Math.min(150, (width - 32) / 7) }]} numberOfLines={1} adjustsFontSizeToFit>{code}</Text>
          <Text style={st.codeModalSub}>Bu kodu ve okul numaranı yaz · {joined}/{total} katıldı · kapatmak için dokun</Text>
        </Pressable>
      </Modal>
    </Card>
  );
}

// Sıralama açıklaması (öğretmen neye göre dizildiğini görsün).
const SORT_HINT = {
  no: () => 'Okul numarasına göre.',
  weak: (drills) =>
    `En düşük başarı önce (${drills ? 'cümlelerde doğru oranı' : 'görevlerde verdiğin notların ortalaması'}); eşitse geciken ödevi çok, sonra puanı düşük olan. Verisi olmayan sonda.`,
  points: () => 'Artı/eksi puan toplamı en yüksek önce.',
  idle: (drills) => `En uzun süredir ${drills ? 'çalışmayan ya da ödev teslim etmeyen' : 'ödev teslim etmeyen'} önce; hiç etkinliği olmayan en üstte.`,
};

// Son çalışma: bugün / dün / 5 g / hiç
function agoLabel(ts) {
  if (!ts) return 'hiç';
  const d = Math.floor((Date.now() - ts) / 86400000);
  return d <= 0 ? 'bugün' : d === 1 ? 'dün' : `${d} g`;
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
  codeModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  codeModalTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  codeModalCode: { color: '#fff', fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  codeModalSub: { color: 'rgba(255,255,255,0.75)', fontSize: 16, fontWeight: '700', marginTop: 18, textAlign: 'center' },
  pm: { width: 28, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
