// Ortaokul branşları. Öğretmen ilk açılışta branşını seçer (kalıcı). Sunucudaki classes.branch ile aynı kimlikler.
//   enabled: şu an seçilebilir mi (false olanlar "Yakında" görünür)
//   grades: dersin okutulduğu sınıf düzeyleri (seçimlerde öneri; zorlayıcı değil)
//   drills: İngilizce kalıp/cümle çalışması (öğrenci tarafı + "Kalıpları dene")
//   hwKinds: verilebilecek ödev türleri — 'sentences' (cümle çalışması) | 'task' (görev/proje)
//   board: akıllı tahta etkinlik seti
export const BRANCHES = [
  { id: 'ingilizce', name: 'İngilizce', emoji: '🇬🇧', color: '#0D9488', grades: [2, 3, 4, 5, 6, 7, 8], enabled: true, drills: true, hwKinds: ['sentences', 'task'], board: 'english' },
  { id: 'teknoloji-tasarim', name: 'Teknoloji ve Tasarım', emoji: '🛠️', color: '#0284C7', grades: [7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'turkce', name: 'Türkçe', emoji: '📖', color: '#E2574C', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'matematik', name: 'Matematik', emoji: '➗', color: '#0D9488', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'fen', name: 'Fen Bilimleri', emoji: '🔬', color: '#0284C7', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'sosyal', name: 'Sosyal Bilgiler', emoji: '🌍', color: '#E2574C', grades: [5, 6, 7], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'inkilap', name: 'T.C. İnkılap Tarihi ve Atatürkçülük', emoji: '🇹🇷', color: '#0D9488', grades: [8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'din', name: 'Din Kültürü ve Ahlak Bilgisi', emoji: '📿', color: '#0284C7', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'gorsel', name: 'Görsel Sanatlar', emoji: '🎨', color: '#E2574C', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'muzik', name: 'Müzik', emoji: '🎵', color: '#0D9488', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'beden', name: 'Beden Eğitimi ve Spor', emoji: '⚽', color: '#0284C7', grades: [5, 6, 7, 8], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
  { id: 'bilisim', name: 'Bilişim Teknolojileri ve Yazılım', emoji: '💻', color: '#E2574C', grades: [5, 6], enabled: true, drills: false, hwKinds: ['task'], board: 'plan' },
];

export const BRANCH_BY_ID = Object.fromEntries(BRANCHES.map((b) => [b.id, b]));
export const branchOf = (id) => BRANCH_BY_ID[id] || BRANCH_BY_ID.ingilizce;
