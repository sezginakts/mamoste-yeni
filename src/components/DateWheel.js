// Tekerlekli tarih seçici: gün / ay / yıl kolonları, ortadaki değer seçili.
// Puan panelinde "Tarih seç" ile açılır; gelecek bir tarihe puan yazmak için kullanılır. Evraklarda evrak tarihini değiştirir.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, font, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';

const ITEM = 44;
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function Kolon({ items, index, onChange, etiket, colors }) {
  const ref = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current && ref.current.scrollTo({ y: index * ITEM, animated: false }), 30);
    return () => clearTimeout(t);
  }, [index]);
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textFaint, fontSize: font.tiny, textAlign: 'center', marginBottom: 4 }}>{etiket}</Text>
      <View style={{ height: ITEM * 3, overflow: 'hidden' }}>
        <ScrollView
          ref={ref}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: ITEM }}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.y / ITEM);
            onChange(Math.max(0, Math.min(items.length - 1, i)));
          }}
        >
          {items.map((v, i) => (
            <View key={`${v}-${i}`} style={{ height: ITEM, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: i === index ? colors.text : colors.textMuted, fontSize: i === index ? font.h3 : font.body, fontWeight: i === index ? '900' : '600' }}>{v}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

export default function DateWheel({ visible, value, onClose, onPick }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const temel = new Date(value || Date.now());
  const [gun, setGun] = useState(temel.getDate() - 1);
  const [ay, setAy] = useState(temel.getMonth());
  const [yil, setYil] = useState(temel.getFullYear());

  useEffect(() => {
    if (!visible) return;
    const d = new Date(value || Date.now());
    setGun(d.getDate() - 1);
    setAy(d.getMonth());
    setYil(d.getFullYear());
  }, [visible, value]);

  // Geçen yıl da var: Ocak'ta açılan evrakın tarihi Eylül'e (önceki yıla) düşebilir.
  const yillar = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);
  const gunler = Array.from({ length: 31 }, (_, i) => String(i + 1));

  const sec = () => {
    const g = Math.min(+gunler[gun], new Date(yil, ay + 1, 0).getDate());
    onPick(new Date(yil, ay, g, 12, 0, 0).getTime());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Kapat">
        <Pressable style={[st.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + spacing.md }]} onPress={() => {}}>
          <View style={[st.grabber, { backgroundColor: colors.border }]} />
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.h3, marginBottom: spacing.sm }}>Tarih seç</Text>
          <View style={[st.wheels, { borderColor: colors.border }]}>
            <View style={[st.ortaCizgi, { borderColor: colors.accent + '66', backgroundColor: colors.accent + '0F' }]} pointerEvents="none" />
            <Kolon items={gunler} index={gun} onChange={setGun} etiket="GÜN" colors={colors} />
            <Kolon items={AYLAR} index={ay} onChange={setAy} etiket="AY" colors={colors} />
            <Kolon items={yillar.map(String)} index={Math.max(0, yillar.indexOf(yil))} onChange={(i) => setYil(yillar[i])} etiket="YIL" colors={colors} />
          </View>
          <Pressable onPress={sec} style={[st.sec, { backgroundColor: colors.accent }]}>
            <Text style={{ color: colors.onAccent, fontWeight: '900', fontSize: font.body }}>Bu tarihe yaz</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  grabber: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  wheels: { flexDirection: 'row', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.sm, overflow: 'hidden' },
  ortaCizgi: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: -22, height: 44, borderTopWidth: 1, borderBottomWidth: 1 },
  sec: { marginTop: spacing.md, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center' },
});
