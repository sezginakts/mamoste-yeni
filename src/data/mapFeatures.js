// TÜRKİYE HARİTASI OYUNU — kategoriler, yerler ve sınıf düzeyine göre zorluk.
// Geometri: akarsu ve büyük göller turkeyMap.js'ten (Natural Earth); diğerleri nokta [boylam, enlem].
// Dağ sıraları (Kuzey Anadolu, Toroslar) ŞEMATİKTİR: kabaca uzanışı gösterir.
//
// tier: 1 = temel (5. sınıf), 2 = 6. sınıf, 3 = 7. sınıf ve tekrar. Üst düzey alt düzeyin yerlerini de içerir.
// Bilgi cümleleri kısa ve kesin tutuldu; emin olunmayan rakam yazılmadı.
import { MAP_BOX, LAKE_PATHS, RIVER_PATHS, PROVINCES } from './turkeyMap';

export const CATEGORIES = [
  { id: 'il', name: 'İller', emoji: '🏙️', color: '#0D9488' },
  { id: 'dag', name: 'Dağlar', emoji: '⛰️', color: '#E2574C' },
  { id: 'akarsu', name: 'Akarsular', emoji: '🌊', color: '#0284C7' },
  { id: 'gol', name: 'Göller', emoji: '💧', color: '#0284C7' },
  { id: 'ova', name: 'Ovalar', emoji: '🌾', color: '#0D9488' },
  { id: 'plato', name: 'Platolar', emoji: '🟫', color: '#E2574C' },
  { id: 'maden', name: 'Madenler ve enerji', emoji: '⛏️', color: '#0284C7' },
  { id: 'ulasim', name: 'Ticaret ve ulaşım', emoji: '🚢', color: '#E2574C' },
];
export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const P = (id, cat, tier, name, at, info) => ({ id, cat, tier, name, kind: 'point', at, info });

// ---- İller: diğer oyunlardan önce öğrenilsin diye ayrı kategori. Plaka kodları resmî numaralar.
const PLATE = 'Adana Adıyaman Afyonkarahisar Ağrı Amasya Ankara Antalya Artvin Aydın Balıkesir Bilecik Bingöl Bitlis Bolu Burdur Bursa Çanakkale Çankırı Çorum Denizli Diyarbakır Edirne Elazığ Erzincan Erzurum Eskişehir Gaziantep Giresun Gümüşhane Hakkari Hatay Isparta Mersin İstanbul İzmir Kars Kastamonu Kayseri Kırklareli Kırşehir Kocaeli Konya Kütahya Malatya Manisa Kahramanmaraş Mardin Muğla Muş Nevşehir Niğde Ordu Rize Sakarya Samsun Siirt Sinop Sivas Tekirdağ Tokat Trabzon Tunceli Şanlıurfa Uşak Van Yozgat Zonguldak Aksaray Bayburt Karaman Kırıkkale Batman Şırnak Bartın Ardahan Iğdır Yalova Karabük Kilis Osmaniye Düzce'.split(' ');
export const PLATE_OF = Object.fromEntries(PLATE.map((n, i) => [n, i + 1]));
// 1: büyük ve kolay tanınan iller (5. sınıf), 2: +25 il (6. sınıf), 3: 81 ilin tamamı.
const IL_T1 = 'İstanbul Ankara İzmir Bursa Antalya Konya Adana Trabzon Samsun Erzurum Van Diyarbakır Gaziantep Kayseri Eskişehir Edirne Sinop Hatay Muğla Mersin'.split(' ');
const IL_T2 = 'Çanakkale Balıkesir Manisa Aydın Denizli Afyonkarahisar Kocaeli Sakarya Zonguldak Kastamonu Ordu Rize Artvin Kars Ağrı Malatya Elazığ Sivas Şanlıurfa Mardin Kahramanmaraş Isparta Tekirdağ Hakkari Nevşehir'.split(' ');
const IL_FEATURES = PROVINCES.map((p) => ({
  id: 'il-' + p.name,
  cat: 'il',
  tier: IL_T1.includes(p.name) ? 1 : IL_T2.includes(p.name) ? 2 : 3,
  name: p.name,
  kind: 'province',
  plate: PLATE_OF[p.name],
  info: `Plaka kodu ${String(PLATE_OF[p.name]).padStart(2, '0')}.`,
}));

