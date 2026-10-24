// Ödev oluşturucu — amaç: sınıfa ödev 3 dokunuşta.
// Her şeyin akıllı varsayılanı var: sıradaki kalıp, 10 cümle, +3 kişisel tekrar, son gün = gelecek hafta.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { spacing, font } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { PATTERNS, PATTERN_BY_ID, CATEGORIES } from '../../data/patterns';
import { weakSuggestion, addDays, nextWeekday, studentPatternStats } from '../../teacher/analytics';
import { HW_KINDS, hwSummary } from '../../utils/homework';
import { Header, Card, SectionTitle, Field, SmallButton, Chip, formatDate } from '../../teacher/ui';
import DuePicker, { nextWeekDue } from '../../teacher/DuePicker';

// Sınıfın son ödevindeki kalıptan bir sonraki kalıp (müfredat sırası = PATTERNS sırası).
function nextPatternFor(cls) {
  const last = (cls.homeworks || []).find((h) => h.kind === 'new' && h.p && h.p.length);
  if (!last) return PATTERNS[0].id;
  const i = PATTERNS.findIndex((p) => p.id === last.p[last.p.length - 1]);
  return PATTERNS[Math.min(PATTERNS.length - 1, i + 1)].id;
}
function lastPatterns(cls) {
  const last = (cls.homeworks || []).find((h) => h.p && h.p.length);
  return last ? last.p : [PATTERNS[0].id];
}

