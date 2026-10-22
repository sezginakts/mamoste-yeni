// Notlarım: yapışkan not panosu (sadece bu cihazda). Üstte yeni not, altta renkli notlar iki sütun.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { spacing, font } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useDesk, sortNotes } from '../../teacher/DeskContext';
import NoteComposer, { StickyNote } from '../../teacher/NoteComposer';
import { Header } from '../../teacher/ui';

export default function NotesScreen({ route, navigation }) {
  const { colors } = useTheme();
  const desk = useDesk();
  const [showDone, setShowDone] = useState(false);
  const pending = sortNotes(desk.notes);
  const done = desk.notes.filter((n) => n.done);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Notlarım" subtitle={pending.length ? `${pending.length} bekleyen not` : 'Not al, hatırlatıcı kur'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <NoteComposer autoFocus={!!(route.params && route.params.compose)} />

        <Text style={[st.sec, { color: colors.textMuted }]}>📌 PANOM</Text>
        {pending.length ? (
          <View style={st.grid}>
            {pending.map((n) => (
              <StickyNote key={n.id} n={n} style={st.cell} />
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.textMuted, textAlign: 'center', padding: spacing.lg }}>Panon boş. Yukarıdan ilk notunu yapıştır.</Text>
        )}

        {done.length ? (
          <>
            <Pressable onPress={() => setShowDone(!showDone)} style={st.doneHead}>
              <Text style={[st.sec, { color: colors.textMuted, marginTop: 0 }]}>✓ TAMAMLANANLAR ({done.length})</Text>
              <Text style={{ color: colors.accent, fontWeight: '800', fontSize: font.small }}>{showDone ? 'Gizle' : 'Göster'}</Text>
            </Pressable>
            {showDone ? (
              <View style={st.grid}>
                {done.map((n) => (
                  <StickyNote key={n.id} n={n} style={st.cell} />
                ))}
              </View>
            ) : null}
          </>
        ) : null}
        <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.lg }}>
          Notlar sadece bu cihazda saklanır. Hatırlatmalar telefona bildirim olarak gelir; web’de/akıllı tahtada ana sayfada görünür.
        </Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  sec: { fontSize: font.tiny, fontWeight: '900', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.lg },
  cell: { width: '47%' },
  doneHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
});
