// Öğretmen: branşını seç (ilk açılışta; sonra Ayarlar'dan değiştirilebilir, her branşın verisi ayrı).
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, font } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import { BRANCHES } from '../data/branches';
import Button from '../components/Button';

export default function BranchSelectScreen() {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const { setBranch, resetRole, prevBranch, cancelBranchChange } = useRole();
  const { isAdmin } = useAuth();
  const [picked, setPicked] = useState(prevBranch);
  const sel = BRANCHES.find((b) => b.id === picked);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl, paddingBottom: 140 }}>
        {prevBranch || isAdmin ? (
          <Pressable onPress={prevBranch ? cancelBranchChange : resetRole} hitSlop={10} style={{ alignSelf: 'flex-start', marginBottom: spacing.md }}>
            <Text style={{ color: colors.accent, fontWeight: '800', fontSize: font.body }}>‹ Geri</Text>
          </Pressable>
        ) : null}
        <Text style={[st.title, { color: colors.text }]}>Branşın hangisi?</Text>
        <Text style={[st.sub, { color: colors.textMuted }]}>Mamoste seçtiğin branşa göre açılır. Her branşın sınıfları ve planları ayrı tutulur.</Text>
        <View style={st.grid}>
          {BRANCHES.map((b) => {
            const on = picked === b.id;
            return (
              <Pressable
                key={b.id}
                disabled={!b.enabled}
                onPress={() => setPicked(b.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled: !b.enabled }}
                style={[st.card, shadow, { backgroundColor: colors.card, borderColor: on ? b.color : colors.border }, !b.enabled && { opacity: 0.45 }]}
              >
                <View style={[st.icon, { backgroundColor: b.color + '22' }]}>
                  <Text style={{ fontSize: 24 }}>{b.emoji}</Text>
                </View>
                <Text style={[st.name, { color: colors.text }]} numberOfLines={2}>{b.name}</Text>
                <Text style={{ color: b.enabled ? colors.textMuted : colors.textFaint, fontSize: font.tiny, marginTop: 2 }}>
                  {b.enabled ? `${b.grades[0]}–${b.grades[b.grades.length - 1]}. sınıflar` : 'Yakında'}
                </Text>
                {on ? <View style={[st.check, { backgroundColor: b.color }]}><Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text></View> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={[st.footer, { backgroundColor: colors.bg, paddingBottom: insets.bottom + spacing.md }]}>
        <Button title={sel ? `${sel.name} ile devam et` : 'Branşını seç'} disabled={!sel} onPress={() => setBranch(picked)} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  title: { fontSize: font.h2, fontWeight: '900' },
  sub: { fontSize: font.body, marginTop: spacing.xs, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  card: { width: '48.5%', borderRadius: radius.lg, borderWidth: 2, padding: spacing.md, minHeight: 128 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  name: { fontSize: font.body, fontWeight: '800' },
  check: { position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
