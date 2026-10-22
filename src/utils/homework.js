// Ödev -> öğrencinin çalışacağı cümle listesi.
// Öğretmen sınıfa TEK ödev verir; liste her öğrencinin kendi tekrar (SRS) geçmişine göre
// burada, öğrencinin cihazında kişiselleşir. Öğretmen tarafında veri gerekmez.
//
// Ödev nesnesi:
//   { id, title, kind: 'new'|'review'|'mixed'|'weak', p: [kalıp id], n: ortak cümle sayısı,
//     r: kişisel tekrar sayısı, ids?: [cümle id] (öğretmenin seçtiği), due: 'YYYY-MM-DD', to?: öğrenci no }
import { ALL_SENTENCES, PATTERN_BY_ID } from '../data/patterns';
import { isNew, isDue } from './srs';

export const HW_KINDS = {
  new: { label: 'Yeni kalıp', emoji: '✨', desc: 'Öğrencinin henüz görmediği cümlelerden.' },
  review: { label: 'Tekrar', emoji: '🔁', desc: 'Öğrencinin daha önce gördüğü, zamanı gelen ve yanlış yaptığı cümleler.' },
  mixed: { label: 'Karışık test', emoji: '🎯', desc: 'Yarısı tekrar, yarısı yeni.' },
  weak: { label: 'Zayıf noktalar', emoji: '🩹', desc: 'Sınıfın en çok yanlış yaptığı cümleler.' },
};

const withPattern = (s, kind) => {
  const p = PATTERN_BY_ID[s.patternId];
  return { ...s, patternColor: p ? p.color : s.patternColor, patternName: p ? p.name : s.patternName, _kind: kind };
};

function reviewOrder(cards, now) {
  return (a, b) => {
    const ca = cards[a.id] || {};
    const cb = cards[b.id] || {};
    const da = isDue(ca, now) ? 1 : 0;
    const db = isDue(cb, now) ? 1 : 0;
    if (da !== db) return db - da;
    if ((cb.failCount || 0) !== (ca.failCount || 0)) return (cb.failCount || 0) - (ca.failCount || 0);
    return (ca.lastSeen || 0) - (cb.lastSeen || 0);
  };
}

// Kalan yeri havuzdan sırayla doldur.
function fill(list, pool, n) {
  const have = new Set(list.map((s) => s.id));
  for (const s of pool) {
    if (list.length >= n) break;
    if (!have.has(s.id)) {
      list.push(s);
      have.add(s.id);
    }
  }
  return list;
}

export function selectHomeworkIds(hw, cards = {}, now = Date.now()) {
  const pats = new Set(hw.p || []);
  const pool = ALL_SENTENCES.filter((s) => pats.has(s.patternId));
  const n = Math.max(1, hw.n || 10);
  const seen = pool.filter((s) => !isNew(cards[s.id])).sort(reviewOrder(cards, now));
  const fresh = pool.filter((s) => isNew(cards[s.id]));
  let core = [];

  if (hw.ids && hw.ids.length) {
    // Öğretmenin seçtiği cümleler; azsa seçili kalıplardan tekrarla tamamlanır.
    core = fill(hw.ids.map((id) => ALL_SENTENCES.find((s) => s.id === id)).filter(Boolean), [...seen, ...pool], n);
  } else if (hw.kind === 'new') {
    core = fill(fresh.slice(0, n), [...seen].reverse(), n);
  } else if (hw.kind === 'review' || hw.kind === 'weak') {
    core = fill(seen.slice(0, n), pool, n);
  } else {
    const half = Math.ceil(n / 2);
    core = fill([...seen.slice(0, half), ...fresh.slice(0, n - half)], pool, n);
  }

  const coreIds = new Set(core.map((s) => s.id));
  const r = Math.max(0, hw.r || 0);
  const personal = ALL_SENTENCES.filter((s) => {
    if (coreIds.has(s.id)) return false;
    const c = cards[s.id];
    return c && ((c.failCount || 0) > 0 || isDue(c, now));
  })
    .sort(reviewOrder(cards, now))
    .slice(0, r);

  return { core: core.map((s) => s.id), personal: personal.map((s) => s.id) };
}

export function sessionFromIds({ core = [], personal = [] }) {
  const byId = (id) => ALL_SENTENCES.find((s) => s.id === id);
  return [
    ...core.map(byId).filter(Boolean).map((s) => withPattern(s, 'hw')),
    ...personal.map(byId).filter(Boolean).map((s) => withPattern(s, 'personal')),
  ];
}

export function hwSummary(hw) {
  if (hw.type === 'task') {
    const n = (hw.att || []).length;
    return `📋 Görev${n ? ` · ${n} ek` : ''}`;
  }
  const kind = HW_KINDS[hw.kind] || HW_KINDS.new;
  const names = (hw.p || []).map((id) => (PATTERN_BY_ID[id] ? PATTERN_BY_ID[id].name : id)).join(' + ');
  return `${kind.emoji} ${kind.label} · ${names || 'seçili cümleler'} · ${hw.n} cümle${hw.r ? ` + en fazla ${hw.r} kişisel tekrar` : ''}`;
}
