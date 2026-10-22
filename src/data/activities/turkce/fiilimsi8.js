// Fiilimsi Kovası · 8. sınıf · Fiilimsiler
// Her satır: [cümle (hedef kelime *yıldız* içinde), tür, kelimenin bölünüşü, açıklama]
//   tür: 'isim' (isim-fiil) · 'sifat' (sıfat-fiil) · 'zarf' (zarf-fiil) · 'degil' (fiilimsi değil)
//   bölünüş: kök/gövde | fiilimsi eki | (varsa) diğer ekler — birleşince hedef kelimeyi vermeli.
//   "degil" için bölünüş yalnız gösterim içindir (ek bonusu sorulmaz).
export default [
  // İsim-fiil: -mak/-mek, -ma/-me, -ış/-iş
  ["Her sabah kitap *okumak* insanı geliştirir.", "isim", "oku|mak", "-mak isim-fiil eki: eylemin adı olmuş (kitap okumak)."],
  ["Bu yaz *yüzmeyi* öğrendim.", "isim", "yüz|me|yi", "-me isim-fiil eki (+yi hâl eki). Neyi öğrendim? → yüzmeyi."],
  ["Onun *gülüşü* hepimizi neşelendirdi.", "isim", "gül|üş|ü", "-üş isim-fiil eki: gülme eyleminin adı."],
  ["Sabah erken *kalkmak* bana zor geliyor.", "isim", "kalk|mak", "-mak isim-fiil eki: eylemin adı."],
  ["Kardeşim resim *yapmayı* çok sever.", "isim", "yap|ma|yı", "-ma isim-fiil eki (+yı). Neyi sever? → resim yapmayı."],
  ["Hafta sonu *gezmek* için sabırsızlanıyoruz.", "isim", "gez|mek", "-mek isim-fiil eki; \"için\" edatıyla kullanılmış."],
  ["Annemin bize *kızması* çok normaldi.", "isim", "kız|ma|sı", "-ma isim-fiil eki (+sı iyelik eki)."],
  ["Ali'nin *koşuşu* herkesi şaşırttı.", "isim", "koş|uş|u", "-uş isim-fiil eki: koşma eyleminin adı."],
  ["Ödevleri zamanında *bitirmek* önemlidir.", "isim", "bitir|mek", "-mek isim-fiil eki: eylemin adı."],
  ["Seni *beklemekten* yoruldum.", "isim", "bekle|mek|ten", "-mek isim-fiil eki (+ten hâl eki)."],
  ["Bu soruyu *çözmek* için çok uğraştım.", "isim", "çöz|mek", "-mek isim-fiil eki; \"için\" edatıyla kullanılmış."],
  // Sıfat-fiil: -an/-en, -ası/-esi, -maz/-mez, -ar/-er, -dık/-dik, -acak/-ecek, -mış/-miş
  ["*Koşan* çocuk birden düştü.", "sifat", "koş|an", "-an sıfat-fiil eki; \"çocuk\" ismini niteliyor (nasıl çocuk?)."],
  ["Akşam *gelecek* misafirler için börek yaptık.", "sifat", "gel|ecek", "-ecek sıfat-fiil eki; \"misafirler\" ismini niteliyor."],
  ["Bu, mutlaka *okunası* bir kitap.", "sifat", "okun|ası", "-ası sıfat-fiil eki; \"kitap\" ismini niteliyor."],
  ["*Pişmiş* aşa su katılmaz.", "sifat", "piş|miş", "-miş sıfat-fiil eki; \"aş\" ismini niteliyor."],
  ["*Akar* suyun sesi insanı dinlendirir.", "sifat", "ak|ar", "-ar sıfat-fiil eki; \"su\" ismini niteliyor."],
  ["Dışarıda *çekilmez* bir sıcak vardı.", "sifat", "çekil|mez", "-mez sıfat-fiil eki; \"sıcak\" ismini niteliyor."],
  ["*Bildiğim* yolları bile karıştırdım.", "sifat", "bil|diğim", "-dik sıfat-fiil eki (+im); \"yollar\" ismini niteliyor."],
  ["Yere *düşen* yaprakları topladık.", "sifat", "düş|en", "-en sıfat-fiil eki; \"yapraklar\" ismini niteliyor."],
  ["Sınıfa *giren* öğretmeni ayakta karşıladık.", "sifat", "gir|en", "-en sıfat-fiil eki; \"öğretmen\" ismini niteliyor."],
  ["*Okunacak* kitapları masaya koydum.", "sifat", "okun|acak", "-acak sıfat-fiil eki; \"kitaplar\" ismini niteliyor."],
  ["*Gülen* yüzünü hiç unutmayacağım.", "sifat", "gül|en", "-en sıfat-fiil eki; \"yüz\" ismini niteliyor."],
  ["*Okuyanlar* sınavı kolayca geçti.", "sifat", "oku|yan|lar", "-(y)an sıfat-fiil eki; nitelediği isim düştüğü için adlaşmış sıfat-fiil (okuyan kişiler)."],
  // Zarf-fiil: -ıp, -arak, -ınca, -ken, -madan, -dıkça, -alı, -casına
  ["Okula *gelince* beni ara.", "zarf", "gel|ince", "-ince zarf-fiil eki; \"ara\" eylemini zaman yönünden belirtiyor."],
  ["Çocuklar *koşarak* bahçeye çıktı.", "zarf", "koş|arak", "-arak zarf-fiil eki; çıkma eyleminin nasıl yapıldığını anlatıyor."],
  ["Ders *çalışırken* müzik dinlemem.", "zarf", "çalış|ırken", "-ken zarf-fiil eki (-ır + -ken); zaman bildiriyor."],
  ["Kapıyı *açıp* içeri girdi.", "zarf", "aç|ıp", "-ıp zarf-fiil eki; iki eylemi birbirine bağlıyor."],
  ["*Düşünmeden* konuşmamalıyız.", "zarf", "düşün|meden", "-meden zarf-fiil eki; konuşma eyleminin nasıl yapılacağını belirtiyor."],
  ["Kitap *okudukça* kelime hazinem genişliyor.", "zarf", "oku|dukça", "-dukça zarf-fiil eki; genişleme eylemini belirtiyor."],
  ["Seni *göreli* çok oldu.", "zarf", "gör|eli", "-eli zarf-fiil eki; zaman bildiriyor."],
  ["Yağmur *yağınca* içeri girdik.", "zarf", "yağ|ınca", "-ınca zarf-fiil eki; zaman bildiriyor."],
  ["Ödevini *bitirince* oyuna başladı.", "zarf", "bitir|ince", "-ince zarf-fiil eki; zaman bildiriyor."],
  ["Bize *bakarak* gülümsedi.", "zarf", "bak|arak", "-arak zarf-fiil eki; gülümseme eyleminin nasıl olduğunu anlatıyor."],
  ["Annem *bağırırcasına* konuşuyordu.", "zarf", "bağır|ırcasına", "-casına zarf-fiil eki (-ır + -casına); konuşmanın nasıl olduğunu anlatıyor."],
  ["Sınav *bitmeden* kimse dışarı çıkmasın.", "zarf", "bit|meden", "-meden zarf-fiil eki; zaman bildiriyor."],
  // Fiilimsi değil: çekimli fiil, olumsuz emir, kalıcı isim, yapım eki
  ["Kapıyı *açma*, içerisi soğuk.", "degil", "aç|ma", "Buradaki -ma olumsuzluk ekidir; \"açma\" emir kipinde çekimli bir fiil (yüklem)."],
  ["Yolda *dondurma* aldık.", "degil", "dondur|ma", "Kalıcı isim: \"dondurma\" artık bir yiyeceğin adı."],
  ["Masadaki *kırık* bardağı attım.", "degil", "kır|ık", "-ık fiilden sıfat yapan yapım eki; fiilimsi eki değil."],
  ["*Çakmak* çekmecede duruyordu.", "degil", "çak|mak", "Kalıcı isim: \"çakmak\" bir eşyanın adı."],
  ["Bütün ödevlerini çoktan *bitirmişti*.", "degil", "bitir|mişti", "-miş burada zaman ekidir; \"bitirmişti\" çekimli fiil (yüklem)."],
  ["*Gelecek* için şimdiden plan yapmalıyız.", "degil", "gel|ecek", "Kalıcı isim: \"gelecek\" burada \"istikbal\" anlamında bir isim."],
  ["Babam *yazar* olmak istermiş.", "degil", "yaz|ar", "Kalıcı isim: \"yazar\" bir meslek adı."],
  ["Bu soruyu bana *çözer* misin?", "degil", "çöz|er", "-er burada geniş zaman ekidir; \"çözer misin\" çekimli fiil."],
  ["Annem akşam için *dolma* yaptı.", "degil", "dol|ma", "Kalıcı isim: \"dolma\" bir yemeğin adı."],
  ["Akşam *yemeği* hazır.", "degil", "ye|meği", "Kalıcı isim: \"yemek\" burada öğün anlamında bir isim."],
  ["Bir *tanıdık* bize yol gösterdi.", "degil", "tanı|dık", "Kalıcı isim: \"tanıdık\" bilinen kişi anlamında bir isim."],
  ["Kardeşim şu an *uyuyor*.", "degil", "uyu|yor", "-yor şimdiki zaman eki; \"uyuyor\" çekimli fiil."],
];
