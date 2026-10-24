// Etkinlikler: branşın oyunları kart olarak. Yalnız kartın “▶ Oyna” düğmesi oyunu açar (sınıf düzeyi oyunun içinden değişir,
// son seçilen hatırlanır). İçeriği olmayan oyun türleri gösterilmez. Türün `branches` listesi varsa yalnız o branşlarda.
// "Akıllı tahta" kısayolundan açılınca (params.board) üstte tahtada kullanma adımları görünür.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useRole } from '../../context/RoleContext';
import { activitiesFor, ACTIVITY_TYPES } from '../../data/activities';
import { Header, Card } from '../../teacher/ui';

const gradeRange = (gs) => {
  const u = [...new Set(gs.filter(Boolean))].sort((a, b) => a - b);
  if (!u.length) return '';
  const run = u.every((g, i) => !i || g === u[i - 1] + 1);
  return `${u.length > 1 && run ? `${u[0]}–${u[u.length - 1]}` : u.join(', ')}. sınıf`;
};

export default function ActivitiesScreen({ navigation, route }) {
  const { colors, shadow } = useTheme();
  const { branchId, branch } = useRole();
  const { width } = useWindowDimensions();
  const board = !!(route.params && route.params.board);
  const list = activitiesFor(branchId);
  const games = Object.entries(ACTIVITY_TYPES)
    .filter(([, t]) => !t.branches || t.branches.includes(branchId))
    .map(([type, t]) => ({ type, t, items: list.filter((a) => a.type === type) }))
    .filter((g) => g.items.length);
  const cols = width >= 900 ? 3 : width >= 560 ? 2 : 1;

  const open = (g) => navigation.navigate('ActivityPlay', { type: g.type });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={board ? 'Akıllı Tahta' : 'Etkinlikler'} subtitle={branch ? `${branch.emoji} ${branch.name}` : ''} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        {board ? (
          <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.accent, marginBottom: spacing.md }}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body, marginBottom: 6 }}>🖥️ Akıllı tahtada nasıl açılır?</Text>
            {[
              'Oyunu aç, üstteki ⬇ İndir’e dokun.',
              'Dosyayı kendine WhatsApp’tan gönder ya da Dosyalar’a / bilgisayarına kaydet.',
              'Dosyayı flash belleğe at, flash’ı akıllı tahtaya tak.',
              'Dosyaya çift tıkla: tarayıcıda açılır. İnternet gerekmez.',
            ].map((tx, i) => (
              <Text key={i} style={{ color: colors.textMuted, fontSize: font.small, lineHeight: 21 }}>
                <Text style={{ color: colors.accent, fontWeight: '900' }}>{i + 1}. </Text>
                {tx}
              </Text>
            ))}
          </Card>
        ) : null}

        {games.length ? (
          <View style={st.grid}>
            {games.map((g, i) => {
              const c = colors.accent;
              return (
                <View key={g.type} style={[st.card, shadow, { width: `${100 / cols}%` }]}>
                  <View style={[st.inner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[st.art, { backgroundColor: c + '1F' }]}>
                      <Text style={{ fontSize: 52 }}>{g.t.icon}</Text>
                    </View>
                    <View style={{ padding: spacing.md, gap: 6, flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.h3 }}>{g.t.name}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: font.small, lineHeight: 20 }} numberOfLines={3}>
                        {g.t.desc}
                      </Text>
                      <View style={st.foot}>
                        <Text style={{ color: c, fontWeight: '800', fontSize: font.small }}>{gradeRange(g.items.some((a) => !a.grade) ? (branch ? branch.grades : []) : g.items.map((a) => a.grade))}</Text>
                        <Pressable
                          onPress={() => open(g)}
                          accessibilityRole="button"
                          accessibilityLabel={`${g.t.name} oyununu aç`}
                          hitSlop={6}
                          style={({ pressed }) => [st.play, { backgroundColor: c }, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
                        >
                          <Text style={st.playT}>▶ Oyna</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Card style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Text style={{ fontSize: 22 }}>⏳</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.small, flex: 1 }}>{branch ? `${branch.name} için` : 'Bu ders için'} oyunlar hazırlanıyor. Eklendiğinde burada görünecek.</Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.sm / 2 },
  card: { padding: spacing.sm / 2 },
  inner: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', flex: 1 },
  art: { height: 110, alignItems: 'center', justifyContent: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 6 },
  play: { borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  playT: { color: '#fff', fontWeight: '900', fontSize: font.small },
});
