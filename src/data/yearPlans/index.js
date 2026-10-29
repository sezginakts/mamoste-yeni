// MEB 2026-2027 çerçeve yıllık planları (tymm.meb.gov.tr, Din Kültürü: dogm.meb.gov.tr).
// Her branş: { [sınıf]: weeks[] } — haftalar teacher/yearPlan.js parseYearPlan biçiminde.
// Öğretmen kendi planını yüklerse o düzey için bunun yerine geçer (PlanContext).
export const MEB_PLAN_YEAR = '2026-2027';

// MEB planlarının çoğunda (matematik, fen, Türkçe, sosyal…) ünite / tema adı `content` alanında, `unit` boş; İngilizce ve
// DKAB'de `unit` dolu (oradaki `content` içerik çerçevesi / konu). Uygulamanın her yeri ünite adını `unit`ten okur: kısa
// `content` ünite adına taşınır. Geçiş haftasında iki ünite alt alta gelir ("A\nB") — ikisi de yazılır.
const norm = new Map();
function normalize(all) {
  const out = {};
  for (const g of Object.keys(all)) {
    out[g] = all[g].map((w) => {
      const c = String(w.content || '').trim();
      if (w.unit || !c || c.length > 160) return w;
      const { content, ...rest } = w;
      return { ...rest, unit: c.replace(/\s*\n\s*/g, ' / ') };
    });
  }
  return out;
}
export function mebPlans(branchId) {
  if (!norm.has(branchId)) norm.set(branchId, normalize(hamPlan(branchId)));
  return norm.get(branchId);
}

function hamPlan(branchId) {
  switch (branchId) {
    case 'ingilizce':
      return require('./ingilizce.json');
    case 'teknoloji-tasarim':
      return require('./teknoloji-tasarim.json');
    case 'turkce':
      return require('./turkce.json');
    case 'matematik':
      return require('./matematik.json');
    case 'fen':
      return require('./fen.json');
    case 'sosyal':
      return require('./sosyal.json');
    case 'inkilap':
      return require('./inkilap.json');
    case 'din':
      return require('./din.json');
    case 'gorsel':
      return require('./gorsel.json');
    case 'muzik':
      return require('./muzik.json');
    case 'beden':
      return require('./beden.json');
    case 'bilisim':
      return require('./bilisim.json');
    default:
      return {};
  }
}
