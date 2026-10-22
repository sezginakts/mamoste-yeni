// Türkiye Haritası oyununun (tools/etkinlik/harita.html) havuzu: harita geometrisi + düzeyin yerleri + zorluk.
// Geometri src/data/turkeyMap.js (Natural Earth), yerler ve düzeyler src/data/mapFeatures.js.
import { MAP_W, MAP_H, PROVINCES, NEIGHBORS, LAKE_PATHS, RIVER_PATHS } from '../turkeyMap';
import { CATEGORIES, FEATURES, MAP_LEVELS, anchorOf, project } from '../mapFeatures';

const r1 = (n) => Math.round(n * 10) / 10;
const pt = (p) => [r1(p[0]), r1(p[1])];

export default function haritaHavuzu(grade) {
  const level = MAP_LEVELS[Math.min(7, grade)];
  const yerler = FEATURES.filter((f) => f.tier <= level.tier).map((f) => {
    const base = { id: f.id, cat: f.cat, tier: f.tier, name: f.name, info: f.info, a: pt(anchorOf(f)) };
    if (f.kind === 'point') return { ...base, kind: 'point', p: pt(project(f.at)) };
    if (f.kind === 'range') return { ...base, kind: 'range', line: f.line.map((q) => pt(project(q))) };
    if (f.kind === 'river') return { ...base, kind: 'river', ref: f.id };
    if (f.kind === 'lake') return { ...base, kind: 'lake', ref: f.id };
    return { ...base, kind: 'il', ref: f.name, plate: f.plate };
  });
  // Seçeneklerde çeldirici olarak üst düzeyin yerleri de gerekebilir (az yer olan kategoriler).
  const celdirici = FEATURES.filter((f) => f.tier > level.tier).map((f) => ({ id: f.id, cat: f.cat, tier: f.tier, name: f.name, a: pt(anchorOf(f)) }));
  return {
    sinif: grade,
    seviye: level,
    kategoriler: CATEGORIES,
    yerler,
    celdirici,
    harita: {
      W: MAP_W,
      H: MAP_H,
      iller: PROVINCES.map((p) => ({ n: p.name, d: p.d })),
      komsu: NEIGHBORS,
      goller: LAKE_PATHS,
      nehirler: RIVER_PATHS,
      kucukGoller: FEATURES.filter((f) => f.cat === 'gol' && f.kind === 'point').map((f) => pt(project(f.at))),
    },
  };
}
