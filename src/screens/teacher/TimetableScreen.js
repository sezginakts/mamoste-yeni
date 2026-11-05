// Haftalık ders programı tablosu: soldan sağa Pzt–Cum, yukarıdan aşağıya ders saatleri.
// Hücreye dokun → sınıf seç. Saate dokun → giriş/çıkış saatini düzenle. "Saatleri ayarla" → okulun saatlerini tek seferde doldur.
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, ScrollView, Pressable, Modal, StyleSheet, KeyboardAvoidingView, Platform, TextInput, useWindowDimensions } from 'react-native';
import { spacing, font, radius, classColorFor, timetableColorFor, inkOn } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { useDesk, weekdayOf, buildPeriods, periodAt, ogleOf } from '../../teacher/DeskContext';
import { usePruneStaleLessons } from '../../teacher/pruneLessons';
import { Header, Chip } from '../../teacher/ui';
import { useRole } from '../../context/RoleContext';
import { branchOf } from '../../data/branches';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
const GRADES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// Sınıf rengi: önce şubeye özel renk (ör. 5-C fuşya), yoksa düzey rengi.
// Düzey rengi sabit: 5 sarı, 6 gök mavisi, 7 mercan, 8 turkuaz (tema değişse de aynı).
export function classColor(label) {
  return classColorFor(label);
}

