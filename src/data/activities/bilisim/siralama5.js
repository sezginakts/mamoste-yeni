// Algoritma Sırası · Bilişim Teknolojileri 5. sınıf
// Her görev: karışık gelen adımlar doğru sıraya dizilir.
export default {
  gorevler: [
    {
      ad: 'Bilgisayarı aç',
      emoji: '💻',
      adimlar: ['Fişi prize tak', 'Güç düğmesine bas', 'Şifreyi yaz', 'Masaüstünü gör'],
    },
    {
      ad: 'Dosyayı kaydet',
      emoji: '💾',
      adimlar: ['Dosya menüsünü aç', '“Farklı kaydet”e bas', 'Kayıt yerini (klasörü) seç', 'Dosya adını yaz', 'Kaydet’e bas'],
    },
    {
      ad: 'E-posta gönder',
      emoji: '📧',
      adimlar: ['Yeni iletiye bas', 'Alıcının adresini yaz', 'Konuyu yaz', 'İletiyi yaz', 'Gönder’e bas'],
    },
    {
      ad: 'Metni kopyala–yapıştır',
      emoji: '📋',
      adimlar: ['Metni seç', 'Ctrl + C (kopyala)', 'İmleci istediğin yere koy', 'Ctrl + V (yapıştır)'],
    },
    {
      ad: 'Yazıcıdan çıktı al',
      emoji: '🖨️',
      adimlar: ['Belgeyi aç', 'Yazdır’ı seç', 'Yazıcıyı seç', 'Yazdır’a bas'],
    },
    {
      ad: 'Çay demle (algoritma örneği)',
      emoji: '🍵',
      adimlar: ['Suyu kaynat', 'Çayı demliğe koy', 'Kaynar suyu ekle', '5 dakika bekle', 'Bardaklara servis yap'],
    },
    {
      ad: 'Bilgisayarı güvenle kapat',
      emoji: '🔌',
      adimlar: ['Çalışmaları kaydet', 'Tüm programları kapat', 'Başlat menüsünden “Kapat”ı seç', 'Ekranın kapanmasını bekle'],
    },
    {
      ad: 'Çay demle (resimli algoritma)',
      emoji: '🍵',
      resimli: true,
      adimlar: [
        { e: '🚰', t: 'Çaydanlığa su koy' },
        { e: '🔥', t: 'Suyu kaynat' },
        { e: '🍃', t: 'Demliğe çay koy' },
        { e: '💧', t: 'Kaynar suyu demliğe dök' },
        { e: '⏳', t: '5 dakika demle' },
        { e: '🫖', t: 'Bardaklara servis yap' },
      ],
    },
  ],
};
