import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Basit yatay ilerleme çubuğu. ratio: 0..1
export default function ProgressBar({ ratio = 0, color, height = 10, track }) {
  const { colors } = useTheme();
  const fillColor = color || colors.primary;
  const trackColor = track || colors.bgSoft;
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height }]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: fillColor, borderRadius: height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
