// Uygulama yazı tipi: Manrope (tek ve kalıcı). Eski sistem yazı tipi kaldırıldı.
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';

export const AİLE = {
  regular: 'Manrope_400Regular',
  orta: 'Manrope_500Medium',
  yari: 'Manrope_600SemiBold',
  koyu: 'Manrope_800ExtraBold',
};

// fontWeight → Manrope ailesi (özel yazı tipiyle birlikte fontWeight KULLANILMAZ;
// iOS'ta sahte kalınlaştırma yapıp görünümü bozuyor).
export function agirligaGoreAile(weight) {
  const w = String(weight == null ? '' : weight);
  if (w === 'bold' || +w >= 700) return AİLE.koyu;
  if (+w >= 500) return AİLE.yari;
  return AİLE.regular;
}

// Açılışta yüklenen font dosyaları (yüklenene kadar uygulama bekler).
export const FONT_YUKLEME = { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_800ExtraBold };
