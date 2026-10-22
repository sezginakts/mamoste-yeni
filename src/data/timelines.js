// ZAMAN ŞERİDİ — akıllı tahta etkinliği için olay setleri ve sınıf düzeyine göre zorluk.
//
// Her olay: { e: olay, i: kart görseli (emoji), d: tarih (yalnızca kontrolden sonra görünür), v: sıralama değeri }
//   kind 'year' → v = yıl (MÖ eksi)      ör. MÖ 3200 → -3200
//   kind 'date' → v = yyyymmdd            ör. 29 Ekim 1923 → 19231029
//   kind 'day'  → v = aaGG (yıl içi gün)  ör. 23 Nisan → 423
// Tarihi tartışmalı/yaklaşık olaylar "~" ile yazılır ve komşusundan çok uzak tutulur ki sıra tartışmalı olmasın.
// Aynı değere sahip iki olay aynı sete konmaz (sıra belirsiz kalır).
//
// color: uygulamanın üç renginden biri (mercan, gök mavisi, turkuaz; theme.js → BRAND).
// grades: setin önerildiği sınıf düzeyleri (seçimde öne çıkar, diğer düzeylerde de açılabilir).

export const TIMELINE_SETS = [
  {
    id: 'gunler',
    color: '#E2574C',
    title: 'Bir yılın önemli günleri',
    emoji: '🗓️',
    grades: [5],
    kind: 'day',
    note: 'Yıl içinde sıralama: ay ve gün bilgisini kullanma.',
    items: [
      { e: 'Çanakkale Zaferi ve Şehitleri Anma Günü', i: '⚓', d: '18 Mart', v: 318 },
      { e: 'Ulusal Egemenlik ve Çocuk Bayramı', i: '🎈', d: '23 Nisan', v: 423 },
      { e: 'Atatürk’ü Anma, Gençlik ve Spor Bayramı', i: '🏃', d: '19 Mayıs', v: 519 },
      { e: 'Demokrasi ve Millî Birlik Günü', i: '🤝', d: '15 Temmuz', v: 715 },
      { e: 'Zafer Bayramı', i: '🏆', d: '30 Ağustos', v: 830 },
      { e: 'Cumhuriyet Bayramı', i: '🇹🇷', d: '29 Ekim', v: 1029 },
      { e: 'Atatürk’ü Anma Günü', i: '🕯️', d: '10 Kasım', v: 1110 },
      { e: 'Öğretmenler Günü', i: '👩‍🏫', d: '24 Kasım', v: 1124 },
    ],
  },
  {
    id: 'icatlar',
    color: '#0284C7',
    title: 'Yazıdan internete',
    emoji: '💡',
    grades: [5, 6],
    kind: 'year',
    note: 'İletişim ve ulaşımdaki büyük adımlar; MÖ ile MS’yi ayırma.',
    items: [
      { e: 'Sümerler yazıyı kullanmaya başladı', i: '📜', d: 'MÖ ~3200', v: -3200 },
      { e: 'Gutenberg matbaası', i: '📖', d: '~1450', v: 1450 },
      { e: 'Telefonun icadı (Bell)', i: '☎️', d: '1876', v: 1876 },
      { e: 'İlk motorlu uçak uçuşu (Wright Kardeşler)', i: '✈️', d: '1903', v: 1903 },
      { e: 'Türkiye’de ilk televizyon yayını', i: '📺', d: '1968', v: 1968 },
      { e: 'İnsan ilk kez Ay’a ayak bastı', i: '🚀', d: '1969', v: 1969 },
      { e: 'Türkiye internete bağlandı', i: '🌐', d: '1993', v: 1993 },
    ],
  },
  {
    id: 'anadolu',
    color: '#0D9488',
    title: 'Anadolu’nun ilk izleri',
    emoji: '🏺',
    grades: [5, 6],
    kind: 'year',
    note: 'Anadolu ve Mezopotamya’da ilk yerleşmeler ve medeniyetler.',
    items: [
      { e: 'Göbeklitepe’nin yapılmaya başlanması', i: '🗿', d: 'MÖ ~9600', v: -9600 },
      { e: 'Çatalhöyük’te yerleşik hayat', i: '🏘️', d: 'MÖ ~7400', v: -7400 },
      { e: 'Sümerlerde yazının bulunuşu', i: '📜', d: 'MÖ ~3200', v: -3200 },
      { e: 'Mısırlılar ile Hititler arasında Kadeş Antlaşması', i: '🕊️', d: 'MÖ ~1259', v: -1259 },
      { e: 'Lidyalılar parayı kullanmaya başladı', i: '💰', d: 'MÖ 7. yüzyıl', v: -650 },
      { e: 'Miladi takvimin başlangıcı', i: '📅', d: 'MS 1', v: 1 },
    ],
  },
  {
    id: 'turk',
    color: '#E2574C',
    title: 'İlk Türk devletleri ve Türk-İslam tarihi',
    emoji: '🏹',
    grades: [6, 7],
    kind: 'year',
    note: 'MÖ-MS geçişi, yüzyıl hesabı, birbirine yakın tarihler.',
    items: [
      { e: 'Asya Hun Devleti’nin güçlenmesi (Mete Han)', i: '🏹', d: 'MÖ 209', v: -209 },
      { e: 'Göktürk Devleti’nin kuruluşu', i: '🐺', d: '552', v: 552 },
      { e: 'Hicret', i: '🐪', d: '622', v: 622 },
      { e: 'Kül Tigin Yazıtı’nın dikilmesi', i: '✍️', d: '732', v: 732 },
      { e: 'Talas Savaşı', i: '⚔️', d: '751', v: 751 },
      { e: 'Dandanakan Savaşı', i: '🛡️', d: '1040', v: 1040 },
      { e: 'Kutadgu Bilig’in yazılması', i: '📖', d: '1069', v: 1069 },
      { e: 'Malazgirt Meydan Muharebesi', i: '🐎', d: '1071', v: 1071 },
      { e: 'Miryokefalon Savaşı', i: '🗡️', d: '1176', v: 1176 },
      { e: 'Kösedağ Savaşı', i: '⛰️', d: '1243', v: 1243 },
    ],
  },
  {
    id: 'osmanli',
    color: '#0284C7',
    title: 'Beylikten dünya gücüne Osmanlı',
    emoji: '🏰',
    grades: [7],
    kind: 'year',
    note: 'Kuruluş ve yükselme dönemi; yüzyıllara göre gruplama.',
    items: [
      { e: 'Osmanlı Beyliği’nin kuruluşu', i: '🌱', d: '1299', v: 1299 },
      { e: 'Bursa’nın fethi', i: '🕌', d: '1326', v: 1326 },
      { e: 'Rumeli’ye geçiş (Çimpe Kalesi)', i: '⛵', d: '1353', v: 1353 },
      { e: 'I. Kosova Savaşı', i: '⚔️', d: '1389', v: 1389 },
      { e: 'Ankara Savaşı', i: '🐘', d: '1402', v: 1402 },
      { e: 'İstanbul’un fethi', i: '🏰', d: '1453', v: 1453 },
      { e: 'Çaldıran Savaşı', i: '🐎', d: '1514', v: 1514 },
      { e: 'Mohaç Meydan Muharebesi', i: '🛡️', d: '1526', v: 1526 },
      { e: 'Preveze Deniz Savaşı', i: '⚓', d: '1538', v: 1538 },
      { e: 'II. Viyana Kuşatması', i: '🧱', d: '1683', v: 1683 },
      { e: 'Karlofça Antlaşması', i: '📜', d: '1699', v: 1699 },
    ],
  },
  {
    id: 'avrupa',
    color: '#0D9488',
    title: 'Avrupa’da değişim, Osmanlı’da yenileşme',
    emoji: '🌍',
    grades: [7],
    kind: 'year',
    note: 'Dünyada ve Osmanlı’da aynı dönemde olanları ilişkilendirme.',
    items: [
      { e: 'İstanbul’un fethi', i: '🏰', d: '1453', v: 1453 },
      { e: 'Ümit Burnu’na ulaşıldı (B. Dias)', i: '🧭', d: '1488', v: 1488 },
      { e: 'Kolomb Amerika kıtasına ulaştı', i: '⛵', d: '1492', v: 1492 },
      { e: 'Hindistan deniz yolu (Vasco da Gama)', i: '🗺️', d: '1498', v: 1498 },
      { e: 'Luther’in 95 Tezi (Reform)', i: '⛪', d: '1517', v: 1517 },
      { e: 'İbrahim Müteferrika matbaasına izin', i: '📖', d: '1727', v: 1727 },
      { e: 'James Watt’ın geliştirdiği buhar makinesi', i: '⚙️', d: '1769', v: 1769 },
      { e: 'Fransız İhtilali', i: '🇫🇷', d: '1789', v: 1789 },
      { e: 'Tanzimat Fermanı', i: '📜', d: '1839', v: 1839 },
      { e: 'I. Meşrutiyet', i: '🏛️', d: '1876', v: 1876 },
    ],
  },
  {
    id: 'millimucadele',
    color: '#E2574C',
    title: 'I. Dünya Savaşı’ndan Cumhuriyet’e',
    emoji: '🇹🇷',
    grades: [8],
    kind: 'date',
    note: 'Aynı yıl içindeki olayları ay ve güne göre sıralama.',
    items: [
      { e: 'I. Dünya Savaşı başladı', i: '💣', d: '28 Temmuz 1914', v: 19140728 },
      { e: 'Çanakkale Deniz Zaferi', i: '⚓', d: '18 Mart 1915', v: 19150318 },
      { e: 'Mondros Ateşkes Antlaşması', i: '✍️', d: '30 Ekim 1918', v: 19181030 },
      { e: 'Mustafa Kemal Samsun’a çıktı', i: '⛴️', d: '19 Mayıs 1919', v: 19190519 },
      { e: 'Amasya Genelgesi', i: '📣', d: '22 Haziran 1919', v: 19190622 },
      { e: 'Erzurum Kongresi', i: '🏔️', d: '23 Temmuz 1919', v: 19190723 },
      { e: 'Sivas Kongresi', i: '👥', d: '4 Eylül 1919', v: 19190904 },
      { e: 'Misak-ı Millî’nin kabulü', i: '📜', d: '28 Ocak 1920', v: 19200128 },
      { e: 'TBMM’nin açılışı', i: '🏛️', d: '23 Nisan 1920', v: 19200423 },
      { e: 'Sevr Antlaşması', i: '📄', d: '10 Ağustos 1920', v: 19200810 },
      { e: 'I. İnönü Muharebesi', i: '🛡️', d: '6 Ocak 1921', v: 19210106 },
      { e: 'Sakarya Meydan Muharebesi', i: '⚔️', d: '23 Ağustos 1921', v: 19210823 },
      { e: 'Büyük Taarruz başladı', i: '🐎', d: '26 Ağustos 1922', v: 19220826 },
      { e: 'Mudanya Ateşkes Antlaşması', i: '🕊️', d: '11 Ekim 1922', v: 19221011 },
      { e: 'Saltanatın kaldırılması', i: '👑', d: '1 Kasım 1922', v: 19221101 },
      { e: 'Lozan Barış Antlaşması', i: '🤝', d: '24 Temmuz 1923', v: 19230724 },
      { e: 'Cumhuriyet’in ilanı', i: '🇹🇷', d: '29 Ekim 1923', v: 19231029 },
    ],
  },
  {
    id: 'inkilaplar',
    color: '#0284C7',
    title: 'Atatürk ilke ve inkılapları',
    emoji: '📜',
    grades: [8],
    kind: 'date',
    note: 'İnkılapların sırası ve birbirine yakın tarihler.',
    items: [
      { e: 'Saltanatın kaldırılması', i: '👑', d: '1 Kasım 1922', v: 19221101 },
      { e: 'Ankara’nın başkent olması', i: '🏙️', d: '13 Ekim 1923', v: 19231013 },
      { e: 'Cumhuriyet’in ilanı', i: '🇹🇷', d: '29 Ekim 1923', v: 19231029 },
      { e: 'Halifeliğin kaldırılması', i: '🕌', d: '3 Mart 1924', v: 19240303 },
      { e: 'Şapka Kanunu', i: '🎩', d: '25 Kasım 1925', v: 19251125 },
      { e: 'Türk Medeni Kanunu’nun kabulü', i: '⚖️', d: '17 Şubat 1926', v: 19260217 },
      { e: 'Harf İnkılabı (Yeni Türk harfleri)', i: '🔤', d: '1 Kasım 1928', v: 19281101 },
      { e: 'Soyadı Kanunu', i: '🏷️', d: '21 Haziran 1934', v: 19340621 },
      { e: 'Kadınlara milletvekili seçme ve seçilme hakkı', i: '🗳️', d: '5 Aralık 1934', v: 19341205 },
      { e: 'Atatürk’ün vefatı', i: '🕯️', d: '10 Kasım 1938', v: 19381110 },
    ],
  },
];

