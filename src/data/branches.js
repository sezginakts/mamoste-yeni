// Branşlar: ortaokul ve lise. Öğretmen ilk açılışta branşını seçer (kalıcı). Sunucudaki classes.branch ile aynı kimlikler.
//   level: 'ortaokul' | 'lise' — seçim ekranında başlık altında gruplanır
//   enabled: şu an seçilebilir mi (false olanlar "Yakında" görünür)
//   grades: dersin okutulduğu sınıf düzeyleri (seçimlerde öneri; zorlayıcı değil)
//   drills: İngilizce kalıp/cümle çalışması (öğrenci tarafı + "Kalıpları dene")
//   hwKinds: verilebilecek ödev türleri — 'sentences' (cümle çalışması) | 'task' (görev/proje)
//   board: akıllı tahta etkinlik seti
export const BRANCHES = [
  // ---- Ortaokul ----
  { id: 'ingilizce', level: 'ortaokul', name: 'İngilizce', emoji: '🇬🇧', color: '#0D9488', grades: [2, 3, 4, 5, 6, 7, 8], enabled: true, drills: true, hwKinds: ['sentences', 'task'], board: 'english' },
  { id: 'teknoloji-tasarim', level: 'ortaokul', name: 'Teknoloji ve Tasarım', emoji: '🛠️', color: '#0284C7', grades: [7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'turkce', level: 'ortaokul', name: 'Türkçe', emoji: '📖', color: '#E2574C', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'matematik', level: 'ortaokul', name: 'Matematik', emoji: '➗', color: '#0D9488', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'fen', level: 'ortaokul', name: 'Fen Bilimleri', emoji: '🔬', color: '#0284C7', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'sosyal', level: 'ortaokul', name: 'Sosyal Bilgiler', emoji: '🌍', color: '#E2574C', grades: [5, 6, 7], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'inkilap', level: 'ortaokul', name: 'T.C. İnkılap Tarihi ve Atatürkçülük', emoji: '🏛️', color: '#0D9488', grades: [8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'din', level: 'ortaokul', name: 'Din Kültürü ve Ahlak Bilgisi', emoji: '📿', color: '#0284C7', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'gorsel', level: 'ortaokul', name: 'Görsel Sanatlar', emoji: '🎨', color: '#E2574C', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'muzik', level: 'ortaokul', name: 'Müzik', emoji: '🎵', color: '#0D9488', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'beden', level: 'ortaokul', name: 'Beden Eğitimi ve Spor', emoji: '⚽', color: '#0284C7', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'bilisim', level: 'ortaokul', name: 'Bilişim Teknolojileri ve Yazılım', emoji: '💻', color: '#E2574C', grades: [5, 6], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },

  // ---- Lise ----
  { id: 'edebiyat', level: 'lise', name: 'Türk Dili ve Edebiyatı', emoji: '📚', color: '#0D9488', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'fizik', level: 'lise', name: 'Fizik', emoji: '⚛️', color: '#0284C7', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'kimya', level: 'lise', name: 'Kimya', emoji: '🧪', color: '#0D9488', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'biyoloji', level: 'lise', name: 'Biyoloji', emoji: '🧬', color: '#E2574C', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'tarih', level: 'lise', name: 'Tarih', emoji: '📜', color: '#E2574C', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'cografya', level: 'lise', name: 'Coğrafya', emoji: '🗺️', color: '#0284C7', grades: [9, 10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'felsefe', level: 'lise', name: 'Felsefe', emoji: '💭', color: '#0D9488', grades: [10, 11, 12], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
];

export const BRANCH_BY_ID = Object.fromEntries(BRANCHES.map((b) => [b.id, b]));
export const branchOf = (id) => BRANCH_BY_ID[id] || BRANCH_BY_ID.ingilizce;
export const branchesOfLevel = (level) => BRANCHES.filter((b) => b.level === level);
