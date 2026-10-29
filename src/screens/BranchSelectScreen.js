// Öğretmen: branşını seç (ilk açılışta; sonra Ayarlar'dan değiştirilebilir, her branşın verisi ayrı).
// Branşlar ORTAOKUL / LİSE başlıkları altında, katlanır bölüm olarak listelenir.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, font } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useRole, MAX_BRANCHES } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import { BRANCHES, branchOf } from '../data/branches';
import Button from '../components/Button';
import Collapsible from '../components/Collapsible';

const SECTIONS = [
  { key: 'ortaokul', label: 'ORTAOKUL' },
  { key: 'lise', label: 'LİSE' },
];

export default function BranchSelectScreen() {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const { setBranch, resetRole, prevBranch, cancelBranchChange, myBranches, setMyBranches, branchNames, renameBranch } = useRole();
  const { isAdmin } = useAuth();
  // Profilden gelindiğinde mevcut derslerin HEPSİ seçili gelsin (kaydederken ders kaybolmasın).
  const [picked, setPicked] = useState(() => (myBranches && myBranches.length ? myBranches : prevBranch ? [prevBranch] : []));
  // Seçmeli derslerin adı: "Seçmeli Ders 1" → ör. "Yaşayan Diller"
  const [adlar, setAdlar] = useState(() => ({ 'secmeli-1': branchNames['secmeli-1'] || '', 'secmeli-2': branchNames['secmeli-2'] || '' }));
  useEffect(() => {
    setAdlar((a) => ({ 'secmeli-1': branchNames['secmeli-1'] || a['secmeli-1'], 'secmeli-2': branchNames['secmeli-2'] || a['secmeli-2'] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchNames['secmeli-1'], branchNames['secmeli-2']]);
  const secmeliler = picked.filter((id) => id === 'secmeli-1' || id === 'secmeli-2');
  const adKaydet = (id) => renameBranch(id, adlar[id] || '');
  // En çok 3 ders: seçiliyse çıkar, değilse ekle (3'ü geçemez).
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_BRANCHES ? p : [...p, id]));
  const kaydet = () => {
    if (!picked.length) return;
    secmeliler.forEach((id) => adKaydet(id));
    if (prevBranch) {
      // Profilden gelindi: aktif ders değişmesin — eski ders listede kaldıysa başta tutulur.
      setMyBranches(picked.includes(prevBranch) ? [prevBranch, ...picked.filter((x) => x !== prevBranch)] : picked);
    } else {
      setBranch(picked[0], picked); // ilk giriş
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl, paddingBottom: 140 }}>
        {prevBranch || isAdmin ? (
          <Pressable onPress={prevBranch ? cancelBranchChange : resetRole} hitSlop={10} style={{ alignSelf: 'flex-start', marginBottom: spacing.md }}>
            <Text style={{ color: colors.accent, fontWeight: '800', fontSize: font.body }}>‹ Geri</Text>
          </Pressable>
        ) : null}
        <Text style={[st.title, { color: colors.text }]}>Hangi dersleri veriyorsun?</Text>
        <Text style={[st.sub, { color: colors.textMuted }]}>
          En çok {MAX_BRANCHES} ders seçebilirsin ({picked.length}/{MAX_BRANCHES}). Her dersin sınıfları ve planları ayrı tutulur; ders programı ortaktır
          ve dersler kısaltmalarıyla görünür (TVT, SB…). Sonradan Profil → Derslerim'den değiştirebilirsin.
        </Text>

        {SECTIONS.map((sec) => {
          const items = BRANCHES.filter((b) => b.level === sec.key);
          if (!items.length) return null;
          return (
            <Collapsible key={sec.key} title={sec.label} style={{ marginTop: spacing.lg }}>
              <View style={st.grid}>
                {items.map((b) => (
                  <BranchCard key={b.id} b={branchOf(b.id)} selected={picked.includes(b.id)} onPress={() => toggle(b.id)} colors={colors} shadow={shadow} />
                ))}
              </View>
            </Collapsible>
          );
        })}

        {/* Seçmeli ders adları: seçildiyse adını yaz (ör. Yaşayan Diller) */}
        {secmeliler.length ? (
          <View style={[st.adKart, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body, marginBottom: spacing.xs }}>Seçmeli dersin adı</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.small, marginBottom: spacing.sm }}>
              Boş bırakırsan “Seçmeli Ders” olarak kalır. Yazdığın ad profilde, ana sayfada ve ders programında görünür.
            </Text>
            {secmeliler.map((id) => (
              <View key={id} style={{ marginBottom: spacing.sm }}>
                <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', marginBottom: 4 }}>
                  {id === 'secmeli-1' ? '1. SEÇMELİ DERS' : '2. SEÇMELİ DERS'}
                </Text>
                <TextInput
                  value={adlar[id] || ''}
                  onChangeText={(v) => setAdlar((a) => ({ ...a, [id]: v }))}
                  onEndEditing={() => adKaydet(id)}
                  onBlur={() => adKaydet(id)}
                  placeholder="ör. Yaşayan Diller"
                  placeholderTextColor={colors.textFaint}
                  style={[st.adInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardSoft }]}
                />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={[st.footer, { backgroundColor: colors.bg, paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title={picked.length ? `${picked.length} dersle devam et` : 'Ders seç'}
          disabled={!picked.length}
          onPress={kaydet}
        />
      </View>
    </View>
  );
}

function BranchCard({ b, selected, onPress, colors, shadow }) {
  const on = selected;
  return (
    <Pressable
      disabled={!b.enabled}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on, disabled: !b.enabled }}
      style={[st.card, shadow, { backgroundColor: colors.card, borderColor: on ? b.color : colors.border }, !b.enabled && { opacity: 0.45 }]}
    >
      <View style={[st.icon, { backgroundColor: b.color + '22' }]}>
        <Text style={/^[a-z]+$/i.test(b.emoji) ? { fontSize: 17, fontWeight: '900', color: b.color } : { fontSize: 24 }}>{b.emoji}</Text>
      </View>
      <Text style={[st.name, { color: colors.text }]} numberOfLines={2}>{b.name}</Text>
      <Text style={{ color: b.enabled ? colors.textMuted : colors.textFaint, fontSize: font.tiny, marginTop: 2 }}>
        {b.enabled ? `${b.grades[0]}–${b.grades[b.grades.length - 1]}. sınıflar` : 'Yakında'}
      </Text>
      {on ? <View style={[st.check, { backgroundColor: b.color }]}><Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text></View> : null}
    </Pressable>
  );
}

const st = StyleSheet.create({
  title: { fontSize: font.h2, fontWeight: '900' },
  sub: { fontSize: font.body, marginTop: spacing.xs, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  card: { width: '48.5%', borderRadius: radius.lg, borderWidth: 2, padding: spacing.md, minHeight: 128 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  name: { fontSize: font.body, fontWeight: '800' },
  check: { position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  adKart: { marginTop: spacing.lg, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  adInput: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 10, fontSize: font.body },
});
