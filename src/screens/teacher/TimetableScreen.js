// Haftalık ders programı tablosu: soldan sağa Pzt–Cum, yukarıdan aşağıya ders saatleri.
// Hücreye dokun → sınıf seç. Saate dokun → giriş/çıkış saatini düzenle. "Saatleri ayarla" → okulun saatlerini tek seferde doldur.
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, ScrollView, Pressable, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { spacing, font, radius, classColorFor, timetableColorFor, inkOn } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { useDesk, weekdayOf, buildPeriods, periodAt } from '../../teacher/DeskContext';
import { usePruneStaleLessons } from '../../teacher/pruneLessons';
import { Header, Chip } from '../../teacher/ui';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
const GRADES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// Sınıf rengi: önce şubeye özel renk (ör. 5-C fuşya), yoksa düzey rengi.
// Düzey rengi sabit: 5 sarı, 6 gök mavisi, 7 mercan, 8 turkuaz (tema değişse de aynı).
export function classColor(label) {
  return classColorFor(label);
}

export default function TimetableScreen({ navigation }) {
  const { colors, shadow } = useTheme();
  const t = useTeacher();
  const desk = useDesk();
  usePruneStaleLessons();
  const today = weekdayOf();
  const now = today <= 5 ? periodAt(desk.periods) : null;
  const [cell, setCell] = useState(null); // { day, period } sınıf seçimi
  const [timeIdx, setTimeIdx] = useState(null); // saat düzenlenen ders
  const [quick, setQuick] = useState(false);
  const hasTimes = desk.periods.some((p) => p.start);

  const lessonCount = Object.keys(desk.lessons).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Ders Programı" subtitle={lessonCount ? `Haftada ${lessonCount} ders` : 'Hücreye dokun, sınıfı seç'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        {/* Üst araçlar */}
        <View style={st.tools}>
          <Pressable onPress={() => setQuick(true)} style={[st.toolBtn, { backgroundColor: colors.accent }]}>
            <Text style={{ color: colors.onAccent, fontWeight: '800', fontSize: font.small }}>⏱️ {hasTimes ? 'Saatleri ayarla' : 'Okulun saatlerini gir'}</Text>
          </Pressable>
          <View style={[st.stepper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Pressable onPress={() => desk.setPeriodCount(desk.periods.length - 1)} hitSlop={6} style={st.stepBtn} accessibilityLabel="Bir ders azalt">
              <Text style={[st.stepT, { color: colors.text }]}>−</Text>
            </Pressable>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: font.small }}>{desk.periods.length} ders</Text>
            <Pressable onPress={() => desk.setPeriodCount(desk.periods.length + 1)} hitSlop={6} style={st.stepBtn} accessibilityLabel="Bir ders ekle">
              <Text style={[st.stepT, { color: colors.text }]}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Tablo */}
        <View style={[st.table, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[st.row, { backgroundColor: colors.cardSoft }]}>
            <View style={[st.timeCol, st.headCell]}>
              <Text style={[st.headT, { color: colors.textMuted }]}>SAAT</Text>
            </View>
            {SHORT.map((d, i) => {
              const isToday = today === i + 1;
              return (
                <View key={d} style={[st.dayCol, st.headCell]}>
                  <View style={[st.dayPill, isToday && { backgroundColor: colors.accent }]}>
                    <Text style={[st.headT, { color: isToday ? colors.onAccent : colors.text }]}>{d}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {desk.periods.map((p, i) => {
            const period = i + 1;
            const isNow = now && now.period === period;
            return (
              <View key={period} style={[st.row, { borderTopColor: colors.border }, st.rowBorder]}>
                <Pressable onPress={() => setTimeIdx(i)} style={[st.timeCol, st.timeCell, isNow && { backgroundColor: colors.accent + '1A' }]} accessibilityLabel={`${period}. ders saatini düzenle`}>
                  <Text style={{ color: isNow ? colors.accent : colors.text, fontWeight: '900', fontSize: font.small }}>{period}.</Text>
                  {p.start ? (
                    <>
                      <Text style={[st.timeT, { color: colors.textMuted }]}>{p.start}</Text>
                      <Text style={[st.timeT, { color: colors.textFaint }]}>{p.end}</Text>
                    </>
                  ) : (
                    <Text style={[st.timeT, { color: colors.accent }]}>saat ekle</Text>
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
                          l ? { backgroundColor: c + '22', borderColor: c } : { borderColor: colors.border, borderStyle: 'dashed' },
                          day === today && !l && { backgroundColor: colors.accent + '0D' },
                          live && { borderWidth: 2.5, borderColor: colors.accent },
                        ]}
                      >
                        {l ? (
                          <Text style={[st.cellT, { color: colors.text }]} numberOfLines={2}>{l.label}</Text>
                        ) : (
                          <Text style={{ color: colors.textFaint, fontSize: 16 }}>+</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {cell ? (
        <ClassPicker
          cell={cell}
          lesson={desk.lessons[`${cell.day}-${cell.period}`]}
          period={desk.periods[cell.period - 1]}
          classes={t.classes}
          onPick={(pick) => {
            if (!pick) desk.setLesson(cell.day, cell.period, null);
            else {
              // Sınıf Sınıflarım'da yoksa oluştur — program ile sınıf listesi aynı kalsın.
              const label = `${pick.grade}-${pick.branch}`;
              const existing = t.classes.find((c) => {
                const p = parseClassName(c.name);
                return p.grade === pick.grade && p.branch === pick.branch;
              });
              const classId = existing ? existing.id : t.addClass(label);
              desk.setLesson(cell.day, cell.period, { classId, grade: pick.grade, label: existing ? existing.name : label });
            }
            setCell(null);
          }}
          onClose={() => setCell(null)}
        />
      ) : null}
      {timeIdx != null ? (
        <TimeEditor
          index={timeIdx}
          value={desk.periods[timeIdx]}
          onSave={(v) => {
            desk.setPeriod(timeIdx, v);
            setTimeIdx(null);
          }}
          onClose={() => setTimeIdx(null)}
        />
      ) : null}
      {quick ? (
        <QuickTimes
          count={desk.periods.length}
          onApply={(ps) => {
            desk.setPeriods(ps);
            setQuick(false);
          }}
          onClose={() => setQuick(false)}
        />
      ) : null}
    </View>
  );
}

// ---- Alttan açılan pencere ----
function Sheet({ title, subtitle, onClose, children }) {
  const { colors } = useTheme();
  // Alttaki sistem çubuğu (Android gezinme tuşları, iPhone çizgisi) düğmeleri örtmesin.
  const insets = useSafeAreaInsets();
  const bottom = spacing.xl + Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 0);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* Klavye açılırsa pencere klavyenin üstüne çıkar. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Kapat">
          <Pressable style={[st.sheet, { backgroundColor: colors.card, paddingBottom: bottom }]} onPress={() => {}}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[st.grabber, { backgroundColor: colors.border }]} />
              <Text style={{ color: colors.text, fontSize: font.h3, fontWeight: '900' }}>{title}</Text>
              {subtitle ? <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>{subtitle}</Text> : null}
              <View style={{ marginTop: spacing.md }}>{children}</View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const BRANCHES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// "7-B", "7B", "7/b", "7 - B" -> { grade: 7, branch: 'B' }
export function parseClassName(name) {
  const m = String(name || '').match(/^\s*(\d{1,2})\s*[-/.\s]?\s*([A-Za-zÇĞİÖŞÜçğıöşü])?/);
  if (!m) return { grade: null, branch: null };
  return { grade: +m[1], branch: m[2] ? m[2].toLocaleUpperCase('tr') : null };
}

// Sınıf + şube seç ("7" + "B" -> 7-B). Daha önce girilen sınıflar üstte hızlı seçim.
// onPick({ grade, branch }) ya da onPick(null) = boşalt.
function ClassPicker({ cell, lesson, period, classes, onPick, onClose }) {
  const { colors } = useTheme();
  const time = period && period.start ? ` · ${period.start}–${period.end}` : '';
  const cur = lesson ? parseClassName(lesson.label) : { grade: null, branch: null };
  const [grade, setGrade] = useState(cur.grade);
  const [branch, setBranch] = useState(cur.branch);
  const name = grade && branch ? `${grade}-${branch}` : null;
  const known = classes.filter((c) => parseClassName(c.name).branch);

  return (
    <Sheet title={`${DAYS[cell.day - 1]} · ${cell.period}. ders`} subtitle={`Bu saatte hangi sınıfa giriyorsun?${time}`} onClose={onClose}>
      {known.length ? (
        <>
          <Text style={[st.pickLbl, { color: colors.textMuted }]}>SINIFLARIM</Text>
          <View style={st.chips}>
            {known.map((c) => {
              const p = parseClassName(c.name);
              return <Chip key={c.id} label={c.name} color={classColor(`${p.grade}-${p.branch}`)} active={grade === p.grade && branch === p.branch} onPress={() => onPick(p)} />;
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

      <Pressable
        onPress={() => name && onPick({ grade, branch })}
        disabled={!name}
        style={[st.primary, { backgroundColor: name ? classColor(name) : colors.accent, marginTop: spacing.md }, !name && { opacity: 0.4 }]}
      >
        <Text style={{ color: inkOn(name ? classColor(name) : colors.accent), fontWeight: '900', fontSize: font.body }}>
          {name ? `${name} olarak kaydet` : !grade ? 'Sınıfı seç' : 'Şubeyi seç'}
        </Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        {lesson ? (
          <Pressable onPress={() => onPick(null)} style={[st.sheetBtn, { borderColor: colors.danger }]}>
            <Text style={{ color: colors.danger, fontWeight: '800' }}>Dersi boşalt</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onClose} style={[st.sheetBtn, { borderColor: colors.border, flex: 1 }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>Vazgeç</Text>
        </Pressable>
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
    <Sheet title={`${index + 1}. ders saati`} subtitle="Giriş ve çıkış saatini tekerleği kaydırarak seç." onClose={onClose}>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'center' }}>
        <TimeField label="GİRİŞ" value={start} onChange={(v) => { setStart(v); if (!(end > v)) setEnd(addMin(v, 40)); }} />
        <Text style={{ color: colors.textMuted, fontSize: font.h3, marginTop: 20 }}>–</Text>
        <TimeField label="ÇIKIŞ" value={end} onChange={setEnd} />
      </View>
      {!ok ? <Text style={{ color: colors.danger, fontSize: font.small, marginTop: spacing.sm, textAlign: 'center' }}>Çıkış saati girişten sonra olmalı.</Text> : null}
      <Pressable onPress={() => ok && onSave({ start, end })} style={[st.primary, { backgroundColor: colors.accent }, !ok && { opacity: 0.4 }]}>
        <Text style={{ color: colors.onAccent, fontWeight: '800' }}>Kaydet</Text>
      </Pressable>
      {value.start ? (
        <Pressable onPress={() => onSave({ start: '', end: '' })} style={[st.sheetBtn, { borderColor: colors.danger, marginTop: spacing.sm }]}>
          <Text style={{ color: colors.danger, fontWeight: '800' }}>Saati sil</Text>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

function QuickTimes({ count, onApply, onClose }) {
  const { colors } = useTheme();
  const [n, setN] = useState(count);
  const [first, setFirst] = useState('08:00');
  const [lesson, setLesson] = useState(40);
  const [rest, setRest] = useState(10);
  const [lunchAfter, setLunchAfter] = useState(0);
  const [lunch, setLunch] = useState(40);
  const preview = validTime(first) && lesson > 0 && n > 0 ? buildPeriods({ count: Math.min(12, n), first, lesson, rest, lunchAfter, lunch }) : null;
  return (
    <Sheet title="Okulun ders saatleri" subtitle="Bir kez gir, bütün dersler dolsun. Sonra tek tek düzeltebilirsin." onClose={onClose}>
      <View style={{ alignItems: 'center' }}>
        <TimeField label="İLK DERS GİRİŞ" value={first} onChange={setFirst} />
      </View>
      <View style={[st.formRow, { marginTop: spacing.sm }]}>
        <NumField label="DERS SÜRESİ" value={lesson} onChange={setLesson} suffix="dk" step={5} min={5} max={120} />
        <NumField label="TENEFFÜS" value={rest} onChange={setRest} suffix="dk" step={5} max={60} />
        <NumField label="DERS SAYISI" value={n} onChange={setN} min={1} max={12} />
        <NumField label="ÖĞLE ARASI (kaçıncı dersten sonra)" value={lunchAfter} onChange={setLunchAfter} suffix={lunchAfter ? '. ders' : 'yok'} max={11} />
        {lunchAfter ? <NumField label="ÖĞLE ARASI" value={lunch} onChange={setLunch} suffix="dk" step={5} min={5} max={120} /> : null}
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
      <Pressable onPress={() => preview && onApply(preview)} style={[st.primary, { backgroundColor: colors.accent }, !preview && { opacity: 0.4 }]}>
        <Text style={{ color: colors.onAccent, fontWeight: '800' }}>Saatleri uygula</Text>
      </Pressable>
    </Sheet>
  );
}

const st = StyleSheet.create({
  tools: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  toolBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 11, alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 4 },
  stepBtn: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepT: { fontSize: 20, fontWeight: '800' },

  table: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth },
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
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxWidth: 640, width: '100%', alignSelf: 'center' },
  grabber: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.md },
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
