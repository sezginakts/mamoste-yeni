// Hangi mağaza uygulaması? (app.config.js → extra.appVariant)
//   'ogretmen' → Okul (yalnız öğretmen) · 'ogrenci' → Okul Öğrenci (yalnız öğrenci) · 'hepsi' → geliştirme/web, rol seçilir
import Constants from 'expo-constants';

const v = ((Constants.expoConfig && Constants.expoConfig.extra) || {}).appVariant;
export const APP_VARIANT = v === 'ogretmen' || v === 'ogrenci' ? v : 'hepsi';
// Uygulamanın sabit rolü; 'hepsi'de null (ilk açılışta seçilir).
export const FIXED_ROLE = APP_VARIANT === 'ogretmen' ? 'teacher' : APP_VARIANT === 'ogrenci' ? 'student' : null;
