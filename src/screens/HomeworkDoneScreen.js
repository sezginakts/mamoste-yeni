// Öğrenci: ödev bitti → sonuç sunucuya kendiliğinden gider (eski QR'lı ödevlerde QR gösterilir).
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { spacing, font } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useProgress } from '../context/ProgressContext';
import { Header, Card, QrBox, Stat, SmallButton, goTo } from '../teacher/ui';
import { SENTENCE_BY_ID } from '../data/patterns';

export default function HomeworkDoneScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { state, resultCode } = useProgress();
  const hw = state.homeworks[route.params.id];
  const code = hw && hw.cloud ? null : route.params.code || resultCode(hw);
  if (!hw || !hw.result || (!hw.cloud && !code)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Sonuç" onBack={() => navigation.goBack()} />
      </View>
    );
  }
  const entries = Object.entries(hw.result.res);
  const c = entries.filter(([, v]) => v === 1).length;
  const wrong = entries.filter(([, v]) => v !== 1).map(([id]) => SENTENCE_BY_ID[id]).filter(Boolean);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Ödev bitti 🎉" subtitle={hw.title} onBack={() => goTo(navigation, 'StudentHomework')} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <Stat value={`${c}/${entries.length}`} label="doğru" color={colors.primary} />
          <Stat value={hw.result.dur != null ? `${hw.result.dur} dk` : '—'} label="süre" />
        </View>
        {hw.cloud ? (
          <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
            <Text style={{ fontSize: 36 }}>{hw.result.sent ? '✅' : '⏳'}</Text>
            <Text style={[st.h, { color: colors.text, marginTop: spacing.sm, marginBottom: 0 }]}>
              {hw.result.sent ? 'Sonucun öğretmenine gönderildi' : 'Sonucun internet gelince öğretmenine gönderilecek'}
            </Text>
          </Card>
        ) : (
        <Card style={{ alignItems: 'center' }}>
          <Text style={[st.h, { color: colors.text }]}>Bu QR'ı öğretmenine göster</Text>
          <QrBox value={code} size={260} caption={`No ${state.student.no}${state.student.nk ? ' · ' + state.student.nk : ''} · ${hw.cn}`} shareMessage={`${hw.title} sonucum (No ${state.student.no}): ${code}`} />
          <Text style={[st.p, { color: colors.textMuted }]}>
            Derste gösteremezsen "Paylaş" ile kodu öğretmenine mesaj olarak da gönderebilirsin. QR her zaman "Ödevlerim → Bitenler"de durur.
          </Text>
        </Card>
        )}
        {wrong.length ? (
          <Card>
            <Text style={[st.h, { color: colors.text }]}>Tekrar etmen gerekenler</Text>
            {wrong.map((s) => (
              <Text key={s.id} style={[st.p, { color: colors.text }]}>• {s.en} — <Text style={{ color: colors.textMuted }}>{s.tr}</Text></Text>
            ))}
          </Card>
        ) : null}
        <SmallButton title="Ana sayfa" onPress={() => goTo(navigation, 'Home')} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  h: { fontSize: font.body, fontWeight: '800', marginBottom: spacing.md, textAlign: 'center' },
  p: { fontSize: font.small, marginTop: spacing.sm, lineHeight: 20 },
});