// Sınıf düzeyine göre zorluk. Tarihler HİÇBİR düzeyde sıralamadan önce görünmez (yarışmada kopya olmasın);
// öğrenci olayın kendisinden sıralar. Kronolojik düşünme kademeli gelişir:
//  5: az kart, birbirinden uzak olaylar (sadece "önce/sonra"); öğretmen ipucu açabilir.
//  6: daha çok kart, MÖ/MS karışık, olaylar rastgele; ipucu açılabilir.
//  7: rastgele ve daha yakın olaylar; ipucu olarak yüzyıl (yüzyıl hesabı bu düzeyin becerisi).
//  8: birbirine en yakın olaylar (aynı yıl içinde ay/gün); ipucu yok.
export const GRADE_LEVELS = {
  5: { count: 4, hint: true, pick: 'spread', label: 'Kolay', desc: '4 olay · birbirinden uzak olaylar' },
  6: { count: 5, hint: true, pick: 'random', label: 'Orta', desc: '5 olay · MÖ/MS karışık' },
  7: { count: 6, hint: true, pick: 'random', label: 'Zor', desc: '6 olay · yakın tarihler' },
  8: { count: 7, hint: false, pick: 'close', label: 'Çok zor', desc: '7 olay · en yakın tarihler · ipucu yok' },
};
export const GRADES = [5, 6, 7, 8];

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Tarih gizliyken gösterilecek ipucu: yıl → yüzyıl, tam tarih → yıl, yıl içi gün → ay.
export function hintOf(item, kind) {
  if (kind === 'date') return String(Math.floor(item.v / 10000));
  if (kind === 'day') return MONTHS[Math.floor(item.v / 100) - 1] || '';
  const y = item.v;
  if (y <= -1000) return `MÖ ${Math.ceil(-y / 1000)}. binyıl`;
  if (y < 0) return `MÖ ${Math.ceil(-y / 100)}. yüzyıl`;
  return `${Math.ceil(y / 100)}. yüzyıl`;
}

