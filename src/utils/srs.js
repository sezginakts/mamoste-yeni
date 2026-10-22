// Aralıklı tekrar — "renkli tik" aşama modeli.
// Öğrenci yazılı testi geçtikçe cümle aşama atlar; her aşama bir tik rengi.
//
//   stage 0  →  (henüz yok)      : yeni, hiç çalışılmadı
//   stage 1  →  🟣 mor tik       : ilk gün yazılı testi geçti
//   stage 2  →  🔵 mavi tik      : ertesi gün (1 gün sonra) tekrarını geçti
//   stage 3  →  🟢 yeşil tik     : haftalık (7 gün sonra) tekrarını geçti
//   stage 4  →  🏅 sarı kurdeleli: aylık (30 gün sonra) tekrarını geçti — ustalaşmış
//
// Test geçilmezse aşama bir basamak geriler (yumuşak düşüş), tekrar yakında istenir.

export const DAY = 24 * 60 * 60 * 1000;

export const MAX_STAGE = 4;
export const MASTER_STAGE = 4; // sarı kurdeleli = ezberlenmiş

// Bir aşamaya ulaşıldıktan sonra BİR SONRAKİ tekrara kaç gün kalacağı.
// stage 1'e ulaşınca 1 gün sonra (mavi için), stage 2'ye ulaşınca 7 gün sonra (yeşil için)...
export const STAGE_NEXT_DAYS = { 1: 1, 2: 7, 3: 30, 4: 30 };

// Tik bilgisi (UI'da kullanılır).
export const TICKS = {
  0: null,
  1: { key: 'mor', label: 'Mor tik', color: '#A855F7', emoji: '🟣', ribbon: false },
  2: { key: 'mavi', label: 'Mavi tik', color: '#3B82F6', emoji: '🔵', ribbon: false },
  3: { key: 'yesil', label: 'Yeşil tik', color: '#22C55E', emoji: '🟢', ribbon: false },
  4: { key: 'sari', label: 'Sarı kurdeleli tik', color: '#EAB308', emoji: '🏅', ribbon: true },
};

// Bir aşamanın "tekrar adı" (kullanıcıya gösterilir).
export const STAGE_REVIEW_NAME = {
  0: 'İlk çalışma',
  1: 'Günlük tekrar',
  2: 'Haftalık tekrar',
  3: 'Aylık tekrar',
};

export function newCard(sentenceId) {
  return {
    id: sentenceId,
    stage: 0, // 0 = hiç çalışılmadı
    nextReview: 0, // epoch ms; bu zamandan sonra tekrar istenir
    passCount: 0, // toplam kaç kez test geçti
    failCount: 0, // toplam kaç kez kaldı
    correctStreak: 0, // üst üste kaç kez doğru (3+ ise tekrar sorulmaz)
    lastSeen: 0,
    firstLearned: 0, // ilk mor tik zamanı
  };
}

// Bir cümle "iyi öğrenilmiş" mi? (üst üste 3+ doğru) → tekrar oturumlarında atlanabilir.
export const WELL_KNOWN_STREAK = 3;
export function isWellKnown(card) {
  return !!card && (card.correctStreak || 0) >= WELL_KNOWN_STREAK;
}

