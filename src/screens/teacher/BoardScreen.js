// AKILLI TAHTA MODU — projeksiyon / etkileşimli tahta / tablet için.
// Büyük, yüksek kontrastlı yazı; tek dokunuşla ses; rastgele öğrenci; anında artı/eksi;
// sözlü cevap profile işlenir; iki takım yarışması; geri sayım.
// Web sürümü (npm run web / expo export) tahtanın tarayıcısında da çalışır.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HighlightedSentence from '../../components/HighlightedSentence';
import { PATTERNS, PATTERN_BY_ID } from '../../data/patterns';
import { useTeacher } from '../../teacher/TeacherContext';
import { speak } from '../../utils/tts';
import { shuffle } from '../../utils/helpers';

// Projeksiyonda soluk renkler kaybolur: sabit, yüksek kontrastlı palet.
const B = {
  bg: '#0B1220',
  panel: '#131C2E',
  panel2: '#1B2740',
  text: '#F8FAFC',
  muted: '#94A3B8',
  border: '#2A3A5C',
  green: '#2DD4BF', // turkuaz
  red: '#FB8A7B', // mercan
  blue: '#38BDF8', // gök mavisi
  amber: '#FB8A7B',
};

export default function BoardScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= 820;
  const t = useTeacher();
  const [classId, setClassId] = useState(route.params?.classId || (t.classes[0] && t.classes[0].id) || null);
  const cls = classId ? t.getClass(classId) : null;

  const [patternId, setPatternId] = useState(() => {
    const last = cls && (cls.homeworks || []).find((h) => h.p && h.p.length);
    return last ? last.p[0] : PATTERNS[0].id;
  });
  const [order, setOrder] = useState(null); // karıştırılmış sıra
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState('read'); // 'read' EN göster | 'translate' TR göster, EN gizli
  const [reveal, setReveal] = useState(false);
  const [picked, setPicked] = useState(null);
  const [used, setUsed] = useState([]);
  const [teams, setTeams] = useState(null); // { A, B, turn }
  const [timer, setTimer] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [menu, setMenu] = useState(false);
  const tick = useRef(null);

  const pattern = PATTERN_BY_ID[patternId];
  const sentences = useMemo(() => {
    const base = pattern.sentences.map((s) => ({ ...s, patternId, patternColor: pattern.color, patternName: pattern.name }));
    return order ? order.map((i) => base[i]).filter(Boolean) : base;
  }, [patternId, order]);
  const cur = sentences[Math.min(idx, sentences.length - 1)];

  useEffect(() => {
    setIdx(0);
    setOrder(null);
    setReveal(false);
  }, [patternId]);
  useEffect(() => {
    setReveal(false);
    setFeedback(null);
  }, [idx, mode, patternId]);
  useEffect(() => {
    if (timer <= 0) return;
    tick.current = setTimeout(() => setTimer((x) => x - 1), 1000);
    return () => clearTimeout(tick.current);
  }, [timer]);

  const students = cls ? Object.values(cls.students).sort((a, b) => (parseInt(a.no, 10) || 0) - (parseInt(b.no, 10) || 0)) : [];

  const pick = () => {
    if (!students.length) return;
    let pool = students.filter((s) => !used.includes(s.id));
    let u = used;
    if (!pool.length) {
      pool = students;
      u = [];
    }
    const s = pool[Math.floor(Math.random() * pool.length)];
    setUsed([...u, s.id]);
    setPicked(s.id);
    setFeedback(null);
  };
  const pickedSt = picked && cls ? cls.students[picked] : null;

  const answer = (ok) => {
    if (pickedSt) t.recordAttempt(classId, pickedSt.id, cur.id, ok);
    if (teams) setTeams((x) => ({ ...x, [x.turn]: x[x.turn] + (ok ? 1 : 0), turn: x.turn === 'A' ? 'B' : 'A' }));
    setFeedback(ok ? 'ok' : 'no');
    setReveal(true);
  };

  const next = () => setIdx((i) => (i + 1) % sentences.length);
  const prev = () => setIdx((i) => (i - 1 + sentences.length) % sentences.length);

  const big = Math.max(30, Math.min(88, (wide ? width * 0.62 : width) / 16));
  const showEn = mode === 'read' || reveal;
  const showTr = mode === 'translate' || reveal;

  const Btn = ({ label, onPress, color = B.panel2, flex, big: isBig, textColor = B.text }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [st.btn, { backgroundColor: color, flex: flex ? 1 : undefined, minHeight: isBig ? 72 : 56 }, pressed && { opacity: 0.75 }]}>
      <Text style={[st.btnT, { color: textColor, fontSize: isBig ? 24 : 18 }]}>{label}</Text>
    </Pressable>
  );

  const Main = (
    <View style={[st.main, { padding: wide ? 32 : 16 }]}>
      <View style={st.topRow}>
        <Pressable onPress={() => setMenu(!menu)} style={[st.patTag, { borderColor: pattern.color }]}>
          <Text style={{ color: pattern.color, fontWeight: '900', fontSize: 18 }}>{pattern.emoji} {pattern.name} ▾</Text>
        </Pressable>
        <Text style={{ color: B.muted, fontSize: 18, fontWeight: '700' }}>{idx + 1}/{sentences.length}</Text>
      </View>
      {menu ? (
        <ScrollView horizontal style={{ maxHeight: 64, marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
          {PATTERNS.map((p) => (
            <Pressable key={p.id} onPress={() => { setPatternId(p.id); setMenu(false); }} style={[st.patChip, { borderColor: p.color, backgroundColor: p.id === patternId ? p.color + '33' : 'transparent' }]}>
              <Text style={{ color: B.text, fontWeight: '800' }}>{p.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={st.stage}>
        {showEn ? (
          <HighlightedSentence text={cur.en} chunk={cur.chunk} color={pattern.color} size={big} style={{ color: B.text, lineHeight: big * 1.25 }} />
        ) : (
          <Text style={{ color: B.muted, fontSize: big * 0.6, fontWeight: '800' }}>🇬🇧 ?</Text>
        )}
        {showTr ? <Text style={{ color: mode === 'translate' && !reveal ? B.text : B.muted, fontSize: big * (mode === 'translate' && !reveal ? 0.8 : 0.5), textAlign: 'center', marginTop: 18, fontWeight: '700' }}>{cur.tr}</Text> : null}
        {feedback ? <Text style={{ fontSize: big * 0.9, marginTop: 10 }}>{feedback === 'ok' ? '✅' : '❌'}</Text> : null}
      </View>

      <View style={st.ctrlRow}>
        <Btn label="◀" onPress={prev} />
        <Btn label="🔊 Dinle" onPress={() => speak(cur.en, { id: cur.id, rate: 0.85 })} flex big color={B.blue} />
        <Btn label={reveal ? '🙈 Gizle' : '👁 Cevap'} onPress={() => setReveal(!reveal)} flex big />
        <Btn label="▶" onPress={next} />
      </View>
      <View style={[st.ctrlRow, { marginTop: 8 }]}>
        <Btn label={mode === 'read' ? '📖 Mod: Oku-tekrarla' : '🔁 Mod: Türkçeden çevir'} onPress={() => setMode(mode === 'read' ? 'translate' : 'read')} flex />
        <Btn label="🔀 Karıştır" onPress={() => { setOrder(shuffle(pattern.sentences.map((_, i) => i))); setIdx(0); }} />
        <Btn label={timer > 0 ? `⏱ ${timer}` : '⏱ 30 sn'} onPress={() => setTimer(timer > 0 ? 0 : 30)} color={timer > 0 && timer <= 5 ? B.red : B.panel2} />
      </View>
    </View>
  );

  const Side = (
    <ScrollView style={[st.side, wide ? { width: Math.min(400, width * 0.3), flexGrow: 0, flexShrink: 0 } : { maxHeight: height * 0.5, flexGrow: 0 }]} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={st.sideH}>SINIF</Text>
      {t.classes.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {t.classes.map((c) => (
            <Pressable key={c.id} onPress={() => { setClassId(c.id); setPicked(null); setUsed([]); }} style={[st.patChip, { borderColor: c.id === classId ? B.amber : B.border, backgroundColor: c.id === classId ? B.amber + '33' : 'transparent' }]}>
              <Text style={{ color: B.text, fontWeight: '800' }}>{c.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={{ color: B.muted }}>Sınıf yok — sadece cümle gösterimi. Öğretmen Paneli'nden sınıf ekleyebilirsin.</Text>
      )}

      {cls ? (
        <>
          <Btn label="🎲 Rastgele öğrenci" onPress={pick} big color={B.amber} textColor="#111" />
          <View style={[st.pickBox, { borderColor: pickedSt ? B.amber : B.border }]}>
            <Text style={{ color: pickedSt ? B.text : B.muted, fontSize: pickedSt ? 34 : 18, fontWeight: '900', textAlign: 'center' }}>
              {pickedSt ? `${pickedSt.no} ${pickedSt.nk || ''}` : 'Henüz seçilmedi'}
            </Text>
            <Text style={{ color: B.muted, textAlign: 'center', marginTop: 4 }}>
              {students.length ? `${used.length}/${students.length} öğrenci söz aldı` : 'Sınıfta öğrenci yok'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="✓ Doğru" onPress={() => answer(true)} flex big color={B.green} textColor="#042F2B" />
            <Btn label="✗ Yanlış" onPress={() => answer(false)} flex big color={B.red} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="＋1 puan" onPress={() => pickedSt && t.addPoint(classId, pickedSt.id, 1, 'Katılım')} flex />
            <Btn label="−1 puan" onPress={() => pickedSt && t.addPoint(classId, pickedSt.id, -1, 'Dikkat')} flex />
          </View>
          <Text style={{ color: B.muted, fontSize: 13 }}>Doğru/Yanlış, seçili öğrencinin profiline bu cümle için işlenir.</Text>
        </>
      ) : null}

      <Text style={[st.sideH, { marginTop: 8 }]}>TAKIM YARIŞMASI</Text>
      {teams ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['A', 'B'].map((k) => (
              <Pressable key={k} onPress={() => setTeams({ ...teams, turn: k })} style={[st.team, { borderColor: teams.turn === k ? (k === 'A' ? B.blue : B.red) : B.border }]}>
                <Text style={{ color: k === 'A' ? B.blue : B.red, fontWeight: '900', fontSize: 18 }}>Takım {k}{teams.turn === k ? ' ◀' : ''}</Text>
                <Text style={{ color: B.text, fontWeight: '900', fontSize: 44 }}>{teams[k]}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable onPress={() => setTeams({ ...teams, [k]: teams[k] + 1 })} style={st.mini}><Text style={st.miniT}>＋</Text></Pressable>
                  <Pressable onPress={() => setTeams({ ...teams, [k]: Math.max(0, teams[k] - 1) })} style={st.mini}><Text style={st.miniT}>−</Text></Pressable>
                </View>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: B.muted, fontSize: 13 }}>Doğru/Yanlış sırası olan takıma işlenir ve sıra karşı takıma geçer.</Text>
          <Btn label="Yarışmayı bitir" onPress={() => setTeams(null)} />
        </>
      ) : (
        <Btn label="⚔️ Başlat (A vs B)" onPress={() => setTeams({ A: 0, B: 0, turn: 'A' })} />
      )}
    </ScrollView>
  );

  return (
    <View style={[st.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={st.bar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ color: B.muted, fontSize: 22, fontWeight: '800' }}>✕  Akıllı Tahta</Text>
        </Pressable>
        <Text style={{ color: B.muted, fontWeight: '700' }}>{cls ? cls.name : ''}</Text>
      </View>
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        {Main}
        {Side}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: B.bg },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: B.border },
  main: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patTag: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  patChip: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, minHeight: 200 },
  ctrlRow: { flexDirection: 'row', gap: 8 },
  btn: { borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnT: { fontWeight: '900' },
  side: { backgroundColor: B.panel, borderLeftWidth: 1, borderColor: B.border },
  sideH: { color: B.muted, fontWeight: '900', letterSpacing: 1.5, fontSize: 13 },
  pickBox: { borderWidth: 2, borderRadius: 14, padding: 16, backgroundColor: B.panel2 },
  team: { flex: 1, borderWidth: 2, borderRadius: 14, padding: 12, alignItems: 'center', backgroundColor: B.panel2 },
  mini: { backgroundColor: B.panel, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 4 },
  miniT: { color: B.text, fontSize: 20, fontWeight: '900' },
});