export const FEATURES = [
  ...IL_FEATURES,

  // ---- Dağlar
  P('agri', 'dag', 1, 'Ağrı Dağı', [44.3, 39.7], '5137 m. Türkiye’nin en yüksek dağı; Ağrı–Iğdır sınırında, volkanik.'),
  P('erciyes', 'dag', 1, 'Erciyes Dağı', [35.45, 38.53], '3917 m. Kayseri’de sönmüş volkan.'),
  P('uludag', 'dag', 1, 'Uludağ', [29.22, 40.07], '2543 m. Bursa’da; kayak merkezi.'),
  { id: 'kuzeyanadolu', cat: 'dag', tier: 1, name: 'Kuzey Anadolu Dağları', kind: 'range', labelAt: [33.6, 41.0], info: 'Karadeniz kıyısına paralel uzanır; denizden gelen nemi tutar, kıyı çok yağış alır.', line: [[30.4, 40.65], [31.8, 40.95], [33.3, 41.35], [34.8, 41.25], [36.3, 40.85], [37.8, 40.6], [39.3, 40.55], [40.6, 40.75], [41.5, 41.1]] },
  { id: 'toroslar', cat: 'dag', tier: 1, name: 'Toros Dağları', kind: 'range', labelAt: [38.4, 38.0], info: 'Akdeniz kıyısına paralel uzanır; batıda Batı Toroslar, doğuda Güneydoğu Toroslar.', line: [[29.3, 36.8], [30.2, 37.0], [30.7, 37.5], [31.6, 37.2], [32.6, 36.9], [33.8, 37.1], [34.7, 37.35], [35.4, 37.7], [36.6, 37.8], [38.0, 38.1], [39.5, 38.35], [41.0, 38.3], [42.5, 37.8], [44.0, 37.4]] },
  P('kackar', 'dag', 2, 'Kaçkar Dağı', [41.16, 40.83], 'Yaklaşık 3900 m. Doğu Karadeniz’in en yüksek dağı (Rize–Artvin).'),
  P('suphan', 'dag', 2, 'Süphan Dağı', [42.83, 38.93], '4058 m. Van Gölü’nün kuzeyinde; volkanik.'),
  P('kazdagi', 'dag', 2, 'Kaz Dağı', [26.85, 39.7], 'Balıkesir–Çanakkale arasında; yoğun ormanlarıyla bilinir.'),
  P('hasan', 'dag', 3, 'Hasan Dağı', [34.17, 38.13], '3268 m. Aksaray’da; volkanik.'),
  P('nemrut', 'dag', 3, 'Nemrut Dağı (Bitlis)', [42.23, 38.65], 'Tatvan yakınında; tepesinde krater gölü olan volkan.'),
  P('cilo', 'dag', 3, 'Cilo Dağları', [44.0, 37.5], 'Hakkari’de; Türkiye’nin buzullu dağlarından.'),
  P('aladaglar', 'dag', 3, 'Aladağlar', [35.15, 37.83], 'Niğde–Kayseri–Adana arasında; Toroslar’ın yüksek bölümü.'),

  // ---- Akarsular (geometri haritadan)
  { id: 'kizilirmak', cat: 'akarsu', tier: 1, name: 'Kızılırmak', kind: 'river', info: 'Türkiye’de doğup Türkiye’den denize dökülen en uzun akarsu; Karadeniz’e dökülür.' },
  { id: 'firat', cat: 'akarsu', tier: 1, name: 'Fırat', kind: 'river', info: 'Erzurum’dan doğar, Basra Körfezi’ne ulaşır. Keban ve Atatürk barajları üzerindedir.' },
  { id: 'dicle', cat: 'akarsu', tier: 1, name: 'Dicle', kind: 'river', info: 'Güneydoğu Anadolu’dan doğar; Fırat ile birleşip Basra Körfezi’ne dökülür.' },
  { id: 'sakarya', cat: 'akarsu', tier: 1, name: 'Sakarya', kind: 'river', info: 'İç Anadolu’dan doğar, Karadeniz’e dökülür.' },
  { id: 'yesilirmak', cat: 'akarsu', tier: 2, name: 'Yeşilırmak', kind: 'river', info: 'Karadeniz’e dökülür; ağzında Çarşamba Ovası (delta) vardır.' },
  { id: 'buyukmenderes', cat: 'akarsu', tier: 2, name: 'Büyük Menderes', kind: 'river', info: 'Ege Denizi’ne dökülür; büklümlerine “menderes” denir.' },
  { id: 'gediz', cat: 'akarsu', tier: 2, name: 'Gediz', kind: 'river', info: 'Manisa’dan geçer, Ege Denizi’ne dökülür.' },
  { id: 'seyhan', cat: 'akarsu', tier: 2, name: 'Seyhan', kind: 'river', info: 'Akdeniz’e dökülür; Ceyhan ile birlikte Çukurova’yı oluşturur.' },
  { id: 'ceyhan', cat: 'akarsu', tier: 2, name: 'Ceyhan', kind: 'river', info: 'Akdeniz’e dökülür; Seyhan ile birlikte Çukurova’yı oluşturur.' },
  { id: 'coruh', cat: 'akarsu', tier: 2, name: 'Çoruh', kind: 'river', info: 'Bayburt’tan doğar; Gürcistan’da Karadeniz’e dökülür.' },
  { id: 'meric', cat: 'akarsu', tier: 2, name: 'Meriç', kind: 'river', info: 'Türkiye–Yunanistan sınırının bir bölümünü oluşturur; Ege’ye dökülür.' },
  { id: 'aras', cat: 'akarsu', tier: 3, name: 'Aras', kind: 'river', info: 'Erzurum’dan doğar; Kura ile birleşip Hazar Denizi’ne dökülür.' },
  { id: 'susurluk', cat: 'akarsu', tier: 3, name: 'Susurluk', kind: 'river', info: 'Marmara Denizi’ne dökülür.' },
  { id: 'kucukmenderes', cat: 'akarsu', tier: 3, name: 'Küçük Menderes', kind: 'river', info: 'İzmir’den geçip Ege Denizi’ne dökülür.' },
  { id: 'kelkit', cat: 'akarsu', tier: 3, name: 'Kelkit Çayı', kind: 'river', info: 'Yeşilırmak’ın kolu.' },
  { id: 'murat', cat: 'akarsu', tier: 3, name: 'Murat Nehri', kind: 'river', info: 'Fırat’ın kolu.' },
  { id: 'porsuk', cat: 'akarsu', tier: 3, name: 'Porsuk Çayı', kind: 'river', info: 'Sakarya’nın kolu; Eskişehir’den geçer.' },
  { id: 'delice', cat: 'akarsu', tier: 3, name: 'Delice Irmağı', kind: 'river', info: 'Kızılırmak’ın kolu.' },

  // ---- Göller
  { id: 'van', cat: 'gol', tier: 1, name: 'Van Gölü', kind: 'lake', info: 'Türkiye’nin en büyük gölü; suyu sodalıdır.' },
  { id: 'tuz', cat: 'gol', tier: 1, name: 'Tuz Gölü', kind: 'lake', info: 'Türkiye’nin ikinci büyük gölü; tuz üretilir.' },
  { id: 'beysehir', cat: 'gol', tier: 2, name: 'Beyşehir Gölü', kind: 'lake', info: 'Türkiye’nin en büyük tatlı su gölü.' },
  { id: 'egirdir', cat: 'gol', tier: 2, name: 'Eğirdir Gölü', kind: 'lake', info: 'Isparta’da tatlı su gölü.' },
  { id: 'ataturk', cat: 'gol', tier: 2, name: 'Atatürk Baraj Gölü', kind: 'lake', info: 'Fırat üzerinde; Türkiye’nin en büyük baraj gölü.' },
  { id: 'keban', cat: 'gol', tier: 3, name: 'Keban Baraj Gölü', kind: 'lake', info: 'Fırat üzerinde, Elazığ’da baraj gölü.' },
  P('burdur', 'gol', 3, 'Burdur Gölü', [30.17, 37.73], 'Tuzlu (acı) su gölü.'),
  P('sapanca', 'gol', 3, 'Sapanca Gölü', [30.26, 40.72], 'Sakarya’da tatlı su gölü.'),
  P('iznik', 'gol', 3, 'İznik Gölü', [29.53, 40.43], 'Bursa’da tatlı su gölü.'),
  P('manyas', 'gol', 3, 'Kuş (Manyas) Gölü', [27.97, 40.18], 'Balıkesir; kıyısında Kuş Cenneti Millî Parkı.'),
  P('hazar', 'gol', 3, 'Hazar Gölü', [39.42, 38.48], 'Elazığ’da tektonik göl.'),
  P('cildir', 'gol', 3, 'Çıldır Gölü', [43.24, 41.05], 'Ardahan’da; kışın donar.'),

  // ---- Ovalar
  P('cukurova', 'ova', 1, 'Çukurova', [35.3, 36.9], 'Adana; Seyhan ve Ceyhan’ın taşıdığı alüvyonlarla oluşmuş. Pamuk.'),
  P('konya', 'ova', 1, 'Konya Ovası', [32.6, 37.8], 'Türkiye’nin en büyük ovası; buğday.'),
  P('harran', 'ova', 1, 'Harran Ovası', [39.0, 36.9], 'Şanlıurfa; GAP sulamasıyla pamuk.'),
  P('bafra', 'ova', 2, 'Bafra Ovası', [35.9, 41.55], 'Samsun; Kızılırmak deltası.'),
  P('carsamba', 'ova', 2, 'Çarşamba Ovası', [36.7, 41.2], 'Samsun; Yeşilırmak deltası.'),
  P('ergene', 'ova', 2, 'Ergene Ovası', [27.3, 41.3], 'Trakya; ayçiçeği ve buğday.'),
  P('mus', 'ova', 2, 'Muş Ovası', [41.5, 38.85], 'Doğu Anadolu’nun büyük ovalarından.'),
  P('bursaova', 'ova', 3, 'Bursa Ovası', [29.0, 40.2], 'Meyve-sebze tarımı ve sanayi.'),
  P('gedizova', 'ova', 3, 'Gediz Ovası', [27.6, 38.6], 'Manisa; üzüm.'),
  P('menderesova', 'ova', 3, 'Büyük Menderes Ovası', [27.9, 37.85], 'Aydın; incir ve pamuk.'),
  P('amik', 'ova', 3, 'Amik Ovası', [36.4, 36.3], 'Hatay; pamuk.'),
  P('igdir', 'ova', 3, 'Iğdır Ovası', [44.0, 39.95], 'Aras kıyısında; ılıman iklimiyle pamuk ve kayısı.'),
  P('malatya', 'ova', 3, 'Malatya Ovası', [38.3, 38.4], 'Kayısı.'),
  P('erzurumova', 'ova', 3, 'Erzurum Ovası', [41.2, 39.95], 'Doğu Anadolu’da yüksek bir ova.'),

  // ---- Platolar
  P('erzurumkars', 'plato', 1, 'Erzurum–Kars Platosu', [42.5, 40.45], 'Doğu Anadolu; gür çayırlarıyla büyükbaş hayvancılık.'),
  P('haymana', 'plato', 1, 'Haymana Platosu', [32.5, 39.4], 'Ankara’nın güneyi; tahıl ve hayvancılık.'),
  P('gaziantep', 'plato', 2, 'Gaziantep Platosu', [37.4, 37.05], 'Antep fıstığı.'),
  P('cihanbeyli', 'plato', 2, 'Cihanbeyli Platosu', [32.9, 38.65], 'Konya; tahıl.'),
  P('taseli', 'plato', 2, 'Taşeli Platosu', [33.0, 36.6], 'Mersin–Antalya arasında; kalkerli (karstik) arazi.'),
  P('obruk', 'plato', 3, 'Obruk Platosu', [33.2, 38.15], 'Konya; obruk denilen çökme çukurlarıyla bilinir.'),
  P('bozok', 'plato', 3, 'Bozok Platosu', [35.3, 39.6], 'Yozgat; tahıl.'),
  P('uzunyayla', 'plato', 3, 'Uzunyayla Platosu', [36.4, 38.8], 'Kayseri–Sivas; hayvancılık.'),
  P('teke', 'plato', 3, 'Teke Platosu', [30.0, 37.0], 'Antalya; Batı Toroslar üzerinde.'),
  P('ardahan', 'plato', 3, 'Ardahan Platosu', [42.7, 41.1], 'Büyükbaş hayvancılık.'),
  P('yazilikaya', 'plato', 3, 'Yazılıkaya Platosu', [30.6, 39.2], 'Eskişehir–Afyon; Frig Vadisi.'),

  // ---- Madenler ve enerji
  P('zonguldak', 'maden', 1, 'Zonguldak — taşkömürü', [31.8, 41.45], 'Türkiye’nin en önemli taşkömürü havzası.'),
  P('batman', 'maden', 1, 'Batman — petrol', [41.13, 37.88], 'Petrol çıkarılır; rafineri vardır.'),
  P('kirka', 'maden', 1, 'Kırka (Eskişehir) — bor', [30.53, 39.29], 'Türkiye dünyanın en büyük bor rezervine sahiptir.'),
  P('afsin', 'maden', 2, 'Afşin-Elbistan — linyit', [36.9, 38.25], 'Linyitle çalışan termik santraller.'),
  P('soma', 'maden', 2, 'Soma — linyit', [27.6, 39.18], 'Linyit; termik santral.'),
  P('divrigi', 'maden', 2, 'Divriği — demir', [38.12, 39.37], 'Demir cevheri demir-çelik fabrikalarına gider.'),
  P('murgul', 'maden', 2, 'Murgul (Artvin) — bakır', [41.55, 41.27], 'Bakır.'),
  P('guleman', 'maden', 2, 'Guleman (Elazığ) — krom', [39.72, 38.55], 'Krom.'),
  P('seydisehir', 'maden', 2, 'Seydişehir — boksit', [31.85, 37.42], 'Boksitten alüminyum üretilir.'),
  P('emet', 'maden', 3, 'Emet (Kütahya) — bor', [29.26, 39.34], 'Bor.'),
  P('bigadic', 'maden', 3, 'Bigadiç (Balıkesir) — bor', [28.13, 39.39], 'Bor.'),
  P('kure', 'maden', 3, 'Küre (Kastamonu) — bakır', [33.7, 41.8], 'Bakır.'),
  P('ergani', 'maden', 3, 'Maden (Elazığ) — bakır', [39.67, 38.39], 'Bakır.'),
  P('kebanmaden', 'maden', 3, 'Keban — simli kurşun', [38.75, 38.8], 'Gümüş içeren kurşun.'),
  P('balya', 'maden', 3, 'Balya (Balıkesir) — kurşun-çinko', [27.58, 39.75], 'Kurşun ve çinko.'),
  P('mazidagi', 'maden', 3, 'Mazıdağı (Mardin) — fosfat', [40.48, 37.47], 'Fosfat; gübre yapımında kullanılır.'),
  P('adiyaman', 'maden', 3, 'Adıyaman — petrol', [38.28, 37.76], 'Petrol.'),

  // ---- Ticaret ve ulaşım
  P('istanbulbogazi', 'ulasim', 1, 'İstanbul Boğazı', [29.06, 41.12], 'Karadeniz’i Marmara’ya bağlar; dünyanın en işlek su yollarından.'),
  P('canakkalebogazi', 'ulasim', 1, 'Çanakkale Boğazı', [26.4, 40.2], 'Marmara’yı Ege Denizi’ne bağlar.'),
  P('izmirlimani', 'ulasim', 1, 'İzmir Limanı', [27.15, 38.44], 'Ege kıyısında büyük dış ticaret limanı.'),
  P('mersinlimani', 'ulasim', 1, 'Mersin Limanı', [34.64, 36.8], 'Akdeniz’de büyük dış ticaret limanı.'),
  P('ambarli', 'ulasim', 2, 'Ambarlı Limanı (İstanbul)', [28.68, 40.97], 'Marmara’da büyük konteyner limanı.'),
  P('iskenderun', 'ulasim', 2, 'İskenderun Limanı', [36.17, 36.59], 'Hatay; demir-çelik ve dış ticaret limanı.'),
  P('samsunlimani', 'ulasim', 2, 'Samsun Limanı', [36.34, 41.29], 'Karadeniz’in büyük limanlarından.'),
  P('kapikule', 'ulasim', 2, 'Kapıkule Sınır Kapısı', [26.65, 41.72], 'Bulgaristan; Avrupa’ya kara yolu ve demir yolu bağlantısı.'),
  P('habur', 'ulasim', 2, 'Habur Sınır Kapısı', [42.36, 37.15], 'Irak sınır kapısı.'),
  P('isthavalimani', 'ulasim', 2, 'İstanbul Havalimanı', [28.75, 41.26], 'Türkiye’nin en büyük havalimanı.'),
  P('trabzonlimani', 'ulasim', 3, 'Trabzon Limanı', [39.73, 41.0], 'Doğu Karadeniz limanı; İran’a transit ticaret yolu.'),
  P('sarp', 'ulasim', 3, 'Sarp Sınır Kapısı', [41.6, 41.47], 'Gürcistan sınır kapısı.'),
  P('gurbulak', 'ulasim', 3, 'Gürbulak Sınır Kapısı', [44.3, 39.42], 'İran sınır kapısı (Ağrı).'),
  P('cilvegozu', 'ulasim', 3, 'Cilvegözü Sınır Kapısı', [36.65, 36.25], 'Suriye sınır kapısı (Hatay).'),
  P('ipsala', 'ulasim', 3, 'İpsala Sınır Kapısı', [26.37, 40.92], 'Yunanistan sınır kapısı (Edirne).'),
  P('esenboga', 'ulasim', 3, 'Esenboğa Havalimanı (Ankara)', [32.99, 40.13], 'Başkentin havalimanı.'),
  P('btc', 'ulasim', 3, 'Ceyhan petrol terminali', [35.9, 36.87], 'Bakü–Tiflis–Ceyhan boru hattı Akdeniz’e burada ulaşır.'),
  P('btk', 'ulasim', 3, 'Kars — Bakü–Tiflis–Kars demiryolu', [43.1, 40.6], 'Demir yolu Kafkasya’dan Türkiye’ye buradan girer.'),
];

