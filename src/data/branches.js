// Branşlar: ortaokul ve lise. Öğretmen ilk açılışta branşını seçer (kalıcı). Sunucudaki classes.branch ile aynı kimlikler.
//   level: 'ortaokul' | 'lise' — seçim ekranında başlık altında gruplanır
//   enabled: şu an seçilebilir mi (false olanlar "Yakında" görünür)
//   grades: dersin okutulduğu sınıf düzeyleri (seçimlerde öneri; zorlayıcı değil)
//   drills: İngilizce kalıp/cümle çalışması (öğrenci tarafı + "Kalıpları dene")
//   hwKinds: verilebilecek ödev türleri — 'sentences' (cümle çalışması) | 'task' (görev/proje)
//   board: akıllı tahta etkinlik seti
export const BRANCHES = [
  // ---- Ortaokul ----
  { id: 'ingilizce', short: 'İNG', level: 'ortaokul', name: 'İngilizce', emoji: '🇬🇧', color: '#0D9488', grades: [2, 3, 4, 5, 6, 7, 8], enabled: true, drills: true, hwKinds: ['sentences', 'task'], board: 'english' },
  { id: 'teknoloji-tasarim', short: 'TVT', level: 'ortaokul', name: 'Teknoloji ve Tasarım', emoji: '🛠️', color: '#0284C7', grades: [7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'turkce', short: 'TÜR', level: 'ortaokul', name: 'Türkçe', emoji: '📖', color: '#E2574C', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'matematik', short: 'MAT', level: 'ortaokul', name: 'Matematik', emoji: '➗', color: '#0D9488', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'fen', short: 'FEN', level: 'ortaokul', name: 'Fen Bilimleri', emoji: '🔬', color: '#0284C7', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'sosyal', short: 'SB', level: 'ortaokul', name: 'Sosyal Bilgiler', emoji: '🌍', color: '#E2574C', grades: [5, 6, 7], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'inkilap', short: 'TİA', level: 'ortaokul', name: 'T.C. İnkılap Tarihi ve Atatürkçülük', emoji: '🏛️', color: '#0D9488', grades: [8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'din', short: 'DKAB', level: 'ortaokul', name: 'Din Kültürü ve Ahlak Bilgisi', emoji: '📿', color: '#0284C7', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'gorsel', short: 'GS', level: 'ortaokul', name: 'Görsel Sanatlar', emoji: '🎨', color: '#E2574C', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'muzik', short: 'MÜZ', level: 'ortaokul', name: 'Müzik', emoji: '🎵', color: '#0D9488', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'beden', short: 'BES', level: 'ortaokul', name: 'Beden Eğitimi ve Spor', emoji: '⚽', color: '#0284C7', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'bilisim', short: 'BTY', level: 'ortaokul', name: 'Bilişim Teknolojileri ve Yazılım', emoji: '💻', color: '#E2574C', grades: [5, 6], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  // Öğretmenin seçtiği seçmeli dersler (adı sonradan değiştirilebilir): ortaokul listesinin en altında.
  { id: 'secmeli-1', short: 'SD1', level: 'ortaokul', name: 'Seçmeli Ders 1', emoji: '➕', color: '#0D9488', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'secmeli-2', short: 'SD2', level: 'ortaokul', name: 'Seçmeli Ders 2', emoji: '➕', color: '#0284C7', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },

  // ---- Lise ----
  { id: 'edebiyat', short: 'TDE', level: 'lise', name: 'Türk Dili ve Edebiyatı', emoji: '📚', color: '#0D9488', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'fizik', short: 'FİZ', level: 'lise', name: 'Fizik', emoji: '⚛️', color: '#0284C7', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'kimya', short: 'KİM', level: 'lise', name: 'Kimya', emoji: '🧪', color: '#0D9488', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'biyoloji', short: 'BİO', level: 'lise', name: 'Biyoloji', emoji: '🧬', color: '#E2574C', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'tarih', short: 'TAR', level: 'lise', name: 'Tarih', emoji: '📜', color: '#E2574C', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'cografya', short: 'COĞ', level: 'lise', name: 'Coğrafya', emoji: '🗺️', color: '#0284C7', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'felsefe', short: 'FEL', level: 'lise', name: 'Felsefe', emoji: '💭', color: '#0D9488', grades: [10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
];

export const BRANCH_BY_ID = Object.fromEntries(BRANCHES.map((b) => [b.id, b]));

// Seçmeli derslerin adı öğretmen tarafından değiştirilebilir (ör. "Seçmeli Ders 1" → "Yaşayan Diller").
// Bu harita cihazda saklanır (src/teacher/branchNames.js) ve branchOf() aynı adı her yerde döndürür.
export const BRANCH_NAME_OVERRIDE = {};

// "Yaşayan Diller" → "YD" (ders programındaki kısa etiket)
export const kisaAd = (ad) =>
  String(ad || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toLocaleUpperCase('tr')
    .slice(0, 3);

export const branchOf = (id) => {
  const b = BRANCH_BY_ID[id] || BRANCH_BY_ID.ingilizce;
  const ad = BRANCH_NAME_OVERRIDE[b.id];
  if (!ad) return b;
  return { ...b, name: ad, short: kisaAd(ad) || b.short };
};

export const branchesOfLevel = (level) => BRANCHES.filter((b) => b.level === level);
