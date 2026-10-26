// Hava İstasyonu — 8. sınıf (Fen Bilimleri, İklim ve Hava Hareketleri / Basınç).
// Her senaryo: deniz seviyesinde sıcaklık (°C) ve bağıl nem (%). Yağışın başladığı yükseklik
// çiy noktasına göre hesaplanır (oyun motoru hesaplar): z ≈ (T0 − Td)/6.5 · 1000.
export default {
  zirve: 4000, // metre
  senaryolar: [
    { ad: 'Ilıman kıyı', aciklama: 'Deniz kıyısında ılık ve nemli hava', denizSeviyesi: 22, nem: 75 },
    { ad: 'Sıcak ve nemli gün', aciklama: 'Yaz öğlesi, hava sıcak ve çok nemli', denizSeviyesi: 30, nem: 88 },
    { ad: 'Serin ve kuru hava', aciklama: 'Kuzeyden gelen serin, kuru hava', denizSeviyesi: 14, nem: 52 },
  ],
};
