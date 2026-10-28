// Global yazı tipi: StyleSheet.create ile üretilen TÜM stillere Manrope fontFamily ekler.
// Böylece yüzlerce dosyaya dokunmadan uygulama genelinde Manrope kullanılır.
import { StyleSheet } from 'react-native';
import { agirligaGoreAile } from '../theme/fontAilesi';

function stilIsle(stil) {
  if (!stil || typeof stil !== 'object' || Array.isArray(stil)) return stil;
  const yaziVar = stil.fontSize != null || stil.fontWeight != null || stil.lineHeight != null || stil.letterSpacing != null;
  if (!yaziVar || stil.fontFamily) return stil;
  const { fontWeight, ...geri } = stil;
  return { ...geri, fontFamily: agirligaGoreAile(fontWeight) };
}

function stilleriIsle(kayit) {
  if (!kayit || typeof kayit !== 'object') return kayit;
  const cikti = {};
  for (const [ad, stil] of Object.entries(kayit)) cikti[ad] = stilIsle(stil);
  return cikti;
}

if (!StyleSheet.__fontYamasi) {
  const orijinalCreate = StyleSheet.create.bind(StyleSheet);
  StyleSheet.create = (kayit) => orijinalCreate(stilleriIsle(kayit));
  StyleSheet.__fontYamasi = true;
}