// Sınıf düzeyine göre zorluk.
//  5: yalnızca temel yerler; harita yeri gösterir, öğrenci 3 seçenekten adını bulur (tanıma).
//  6: temel + orta yerler; öğrenci adı verilen yeri haritada bulur, geniş hata payı.
//  7: tüm yerler; haritada bul, 100 km hata payı, 4 seçenek ve çeldiriciler yakındaki yerlerden.
//  İllerde hata payı yok: dokunulan nokta o ilin içinde olmalı.
// 8. sınıfta (İnkılap Tarihi) Türkiye coğrafyası yok; 8. sınıf seçilirse 7. düzey tekrar olarak açılır.
export const MAP_LEVELS = {
  5: { tier: 1, mode: 'which', options: 3, tolKm: 150, questions: 6, near: false, label: 'Kolay', desc: 'Temel yerler · yeri gör, adını seç (3 seçenek)' },
  6: { tier: 2, mode: 'find', options: 3, tolKm: 120, questions: 8, near: false, label: 'Orta', desc: 'Daha çok yer · adı verilen yeri haritada bul (120 km hata payı)' },
  7: { tier: 3, mode: 'find', options: 4, tolKm: 100, questions: 10, near: true, label: 'Zor', desc: 'Tüm yerler · haritada bul (100 km hata payı)' },
};
export const MAP_GRADES = [5, 6, 7];

