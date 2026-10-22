// Hikâye Zinciri · Türkçe (5-8. sınıf) — yaratıcı yazma.
// baslangiclar: hikâyenin ilk cümlesi (tür, emoji, başlık önerisi, cümle)
// kelimeler: her türün kelime makarası (takım cümlesinde bu kelimeyi kullanır; ek alabilir)
// gorevler: sınıfa göre dil görevleri (öğretmen "yapıldı" der) — ortak + sınıf düzeyine özel
export default {
  baslangiclar: [
    { tur: 'macera', emoji: '🏝️', baslik: 'Issız Ada', cumle: 'Gemi kayalıklara çarptığında güneş yeni doğuyordu ve Deniz kendini bilmediği bir adanın kumsalında buldu.' },
    { tur: 'macera', emoji: '🗺️', baslik: 'Dedemin Haritası', cumle: 'Tavan arasındaki sandığı açtığımda, sararmış bir haritanın üzerinde kırmızı bir çarpı işareti gördüm.' },
    { tur: 'macera', emoji: '⛰️', baslik: 'Kayıp Patika', cumle: 'Sis o kadar yoğundu ki Ece, arkadaşlarının sesini artık duyamıyordu.' },
    { tur: 'gizem', emoji: '🕰️', baslik: 'Durmuş Saat', cumle: 'Okulun koridorundaki eski saat tam on ikiyi gösterdiği anda durdu ve bütün ışıklar söndü.' },
    { tur: 'gizem', emoji: '✉️', baslik: 'İsimsiz Mektup', cumle: 'Sabah kapının önünde, üzerinde yalnızca benim adımın yazılı olduğu bir zarf duruyordu.' },
    { tur: 'gizem', emoji: '🐾', baslik: 'Gece Yarısı Ayak Sesleri', cumle: 'Herkes uyuduktan sonra mutfaktan gelen tıkırtılar yine başladı.' },
    { tur: 'komik', emoji: '🦜', baslik: 'Konuşan Papağan', cumle: 'Teyzemin papağanı, misafirlerin önünde bütün sırlarımızı tek tek anlatmaya başladı.' },
    { tur: 'komik', emoji: '🎂', baslik: 'Uçan Pasta', cumle: 'Doğum günü pastası masaya geldiği anda kardeşimin hapşırığı her şeyi değiştirdi.' },
    { tur: 'komik', emoji: '🐧', baslik: 'Sınıftaki Penguen', cumle: 'Pazartesi sabahı sınıfa girdiğimizde öğretmenin masasında bir penguen oturuyordu.' },
    { tur: 'bilimkurgu', emoji: '🚀', baslik: 'Yanlış Gezegen', cumle: 'Uzay gemisinin ekranında kırmızı bir uyarı yanıp sönüyordu: Rota hatalı!' },
    { tur: 'bilimkurgu', emoji: '🤖', baslik: 'Robot Arkadaşım', cumle: 'Bilim fuarı için yaptığım robot, gece yarısı kendi kendine konuşmaya başladı.' },
    { tur: 'bilimkurgu', emoji: '⏳', baslik: 'Zaman Makinesi', cumle: 'Düğmeye bastığımda laboratuvar dönmeye başladı ve kendimi yüz yıl önceki İstanbul\'da buldum.' },
    { tur: 'masal', emoji: '🐉', baslik: 'Uyuyan Ejderha', cumle: 'Bir varmış bir yokmuş, yüksek bir dağın tepesinde yüz yıldır uyuyan bir ejderha varmış.' },
    { tur: 'masal', emoji: '🍎', baslik: 'Altın Elma', cumle: 'Evvel zaman içinde, padişahın bahçesindeki altın elma ağacından her gece bir elma kaybolurmuş.' },
    { tur: 'masal', emoji: '🧚', baslik: 'Küçük Peri', cumle: 'Çok eski zamanlarda, bir çeşmenin başında avuç içi kadar küçük bir peri yaşarmış.' },
  ],
  kelimeler: {
    macera: ['harita', 'mağara', 'pusula', 'fırtına', 'köprü', 'sandık', 'ayak izi', 'gemi', 'orman', 'halat', 'fener', 'şelale', 'kartal', 'anahtar', 'kayık', 'uçurum', 'ateş', 'sırt çantası', 'yıldız', 'sis'],
    gizem: ['mektup', 'gölge', 'saat', 'kilit', 'fısıltı', 'merdiven', 'ayna', 'şifre', 'perde', 'dedektif', 'büyüteç', 'tavan arası', 'fotoğraf', 'çıtırtı', 'gece yarısı', 'kedi', 'ayak sesi', 'günlük', 'mum', 'kapı'],
    komik: ['pijama', 'muz kabuğu', 'papağan', 'pasta', 'şemsiye', 'hapşırık', 'penguen', 'çorap', 'balon', 'dondurma', 'kahkaha', 'makarna', 'peruk', 'kurbağa', 'bisiklet', 'horoz', 'tencere', 'hıçkırık', 'kek', 'ördek'],
    bilimkurgu: ['robot', 'uzay gemisi', 'gezegen', 'ışınlanma', 'zaman makinesi', 'uzaylı', 'ekran', 'sinyal', 'ay', 'yer çekimi', 'kask', 'buz', 'düğme', 'hologram', 'meteor', 'laboratuvar', 'şifre', 'kristal', 'kapsül', 'yörünge'],
    masal: ['ejderha', 'sihirli değnek', 'saray', 'cüce', 'prenses', 'kuyu', 'altın elma', 'dev', 'peri', 'kurbağa', 'kale', 'büyü', 'orman', 'yaşlı kadın', 'padişah', 'kırk gün', 'dağ', 'çeşme', 'kuş', 'yüzük'],
  },
  gorevler: {
    ortak: [
      'Bir renk sözcüğü kullan.',
      'Bir yansıma sözcüğü kullan (şırıl şırıl, gürül gürül…).',
      'Bir duyguyu anlat (korku, sevinç, merak…).',
      'Bir soru cümlesi yaz.',
      'Bir ünlem cümlesi yaz (!).',
      'Bir konuşma ekle (tırnak ya da konuşma çizgisiyle).',
      'Zaman bildiren bir söz kullan (ertesi gün, o sırada…).',
      'Bir koku, ses ya da tat betimle.',
    ],
    5: ['Bir sıfat kullan.', 'Zıt anlamlı iki kelime kullan.', 'Bir ikileme kullan (yavaş yavaş, koşa koşa…).'],
    6: ['Bir sıfat kullan.', 'Bir ikileme kullan (yavaş yavaş, koşa koşa…).', 'Bir zamir kullan (o, onlar, bu…).'],
    7: ['Bir zarf kullan.', 'Bir deyim kullan.', 'Bir benzetme yap (gibi, kadar…).'],
    8: ['Bir fiilimsi kullan.', 'Bir deyim kullan.', 'Bir benzetme yap (gibi, kadar…).', 'Bir atasözü kullan.'],
  },
};
