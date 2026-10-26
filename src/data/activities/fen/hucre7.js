// Hücre Fabrikası — 7. sınıf (Fen Bilimleri). Organel → görev bölümü eşleştirmesi.
// bolumler: fabrika bölümleri (düğmeler). organeller: kartta çıkan yapılar (bolum = doğru bölüm kimliği).
export default {
  bolumler: [
    { id: 'yonetim', ad: 'Yönetim Merkezi', gorev: 'DNA ve kalıtım', emoji: '🏢', renk: '#0D9488' },
    { id: 'enerji', ad: 'Enerji Santrali', gorev: 'Enerji üretimi', emoji: '⚡', renk: '#D99A1E' },
    { id: 'uretim', ad: 'Üretim Hattı', gorev: 'Protein sentezi', emoji: '🏭', renk: '#0284C7' },
    { id: 'paketleme', ad: 'Paketleme', gorev: 'Sevkiyat', emoji: '📦', renk: '#E2574C' },
    { id: 'depo', ad: 'Depo', gorev: 'Madde depolama', emoji: '🏬', renk: '#0D9488' },
    { id: 'geri', ad: 'Geri Dönüşüm', gorev: 'Sindirim', emoji: '♻️', renk: '#E2574C' },
    { id: 'guvenlik', ad: 'Güvenlik Kapısı', gorev: 'Giriş-çıkış kontrolü', emoji: '🛡️', renk: '#0284C7' },
  ],
  organeller: [
    { ad: 'Çekirdek', emoji: '🧠', bolum: 'yonetim', aciklama: 'Hücrenin yönetim merkezi; DNA burada bulunur.' },
    { ad: 'Çekirdekçik', emoji: '🧩', bolum: 'yonetim', aciklama: 'Çekirdek içinde ribozom üretiminden sorumludur.' },
    { ad: 'Mitokondri', emoji: '🔋', bolum: 'enerji', aciklama: 'Besinlerdeki enerjiyi hücrenin kullanabileceği enerjiye çevirir.' },
    { ad: 'Kloroplast', emoji: '🌿', bolum: 'enerji', aciklama: 'Fotosentezle güneş enerjisinden besin üretir (bitki hücresi).' },
    { ad: 'Ribozom', emoji: '🧵', bolum: 'uretim', aciklama: 'Protein üretim hattı; amino asitleri birleştirir.' },
    { ad: 'Endoplazmik Retikulum', emoji: '🛤️', bolum: 'uretim', aciklama: 'Madde iletim yolları; protein ve yağ üretimine yardım eder.' },
    { ad: 'Golgi Cisimciği', emoji: '📮', bolum: 'paketleme', aciklama: 'Üretilen maddeleri paketler ve hücre içine/dışına gönderir.' },
    { ad: 'Koful', emoji: '🏺', bolum: 'depo', aciklama: 'Su, besin ve atık maddeleri depolar.' },
    { ad: 'Lizozom', emoji: '🗑️', bolum: 'geri', aciklama: 'Büyük molekülleri ve atıkları parçalar (sindirim).' },
    { ad: 'Peroksizom', emoji: '🧪', bolum: 'geri', aciklama: 'Zararlı maddeleri etkisiz hale getirir; zehri parçalar.' },
    { ad: 'Hücre Zarı', emoji: '🚪', bolum: 'guvenlik', aciklama: 'Hücreye madde giriş-çıkışını seçerek kontrol eder.' },
    { ad: 'Hücre Duvarı', emoji: '🧱', bolum: 'guvenlik', aciklama: 'Bitki hücresini dıştan sarar, korur ve şekil verir.' },
    { ad: 'Sitoplazma', emoji: '🌊', bolum: 'uretim', aciklama: 'Organellerin içinde bulunduğu, tepkimelerin geçtiği sıvı ortam.' },
    { ad: 'Sentriyol', emoji: '🎯', bolum: 'uretim', aciklama: 'Hücre bölünmesinde iğ ipliklerinin oluşumuna yardım eder.' },
  ],
};
