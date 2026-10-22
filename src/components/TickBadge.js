import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { font } from '../theme';

// Cümlenin tik rozetini gösterir. tick: srs.tickFor() çıktısı veya null.
//   🟣 mor → 🔵 mavi → 🟢 yeşil → 🏅 sarı (kurdeleli)
// size: 'sm' | 'md'
export default function TickBadge({ tick, size = 'md' }) {
  if (!tick) return null;
  const dim = size === 'sm' ? 18 : 24;
  const fs = size === 'sm' ? 11 : 14;
  return (
    <View style={[styles.wrap, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: tick.color }]}>
      <Text style={[styles.check, { fontSize: fs }]}>{tick.ribbon ? '🎀' : '✓'}</Text>
    </View>
  );
}

// Birden çok tik sayısını yatay özet olarak gösterir (örn. performans).
export function TickLegendRow({ counts, styleOverride }) {
  const items = [
    { key: 'mor', color: '#A855F7', label: 'Mor' },
    { key: 'mavi', color: '#3B82F6', label: 'Mavi' },
    { key: 'yesil', color: '#22C55E', label: 'Yeşil' },
    { key: 'sari', color: '#EAB308', label: 'Sarı' },
  ];
  return (
    <View style={[styles.legend, styleOverride]}>
      {items.map((it) => (
        <View key={it.key} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: it.color }]} />
          <Text style={styles.legendLabel}>{counts[it.key] || 0}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  check: { color: '#FFFFFF', fontWeight: '900' },
  legend: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { fontSize: font.small, fontWeight: '800' },
});
