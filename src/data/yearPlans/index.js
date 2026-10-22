// MEB 2026-2027 çerçeve yıllık planları (tymm.meb.gov.tr, Din Kültürü: dogm.meb.gov.tr).
// Her branş: { [sınıf]: weeks[] } — haftalar teacher/yearPlan.js parseYearPlan biçiminde.
// Öğretmen kendi planını yüklerse o düzey için bunun yerine geçer (PlanContext).
export const MEB_PLAN_YEAR = '2026-2027';

export function mebPlans(branchId) {
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
