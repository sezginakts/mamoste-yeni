// Öğrenci: görev ödevi (öğretmenin açıklaması + foto/videoları). Öğrenci "Tamamladım" der, isterse kısa not ekler.
// Öğrenci dosya gönderemez (şimdilik). Öğretmenin geri bildirimi ve puanı burada görünür.
import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Image, Pressable, Linking, StyleSheet } from 'react-native';
import { spacing, font, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useProgress } from '../context/ProgressContext';
import { Header, Card, SmallButton, SectionTitle, formatDate } from '../teacher/ui';
import { branchOf } from '../data/branches';
import { dayKey } from '../utils/helpers';

export default function TaskScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { state, completeTask } = useProgress();
  const hw = state.homeworks[route.params.id];
  const [note, setNote] = useState('');

  if (!hw) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Ödev" onBack={() => navigation.goBack()} />
        <Text style={{ color: colors.textMuted, padding: spacing.lg }}>Bu ödev artık yok — öğretmenin kaldırmış olabilir.</Text>
      </View>
    );
  }

  const b = branchOf(hw.branch);
  const late = hw.due && hw.due < dayKey() && !hw.result;
  const images = (hw.att || []).filter((a) => a.type === 'image' && a.url);
  const videos = (hw.att || []).filter((a) => a.type === 'video' && a.url);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={hw.title} subtitle={`${b.emoji} ${b.name} · ${hw.cn || ''}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={{ color: late ? colors.danger : colors.textMuted, fontSize: font.small, fontWeight: '700' }}>
            Son gün: {hw.due ? formatDate(hw.due) : '—'}{late ? ' (geçti)' : ''}
          </Text>
          {hw.body ? <Text style={[st.body, { color: colors.text }]}>{hw.body}</Text> : null}
        </Card>

        {images.length || videos.length ? <SectionTitle>ÖĞRETMENİNİN EKLEDİKLERİ</SectionTitle> : null}
        {images.map((a, i) => (
          <Pressable key={'i' + i} onPress={() => Linking.openURL(a.url)}>
            <Image source={{ uri: a.url }} style={[st.img, { backgroundColor: colors.card }]} resizeMode="cover" accessibilityLabel={a.name || 'Fotoğraf'} />
          </Pressable>
        ))}
        {videos.map((a, i) => (
          <Card key={'v' + i} onPress={() => Linking.openURL(a.url)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text style={{ fontSize: 28 }}>🎬</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{a.name || `Video ${i + 1}`}</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.small }}>İzlemek için dokun</Text>
            </View>
          </Card>
        ))}

        {hw.result ? (
          <>
            <SectionTitle>DURUM</SectionTitle>
            <Card>
              <Text style={{ color: colors.primary, fontWeight: '900' }}>✓ Tamamladın · {new Date(hw.result.at).toLocaleDateString('tr-TR')}</Text>
              {hw.result.note ? <Text style={{ color: colors.text, marginTop: 6 }}>Notun: {hw.result.note}</Text> : null}
              <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 6 }}>
                {hw.result.sent ? 'Öğretmenine iletildi.' : '⏳ İnternet gelince öğretmenine iletilecek.'}
              </Text>
            </Card>
            {hw.fb ? (
              <Card style={{ borderColor: colors.accent, borderWidth: 1 }}>
                <Text style={{ color: colors.accent, fontWeight: '900' }}>Öğretmeninden{hw.fb.score != null ? ` · ${hw.fb.score} puan` : ''}</Text>
                {hw.fb.text ? <Text style={{ color: colors.text, marginTop: 6 }}>{hw.fb.text}</Text> : null}
              </Card>
            ) : null}
          </>
        ) : (
          <>
            <SectionTitle>BİTİRİNCE</SectionTitle>
            <Card>
              <Text style={{ color: colors.textMuted, fontSize: font.small, marginBottom: spacing.sm }}>Öğretmenine kısa bir not bırakabilirsin (isteğe bağlı).</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="ör. Eskizimi defterime çizdim."
                placeholderTextColor={colors.textFaint}
                multiline
                maxLength={1000}
                style={[st.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              />
              <SmallButton title="✓ Tamamladım" filled onPress={() => completeTask(hw.id, note)} style={{ marginTop: spacing.md }} />
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  body: { fontSize: font.body, lineHeight: 24, marginTop: spacing.sm },
  img: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, marginBottom: spacing.sm },
  input: { minHeight: 80, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, fontSize: font.body, textAlignVertical: 'top' },
});
