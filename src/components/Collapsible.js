// Katlanır bölüm: başlığa dokununca içerik aşağı doğru açılır, tekrar dokununca kapanır.
// KURAL: durum HATIRLANMAZ. Bölüm varsayılan olarak kapalıdır (defaultOpen verilmedikçe);
// ekrandan çıkınca varsayılana döner, ekrana tekrar girildiğinde kapalı (ya da defaultOpen neyse öyle) başlar.
// Yükseklik her zaman ölçülen içerik yüksekliğinden hesaplanır; ölçüm gelmeden açılırsa doğal yükseklik kullanılır,
// böylece "bazen açılıyor bazen açılmıyor" durumu oluşmaz.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { font, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';

// Navigasyon bağlamı yoksa (ör. test/izole render) hep odakta say.
function useFocusSafe() {
  try {
    return useIsFocused();
  } catch (e) {
    return true;
  }
}

export default function Collapsible({ title, right, defaultOpen = false, acilSin = 0, okSolda = false, children, style, titleStyle, header }) {
  const { colors } = useTheme();
  const odak = useFocusSafe();
  const [open, setOpen] = useState(!!defaultOpen);
  const [contentH, setContentH] = useState(0);
  const anim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  // Dışarıdan "aç" sinyali (ör. başlıktaki ＋ Sınıf düğmesi): sinyal her arttığında bölüm açılır.
  useEffect(() => {
    if (!acilSin) return;
    setOpen(true);
    anim.setValue(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acilSin]);
  const ilkOdak = useRef(true);

  // Ekrandan çıkınca varsayılana dön: tekrar girildiğinde derli toplu (kapalı) başlar.
  useEffect(() => {
    if (ilkOdak.current) {
      ilkOdak.current = false;
      return;
    }
    if (!odak) {
      const deger = defaultOpen ? 1 : 0;
      setOpen(!!defaultOpen);
      anim.setValue(deger);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odak]);

  useEffect(() => {
    Animated.timing(anim, { toValue: open ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [open, anim]);

  // İçerik ölçüldüğünde açık bölümün yüksekliğini hemen tam değere oturt (animasyon yarım kalmasın).
  useEffect(() => {
    if (open && contentH > 0) anim.setValue(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentH]);

  const toggle = () => setOpen((v) => !v);

  const baslik = header ? (
    header({ open, toggle })
  ) : (
    <Pressable
      onPress={toggle}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => [styles.head, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.title, { color: colors.textMuted }, titleStyle]}>{title}</Text>
      {okSolda ? <Text style={[styles.caret, { color: colors.textFaint }]}>{open ? '⌃' : '⌄'}</Text> : null}
      <View style={{ flex: 1 }} />
      {right}
      {okSolda ? null : <Text style={[styles.caret, { color: colors.textFaint }]}>{open ? '⌃' : '⌄'}</Text>}
    </Pressable>
  );

  // iOS/Android: ölçüm ve animasyon YOK — açıkken içerik takılır, kapalıyken hiç çizilmez.
  // (Cihazda yükseklik ölçümüne bağlı takılmalar bu yüzden olamaz.)
  if (Platform.OS !== 'web') {
    return (
      <View style={style}>
        {baslik}
        {open ? <View style={{ paddingTop: spacing.sm }}>{children}</View> : null}
      </View>
    );
  }

  const boxStyle = contentH > 0
    ? { height: anim.interpolate({ inputRange: [0, 1], outputRange: [0, contentH] }) }
    : { height: open ? undefined : 0 };

  return (
    <View style={style}>
      {baslik}
      <Animated.View style={[boxStyle, { overflow: 'hidden' }]} pointerEvents={open ? 'auto' : 'none'}>
        <View onLayout={(e) => setContentH(Math.round(e.nativeEvent.layout.height))} style={{ paddingTop: spacing.sm }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  title: { fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  caret: { fontSize: 15, fontWeight: '900', marginLeft: 2 },
});
