// İlk açılış: öğrenci mi öğretmen mi? Seçim cihazda saklanır, Ayarlar'dan değiştirilebilir.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, font } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import Button from '../components/Button';

const OPTIONS = [
  {
    key: 'student',
    emoji: '🎒',
    title: 'Öğrenciyim',
    desc: 'Kalıplarla İngilizce çalış, öğretmeninden gelen ödevleri yap.',
  },
  {
    key: 'teacher',
    emoji: '👩‍🏫',
    title: 'Öğretmenim',
    desc: 'Sınıflarını yönet, ödev ver, sonuçları takip et, akıllı tahtayı kullan.',
  },
];

export default function RoleSelectScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { setRole } = useRole();
  const [picked, setPicked] = useState(null);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl, paddingBottom: spacing.xxl, flexGrow: 1 }}
    >
      <Text style={styles.title}>Mamoste</Text>
      <Text style={styles.sub}>Uygulamayı nasıl kullanacaksın?</Text>

      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        {OPTIONS.map((o) => {
          const active = picked === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => setPicked(o.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.option, active && { borderColor: o.key === 'teacher' ? colors.accent : colors.primary }]}
            >
              <Text style={styles.emoji}>{o.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.optTitle}>{o.title}</Text>
                <Text style={styles.optDesc}>{o.desc}</Text>
              </View>
              <View style={[styles.radio, active && { borderColor: o.key === 'teacher' ? colors.accent : colors.primary }]}>
                {active ? <View style={[styles.radioDot, { backgroundColor: o.key === 'teacher' ? colors.accent : colors.primary }]} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />
      <Button
        title={picked === 'teacher' ? 'Öğretmen olarak devam et' : picked === 'student' ? 'Öğrenci olarak devam et' : 'Bir seçenek seç'}
        variant={picked === 'teacher' ? 'accent' : 'primary'}
        disabled={!picked}
        onPress={() => setRole(picked)}
        style={{ marginTop: spacing.xl }}
      />
      <Text style={styles.note}>Bu seçim kalıcıdır; uygulama bu cihazda hep bu modda açılır.</Text>
    </ScrollView>
  );
}

const makeStyles = (colors, shadow) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  sub: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.xs },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 2, borderColor: colors.border, ...shadow },
  emoji: { fontSize: 36 },
  optTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  optDesc: { color: colors.textMuted, fontSize: font.small, marginTop: 2, lineHeight: 20 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  note: { color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.md },
});
