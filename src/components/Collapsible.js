// Katlanır bölüm: başlığa dokununca içerik aşağı doğru açılır, tekrar dokununca kapanır.
// Durum cihazda hatırlanır (storageKey verilirse). Yükseklik Animated ile ölçülüp canlandırılır;
// içerik kapalıyken de takılı kalır (ölçüm için), ama dokunulamaz.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { font, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';

const STORE_KEY = '@ingapp/collapse/v1';
let mapCache = null;
let mapPromise = null;

async function loadMap() {
  if (mapCache) return mapCache;
  if (!mapPromise) {
    mapPromise = AsyncStorage.getItem(STORE_KEY)
      .then((raw) => {
        mapCache = raw ? JSON.parse(raw) : {};
        return mapCache;
      })
      .catch(() => {
        mapCache = {};
        return mapCache;
      });
  }
  return mapPromise;
}

function saveMap(map) {
  mapCache = map;
  AsyncStorage.setItem(STORE_KEY, JSON.stringify(map)).catch(() => {});
}

export default function Collapsible({ title, right, defaultOpen = true, storageKey, children, style, titleStyle }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const [contentH, setContentH] = useState(0);
  const anim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  // Kayıtlı tercih varsa uygula.
  useEffect(() => {
    if (!storageKey) return;
    let alive = true;
    loadMap().then((map) => {
      if (!alive) return;
      const saved = map[storageKey];
      if (typeof saved === 'boolean' && saved !== defaultOpen) {
        setOpen(saved);
        anim.setValue(saved ? 1 : 0);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [open, anim]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (storageKey) loadMap().then((map) => saveMap({ ...map, [storageKey]: next }));
  };

  const height = anim.interpolate({ inputRange: [0, 1], outputRange: [0, contentH] });
  // İlk ölçüm öncesi: açıkken doğal yükseklik, kapalıyken sıfır.
  const boxStyle = contentH ? { height } : { height: open ? undefined : 0 };

  return (
    <View style={style}>
      <Pressable
        onPress={toggle}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.title, { color: colors.textMuted }, titleStyle]}>{title}</Text>
        <View style={{ flex: 1 }} />
        {right}
        <Text style={[styles.caret, { color: colors.textFaint }]}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>
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