// "1453 | İstanbul'un fethi", "MÖ 3200 | Yazı", "29.10.1923 | Cumhuriyet" satırlarından set kurar.
export function parseCustomLines(text) {
  const rows = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(.+?)\s*[|;\t]\s*(.+)$/) || line.match(/^((?:MÖ|MS|M\.Ö\.|M\.S\.)?\s*-?\d[\d.\/]*)\s+[-–:]?\s*(.+)$/i);
    if (!m) continue;
    const d = m[1].trim();
    const e = m[2].trim();
    const full = d.match(/^(\d{1,2})[./](\d{1,2})[./](\d{3,4})$/);
    if (full) {
      rows.push({ e, d, v: +full[3] * 10000 + +full[2] * 100 + +full[1], date: true });
      continue;
    }
    const y = d.match(/^(MÖ|M\.Ö\.|MS|M\.S\.)?\s*(-?\d{1,5})$/i);
    if (!y) continue;
    const bc = y[1] && /^M\.?Ö/i.test(y[1]);
    const n = parseInt(y[2], 10);
    rows.push({ e, d: bc ? `MÖ ${Math.abs(n)}` : d, v: bc ? -Math.abs(n) : n, date: false });
  }
  const anyDate = rows.some((r) => r.date);
  // Tarih ve yıl karışıksa yılı yılın başına koy ki karşılaştırılabilsin.
  const items = rows.map((r) => ({ e: r.e, d: r.d, v: anyDate && !r.date ? r.v * 10000 : r.v }));
  return { kind: anyDate ? 'date' : 'year', items };
}

