// Aktif temayı (light/dark) yöneten context.
// Tercih AsyncStorage'da saklanır; tüm ekranlar useTheme() ile aktif paleti alır.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETTES, makeShadow, setAccentNow } from '../theme';

const KEY = '@ingapp/theme/v1';
const ACCENT_KEY = '@ingapp/accent/v1';
const ThemeContext = createContext(null);

// Uygulama rengi: light = aydınlık temada, dark = karanlık temada, deep = üst bant (karanlık),
// press = aydınlıkta düğme gölgesi / koyu ton, ink = karanlıkta renkli düğmenin yazısı.
// Düğmeler, vurgular, ünite ve sınıf renkleri hep bu renkten. Anlamı olan renkler ayrı: doğru = success (turkuaz), hata = danger (mercan).
export const ACCENTS = {
  coral: { label: 'Mercan', light: '#E2574C', dark: '#FB8A7B', deep: '#9F2D24', press: '#B4382E', ink: '#3D1A16' },
  ocean: { label: 'Turkuaz', light: '#0D9488', dark: '#2DD4BF', deep: '#115E59', press: '#0F766E', ink: '#042F2B' },
  sky: { label: 'Gök mavisi', light: '#0284C7', dark: '#38BDF8', deep: '#075985', press: '#075985', ink: '#082F49' },
};
// Eski sürümde seçilmiş, artık olmayan renkler (çivit, mor, yeşil, klasik mavi) turkuaza döner.
const DEFAULT_ACCENT = 'ocean';

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const [accent, setAccentState] = useState(DEFAULT_ACCENT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [saved, acc] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(ACCENT_KEY)]);
        if (saved === 'light' || saved === 'dark') setMode(saved);
        if (acc && ACCENTS[acc]) setAccentState(acc);
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  const setAccent = (a) => {
    if (!ACCENTS[a]) return;
    setAccentState(a);
    AsyncStorage.setItem(ACCENT_KEY, a).catch(() => {});
  };

  const setThemeMode = (m) => {
    setMode(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  };

  const toggleTheme = () => setThemeMode(mode === 'light' ? 'dark' : 'light');

  const value = useMemo(() => {
    const a = ACCENTS[accent] || ACCENTS[DEFAULT_ACCENT];
    const base = PALETTES[mode] || PALETTES.light;
    const dark = mode === 'dark';
    const accentC = dark ? a.dark : a.light;
    const colors = {
      ...base,
      success: base.primary,
      onSuccess: base.onPrimary,
      accent: accentC,
      accentDeep: dark ? a.deep : a.light,
      primary: accentC,
      primaryDark: dark ? a.light : a.press,
      onPrimary: dark ? a.ink : '#FFFFFF',
    };
    // Sınıf / ünite kartları üstünde beyaz yazı var: karanlıkta da canlı (aydınlık) ton.
    setAccentNow(a.light);
    return { mode, colors, shadow: makeShadow(colors), setThemeMode, toggleTheme, accent, setAccent, loaded };
  }, [mode, accent, loaded]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme, ThemeProvider içinde kullanılmalı');
  return ctx;
}

// Stil fabrikasını aktif palete göre memoize eden yardımcı.
// Kullanım: const styles = useThemedStyles(makeStyles);
export function useThemedStyles(factory) {
  const { colors, shadow } = useTheme();
  return useMemo(() => factory(colors, shadow), [colors, shadow, factory]);
}
