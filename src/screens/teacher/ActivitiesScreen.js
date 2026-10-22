// Etkinlikler: branşın sınıf oyunları, türe göre (Pasaparola, Cümle Kur, Çarkıfelek, Denklem Terazisi …). Türün `branches` listesi varsa yalnız o branşlarda görünür.
//   ▶ Oyna  → uygulama içinde tam ekran
//   ⬇ İndir → tek dosyalık .html (WhatsApp/Dosyalar ile gönder; flash belleğe at, akıllı tahtada çift tıkla)
// "Akıllı tahta" kısayolundan açılınca (params.board) üstte tahtada kullanma adımları görünür.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useRole } from '../../context/RoleContext';
import { activitiesFor, ACTIVITY_TYPES } from '../../data/activities';
import { exportActivity } from '../../teacher/activityExport';
import { Header, Card, SectionTitle } from '../../teacher/ui';

export default function ActivitiesScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { branchId, branch } = useRole();
  const board = !!(route.params && route.params.board);
  const list = activitiesFor(branchId);
  const [busy, setBusy] = useState(null);

  const download = async (a) => {
    setBusy(a.id);
    try {
      await exportActivity(a);
    } catch (e) {
      const msg = 'Dosya hazırlanamadı. Tekrar dene.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('İndirilemedi', msg);
      console.warn('etkinlik indirme', e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={board ? 'Akıllı Tahta' : 'Etkinlikler'} subtitle={branch ? `${branch.emoji} ${branch.name}` : ''} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        {board ? (
          <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.accent }}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body, marginBottom: 6 }}>🖥️ Akıllı tahtada nasıl açılır?</Text>
            {[
              'Etkinliğin yanındaki ⬇ İndir’e dokun.',
              'Dosyayı kendine WhatsApp’tan gönder ya da Dosyalar’a / bilgisayarına kaydet.',
              'Dosyayı flash belleğe at, flash’ı akıllı tahtaya tak.',
              'Dosyaya çift tıkla: tarayıcıda açılır. İnternet gerekmez.',
            ].map((t, i) => (
              <Text key={i} style={{ color: colors.textMuted, fontSize: font.small, lineHeight: 21 }}>
                <Text style={{ color: colors.accent, fontWeight: '900' }}>{i + 1}. </Text>
                {t}
              </Text>
            ))}
          </Card>
        ) : null}

        {Object.entries(ACTIVITY_TYPES)
          .filter(([, t]) => !t.branches || t.branches.includes(branchId))
          .map(([type, t]) => {
          const games = list.filter((a) => a.type === type).sort((a, b) => a.grade - b.grade || a.unit - b.unit);
          return (
            <View key={type}>
              <SectionTitle>{`${t.icon} ${t.name.toLocaleUpperCase('tr')}`}</SectionTitle>
              <Text style={{ color: colors.textMuted, fontSize: font.small, marginBottom: spacing.sm }}>{t.desc}</Text>
              {games.length ? (
                games.map((a) => (
                  <Card key={a.id} style={st.row}>
                    <View style={[st.icon, { backgroundColor: colors.accent + '1F' }]}>
                      <Text style={{ color: colors.accent, fontWeight: '900', fontSize: font.h3 }}>{a.grade}</Text>
                      <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 9 }}>SINIF</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body }}>{a.unit ? `${a.unit}. Ünite` : a.unitName}</Text>
                      {a.unit ? <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }} numberOfLines={2}>{a.unitName}</Text> : null}
                      <View style={st.btns}>
                        <Pressable onPress={() => navigation.navigate('ActivityPlay', { id: a.id })} style={[st.btn, { backgroundColor: colors.accent }]} accessibilityLabel={`${a.unit ? `${a.unit}. ünite` : a.unitName} oyununu oyna`}>
                          <Text style={st.btnT}>▶ Oyna</Text>
                        </Pressable>
                        <Pressable onPress={() => download(a)} disabled={busy === a.id} style={[st.btn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.accent }]} accessibilityLabel="Akıllı tahta için indir">
                          {busy === a.id ? <ActivityIndicator color={colors.accent} /> : <Text style={[st.btnT, { color: colors.accent }]}>⬇ İndir</Text>}
                        </Pressable>
                      </View>
                    </View>
                  </Card>
                ))
              ) : (
                <Card style={[st.row, { borderStyle: 'dashed' }]}>
                  <Text style={{ fontSize: 22 }}>⏳</Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.small, flex: 1 }}>
                    {branch ? `${branch.name} için` : 'Bu ders için'} {t.name} içeriği hazırlanıyor. Eklendiğinde burada görünecek.
                  </Text>
                </Card>
              )}
            </View>
          );
        })}
        <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.md }}>
          Etkinlikler internetsiz çalışır. İndirilen dosya tek başına çalışır; akıllı tahtada, bilgisayarda ya da telefonda tarayıcıda açılır.
        </Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  btn: { flex: 1, borderRadius: radius.md, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  btnT: { color: '#fff', fontWeight: '900', fontSize: font.small },
});