export default function HomeworkCreateScreen({ route, navigation }) {
  const { classId, studentId, preset } = route.params;
  const { colors } = useTheme();
  const t = useTeacher();
  const cls = t.getClass(classId);
  const student = studentId ? cls.students[studentId] : null;
  const weak = useMemo(() => weakSuggestion(cls), [cls]);

  // Bireysel ödevde varsayılan: öğrencinin takıldığı cümleler.
  const studentWeakIds = useMemo(() => {
    if (!student) return [];
    return Object.entries(student.attempts || {})
      .filter(([, a]) => a.f > 0)
      .sort((a, b) => b[1].f - a[1].f)
      .slice(0, 10)
      .map(([id]) => id);
  }, [student]);
  const studentWeakPattern = useMemo(() => {
    if (!student) return null;
    const ps = studentPatternStats(student);
    const w = Object.entries(ps).filter(([, o]) => o.acc != null).sort((a, b) => a[1].acc - b[1].acc)[0];
    return w ? w[0] : null;
  }, [student]);

  const initial = () => {
    if (preset === 'week') return { kind: 'week', p: [nextPatternFor(cls)] };
    if (preset === 'weak' && weak.patterns.length) return { kind: 'weak', p: weak.patterns.map((x) => x.id) };
    if (student && (studentWeakIds.length || studentWeakPattern)) return { kind: 'weak', p: studentWeakPattern ? [studentWeakPattern] : lastPatterns(cls) };
    return { kind: 'new', p: [nextPatternFor(cls)] };
  };
  const init = useMemo(initial, []);
  const [kind, setKind] = useState(init.kind);
  const [pats, setPats] = useState(init.p);
  const [n, setN] = useState(10);
  const [r, setR] = useState(student ? 5 : 3);
  const [due, setDue] = useState(nextWeekDue);
  const [target, setTarget] = useState(student ? student.id : 'all');
  const [title, setTitle] = useState('');
  const [showAll, setShowAll] = useState(false);

  const togglePat = (id) => setPats((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const patNames = pats.map((id) => PATTERN_BY_ID[id]?.name).filter(Boolean).join(' + ');
  const weakIds = target !== 'all' && studentWeakIds.length ? studentWeakIds : weak.ids;
  const useIds = kind === 'weak' && weakIds.length ? weakIds.slice(0, n) : undefined;
  const autoTitle = kind === 'week' ? `Haftalık plan: ${patNames}` : `${patNames || 'Seçili cümleler'} · ${HW_KINDS[kind]?.label || ''}`;

  const build = () => {
    const to = target === 'all' ? undefined : target;
    if (kind === 'week') {
      const x = pats[0] || nextPatternFor(cls);
      const prev = PATTERNS[Math.max(0, PATTERNS.findIndex((p) => p.id === x) - 1)].id;
      const mon = nextWeekday(1, new Date(Date.now() + 864e5));
      const name = PATTERN_BY_ID[x].name;
      return [
        { title: `${name} · 1) Yeni kalıp`, kind: 'new', p: [x], n, r: 0, due: addDays(mon, 2), to },
        { title: `${name} · 2) Tekrar`, kind: 'review', p: [x], n, r, due: addDays(mon, 4), to },
        { title: `${name} · 3) Karışık test`, kind: 'mixed', p: x === prev ? [x] : [x, prev], n, r, due: addDays(mon, 7), to },
      ];
    }
    return [{ title: title.trim() || autoTitle, kind, p: pats, n, r, ids: useIds, due, to }];
  };
  const preview = build();
  const canCreate = pats.length > 0 || (useIds && useIds.length);

  const create = () => {
    const { list } = t.addHomeworks(classId, build());
    navigation.replace('HomeworkShare', { classId, hwIds: list.map((h) => h.id) });
  };

  const shown = showAll ? PATTERNS : PATTERNS.filter((p) => pats.includes(p.id) || p.id === nextPatternFor(cls) || weak.patterns.some((w) => w.id === p.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Yeni ödev" subtitle={cls.name} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <SectionTitle>KİME</SectionTitle>
        <View style={st.wrap}>
          <Chip label={`👥 Tüm sınıf (${Object.keys(cls.students).length})`} active={target === 'all'} onPress={() => setTarget('all')} />
          {student ? <Chip label={`👤 ${student.no} ${student.nk || ''}`} active={target === student.id} onPress={() => setTarget(student.id)} /> : null}
        </View>

        <SectionTitle>TÜR</SectionTitle>
        <View style={st.wrap}>
          {Object.entries(HW_KINDS).map(([k, v]) => (
            <Chip key={k} label={`${v.emoji} ${v.label}`} active={kind === k} onPress={() => setKind(k)} />
          ))}
          {target === 'all' ? <Chip label="📅 Haftalık plan (3 ödev)" active={kind === 'week'} onPress={() => setKind('week')} color={colors.gold} /> : null}
        </View>
        <Text style={[st.hint, { color: colors.textMuted }]}>
          {kind === 'week'
            ? 'Tek QR ile 3 ödev: yeni kalıp → tekrar → önceki kalıpla karışık test. Son günler: Çarşamba, Cuma, Pazartesi.'
            : kind === 'weak'
            ? weakIds.length
              ? `${target === 'all' ? 'Sınıfın' : 'Öğrencinin'} en çok yanlış yaptığı ${Math.min(n, weakIds.length)} cümle seçildi.`
              : 'Henüz yanlış verisi yok; seçili kalıplardan tekrar yapılır.'
            : HW_KINDS[kind].desc}
        </Text>

        <SectionTitle right={<SmallButton title={showAll ? 'Önerilenler' : 'Tüm kalıplar'} onPress={() => setShowAll(!showAll)} style={{ paddingVertical: 4 }} />}>
          KALIP{kind === 'week' ? ' (haftanın kalıbı)' : ''}
        </SectionTitle>
        {showAll
          ? CATEGORIES.map((c) => (
              <View key={c.id} style={{ marginBottom: 6 }}>
                <Text style={[st.cat, { color: colors.textFaint }]}>{c.emoji} {c.name}</Text>
                <View style={st.wrap}>
                  {c.patternIds.map((id) => PATTERN_BY_ID[id]).filter(Boolean).map((p) => (
                    <Chip key={p.id} small label={p.name} color={p.color} active={pats.includes(p.id)} onPress={() => (kind === 'week' ? setPats([p.id]) : togglePat(p.id))} />
                  ))}
                </View>
              </View>
            ))
          : (
            <View style={st.wrap}>
              {shown.map((p) => (
                <Chip
                  key={p.id}
                  label={`${p.name}${p.id === nextPatternFor(cls) ? ' · sıradaki' : ''}${weak.patterns.some((w) => w.id === p.id) ? ' · zayıf' : ''}`}
                  color={p.color}
                  active={pats.includes(p.id)}
                  onPress={() => (kind === 'week' ? setPats([p.id]) : togglePat(p.id))}
                />
              ))}
            </View>
          )}

        <SectionTitle>KAÇ CÜMLE</SectionTitle>
        <View style={st.wrap}>
          {[5, 10, 15, 20].map((x) => (
            <Chip key={x} label={String(x)} active={n === x} onPress={() => setN(x)} />
          ))}
        </View>

        <SectionTitle>KİŞİSEL TEKRAR (her öğrencinin kendi yanlışlarından)</SectionTitle>
        <View style={st.wrap}>
          {[0, 3, 5].map((x) => (
            <Chip key={x} label={x ? `+${x}` : 'Yok'} active={r === x} onPress={() => setR(x)} />
          ))}
        </View>

        {kind !== 'week' ? (
          <>
            <SectionTitle>SON GÜN</SectionTitle>
            <DuePicker value={due} onChange={setDue} />
            <Field label="Başlık (boş bırakılırsa otomatik)" value={title} onChangeText={setTitle} placeholder={autoTitle} />
          </>
        ) : null}

        <Card style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', marginBottom: 6 }}>ÖNİZLEME</Text>
          {preview.map((h, i) => (
            <Text key={i} style={{ color: colors.text, fontSize: font.small, marginBottom: 4 }}>
              • <Text style={{ fontWeight: '800' }}>{h.title}</Text> — {hwSummary(h)} · son gün {formatDate(h.due)}
            </Text>
          ))}
        </Card>
      </ScrollView>
      <View style={[st.footer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <SmallButton title="Oluştur ve gönder →" filled onPress={create} disabled={!canCreate} style={{ paddingVertical: 14 }} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: { fontSize: font.small, marginTop: 2, lineHeight: 19 },
  cat: { fontSize: font.tiny, fontWeight: '800', marginBottom: 4 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