// ---- Geometri yardımcıları (harita birimi; 1 birim ≈ 1,1 km)
export const KM_PER_UNIT = 1.11;
export const project = ([lon, lat]) => [(lon - MAP_BOX.lon0) * MAP_BOX.k * MAP_BOX.s, (MAP_BOX.lat1 - lat) * MAP_BOX.s];

// "M1 2L3 4Z M…" → [[[x,y],…], …]
export function parsePath(d) {
  return String(d || '')
    .split('M')
    .filter(Boolean)
    .map((part) => part.replace(/Z/g, '').split('L').map((p) => p.trim().split(/\s+/).map(Number)));
}

const shapeCache = {};
// Bir yerin çizim parçaları: { pts: [[x,y]], closed }[]
export function shapesOf(f) {
  if (shapeCache[f.id]) return shapeCache[f.id];
  let out;
  if (f.kind === 'river') out = parsePath(RIVER_PATHS[f.id]).map((pts) => ({ pts, closed: false }));
  else if (f.kind === 'province') out = parsePath((PROVINCES.find((p) => p.name === f.name) || {}).d).map((pts) => ({ pts, closed: true }));
  else if (f.kind === 'lake' && LAKE_PATHS[f.id]) out = parsePath(LAKE_PATHS[f.id]).map((pts) => ({ pts, closed: true }));
  else if (f.kind === 'range') out = [{ pts: f.line.map(project), closed: false }];
  else out = [{ pts: [project(f.at)], closed: false }];
  return (shapeCache[f.id] = out);
}

function segDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function inside(p, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Dokunulan nokta ile yer arasındaki uzaklık (km). Göl içi = 0.
export function distanceKm(f, p) {
  let best = Infinity;
  for (const { pts, closed } of shapesOf(f)) {
    if (closed && inside(p, pts)) return 0;
    if (pts.length === 1) best = Math.min(best, Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]));
    for (let i = 1; i < pts.length; i++) best = Math.min(best, segDist(p, pts[i - 1], pts[i]));
    if (closed && pts.length > 2) best = Math.min(best, segDist(p, pts[pts.length - 1], pts[0]));
  }
  return best * KM_PER_UNIT;
}

const area = (pts) => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;

// Haritada bir noktanın düştüğü il (yoksa null) — yanlış dokunuşta "sen X'e dokundun" demek için.
export function provinceAt(p) {
  const f = IL_FEATURES.find((x) => shapesOf(x).some(({ pts }) => inside(p, pts)));
  return f ? f.name : null;
}

// Bir yerin etiket/odak noktası.
export function anchorOf(f) {
  if (f.labelAt) return project(f.labelAt);
  const shapes = shapesOf(f);
  if (f.kind === 'point') return shapes[0].pts[0];
  const all = shapes.flatMap((s) => s.pts);
  if (f.kind === 'province') {
    // En büyük halkanın alan ağırlıklı merkezi (ada parçaları etiketi kaydırmasın).
    const ring = shapes.reduce((a, b) => (Math.abs(area(b.pts)) > Math.abs(area(a.pts)) ? b : a)).pts;
    let A = 0, cx = 0, cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const c = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      A += c;
      cx += (ring[j][0] + ring[i][0]) * c;
      cy += (ring[j][1] + ring[i][1]) * c;
    }
    const c = A ? [cx / (3 * A), cy / (3 * A)] : ring[0];
    if (inside(c, ring)) return c;
    // Kıvrımlı il (Antalya, Batman): merkez dışarı düşerse il içinde sınırlara en uzak ızgara noktası.
    const xs = ring.map((q) => q[0]);
    const ys = ring.map((q) => q[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    let best = ring[0];
    let bestD = -1;
    for (let i = 1; i < 24; i++) {
      for (let j = 1; j < 24; j++) {
        const q = [x0 + ((x1 - x0) * i) / 24, y0 + ((y1 - y0) * j) / 24];
        if (!inside(q, ring)) continue;
        let d = Infinity;
        for (let k = 0, m = ring.length - 1; k < ring.length; m = k++) d = Math.min(d, segDist(q, ring[m], ring[k]));
        if (d > bestD) (bestD = d), (best = q);
      }
    }
    return best;
  }
  if (f.kind === 'lake') {
    const xs = all.map((p) => p[0]);
    const ys = all.map((p) => p[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  }
  // Çizgi: en uzun parçanın Türkiye kutusu içinde kalan noktalarının ortası
  // (Fırat/Dicle gibi sınır dışına uzananların etiketi Suriye/Irak'a düşmesin).
  const longest = shapes.reduce((a, b) => (b.pts.length > a.pts.length ? b : a));
  const [x0] = project([26, 0]);
  const [x1] = project([44.5, 0]);
  const [, y0] = project([0, 42]);
  const [, y1] = project([0, 37.1]);
  const inTr = longest.pts.filter(([x, y]) => x > x0 && x < x1 && y > y0 && y < y1);
  const pts = inTr.length ? inTr : longest.pts;
  return pts[Math.floor(pts.length / 2)];
}

export const featuresFor = (cat, tier) => FEATURES.filter((f) => f.cat === cat && f.tier <= tier);