// Yazılı test sonucu işlenir.
// ÖNEMLİ: Aşama (tik) yalnızca DOĞRU ZAMANDA ilerler:
//   • İlk öğrenme (stage 0)  -> her zaman stage 1'e (mor tik)
//   • Tekrar (stage 1+)      -> SADECE tekrar zamanı geldiyse (nextReview <= now) bir üst aşamaya
// Zamanı gelmemiş bir cümle (örn. kütüphaneden) test edilirse: sadece pratik sayılır,
// aşama ve takvim DEĞİŞMEZ. Böylece aynı gün 4 kez geçip "aylık tik" alınamaz.
export function gradeTest(card, passed, now = Date.now()) {
  const prev = card && typeof card.stage === 'number' ? card : migrate(card);
  let stage = prev.stage || 0;
  let passCount = prev.passCount || 0;
  let failCount = prev.failCount || 0;
  let correctStreak = prev.correctStreak || 0;
  let firstLearned = prev.firstLearned || 0;
  let nextReview = prev.nextReview || 0;

  const isFirstLearn = stage === 0;
  const isDueNow = stage > 0 && (prev.nextReview || 0) <= now;
  const canAdvance = isFirstLearn || isDueNow; // aşama ancak bu durumlarda değişir

  if (passed) {
    passCount += 1;
    correctStreak += 1;
    if (canAdvance) {
      stage = Math.min(MAX_STAGE, stage + 1);
      if (stage === 1 && !firstLearned) firstLearned = now;
      // yeni aşamaya göre bir sonraki tekrar zamanı
      const days = STAGE_NEXT_DAYS[stage] != null ? STAGE_NEXT_DAYS[stage] : 1;
      nextReview = now + days * DAY;
    }
    // canAdvance değilse: nextReview AYNI kalır (takvim korunur)
  } else {
    failCount += 1;
    correctStreak = 0;
    if (canAdvance && stage > 1) {
      // tekrar zamanı gelmişti ama geçemedi -> bir aşama geri, yakında tekrar iste
      stage = stage - 1;
      nextReview = now + (STAGE_NEXT_DAYS[stage] || 1) * DAY;
    } else if (isDueNow) {
      // stage 1'de kaldı -> yarın tekrar
      nextReview = now + DAY;
    }
  }

  return {
    ...prev,
    stage,
    passCount,
    failCount,
    correctStreak,
    firstLearned,
    nextReview,
    lastSeen: now,
  };
}

// Eski (box tabanlı) kartları yeni modele taşı — geriye dönük uyum.
function migrate(card) {
  if (!card) return newCard(undefined);
  if (typeof card.stage === 'number') return card;
  const box = card.box || 0;
  // box 0-5 -> stage 0-4 kabaca eşle
  const stage = box <= 0 ? 0 : Math.min(MAX_STAGE, Math.ceil(box / 1.25));
  return {
    id: card.id,
    stage,
    nextReview: card.nextReview || 0,
    passCount: card.seenCount || 0,
    failCount: card.lapses || 0,
    lastSeen: card.lastSeen || 0,
    firstLearned: stage > 0 ? card.lastSeen || 0 : 0,
  };
}

export function isNew(card) {
  return !card || !card.stage;
}

// Zamanı gelmiş tekrar mı? (çalışılmış + nextReview geçmiş, henüz ustalaşmamış)
export function isDue(card, now = Date.now()) {
  if (!card || !card.stage) return false;
  if (card.stage >= MASTER_STAGE) return false; // sarı = bitti, tekrar istemez
  return (card.nextReview || 0) <= now;
}

export function isMastered(card) {
  return !!card && card.stage >= MASTER_STAGE;
}

export function isLearning(card) {
  return !!card && card.stage > 0 && card.stage < MASTER_STAGE;
}

export function statusOf(card) {
  if (isNew(card)) return 'new';
  if (isMastered(card)) return 'mastered';
  return 'learning';
}

// Cümlenin tik bilgisini döndürür (null = henüz yok).
export function tickFor(card) {
  if (!card || !card.stage) return null;
  return TICKS[card.stage] || null;
}

// İlerleme oranı (0-1) — aşamaya göre.
export function masteryRatio(card) {
  if (!card || !card.stage) return 0;
  return Math.min(1, card.stage / MASTER_STAGE);
}

// Bu kartın şu an istenen tekrar türü adı (örn. "Günlük tekrar").
export function dueReviewName(card) {
  if (!card || !card.stage) return STAGE_REVIEW_NAME[0];
  return STAGE_REVIEW_NAME[card.stage] || 'Tekrar';
}
