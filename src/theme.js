// Uygulama genelinde tutarlı renk, boşluk ve tipografi.
// İki palet: light (aydınlık) ve dark (karanlık). Aktif palet ThemeContext'ten gelir.

export const LIGHT = {
  bg: '#F1F5F9',
  bgSoft: '#E8EEF5',
  card: '#FFFFFF',
  cardSoft: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  primary: '#0D9488',
  primaryDark: '#0F766E',
  onPrimary: '#FFFFFF',
  accent: '#0284C7',
  danger: '#E2574C',
  warning: '#E2574C',
  gold: '#E2574C',
  white: '#FFFFFF',
  successSoft: '#D5F2EE',
  dangerSoft: '#FBE1DD',
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
};

export const DARK = {
  bg: '#0F172A',
  bgSoft: '#1E293B',
  card: '#1E293B',
  cardSoft: '#273449',
  border: '#334155',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textFaint: '#64748B',
  primary: '#2DD4BF',
  primaryDark: '#0D9488',
  onPrimary: '#042F2B',
  accent: '#38BDF8',
  danger: '#FB8A7B',
  warning: '#FB8A7B',
  gold: '#FB8A7B',
  white: '#FFFFFF',
  successSoft: '#0B3B37',
  dangerSoft: '#3D1A16',
  shadowColor: '#000000',
  shadowOpacity: 0.25,
};

export const PALETTES = { light: LIGHT, dark: DARK };

// Uygulamada yalnız üç renk var: mercan, turkuaz, gök mavisi (griler ve beyaz dışında).
export const BRAND = { coral: '#E2574C', ocean: '#0D9488', sky: '#0284C7' };
export const BRAND_CYCLE = [BRAND.ocean, BRAND.sky, BRAND.coral];
// Sınıf düzeyleri için dördüncü renk (yalnız sınıf etiketlerinde): üç renge uyan kehribar.
export const AMBER = '#D99A1E';
// 5 kehribar, 6 gök mavisi, 7 mercan, 8 turkuaz; diğer düzeyler bu sırayla döner.
export const GRADE_CYCLE = [AMBER, BRAND.sky, BRAND.coral, BRAND.ocean];

// Seçili uygulama rengi (ThemeContext günceller). Tema bağlamı olmayan saf yardımcılar (ünite / sınıf rengi) bunu kullanır.
let accentNow = BRAND.ocean;
export const setAccentNow = (c) => {
  accentNow = c;
};
export const accentColor = () => accentNow;

// Varsayılan/yedek palet — modül seviyesinde colors importu için (statik referanslar).
export const colors = LIGHT;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 };
export const font = { h1: 32, h2: 24, h3: 20, body: 16, small: 14, tiny: 12 };

// Palete göre gölge üretir (karanlıkta daha belirgin).
export function makeShadow(c) {
  return {
    shadowColor: c.shadowColor || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: c.shadowOpacity ?? 0.1,
    shadowRadius: 8,
    elevation: 2,
  };
}

// Geriye dönük statik gölge (light).
export const shadow = makeShadow(LIGHT);
