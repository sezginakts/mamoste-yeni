// Akıllı tahta yan paneli: sınıf seçimi, rastgele öğrenci (+/− puan) ve iki takım yarışması.
// Zaman şeridi ve harita oyunu ortak kullanır.
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTeacher } from '../teacher/TeacherContext';

// Projeksiyonda soluk renkler kaybolur: sabit, yüksek kontrastlı palet (BoardScreen ile aynı).
export const B = {
  bg: '#0B1220',
  panel: '#131C2E',
  panel2: '#1B2740',
  text: '#F8FAFC',
  muted: '#94A3B8',
  border: '#2A3A5C',
  green: '#22C55E',
  red: '#EF4444',
  blue: '#3B82F6',
  amber: '#F59E0B',
};

// Uygulama temasından (useTheme().colors) aynı anahtarlarla palet — tahta dışı görünümler için.
export const appBoardPalette = (c) => ({
  bg: c.bg,
  panel: c.card,
  panel2: c.cardSoft,
  text: c.text,
  muted: c.textMuted,
  border: c.border,
  green: c.primary,
  red: c.danger,
  blue: c.accent,
  amber: c.warning,
});

export function BoardBtn({ label, onPress, pal = B, color = pal.panel2, flex, big, textColor = pal.text, disabled, small }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [st.btn, { backgroundColor: color, flex: flex ? 1 : undefined, minHeight: big ? 64 : small ? 42 : 50, opacity: disabled ? 0.4 : 1 }, pressed && !disabled && { opacity: 0.75 }]}
    >
      <Text style={[st.btnT, { color: textColor, fontSize: big ? 22 : small ? 15 : 17 }]}>{label}</Text>
    </Pressable>
  );
}

export function BoardChip({ on, label, onPress, pal = B, color = pal.amber, dim }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }} style={[st.chip, { borderColor: on ? color : pal.border, backgroundColor: on ? color + '33' : 'transparent', opacity: dim && !on ? 0.55 : 1 }]}>
      <Text style={{ color: pal.text, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

export default function BoardClassPanel({ classId, onClassChange, style, teamHint, emptyText = 'Sınıf yok — düzeyi üstten seç.', pal = B, inline }) {
  const t = useTeacher();
  const cls = classId ? t.getClass(classId) : null;
  const [picked, setPicked] = useState(null);
  const [used, setUsed] = useState([]);
  const [teams, setTeams] = useState(null);

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
  };
  const pickedSt = picked && cls ? cls.students[picked] : null;
  const Wrap = inline ? View : ScrollView;

  return (
    // inline: dar ekranda sayfanın kendi kaydırmasının içinde düz View olarak çizilir.
    <Wrap {...(inline ? { style: [st.side, st.inline, { backgroundColor: pal.panel, borderColor: pal.border }, style] } : { style: [st.side, { backgroundColor: pal.panel, borderColor: pal.border }, style], contentContainerStyle: { padding: 16, gap: 12 } })}>
      <Text style={[st.sideH, { color: pal.muted }]}>SINIF</Text>
      {t.classes.length ? (
        <View style={st.row}>
          {t.classes.map((c) => (
            <BoardChip
              pal={pal}
              key={c.id}
              on={c.id === classId}
              label={c.name}
              onPress={() => {
                onClassChange(c.id);
                setPicked(null);
                setUsed([]);
              }}
            />
          ))}
        </View>
      ) : (
        <Text style={{ color: pal.muted }}>{emptyText}</Text>
      )}
      {cls ? (
        <>
          <BoardBtn pal={pal} label="🎲 Rastgele öğrenci" onPress={pick} big color={pal.amber} textColor="#111" />
          <View style={[st.pickBox, { backgroundColor: pal.panel2, borderColor: pickedSt ? pal.amber : pal.border }]}>
            <Text style={{ color: pickedSt ? pal.text : pal.muted, fontSize: pickedSt ? 32 : 18, fontWeight: '900', textAlign: 'center' }}>
              {pickedSt ? `${pickedSt.no} ${pickedSt.nk || ''}` : 'Henüz seçilmedi'}
            </Text>
            <Text style={{ color: pal.muted, textAlign: 'center', marginTop: 4 }}>{students.length ? `${used.length}/${students.length} öğrenci söz aldı` : 'Sınıfta öğrenci yok'}</Text>
          </View>
          <View style={st.row}>
            <BoardBtn pal={pal} label="＋1 puan" onPress={() => pickedSt && t.addPoint(classId, pickedSt.id, 1, 'Katılım')} flex />
            <BoardBtn pal={pal} label="−1 puan" onPress={() => pickedSt && t.addPoint(classId, pickedSt.id, -1, 'Dikkat')} flex />
          </View>
        </>
      ) : null}

      <Text style={[st.sideH, { marginTop: 8, color: pal.muted }]}>TAKIM YARIŞMASI</Text>
      {teams ? (
        <>
          <View style={st.row}>
            {['A', 'B'].map((k) => (
              <View key={k} style={[st.team, { backgroundColor: pal.panel2, borderColor: k === 'A' ? pal.blue : pal.red }]}>
                <Text style={{ color: k === 'A' ? pal.blue : pal.red, fontWeight: '900', fontSize: 18 }}>Takım {k}</Text>
                <Text style={{ color: pal.text, fontWeight: '900', fontSize: 44 }}>{teams[k]}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable onPress={() => setTeams({ ...teams, [k]: teams[k] + 1 })} style={[st.mini, { backgroundColor: pal.panel }]}><Text style={[st.miniT, { color: pal.text }]}>＋</Text></Pressable>
                  <Pressable onPress={() => setTeams({ ...teams, [k]: Math.max(0, teams[k] - 1) })} style={[st.mini, { backgroundColor: pal.panel }]}><Text style={[st.miniT, { color: pal.text }]}>−</Text></Pressable>
                </View>
              </View>
            ))}
          </View>
          {teamHint ? <Text style={{ color: pal.muted, fontSize: 13 }}>{teamHint}</Text> : null}
          <BoardBtn pal={pal} label="Yarışmayı bitir" onPress={() => setTeams(null)} />
        </>
      ) : (
        <BoardBtn pal={pal} label="⚔️ Başlat (A vs B)" onPress={() => setTeams({ A: 0, B: 0 })} />
      )}
    </Wrap>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  btn: { borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnT: { fontWeight: '900' },
  side: { backgroundColor: B.panel, borderLeftWidth: 1, borderColor: B.border },
  inline: { borderLeftWidth: 0, borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  sideH: { color: B.muted, fontWeight: '900', letterSpacing: 1.5, fontSize: 13 },
  pickBox: { borderWidth: 2, borderRadius: 14, padding: 16, backgroundColor: B.panel2 },
  team: { flex: 1, borderWidth: 2, borderRadius: 14, padding: 12, alignItems: 'center', backgroundColor: B.panel2 },
  mini: { backgroundColor: B.panel, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 4 },
  miniT: { color: B.text, fontSize: 20, fontWeight: '900' },
});