export default function TimetableScreen({ navigation }) {
  const { colors } = useTheme();
  const t = useTeacher();
  const desk = useDesk();
  const { branchId, myBranches } = useRole();
  const dersler = (myBranches && myBranches.length ? myBranches : branchId ? [branchId] : []).map(branchOf);
  usePruneStaleLessons();
  const today = weekdayOf();
  const now = today <= 5 ? periodAt(desk.todayPeriods) : null;
  const [cell, setCell] = useState(null); // { day, period } sınıf seçimi
  const [timeIdx, setTimeIdx] = useState(null); // saat düzenlenen ders
  const [quick, setQuick] = useState(false);
  const [renaming, setRenaming] = useState(null); // hangi düzenin adı düzenleniyor
  const [yeniAd, setYeniAd] = useState('');

  // İki okulun saat düzeni: seçili düzen düzenlenir; her gün bir düzene bağlıdır.
  const SCHED_KEYS = ['a', 'b'];
  const activeKey = desk.activeSchedule;
  const activeSched = desk.schedules[activeKey] || desk.schedules.a;
  const activePeriods = activeSched.periods || [];
  // Öğle arası seçili okulun ayarıdır ("Saatleri ayarla"da kaçıncı dersten sonra): o dersten sonra bütün haftaya tek ince
  // şerit; yoksa şerit yok.
  const ogle = ogleOf(activeSched);
  const rowCount = Math.max(2, ...[1, 2, 3, 4, 5].map((g) => desk.periodsFor(g).length));
  const hasTimes = SCHED_KEYS.some((k) => (desk.schedules[k].periods || []).some((p) => p.start));
  const gunDuzeni = (day) => desk.schedules[desk.daySchedule[day] || 'a'] || desk.schedules.a;
  const gunuDegistir = (day) => {
    const cur = desk.daySchedule[day] || 'a';
    const next = cur === 'a' ? 'b' : 'a';
    desk.setDaySchedule(day, next);
  };

  const lessonCount = Object.keys(desk.lessons).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Ders Programı" subtitle={lessonCount ? `Haftada ${lessonCount} ders` : 'Hücreye dokun, sınıfı seç'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        {/* Okul saat düzeni: iki okulun saatleri ayrı; gün başlığından hangi günün hangi okul olduğu seçilir */}
        <View style={[st.schedBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 }}>SAAT DÜZENİ</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.xs, alignItems: 'center', flexWrap: 'wrap' }}>
            {SCHED_KEYS.map((k) => (
              <Chip key={k} label={desk.schedules[k].name} active={activeKey === k} onPress={() => desk.setActiveSchedule(k)} />
            ))}
            <Pressable
              onPress={() => {
                setRenaming(activeKey);
                setYeniAd(desk.schedules[activeKey].name);
              }}
              hitSlop={8}
              accessibilityLabel="Saat düzeni adını değiştir"
            >
              <Text style={{ color: colors.accent, fontWeight: '900' }}>✎</Text>
            </Pressable>
          </View>
          <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: 4 }}>
            Gün başlığındaki harfe dokun: o gün hangi okulun saatleri geçerli olsun. Saat sütunu seçili okulundur; ana sayfadaki programda da seçili okulun saatleri görünür ve sen değiştirene kadar kalır.
          </Text>
        </View>

        {/* Üst araçlar */}
        <View style={st.tools}>
          <Pressable onPress={() => setQuick(true)} style={[st.toolBtn, { backgroundColor: colors.accent }]}>
            <Text style={{ color: colors.onAccent, fontWeight: '800', fontSize: font.small }}>⏱️ {hasTimes ? 'Saatleri ayarla' : 'Okulun saatlerini gir'}</Text>
          </Pressable>
          <View style={[st.stepper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Pressable onPress={() => desk.setPeriodCount(activePeriods.length - 1)} hitSlop={6} style={st.stepBtn} accessibilityLabel="Bir ders azalt">
              <Text style={[st.stepT, { color: colors.text }]}>−</Text>
            </Pressable>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: font.small }}>{activePeriods.length} ders</Text>
            <Pressable onPress={() => desk.setPeriodCount(activePeriods.length + 1)} hitSlop={6} style={st.stepBtn} accessibilityLabel="Bir ders ekle">
              <Text style={[st.stepT, { color: colors.text }]}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Çakışan dersler: listeye geri eklenen dersin, saatinde artık başka ders olan hücreleri. Saatteki ders kalır
            (öğretmenin son ayarı); öğretmen isterse geri gelen dersi koyar ya da siler. O saati elle değiştirmek de çakışmayı kapatır. */}
        {desk.conflicts.length ? (
          <View style={[st.cakisma, { borderColor: colors.danger + '66', backgroundColor: colors.danger + '0F' }]}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body }}>⚠️ Çakışan dersler ({desk.conflicts.length})</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2, marginBottom: spacing.xs }}>
              Geri eklediğin dersin bu saatlerine başka ders koymuşsun. Şimdiki ders kalıyor; istersen eskisini geri koy.
            </Text>
            {desk.conflicts.map((p) => {
              const [g, s] = p.key.split('-').map(Number);
              const simdi = desk.lessons[p.key];
              const ad = (l) => (l ? `${l.ders ? branchOf(l.ders).short + ' ' : ''}${l.label || ''}`.trim() : '');
              return (
                <View key={p.id} style={[st.cakismaSatir, { borderTopColor: colors.border }]}>
                  <Text style={{ color: colors.text, fontSize: font.small, flex: 1 }}>
                    <Text style={{ fontWeight: '900' }}>{SHORT[g - 1]} {s}. ders: </Text>
                    {ad(p.lesson)}
                    <Text style={{ color: colors.textMuted }}>{simdi ? `  (şu an ${ad(simdi)})` : ''}</Text>
                  </Text>
                  <Pressable onPress={() => desk.applyConflict(p.id)} hitSlop={6} style={[st.cakismaBtn, { backgroundColor: colors.accent }]} accessibilityRole="button" accessibilityLabel={`${ad(p.lesson)} dersini geri koy`}>
                    <Text style={{ color: colors.onAccent, fontWeight: '900', fontSize: font.small }}>Bunu koy</Text>
                  </Pressable>
                  <Pressable onPress={() => desk.dropConflict(p.id)} hitSlop={6} style={[st.cakismaBtn, { borderWidth: 1, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={`${ad(p.lesson)} dersini sil`}>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: font.small }}>Sil</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Tablo */}
        {/* Gölge YOK: tablo köşeden kırpıldığı (overflow hidden) için gölge görünmüyordu ama iPhone kaydırırken her karede
            ekran dışı çizim yapıyor, sayfa takılarak kayıyordu. */}
        <View style={[st.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[st.row, { backgroundColor: colors.cardSoft }]}>
            <View style={[st.timeCol, st.headCell]}>
              <Text style={[st.headT, { color: colors.textMuted }]}>SAAT</Text>
            </View>
            {SHORT.map((d, i) => {
              const isToday = today === i + 1;
              const gunKey = desk.daySchedule[i + 1] || 'a';
              return (
                <Pressable
                  key={d}
                  onPress={() => gunuDegistir(i + 1)}
                  style={[st.dayCol, st.headCell]}
                  accessibilityRole="button"
                  accessibilityLabel={`${DAYS[i]} gününün saat düzeni: ${gunDuzeni(i + 1).name}. Değiştirmek için dokun.`}
                >
                  <View style={[st.dayPill, isToday && { backgroundColor: colors.accent }]}>
                    <Text style={[st.headT, { color: isToday ? colors.onAccent : colors.text }]}>{d}</Text>
                  </View>
                  <Text style={[st.schedBadge, { color: colors.textMuted, borderColor: colors.border }]}>{gunKey.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>

          {Array.from({ length: rowCount }, (_, i) => {
            const period = i + 1;
            const p = activePeriods[i] || {};
            const isNow = now && now.period === period;
            return (
              <React.Fragment key={period}>
              {ogle && period === ogle + 1 ? (
                <View style={[st.ogle, { borderTopColor: colors.border, backgroundColor: colors.cardSoft }]} accessibilityLabel={`Öğle arası, ${ogle}. dersten sonra`}>
                  <Text style={[st.ogleT, { color: colors.textMuted }]} {...SIGDIR}>ÖĞLE ARASI</Text>
                </View>
              ) : null}
              <View style={[st.row, { borderTopColor: colors.border }, st.rowBorder]}>
                <Pressable onPress={() => setTimeIdx(i)} style={[st.timeCol, st.timeCell, isNow && { backgroundColor: colors.accent + '1A' }]} accessibilityLabel={`${period}. ders saatini düzenle`}>
                  <Text style={{ color: isNow ? colors.accent : colors.text, fontWeight: '900', fontSize: font.small }} {...SIGDIR}>{period}.</Text>
                  {p.start ? (
                    <>
                      <Text style={[st.timeT, { color: colors.textMuted }]} {...SIGDIR}>{p.start}</Text>
                      <Text style={[st.timeT, { color: colors.textFaint }]} {...SIGDIR}>{p.end}</Text>
                    </>
                  ) : (
                    <Text style={[st.timeT, { color: colors.accent }]} {...SIGDIR}>saat ekle</Text>
                  )}
                </Pressable>
                {SHORT.map((d, di) => {
                  const day = di + 1;
                  const l = desk.lessons[`${day}-${period}`];
                  const c = l ? timetableColorFor(l.label) : null;
                  const live = isNow && day === today && now.status === 'now';
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setCell({ day, period })}
                      style={[st.dayCol, st.cell]}
                      accessibilityLabel={`${DAYS[di]} ${period}. ders${l ? ', ' + l.label : ', boş'}`}
                    >
                      <View
                        style={[
                          st.cellInner,
                          // Boş hücre düz ince kenarlı: kesik çizgili + yuvarlak kenar iPhone'da ayrıca çiziliyor (30+ hücrede kaydırma takılıyordu).
                          l ? { backgroundColor: c + '22', borderColor: c } : { borderColor: colors.border, borderWidth: 1 },
                          day === today && !l && { backgroundColor: colors.accent + '0D' },
                          live && { borderWidth: 2.5, borderColor: colors.accent },
                        ]}
                      >
                        {l ? (
                          <>
                            <Text style={[st.cellT, { color: colors.text }]} numberOfLines={2} maxFontSizeMultiplier={1.15}>{l.label}</Text>
                            {l.ders ? (
                              <Text style={[st.dersTag, { color: branchOf(l.ders).color, borderColor: branchOf(l.ders).color + '66' }]}>{branchOf(l.ders).short}</Text>
                            ) : null}
                          </>
                        ) : (
                          <Text style={{ color: colors.textFaint, fontSize: 16 }}>+</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>

      {cell ? (
        <ClassPicker
          cell={cell}
          lesson={desk.lessons[`${cell.day}-${cell.period}`]}
          period={desk.periodsFor(cell.day)[cell.period - 1]}
          classes={t.allClasses}
          dersler={dersler}
          varsayilanDers={branchId}
          onPick={(pick) => {
            if (!pick) desk.setLesson(cell.day, cell.period, null);
            else {
              // Sınıf o dersin Sınıflarım'ında yoksa o derse aç — program ile sınıf listesi aynı kalsın.
              // Aranan ders seçilen derstir (aktif ders değil): TVT'ye 7-A girilince İngilizce'nin 7-A'sı alınmasın.
              const ders = pick.ders || branchId;
              const label = `${pick.grade}-${pick.branch}`;
              const existing = t.allClasses.find((c) => {
                const p = parseClassName(c.name);
                return (c.branch || branchId) === ders && p.grade === pick.grade && p.branch === pick.branch;
              });
              const classId = existing ? existing.id : t.addClass(label, ders);
              desk.setLesson(cell.day, cell.period, {
                classId,
                grade: pick.grade,
                label: existing ? existing.name : label,
                ders,
              });
            }
            setCell(null);
          }}
          onClose={() => setCell(null)}
        />
      ) : null}
      {timeIdx != null ? (
        <TimeEditor
          index={timeIdx}
          value={activePeriods[timeIdx]}
          onSave={(v) => {
            desk.setPeriod(timeIdx, v);
            setTimeIdx(null);
          }}
          onClose={() => setTimeIdx(null)}
        />
      ) : null}
      {renaming ? (
        <Sheet
          title="Saat düzeni adı"
          subtitle="Ör. Atatürk Ortaokulu / İnönü Ortaokulu"
          onClose={() => setRenaming(null)}
          footer={
            <Pressable
              onPress={() => {
                desk.renameSchedule(renaming, yeniAd);
                setRenaming(null);
              }}
              style={{ backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: spacing.sm + 2, alignItems: 'center' }}
            >
              <Text style={{ color: colors.onAccent, fontWeight: '900' }}>Kaydet</Text>
            </Pressable>
          }
        >
          <TextInput
            value={yeniAd}
            onChangeText={setYeniAd}
            placeholder="1. Okul"
            placeholderTextColor="#94A3B8"
            autoFocus
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, color: colors.text, fontSize: font.body, backgroundColor: colors.card }}
          />
        </Sheet>
      ) : null}
      {quick ? (
        <QuickTimes
          count={activePeriods.length}
          periods={activePeriods}
          ogle={ogle}
          onApply={(ps, ogleSonra) => {
            desk.setPeriods(ps, { ogle: ogleSonra });
            setQuick(false);
          }}
          onClose={() => setQuick(false)}
        />
      ) : null}
    </View>
  );
}

// ---- Alttan açılan pencere ----
// Yayındaki 1.0.0'da "Saatleri ayarla"da öğle arası açılınca pencere uzuyor, "Saatleri uygula" ekranın altında
// kalıyor ve iPhone'da pencere kaydırılamadığı için öğretmen pencerede mahsur kalıyordu. Bu yüzden:
// - footer (asıl düğmeler) kaydırılan alanın DIŞINDA, pencerenin altında her zaman görünür;
// - başlıkta her zaman görünen ✕ Kapat var;
// - pencere bir Pressable değil düz View: kaydırma alanını saran Pressable dokunuşu üstlenmesin; arka plan ayrı katman;
// - yükseklik ekrandan (üst çentik payı düşülerek) hesaplanır, içerik sığmazsa yalnız orta alan kayar.
function Sheet({ title, subtitle, onClose, children, footer }) {
  const { colors } = useTheme();
  // Alttaki sistem çubuğu (Android gezinme tuşları, iPhone çizgisi) düğmeleri örtmesin.
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const bottom = spacing.md + Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 0);
  const maxHeight = Math.max(240, height - Math.max(insets.top, 24) - 12);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* Klavye açılırsa pencere klavyenin üstüne çıkar. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Kapat" />
          <View style={[st.sheet, { backgroundColor: colors.card, paddingBottom: bottom, maxHeight }]}>
            <View style={st.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: font.h3, fontWeight: '900' }}>{title}</Text>
                {subtitle ? <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>{subtitle}</Text> : null}
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={[st.kapat, { backgroundColor: colors.cardSoft }]} accessibilityRole="button" accessibilityLabel="Kapat">
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={{ flexShrink: 1 }} bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              <View style={{ paddingBottom: spacing.sm }}>{children}</View>
            </ScrollView>
            {footer ? <View style={[st.sheetFoot, { borderTopColor: colors.border }]}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Dar ızgara yazıları: telefonun yazı boyutu büyükse sütundan taşmasın (Android'de sık). Tek tek küçülme ("sığdır") YOK:
// aynı türdeki yazılar hep aynı boyda (iOS "sığdır"da tek bir yazıyı minicik yapabiliyordu). Saat sütunu 62 px'e
// en büyük boyda da sığar.
const SIGDIR = { numberOfLines: 1, maxFontSizeMultiplier: 1.15 };

const BRANCHES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// "7-B", "7B", "7/b", "7 - B" -> { grade: 7, branch: 'B' }
export function parseClassName(name) {
  const m = String(name || '').match(/^\s*(\d{1,2})\s*[-/.\s]?\s*([A-Za-zÇĞİÖŞÜçğıöşü])?/);
  if (!m) return { grade: null, branch: null };
  return { grade: +m[1], branch: m[2] ? m[2].toLocaleUpperCase('tr') : null };
}

// Sınıf + şube seç ("7" + "B" -> 7-B) ve ders (branş) seç.
// onPick({ grade, branch, ders }) ya da onPick(null) = boşalt.
function ClassPicker({ cell, lesson, period, classes, dersler = [], varsayilanDers, onPick, onClose }) {
  const { colors } = useTheme();
  const time = period && period.start ? ` · ${period.start}–${period.end}` : '';
  const cur = lesson ? parseClassName(lesson.label) : { grade: null, branch: null };
  const [ders, setDers] = useState((lesson && lesson.ders) || varsayilanDers || (dersler[0] && dersler[0].id) || null);
  const [grade, setGrade] = useState(cur.grade);
  const [branch, setBranch] = useState(cur.branch);
  const name = grade && branch ? `${grade}-${branch}` : null;
  const known = (classes || []).filter((c) => parseClassName(c.name).branch && (!ders || (c.branch || varsayilanDers) === ders));

  return (
    <Sheet
      title={`${DAYS[cell.day - 1]} · ${cell.period}. ders`}
      subtitle={`Bu saatte hangi derse, hangi sınıfa giriyorsun?${time}`}
      onClose={onClose}
      footer={
        <Pressable
          onPress={() => name && onPick({ grade, branch, ders })}
          disabled={!name}
          style={[st.primary, { marginTop: 0, backgroundColor: name ? classColor(name) : colors.accent }, !name && { opacity: 0.4 }]}
        >
          <Text style={{ color: inkOn(name ? classColor(name) : colors.accent), fontWeight: '900', fontSize: font.body }}>
            {name ? `${name} olarak kaydet` : !grade ? 'Sınıfı seç' : 'Şubeyi seç'}
          </Text>
        </Pressable>
      }
    >
      {/* Dolu hücrede "Dersi boşalt" EN ÜSTTE: pencere uzun olunca alttaki düğme ekran dışında kalıyordu. */}
      {lesson ? (
        <View style={[st.bosaltSatir, { borderColor: colors.danger + '55', backgroundColor: colors.danger + '0F' }]}>
          <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }} numberOfLines={1}>
            Şu an: {lesson.label || '—'}
          </Text>
          <Pressable onPress={() => onPick(null)} style={[st.bosaltBtn, { backgroundColor: colors.danger }]} accessibilityRole="button" accessibilityLabel="Dersi boşalt">
            <Text style={{ color: '#fff', fontWeight: '900' }}>🗑 Dersi boşalt</Text>
          </Pressable>
        </View>
      ) : null}
      {dersler.length > 1 ? (
        <>
          <Text style={[st.pickLbl, { color: colors.textMuted }]}>DERS</Text>
          <View style={st.chips}>
            {dersler.map((d) => (
              <Chip key={d.id} label={`${d.short} · ${d.name}`} color={d.color} active={ders === d.id} onPress={() => setDers(d.id)} />
            ))}
          </View>
        </>
      ) : null}

      {known.length ? (
        <>
          <Text style={[st.pickLbl, { color: colors.textMuted, marginTop: dersler.length > 1 ? spacing.md : 0 }]}>SINIFLARIM</Text>
          <View style={st.chips}>
            {known.map((c) => {
              const p = parseClassName(c.name);
              return <Chip key={c.id} label={c.name} color={classColor(`${p.grade}-${p.branch}`)} active={grade === p.grade && branch === p.branch} onPress={() => onPick({ ...p, ders })} />;
            })}
          </View>
          <Text style={[st.pickLbl, { color: colors.textMuted, marginTop: spacing.md }]}>YA DA YENİ SINIF</Text>
        </>
      ) : null}

      <Text style={[st.stepLbl, { color: colors.text }]}>1. Sınıf</Text>
      <View style={st.chips}>
        {GRADES.map((g) => (
          <Chip key={g} label={String(g)} active={grade === g} onPress={() => setGrade(g)} />
        ))}
      </View>
      <Text style={[st.stepLbl, { color: grade ? colors.text : colors.textFaint }]}>2. Şube</Text>
      <View style={[st.chips, !grade && { opacity: 0.4 }]} pointerEvents={grade ? 'auto' : 'none'}>
        {BRANCHES.map((b) => (
          <Chip key={b} label={b} active={branch === b} onPress={() => setBranch(b)} />
        ))}
      </View>
    </Sheet>
  );
}

const validTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const two = (n) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => two(i));
// Ders saatleri 5'in katları: 00, 05, 10 … 55.
const MINUTES = Array.from({ length: 12 }, (_, i) => two(i * 5));
// "08:30" + 40 dk -> "09:10"
const addMin = (t, m) => {
  const [h, mm] = t.split(':').map(Number);
  const x = (h * 60 + mm + m + 1440) % 1440;
  return `${two(Math.floor(x / 60))}:${two(x % 60)}`;
};

// Kaydırmalı tekerlek: ortadaki satır seçilidir. Klavye açılmaz.
const ITEM = 40;
function Wheel({ items, value, onChange, label }) {
  const { colors } = useTheme();
  const ref = React.useRef(null);
  const idx = Math.max(0, items.indexOf(value));
  React.useEffect(() => {
    const t = setTimeout(() => ref.current && ref.current.scrollTo({ y: idx * ITEM, animated: false }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const settle = (y) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM)));
    if (items[i] !== value) onChange(items[i]);
  };
  return (
    <View style={{ height: ITEM * 3, width: 64 }} accessibilityLabel={label}>
      <View pointerEvents="none" style={[st.wheelBand, { top: ITEM, backgroundColor: colors.accent + '1F', borderColor: colors.accent }]} />
      <ScrollView
        ref={ref}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.y)}
      >
        {items.map((it) => (
          <Pressable key={it} onPress={() => { onChange(it); ref.current && ref.current.scrollTo({ y: items.indexOf(it) * ITEM, animated: true }); }} style={{ height: ITEM, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: it === value ? 22 : 17, fontWeight: it === value ? '900' : '600', color: it === value ? colors.text : colors.textFaint }}>{it}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// Saat seçici: saat ve dakika tekerleği ("08:30").
function TimeField({ label, value, onChange }) {
  const { colors } = useTheme();
  const v = validTime(value) ? value : '08:00';
  const [h, raw] = v.split(':');
  // Eski kayıtta 5'in katı olmayan dakika varsa en yakın 5'e yuvarlanır.
  const m = two(Math.min(55, Math.round(+raw / 5) * 5));
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[st.pickLbl, { color: colors.textMuted }]}>{label}</Text>
      <View style={[st.wheelBox, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
        <Wheel items={HOURS} value={h} onChange={(x) => onChange(`${x}:${m}`)} label={`${label} saat`} />
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>:</Text>
        <Wheel items={MINUTES} value={m} onChange={(x) => onChange(`${h}:${x}`)} label={`${label} dakika`} />
      </View>
    </View>
  );
}

// Sayı: − değer + (klavye yok).
function NumField({ label, value, onChange, suffix, step = 1, min = 0, max = 999 }) {
  const { colors } = useTheme();
  const set = (x) => onChange(Math.max(min, Math.min(max, x)));
  return (
    <View>
      <Text style={[st.pickLbl, { color: colors.textMuted }]}>{label}</Text>
      <View style={[st.stepper, { borderColor: colors.border, backgroundColor: colors.cardSoft }]}>
        <Pressable onPress={() => set(value - step)} hitSlop={6} style={st.stepBtn} accessibilityLabel={`${label} azalt`}>
          <Text style={[st.stepT, { color: colors.text }]}>−</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body, minWidth: 30, textAlign: 'center' }}>{value}</Text>
        <Pressable onPress={() => set(value + step)} hitSlop={6} style={st.stepBtn} accessibilityLabel={`${label} artır`}>
          <Text style={[st.stepT, { color: colors.text }]}>+</Text>
        </Pressable>
        {suffix ? <Text style={{ color: colors.textMuted, fontSize: font.small, marginRight: 6 }}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function TimeEditor({ index, value, onSave, onClose }) {
  const { colors } = useTheme();
  // Saat girilmemişse 08:00 – 08:40.
  const [start, setStart] = useState(validTime(value.start) ? value.start : '08:00');
  const [end, setEnd] = useState(validTime(value.end) ? value.end : addMin(validTime(value.start) ? value.start : '08:00', 40));
  const ok = validTime(start) && validTime(end) && end > start;
  return (
    <Sheet
      title={`${index + 1}. ders saati`}
      subtitle="Giriş ve çıkış saatini tekerleği kaydırarak seç."
      onClose={onClose}
      footer={
        <>
          <Pressable onPress={() => ok && onSave({ start, end })} style={[st.primary, { marginTop: 0, backgroundColor: colors.accent }, !ok && { opacity: 0.4 }]}>
            <Text style={{ color: colors.onAccent, fontWeight: '800' }}>Kaydet</Text>
          </Pressable>
          {value.start ? (
            <Pressable onPress={() => onSave({ start: '', end: '' })} style={[st.sheetBtn, { borderColor: colors.danger, marginTop: spacing.sm }]}>
              <Text style={{ color: colors.danger, fontWeight: '800' }}>Saati sil</Text>
            </Pressable>
          ) : null}
        </>
      }
    >
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'center' }}>
        <TimeField label="GİRİŞ" value={start} onChange={(v) => { setStart(v); if (!(end > v)) setEnd(addMin(v, 40)); }} />
        <Text style={{ color: colors.textMuted, fontSize: font.h3, marginTop: 20 }}>–</Text>
        <TimeField label="ÇIKIŞ" value={end} onChange={setEnd} />
      </View>
      {!ok ? <Text style={{ color: colors.danger, fontSize: font.small, marginTop: spacing.sm, textAlign: 'center' }}>Çıkış saati girişten sonra olmalı.</Text> : null}
    </Sheet>
  );
}

// Pencere programdaki MEVCUT ayarla açılır (ilk ders, ders süresi, teneffüs, öğle arası yeri ve süresi). Öğle arasının
// yeri programdaki "Öğle arası" seçimiyle aynı ayardır: burada 0'dan başlasaydı uygulayınca seçilen yer silinirdi.
const dk = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || '');
  return m ? +m[1] * 60 + +m[2] : null;
};
function mevcutAyar(periods, ogle) {
  const ps = periods || [];
  const p0 = ps[0] || {};
  const s0 = dk(p0.start);
  const e0 = dk(p0.end);
  const ara = (i) => {
    const e = dk(ps[i] && ps[i].end);
    const s = dk(ps[i + 1] && ps[i + 1].start);
    return e != null && s != null && s >= e ? s - e : null;
  };
  // Teneffüs: öğle arası dışındaki aralıkların en sık görüleni.
  const sayac = {};
  ps.slice(0, -1).forEach((_, i) => {
    const a = ara(i);
    if (a != null && i + 1 !== ogle) sayac[a] = (sayac[a] || 0) + 1;
  });
  const enSik = Object.keys(sayac).sort((a, b) => sayac[b] - sayac[a])[0];
  const rest = enSik != null ? +enSik : 10;
  // Öğle arası süresi: o dersten sonraki gerçek ara; ara teneffüsten uzun değilse (yer yeni seçilmiş) 40 dk.
  const ogleDk = ogle ? ara(ogle - 1) : null;
  return {
    first: s0 != null ? p0.start : '08:00',
    lesson: s0 != null && e0 != null && e0 > s0 ? e0 - s0 : 40,
    rest,
    lunchAfter: ogle || 0,
    lunch: ogleDk && ogleDk > rest ? ogleDk : 40,
  };
}

function QuickTimes({ count, periods, ogle, onApply, onClose }) {
  const { colors } = useTheme();
  const [ilk] = useState(() => mevcutAyar(periods, ogle));
  const [n, setN] = useState(count);
  const [first, setFirst] = useState(ilk.first);
  const [lesson, setLesson] = useState(ilk.lesson);
  const [rest, setRest] = useState(ilk.rest);
  const [lunchAfter, setLunchAfter] = useState(ilk.lunchAfter);
  const [lunch, setLunch] = useState(ilk.lunch);
  const preview = validTime(first) && lesson > 0 && n > 0 ? buildPeriods({ count: Math.min(12, n), first, lesson, rest, lunchAfter, lunch }) : null;
  return (
    <Sheet
      title="Okulun ders saatleri"
      subtitle="Bir kez gir, bütün dersler dolsun. Sonra tek tek düzeltebilirsin."
      onClose={onClose}
      footer={
        <Pressable onPress={() => preview && onApply(preview, lunchAfter < preview.length ? lunchAfter : 0)} style={[st.primary, { marginTop: 0, backgroundColor: colors.accent }, !preview && { opacity: 0.4 }]}>
          <Text style={{ color: colors.onAccent, fontWeight: '800' }}>Saatleri uygula</Text>
        </Pressable>
      }
    >
      <View style={{ alignItems: 'center' }}>
        <TimeField label="İLK DERS GİRİŞ" value={first} onChange={setFirst} />
      </View>
      <View style={[st.formRow, { marginTop: spacing.sm }]}>
        <NumField label="DERS SÜRESİ" value={lesson} onChange={setLesson} suffix="dk" step={5} min={5} max={120} />
        <NumField label="TENEFFÜS" value={rest} onChange={setRest} suffix="dk" step={5} max={60} />
        <NumField label="DERS SAYISI" value={n} onChange={setN} min={1} max={12} />
      </View>
      {/* Öğle arası: yeri ve süresi aynı satırda (pencere uzamasın). */}
      <View style={[st.formRow, { marginTop: spacing.sm }]}>
        <NumField label="ÖĞLE ARASI · KAÇINCI DERSTEN SONRA" value={lunchAfter} onChange={setLunchAfter} suffix={lunchAfter ? '. ders' : 'yok'} max={11} />
        {lunchAfter ? <NumField label="SÜRESİ" value={lunch} onChange={setLunch} suffix="dk" step={5} min={5} max={120} /> : null}
      </View>
      {preview ? (
        <View style={[st.preview, { backgroundColor: colors.cardSoft }]}>
          {preview.map((p, i) => (
            <Text key={i} style={{ color: colors.text, fontSize: font.small, width: '50%', paddingVertical: 2 }}>
              <Text style={{ fontWeight: '900' }}>{i + 1}.</Text> {p.start}–{p.end}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={{ color: colors.textFaint, fontSize: font.small, marginTop: spacing.md }}>Ders süresini seç; saatler burada görünecek.</Text>
      )}
    </Sheet>
  );
}

const st = StyleSheet.create({
  schedBar: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  schedBadge: { fontSize: 10, fontWeight: '900', borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, marginTop: 3, overflow: 'hidden' },
  dersTag: { fontSize: 9, fontWeight: '900', borderWidth: 1, borderRadius: 5, paddingHorizontal: 4, marginTop: 2, overflow: 'hidden' },
  tools: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  cakisma: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  cakismaSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs, marginTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth },
  cakismaBtn: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  toolBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 11, alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 4 },
  stepBtn: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepT: { fontSize: 20, fontWeight: '800' },

  table: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth },
  ogle: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 3, alignItems: 'center', justifyContent: 'center' },
  ogleT: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  timeCol: { width: 62 },
  dayCol: { flex: 1, minWidth: 52 },
  headCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  headT: { fontSize: font.tiny, fontWeight: '900', letterSpacing: 0.5 },
  dayPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  timeCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  timeT: { fontSize: 10, fontWeight: '700' },
  cell: { padding: 3 },
  cellInner: { flex: 1, minHeight: 52, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  cellT: { fontWeight: '900', fontSize: 13, textAlign: 'center' },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  // maxHeight Sheet'te ekrandan hesaplanır; içerik sığmazsa yalnız orta alan kayar, footer hep görünür.
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingTop: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  kapat: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sheetFoot: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm },
  bosaltSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  bosaltBtn: { borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: spacing.md },
  pickLbl: { fontSize: font.tiny, fontWeight: '800', letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  stepLbl: { fontSize: font.body, fontWeight: '900', marginTop: spacing.sm, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  sheetBtn: { borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: spacing.lg, alignItems: 'center' },
  wheelBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 6 },
  wheelBand: { position: 'absolute', left: 4, right: 4, height: ITEM, borderRadius: 10, borderWidth: 1.5 },
  timeInput: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 9, fontSize: font.body, textAlign: 'center' },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  preview: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  primary: { marginTop: spacing.lg, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
});
