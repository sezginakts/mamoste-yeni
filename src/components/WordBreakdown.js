import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius, spacing, font } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';

// Cümledeki kelimeleri ve Türkçe anlamlarını chip olarak gösterir.
// words: [['can', '-ebilmek'], ['swim', 'yüzmek'], ...]
export default function WordBreakdown({ words, color }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const c = color || colors.accent;
  if (!words || words.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {words.map(([w, mean], i) => (
        <View key={`${w}-${i}`} style={[styles.chip, { borderColor: c + '55' }]}>
          <Text style={[styles.word, { color: c }]}>{w}</Text>
          <Text style={styles.mean}>{mean}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
    chip: {
      backgroundColor: colors.cardSoft,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: 'center',
      minWidth: 64,
    },
    word: { fontSize: font.small, fontWeight: '800' },
    mean: { color: colors.textMuted, fontSize: font.tiny, marginTop: 1 },
  });
