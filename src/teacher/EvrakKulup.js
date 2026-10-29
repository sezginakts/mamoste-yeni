// Kulübüm: kulüp adı, danışman, üyeler (sınıf listelerinden işaretlenir ya da elle yazılır), başkan (⭐).
// Kulüp evraklarının üye tabloları, başkanı ve üye sayısı buradan dolar. Kayıt Okul bilgileri ile aynı yerde (docs.js → kulup).
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, font, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { Field, SmallButton } from './ui';

const anahtar = (u) => `${u.sinif || ''}|${u.no || ''}|${u.ad}`;
// "123 Ali Veli" / "Ali Veli" satırları → [{ no, ad }]
const elleAyikla = (metin) =>
  String(metin || '')
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\d+)[\s.)-]+(.+)$/);
      return m ? { no: m[1], ad: m[2].trim() } : { no: '', ad: l };
    });

export default function EvrakKulup({ visible, kulup, classes, ogretmen, onClose, onSave }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [k, setK] = useState(kulup);
  const [acik, setAcik] = useState(null); // açık sınıf (üye seçimi)
  const [elle, setElle] = useState('');

  useEffect(() => {
    if (!visible) return;
    setK(kulup);
    setAcik(null);
    setElle('');
  }, [visible, kulup]);

  const uyeler = k.uyeler || [];
  const varMi = (u) => uyeler.some((x) => anahtar(x) === anahtar(u));
  const degistir = (u) => {
    const cikar = varMi(u);
    const sonra = cikar ? uyeler.filter((x) => anahtar(x) !== anahtar(u)) : [...uyeler, u];
    setK({ ...k, uyeler: sonra, baskan: cikar && u.ad === k.baskan ? '' : k.baskan }); // başkan listeden çıkarsa başkanlık da düşer
  };
  const elleEkle = () => {
    const yeni = elleAyikla(elle).map((u) => ({ ...u, sinif: '' })).filter((u) => !varMi(u));
    setK({ ...k, uyeler: [...uyeler, ...yeni] });
    setElle('');
  };
  const ogrencileri = (c) =>
    Object.values(c.students || {})
      .filter((s) => (s.nk || '').trim())
      .sort((a, b) => (+a.no || 1e9) - (+b.no || 1e9))
      .map((s) => ({ no: String(s.no || ''), ad: s.nk.trim(), sinif: c.name }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={[st.ust, { borderColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Text style={{ color: colors.textMuted, fontWeight: '800' }}>Vazgeç</Text>
          </Pressable>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.h3 }}>Kulübüm</Text>
          <Pressable onPress={() => onSave({ ...k, uyeler })} hitSlop={10} accessibilityRole="button">
            <Text style={{ color: colors.accent, fontWeight: '900' }}>Kaydet</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xxl }} keyboardShouldPersistTaps="handled">
          <Field label="Kulüp adı" value={k.ad} onChangeText={(v) => setK({ ...k, ad: v })} placeholder="ör. Satranç" />
          <Field label="Danışman öğretmen" value={k.danisman} onChangeText={(v) => setK({ ...k, danisman: v })} placeholder={ogretmen || 'Boşsa senin adın yazılır'} />

          <Text style={[st.baslik, { color: colors.textMuted }]}>ÜYELER ({uyeler.length}) · ⭐ = kulüp başkanı</Text>
          {uyeler.length ? (
            <View style={{ gap: 6, marginBottom: spacing.md }}>
              {uyeler.map((u) => {
                const baskan = k.baskan && k.baskan === u.ad;
                return (
                  <View key={anahtar(u)} style={[st.uye, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Pressable onPress={() => setK({ ...k, baskan: baskan ? '' : u.ad })} hitSlop={8} accessibilityLabel={`${u.ad} başkan`}>
                      <Text style={{ fontSize: 18, opacity: baskan ? 1 : 0.25 }}>⭐</Text>
                    </Pressable>
                    <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                      {u.ad}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: font.small }}>{[u.sinif, u.no].filter(Boolean).join(' · ')}</Text>
                    <Pressable onPress={() => degistir(u)} hitSlop={8} accessibilityLabel={`${u.ad} çıkar`}>
                      <Text style={{ color: colors.danger, fontWeight: '900' }}>✕</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>Henüz üye yok. Aşağıdaki sınıflardan seç ya da elle yaz.</Text>
          )}

          <Text style={[st.baslik, { color: colors.textMuted }]}>SINIFLARIMDAN SEÇ</Text>
          {classes.length ? (
            classes.map((c) => {
              const list = ogrencileri(c);
              const secili = list.filter(varMi).length;
              return (
                <View key={c.id} style={[st.sinif, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Pressable onPress={() => setAcik(acik === c.id ? null : c.id)} style={st.sinifBas} accessibilityRole="button">
                    <Text style={{ color: colors.text, fontWeight: '900', flex: 1 }}>{c.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: font.small }}>
                      {list.length ? `${secili}/${list.length} seçili` : 'adı yazılı öğrenci yok'} {acik === c.id ? '▴' : '▾'}
                    </Text>
                  </Pressable>
                  {acik === c.id
                    ? list.map((u) => (
                        <Pressable key={anahtar(u)} onPress={() => degistir(u)} style={st.ogr} accessibilityRole="checkbox" accessibilityState={{ checked: varMi(u) }}>
                          <Text style={{ fontSize: 16 }}>{varMi(u) ? '☑' : '☐'}</Text>
                          <Text style={{ color: colors.text, flex: 1 }}>{u.ad}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: font.small }}>{u.no}</Text>
                        </Pressable>
                      ))
                    : null}
                </View>
              );
            })
          ) : (
            <Text style={{ color: colors.textMuted, marginBottom: spacing.sm }}>Bu derste sınıf yok.</Text>
          )}

          <Text style={[st.baslik, { color: colors.textMuted, marginTop: spacing.md }]}>ELLE EKLE</Text>
          <Field value={elle} onChangeText={setElle} placeholder={'Her satıra bir öğrenci: 123 Ali Veli'} multiline />
          <SmallButton title="Listeye ekle" onPress={elleEkle} disabled={!elle.trim()} style={{ alignSelf: 'flex-start' }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  ust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  baslik: { fontSize: font.tiny, fontWeight: '900', letterSpacing: 1, marginBottom: spacing.sm },
  uye: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8 },
  sinif: { borderWidth: 1, borderRadius: radius.md, marginBottom: spacing.sm, overflow: 'hidden' },
  sinifBas: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  ogr: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 8 },
});
