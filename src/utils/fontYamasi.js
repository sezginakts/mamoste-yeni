// Global yazı tipi yaması: StyleSheet.create ile üretilen TÜM stillere fontFamily ekler.
// Böylece yüzlerce dosyaya dokunmadan uygulama genelinde yazı tipi değişir.
// Kapatmak için: src/theme/fontAilesi.js → YENI_FONT_AKTIF = false (bu dosya hiçbir şey yapmaz).
import { StyleSheet } from 'react-native';
import { YENI_FONT_AKTIF, agirligaGoreAile } from '../theme/fontAilesi';

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

if (YENI_FONT_AKTIF && !StyleSheet.__fontYamasi) {
  const orijinalCreate = StyleSheet.create.bind(StyleSheet);
  StyleSheet.create = (kayit) => orijinalCreate(stilleriIsle(kayit));
  StyleSheet.create = StyleSheet.create;
  StyleSheet.__fontYamasi = true;
}
