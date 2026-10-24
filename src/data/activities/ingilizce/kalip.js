// Kalıp Tahtası havuzu: uygulamanın kalıp cümleleri (src/data/patterns.js — tek kaynak).
// Her kalıp: { ad, tr, renk, emoji, cumleler: [[İngilizce, Türkçe, renkli kalıp parçası, seviye], …] }
import { PATTERNS } from '../../patterns.js';

export default PATTERNS.map((p) => ({
  ad: p.name,
  tr: p.nameTr,
  renk: p.color,
  emoji: p.emoji,
  cumleler: p.sentences.map((s) => [s.en, s.tr, s.chunk, s.level]),
}));
