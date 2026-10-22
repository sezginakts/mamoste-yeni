// Kaydırılan ekranlarda içerik saat / Wi-Fi / şarj göstergelerinin altına girmesin:
// en üstte, çentik (kamera) yüksekliğinde sabit bir şerit.
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StatusBarCover({ color }) {
  const insets = useSafeAreaInsets();
  if (!insets.top) return null;
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: color }} />;
}
