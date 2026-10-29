// Tek kod, iki mağaza uygulaması. APP_VARIANT ortam değişkeni (eas.json profilleri ayarlar):
//   ogretmen → "Okul": yalnız öğretmen (paket com.ingapp.cumle — mevcut kimlik)
//   ogrenci  → "Okul Öğrenci": yalnız öğrenci (paket com.ingapp.ogrenci — ayrı uygulama)
// Değişken yoksa (npm start, npm run web) ikisi bir arada: ilk açılışta rol seçilir. Geliştirme ve
// iki sekmeli web testi (localhost = öğretmen, 127.0.0.1 = öğrenci) böyle çalışır.
// İki uygulama da aynı Supabase sunucusuna ve aynı Expo projesine (bildirimler) bağlıdır.
module.exports = ({ config }) => {
  const v = process.env.APP_VARIANT;
  const variant = v === 'ogretmen' || v === 'ogrenci' ? v : 'hepsi';
  const extra = { ...config.extra, appVariant: variant };
  if (variant !== 'ogrenci') return { ...config, extra };
  return {
    ...config,
    name: 'Okul Öğrenci',
    scheme: 'okulogrenci',
    ios: { ...config.ios, bundleIdentifier: 'com.ingapp.ogrenci' },
    android: { ...config.android, package: 'com.ingapp.ogrenci' },
    extra,
  };
};
