import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, font } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { SENTENCE_BY_ID } from '../data/patterns';
import Button from '../components/Button';

// Sonuç ekranı — öz-değerlendirmeye göre cümleler 3 gruba ayrılır.
// (streak + XP, oturum bitişinde StudyScreen'de işlenir; burada tekrar işlenmez.)
export default function ResultScreen({ route, navigation }) {
  const { results, title } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const known = results.filter((r) => r.grade === 'know');
  const partial = results.filter((r) => r.grade === 'partial');
  const forgot = results.filter((r) => r.grade === 'forgot');
  const needReview = [...forgot, ...partial];
  const score = results.length > 0 ? Math.round((known.length / results.length) * 100) : 0;

  const retryWeak = () => {
    const sentences = needReview.map((r) => SENTENCE_BY_ID[r.id]).filter(Boolean);
    if (sentences.length === 0) return;
    navigation.replace('Study', { sentences, title: 'Tekrar' });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.emoji}>{score >= 80 ? '🏆' : score >= 50 ? '👏' : '💪'}</Text>
        <Text style={styles.title}>Çalışma Tamamlandı!</Text>
        <Text style={styles.scoreBig}>%{score}</Text>
        <Text style={styles.scoreSub}>
          {known.length}/{results.length} bildin
        </Text>

        {known.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>✅ Bildiklerin ({known.length})</Text>
            {known.map((r) => (
              <Row key={r.id} r={r} color={colors.primary} />
            ))}
          </View>
        )}

        {partial.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.warning }]}>🤔 Yarım Hatırladıkların ({partial.length})</Text>
            {partial.map((r) => (
              <Row key={r.id} r={r} color={colors.warning} />
            ))}
          </View>
        )}

        {forgot.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.danger }]}>❌ Tekrar Gerekenler ({forgot.length})</Text>
            {forgot.map((r) => (
              <Row key={r.id} r={r} color={colors.danger} />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        {needReview.length > 0 && (
          <Button title={`🔁 Zayıfları Tekrar Et (${needReview.length})`} variant="accent" onPress={retryWeak} />
        )}
        <Button title="Bitir" onPress={() => navigation.popToTop()} />
      </View>
    </View>
  );
}

function Row({ r, color }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.row, { borderLeftColor: color }]}>
      <Text style={styles.rowEn}>{r.en}</Text>
      <Text style={styles.rowTr}>{r.tr}</Text>
    </View>
  );
}

const makeStyles = (colors, shadow) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  emoji: { fontSize: 56, textAlign: 'center' },
  title: { color: colors.text, fontSize: font.h2, fontWeight: '900', textAlign: 'center', marginTop: spacing.sm },
  scoreBig: { color: colors.primary, fontSize: 52, fontWeight: '900', textAlign: 'center', marginTop: spacing.md },
  scoreSub: { color: colors.textMuted, fontSize: font.body, textAlign: 'center', fontWeight: '700', marginBottom: spacing.lg },
  section: { marginTop: spacing.lg },
  sectionTitle: { fontSize: font.body, fontWeight: '800', marginBottom: spacing.sm },
  row: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4 },
  rowEn: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  rowTr: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  actions: { gap: spacing.sm, paddingTop: spacing.md },
});
