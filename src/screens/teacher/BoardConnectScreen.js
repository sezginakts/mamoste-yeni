// Kodla bağlan: tahtanın tarayıcısında Okul Tahta sayfası açılır, ekrandaki 6 haneli kod burada yazılır (teacher/BoardLink).
// params.hotspot: okul interneti kapalıysa önce telefonun internetini paylaşma adımları.
import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../teacher/ui';
import { useBoardLink, TAHTA_URL } from '../../teacher/BoardLink';
import { activityById } from '../../data/activities';

const HOTSPOT_STEPS = [
  'Telefonunda Ayarlar → Kişisel Erişim Noktası (Android: Mobil Erişim Noktası) aç.',
  'Tahtada sağ üstteki ağ simgesinden telefonunun adını seç, şifresini yaz.',
  'Tahta internete bağlanınca aşağıdaki adımlarla devam et.',
];

export const showCode = (c) => (c ? `${c.slice(0, 3)} ${c.slice(3)}` : '');

export default function BoardConnectScreen({ navigation, route }) {
  const { colors, shadow } = useTheme();
  const link = useBoardLink();
  const hotspot = !!(route.params && route.params.hotspot);
  const [code, setCode] = useState('');
  const ok = code.length === 6;
  const busy = link.status === 'connecting';
  const openAct = link.open && activityById(link.open.id);

  const Step = ({ n, children }) => (
    <View style={st.step}>
      <View style={[st.num, { backgroundColor: colors.accent }]}>
        <Text style={{ color: '#fff', fontWeight: '900' }}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={hotspot ? 'İnternet paylaşarak bağlan' : 'Kodla bağlan'} subtitle="Akıllı tahta" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }} keyboardShouldPersistTaps="handled">
        {link.linked ? (
          <View style={[st.card, shadow, { backgroundColor: colors.card, borderColor: colors.success }]}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>📺</Text>
            <Text style={[st.big, { color: colors.text }]}>Tahtaya bağlandın</Text>
            <Text style={{ color: link.status === 'lost' ? colors.danger : colors.textMuted, textAlign: 'center', fontWeight: '700' }}>
              {link.status === 'lost' ? 'Bağlantı zayıf — yeniden deneniyor' : `Kod ${showCode(link.code)}`}
              {openAct ? ` · Tahtada: ${openAct.unitName}` : ''}
            </Text>
            <Pressable onPress={() => navigation.navigate('Activities')} style={[st.btn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.onPrimary, fontWeight: '900' }}>🎯 Etkinlik seç</Text>
            </Pressable>
            {openAct ? (
              <Pressable onPress={() => navigation.navigate('BoardRemote', { type: openAct.type })} style={[st.btn, { backgroundColor: colors.second }]}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>🎮 Kumanda</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={link.disconnect} hitSlop={8} style={{ alignSelf: 'center', marginTop: spacing.xs }}>
              <Text style={{ color: colors.danger, fontWeight: '800' }}>Bağlantıyı kes</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[st.card, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {hotspot
              ? HOTSPOT_STEPS.map((tx, i) => (
                  <Step key={i} n={i + 1}>
                    <Text style={[st.body, { color: colors.text }]}>{tx}</Text>
                  </Step>
                ))
              : null}
            <Step n={hotspot ? 4 : 1}>
              <Text style={[st.body, { color: colors.text }]}>Tahtanın tarayıcısında şu adresi aç:</Text>
              {TAHTA_URL ? (
                <Text selectable style={[st.url, { color: colors.accent, backgroundColor: colors.cardSoft }]}>{TAHTA_URL.replace(/^https?:\/\//, '')}</Text>
              ) : (
                <Text style={[st.body, { color: colors.danger }]}>Tahta sayfası henüz yayınlanmadı.</Text>
              )}
            </Step>
            <Step n={hotspot ? 5 : 2}>
              <Text style={[st.body, { color: colors.text }]}>Tahtada görünen 6 haneli kodu yaz:</Text>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel="Tahta kodu"
                onSubmitEditing={() => ok && link.connect(code)}
                style={[st.code, { color: colors.text, borderColor: ok ? colors.accent : colors.border, backgroundColor: colors.cardSoft }]}
              />
            </Step>
            {link.error ? <Text style={{ color: colors.danger, fontWeight: '700', textAlign: 'center' }}>{link.error}</Text> : null}
            <Pressable onPress={() => link.connect(code)} disabled={!ok || busy} style={[st.btn, { backgroundColor: colors.primary }, (!ok || busy) && { opacity: 0.45 }]}>
              {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={{ color: colors.onPrimary, fontWeight: '900' }}>📶 Bağlan</Text>}
            </Pressable>
            {link.lastCode && !code ? (
              <Pressable onPress={() => setCode(link.lastCode)} hitSlop={8} style={{ alignSelf: 'center' }}>
                <Text style={{ color: colors.accent, fontWeight: '800' }}>Son kod: {showCode(link.lastCode)}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.lg, gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  body: { fontSize: font.body, lineHeight: 23 },
  url: { fontSize: font.body, fontWeight: '900', marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.sm },
  code: { fontSize: 34, fontWeight: '900', letterSpacing: 10, textAlign: 'center', borderWidth: 2, borderRadius: radius.md, paddingVertical: 10, marginTop: spacing.sm },
  btn: { borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center' },
  big: { fontSize: font.h2, fontWeight: '900', textAlign: 'center' },
});
