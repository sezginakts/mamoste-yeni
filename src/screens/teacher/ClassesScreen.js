// Sınıflar ekranı: öğretmenin sınıfları (kısayoldaki "Sınıf" burayı açar).
// Kartlar ana sayfadakiyle aynı dilde: sınıf rengi, öğrenci/ödev sayısı, davet kodu.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, font, radius, inkOn } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { useRole } from '../../context/RoleContext';
import { classColor } from './TimetableScreen';
import { Header, Card, Field, SmallButton, formatJoinCode, notify } from '../../teacher/ui';

export default function ClassesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const t = useTeacher();
  const { branch } = useRole();
  const [adding, setAdding] = useState(false);
  const [ad, setAd] = useState('');

  const siniflar = useMemo(() => (Array.isArray(t.classes) ? [...t.classes].sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr')) : []), [t.classes]);

  const olustur = () => {
    const adi = ad.trim();
    if (!adi) return;
    try {
      const id = t.addClass(adi);
      setAd('');
      setAdding(false);
      navigation.navigate('TeacherClass', { classId: id, justCreated: true });
    } catch (e) {
      notify('Sınıf oluşturulamadı', e.message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Sınıflar"
        subtitle={branch ? `${branch.emoji} ${branch.name} · ${siniflar.length} sınıf` : `${siniflar.length} sınıf`}
        onBack={() => navigation.goBack()}
        right={siniflar.length ? <SmallButton title={adding ? 'Vazgeç' : '＋ Sınıf'} onPress={() => setAdding((v) => !v)} /> : null}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xxl }} keyboardShouldPersistTaps="handled">
        {adding ? (
          <Card>
            <Field label="Sınıf adı" value={ad} onChangeText={setAd} placeholder="ör. 7-B" autoFocus onSubmitEditing={olustur} />
            <SmallButton title="Oluştur" filled onPress={olustur} disabled={!ad.trim()} />
          </Card>
        ) : null}

        {siniflar.length ? (
          <View style={st.grid}>
            {siniflar.map((c) => {
              const ogrenciler = Object.values(c.students || {});
              const col = classColor(c.name);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => navigation.navigate('TeacherClass', { classId: c.id })}
                  style={({ pressed }) => [st.kart, shadow, { backgroundColor: col }, pressed && { opacity: 0.9 }]}
                  accessibilityLabel={`${c.name} sınıfı`}
                >
                  <View style={[st.blob, { width: 90, height: 90, top: -30, right: -25 }]} />
                  <Text style={[st.ad, { color: inkOn(col) }]} numberOfLines={1}>{c.name}</Text>
                  <Text style={[st.meta, { color: inkOn(col) }]}>{ogrenciler.length} öğrenci</Text>
                  <Text style={[st.meta, { color: inkOn(col) }]}>{(c.homeworks || []).length} ödev</Text>
                  {c.code ? (
                    <View style={st.kod}>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 }}>{formatJoinCode(c.code)}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : !adding ? (
          <Pressable onPress={() => setAdding(true)} style={[st.bosKart, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Sınıf ekle">
            <Text style={{ fontSize: 32 }}>🏫</Text>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body, marginTop: 6 }}>＋ Sınıf ekle</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.small, textAlign: 'center', marginTop: 4 }}>
              Sınıf adını yaz (ör. 7-B). Ya da ders programında şube seçtiğinde sınıf kendiliğinden eklenir.
            </Text>
          </Pressable>
        ) : null}

        {siniflar.length && !adding ? (
          <Pressable onPress={() => setAdding(true)} style={{ alignSelf: 'center', marginTop: spacing.md }} accessibilityRole="button" accessibilityLabel="Yeni sınıf ekle">
            <Text style={{ color: colors.accent, fontWeight: '800', fontSize: font.small }}>＋ Yeni sınıf ekle</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kart: { width: '48.5%', borderRadius: radius.lg, padding: spacing.md, minHeight: 128, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  ad: { fontSize: font.h3, fontWeight: '900' },
  meta: { fontSize: font.small, fontWeight: '700', opacity: 0.9, marginTop: 2 },
  kod: { alignSelf: 'flex-start', backgroundColor: 'rgba(15,23,42,0.28)', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, marginTop: spacing.sm },
  bosKart: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
});
