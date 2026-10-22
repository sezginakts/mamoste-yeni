// Aktif temayı (light/dark) yöneten context.
// Tercih AsyncStorage'da saklanır; tüm ekranlar useTheme() ile aktif paleti alır.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETTES, makeShadow } from '../theme';

const KEY = '@ingapp/theme/v1';
const ACCENT_KEY = '@ingapp/accent/v1';
const ThemeContext = createContext(null);

// Uygulama rengi: light = aydınlık temada, dark = karanlık temada, deep = üst bant (karanlık).
export const ACCENTS = {
  coral: { label: 'Mercan', light: '#E2574C', dark: '#FB8A7B', deep: '#9F2D24' },
  ocean: { label: 'Turkuaz', light: '#0D9488', dark: '#2DD4BF', deep: '#115E59' },
  sky: { label: 'Gök mavisi', light: '#0284C7', dark: '#38BDF8', deep: '#075985' },
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
    const colors = { ...base, accent: mode === 'dark' ? a.dark : a.light, accentDeep: mode === 'dark' ? a.deep : a.light };
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
