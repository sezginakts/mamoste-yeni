// Ders zili animasyonu: uygulama açıkken zil saati gelince ekranın üstünde sallanan zil + halkalar (6 sn, dokununca kapanır).
// Zamanı DeskContext'teki zillerden (bells) kendisi izler; telefonda sesi bildirim çalar, web'de / tahtada burada çalınır.
// "Zili dene" için: ringBell({ title, body }).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useDesk, weekdayOf } from '../teacher/DeskContext';
import { bellText, playBell } from '../utils/bell';
import { dayKey } from '../utils/helpers';
import { font, radius, spacing } from '../theme';

let openBell = null;
// sound: uygulama kendi sesini çalsın mı (web'de hep; telefonda zil saatinde bildirim çalar).
export function ringBell(text, sound = true) {
  if (sound) playBell();
  if (openBell) openBell(text);
}

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function BellOverlay() {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const desk = useDesk();
  const [text, setText] = useState(null);
  const shown = useRef(new Set());
  const swing = useRef(new Animated.Value(0)).current;
  const drop = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const native = Platform.OS !== 'web';

  const close = () => {
    clearTimeout(timer.current);
    Animated.timing(drop, { toValue: 0, duration: 220, useNativeDriver: native }).start(() => setText(null));
  };

  useEffect(() => {
    openBell = (t) => {
      setText(t);
      drop.setValue(0);
      swing.setValue(0);
      ring.setValue(0);
      Animated.spring(drop, { toValue: 1, friction: 6, tension: 80, useNativeDriver: native }).start();
      // Zil sallanır: sağa-sola, gittikçe azalarak.
      const amps = [1, -1, 0.8, -0.8, 0.6, -0.6, 0.4, -0.3, 0.15, 0];
      Animated.sequence(amps.map((a) => Animated.timing(swing, { toValue: a, duration: 120, easing: Easing.inOut(Easing.quad), useNativeDriver: native }))).start();
      Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: native }), { iterations: 4 }).start();
      clearTimeout(timer.current);
      timer.current = setTimeout(close, 6000);
    };
    return () => {
      openBell = null;
      clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zil saatini izle (uygulama açıkken). Aynı zil bir kez.
  useEffect(() => {
    if (!desk.bells.length) return undefined;
    const check = () => {
      const now = new Date();
      const day = weekdayOf(now);
      const t = hhmm(now);
      const b = desk.bells.find((x) => x.day === day && x.time === t);
      if (!b) return;
      const key = `${dayKey(now)}-${t}`;
      if (shown.current.has(key)) return;
      shown.current.add(key);
      ringBell(bellText(b), !native);
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desk.bells]);

  if (!text) return null;
  const rotate = swing.interpolate({ inputRange: [-1, 1], outputRange: ['-28deg', '28deg'] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const translateY = drop.interpolate({ inputRange: [0, 1], outputRange: [-160, 0] });

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + spacing.sm, alignItems: 'center' }]}>
      <Animated.View style={{ transform: [{ translateY }], opacity: drop, width: '92%', maxWidth: 440 }}>
        <Pressable onPress={close} accessibilityRole="alert" accessibilityLabel={`${text.title}. ${text.body}`} style={[st.card, shadow, { backgroundColor: colors.card, borderColor: colors.accent }]}>
          <View style={st.bellBox}>
            <Animated.View style={[st.ring, { borderColor: colors.accent, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
            <View style={[st.bellBg, { backgroundColor: colors.accent + '22' }]}>
              {/* Zil üstteki askısından sallanır: dönme noktası üstte. */}
              <Animated.Text style={[st.bell, { transform: [{ translateY: -14 }, { rotate }, { translateY: 14 }] }]}>🔔</Animated.Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.h3 }}>{text.title.replace('🔔 ', '')}</Text>
            <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: font.body, marginTop: 2 }}>{text.body}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.xl, borderWidth: 2, padding: spacing.md, paddingRight: spacing.lg },
  bellBox: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 3 },
  bellBg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  bell: { fontSize: 38 },
});