// Set'ten düzeye göre olay seç. Aynı değerdeki olaylardan biri alınır (sıra belirsiz kalmasın).
export function pickItems(set, count, pick) {
  const seen = new Set();
  const sorted = [...set.items].sort((a, b) => a.v - b.v).filter((x) => (seen.has(x.v) ? false : (seen.add(x.v), true)));
  const n = Math.min(count, sorted.length);
  if (n >= sorted.length) return sorted;
  if (pick === 'spread') {
    // Eşit aralıklı indeksler + küçük kaydırma → olaylar birbirinden uzak.
    const step = (sorted.length - 1) / (n - 1);
    const idx = Array.from({ length: n }, (_, i) => Math.round(i * step));
    for (let i = 1; i < n - 1; i++) {
      const j = idx[i] + (Math.random() < 0.5 ? -1 : 1);
      if (Math.random() < 0.5 && j > idx[i - 1] && j < idx[i + 1]) idx[i] = j;
    }
    return idx.map((i) => sorted[i]);
  }
  if (pick === 'close') {
    // Ardışık bir pencere: birbirine en yakın olaylar.
    const start = Math.floor(Math.random() * (sorted.length - n + 1));
    return sorted.slice(start, start + n);
  }
  const all = sorted.map((_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, n).sort((a, b) => a - b).map((i) => sorted[i]);
}

// Sınıf adından düzey tahmini: "6-A", "7/B", "8 C" → 6, 7, 8.
export function gradeFromClassName(name) {
  const m = String(name || '').match(/^\s*(\d{1,2})/);
  const g = m ? parseInt(m[1], 10) : null;
  return GRADES.includes(g) ? g : null;
}
