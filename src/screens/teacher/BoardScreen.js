// Akıllı Tahta: etkinlikleri tahtaya taşımanın yolları. Okulun tahtası ve interneti farklı; öğretmen uygun olanı seçer.
//   📶 Kodla bağlan (internet varsa) · 📱 Telefonun internetini paylaş → BoardConnect (tahta sayfası: tools/tahta).
//   💾 Flash bellek: branşın bütün oyunları + menü tek .html (data/activities/pack.js) — Pardus tahtada tarayıcıda açılır.
//   🎯 Etkinlikleri bu cihazda aç.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useRole } from '../../context/RoleContext';
import { Header, notify } from '../../teacher/ui';
import { exportBoardPack } from '../../teacher/activityExport';
import { packCount } from '../../data/activities/pack';
import { useBoardLink } from '../../teacher/BoardLink';

const PACK_STEPS = [
  'Paketi indir; kendine WhatsApp’tan gönder ya da Dosyalar’a / bilgisayarına kaydet.',
  'Dosyayı flash belleğe at, flash’ı akıllı tahtaya tak.',
  'Dosyaya çift tıkla: tarayıcıda menü açılır. Oyunu ve sınıfı seç.',
];

export default function BoardScreen({ navigation }) {
  const { colors, shadow } = useTheme();
  const { branchId, branch } = useRole();
  const [busy, setBusy] = useState(false);
  const count = packCount(branchId);
  const link = useBoardLink();

  const download = () => {
    setBusy(true);
    // Paket büyük (sesli oyunlarla birkaç MB): önce dönen göstergeyi çiz, sonra hazırla.
    setTimeout(async () => {
      try {
        await exportBoardPack(branchId);
      } catch (e) {
        notify('İndirilemedi', 'Paket hazırlanamadı. Tekrar dene.');
      } finally {
        setBusy(false);
      }
    }, 50);
  };

  const Option = ({ icon, tint, title, when, soon, children, onPress }) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [st.card, shadow, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: tint }, soon && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
    >
      <View style={st.head}>
        <View style={[st.icon, { backgroundColor: tint + '1F' }]}>
          <Text style={{ fontSize: 24 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body }}>{title}</Text>
          <Text style={{ color: tint, fontWeight: '800', fontSize: font.tiny, marginTop: 2 }}>{when}</Text>
        </View>
        {soon ? (
          <View style={[st.soon, { backgroundColor: colors.cardSoft }]}>
            <Text style={{ color: colors.textMuted, fontWeight: '900', fontSize: 11 }}>YAKINDA</Text>
          </View>
        ) : onPress ? (
          <Text style={{ color: colors.textFaint, fontSize: 22 }}>›</Text>
        ) : null}
      </View>
      {children}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Akıllı Tahta" subtitle={branch ? `${branch.emoji} ${branch.name}` : ''} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}>
        <Option icon="📶" tint={colors.accent} title={link.linked ? 'Tahtaya bağlısın' : 'Kodla bağlan'} when="Tahtada internet varsa" onPress={() => navigation.navigate('BoardConnect')}>
          <Text style={[st.body, { color: colors.textMuted }]}>
            Tahtanın tarayıcısında açılan kodu yaz; oyunu telefondan tahtada aç, telefon ya da tablet kumanda olsun.
          </Text>
        </Option>

        <Option icon="📱" tint={colors.second} title="Telefonun internetini paylaş" when="Okul interneti kapalıysa" onPress={() => navigation.navigate('BoardConnect', { hotspot: true })}>
          <Text style={[st.body, { color: colors.textMuted }]}>Tahtayı telefonunun erişim noktasına bağla, sonra kodla bağlan.</Text>
        </Option>

        <Option icon="💾" tint={colors.accent} title="Flash bellekle" when="İnternet yoksa">
          {PACK_STEPS.map((tx, i) => (
            <Text key={i} style={[st.body, { color: colors.textMuted }]}>
              <Text style={{ color: colors.accent, fontWeight: '900' }}>{i + 1}. </Text>
              {tx}
            </Text>
          ))}
          <Pressable
            onPress={download}
            disabled={busy || !count}
            style={[st.btn, { backgroundColor: colors.primary }, (busy || !count) && { opacity: 0.5 }]}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={{ color: colors.onPrimary, fontWeight: '900' }}>{count ? `⬇ Tahta paketini indir (${count} oyun)` : 'Bu branşta henüz oyun yok'}</Text>
            )}
          </Pressable>
        </Option>

        <Option icon="🎯" tint={colors.second} title="Etkinlikleri bu cihazda aç" when="Tahtaya bağlanmadan" onPress={() => navigation.navigate('Activities')}>
          <Text style={[st.body, { color: colors.textMuted }]}>Oyunu telefonda ya da tablette oynat; tek oyunu ⬇ İndir ile de alabilirsin.</Text>
        </Option>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, borderLeftWidth: 5, padding: spacing.md, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  soon: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  body: { fontSize: font.small, lineHeight: 21 },
  btn: { borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.xs },
});
