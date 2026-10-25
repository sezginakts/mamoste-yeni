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
  // Fazla karanlık değil: slate-900 yerine slate-800 aralığı (arka plan ile kartlar ayrışsın).
  bg: '#1C2637',
  bgSoft: '#243044',
  card: '#27344B',
  cardSoft: '#2E3C56',
  border: '#3A4964',
  text: '#F1F5F9',
  textMuted: '#A9B6CA',
  textFaint: '#7C8BA3',
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
  shadowOpacity: 0.3,
};

export const PALETTES = { light: LIGHT, dark: DARK };

// Uygulamada dört renk var: mercan, turkuaz, gök mavisi, fuşya (griler ve beyaz dışında).
export const BRAND = { coral: '#E2574C', ocean: '#0D9488', sky: '#0284C7', fuchsia: '#DB2777' };
export const BRAND_CYCLE = [BRAND.ocean, BRAND.sky, BRAND.coral];
// Sınıf düzeyi rengi SABİT — tema değişse de aynı kalır.
// 8 turkuaz · 7 mercan · 6 mavi · 5 turkuaz · 4 mercan · 3 mavi · 2 turkuaz · 1 mercan
// (kural: 3'e bölümünde kalan 2 → turkuaz, 1 → mercan, 0 → mavi)
export const GRADE_COLORS = {
  1: BRAND.coral,
  2: BRAND.ocean,
  3: BRAND.sky,
  4: BRAND.coral,
  5: BRAND.ocean,
  6: BRAND.sky,
  7: BRAND.coral,
  8: BRAND.ocean,
};
export const gradeColor = (grade) => GRADE_COLORS[+grade] || BRAND_CYCLE[(+grade || 0) % BRAND_CYCLE.length];

// Sınıf kutusu (ana sayfa) ve genel kullanım: düzey rengi. Fuşya burada YOK.
// Anahtar: sınıf adı — boşluk ve tire yok sayılır ("5-C", "5 C", "5C" aynı).
export const CLASS_COLORS = {};
const classKey = (label) => String(label || '').toUpperCase().replace(/[\s-]/g, '');
export const classColorFor = (label) => CLASS_COLORS[classKey(label)] || gradeColor((String(label || '').match(/^\s*(\d{1,2})/) || [])[1]);

// Yalnız DERS PROGRAMI zemininde kullanılan renkler (ana sayfa sınıf kutusunu etkilemez):
// şube bazlı (5C) ve düzey bazlı (2. sınıf) istisnalar.
export const TIMETABLE_COLORS = { '5C': BRAND.fuchsia };
export const TIMETABLE_GRADE_COLORS = { 2: BRAND.fuchsia };
export const timetableColorFor = (label) => {
  const key = classKey(label);
  if (TIMETABLE_COLORS[key]) return TIMETABLE_COLORS[key];
  const grade = +((String(label || '').match(/^\s*(\d{1,2})/) || [])[1]);
  if (TIMETABLE_GRADE_COLORS[grade]) return TIMETABLE_GRADE_COLORS[grade];
  return classColorFor(label);
};
export const GRADE_CYCLE = [BRAND.ocean, BRAND.sky, BRAND.coral];

// Sarı gibi açık zeminlerde beyaz yazı okunmaz. Zemin rengine göre yazı rengi:
// açık zemin → koyu mürekkep, koyu zemin → beyaz.
const srgb = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
export function inkOn(bg) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(bg || ''));
  if (!m) return '#FFFFFF';
  const n = parseInt(m[1], 16);
  const L = 0.2126 * srgb((n >> 16) & 255) + 0.7152 * srgb((n >> 8) & 255) + 0.0722 * srgb(n & 255);
  return L > 0.45 ? '#3B2A00' : '#FFFFFF';
}

// Renk tonlu (açık) zemin üstündeki yazı: koyu renklerde rengin kendisi, sarıda koyu mürekkep.
export function textOnTint(color) {
  return inkOn(color) === '#FFFFFF' ? color : '#3B2A00';
}

// Seçili uygulama rengi ve ona eşlik eden ikinci renk (ThemeContext günceller).
// Tema bağlamı olmayan saf yardımcılar (ünite / sınıf rengi) bunları kullanır.
let accentNow = BRAND.ocean;
let secondNow = BRAND.coral;
export const setAccentNow = (c, second) => {
  accentNow = c;
  if (second) secondNow = second;
};
export const accentColor = () => accentNow;
export const secondColor = () => secondNow;
// Sırayla iki renk: 0 → uygulama rengi, 1 → ikinci renk, 2 → uygulama rengi …
export const pairColor = (i) => (Math.abs(i) % 2 ? secondNow : accentNow);

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
