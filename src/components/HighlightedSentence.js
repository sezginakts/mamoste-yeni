import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { font } from '../theme';
import { useTheme } from '../context/ThemeContext';

// İngilizce cümleyi gösterir; `chunk` (sabit kalıp parçası) renkli + altı çizili vurgulanır.
// Renk kodlama bilimsel olarak kalıbı yakalamayı kolaylaştırır.
export default function HighlightedSentence({ text, chunk, color, size = font.h2, style }) {
  const { colors } = useTheme();
  const hl = color || colors.gold;
  const base = [styles.base, { color: colors.text, fontSize: size }, style];

  if (!chunk) {
    return <Text style={base}>{text}</Text>;
  }
  const idx = text.toLowerCase().indexOf(chunk.toLowerCase());
  if (idx === -1) {
    return <Text style={base}>{text}</Text>;
  }
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + chunk.length);
  const after = text.slice(idx + chunk.length);
  return (
    <Text style={base}>
      {before}
      <Text style={[styles.highlight, { color: hl }]}>{match}</Text>
      {after}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { fontWeight: '700', textAlign: 'center', lineHeight: 36 },
  highlight: { fontWeight: '900', textDecorationLine: 'underline' },
});
