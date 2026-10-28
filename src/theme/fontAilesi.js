// Yazı tipi: uygulama genelinde Manrope kullanılır.
// ESKİYE DÖNMEK İÇİN: YENI_FONT_AKTIF = false yap (hiçbir stil değişmez, sistem yazı tipi geri gelir).
export const YENI_FONT_AKTIF = true;

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

// Font yüklenene kadar kullanılacak yedek (font yüklenmeden metin görünmesin diye App bekler).
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';

export const FONT_YUKLEME = { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_800ExtraBold };
